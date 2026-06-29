import time
from datetime import datetime, timezone, timedelta
from bson.objectid import ObjectId
from config.database import get_db

_cache = {}
_cache_ttl = {}

def _cached(ttl=30):
    def decorator(func):
        def wrapper(*args, **kwargs):
            key = f"{func.__name__}:{args[0]}:{kwargs.get('range_type', args[1] if len(args) > 1 else 'month')}"
            now = time.monotonic()
            if key in _cache and now - _cache_ttl.get(key, 0) < ttl:
                return _cache[key]
            result = func(*args, **kwargs)
            _cache[key] = result
            _cache_ttl[key] = now
            return result
        return wrapper
    return decorator


def _get_time_range(range_type, start=None, end=None):
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if range_type == "day":
        return now.replace(hour=0, minute=0, second=0, microsecond=0), now
    elif range_type == "week":
        return now - timedelta(days=7), now
    elif range_type == "month":
        return now - timedelta(days=30), now
    elif range_type == "year":
        return now - timedelta(days=365), now
    elif range_type == "custom" and start and end:
        try:
            return datetime.fromisoformat(start), datetime.fromisoformat(end)
        except (ValueError, TypeError):
            return now - timedelta(days=30), now
    return now - timedelta(days=30), now


def _get_user_trip_ids(user_id):
    db = get_db()
    memberships = db["members"].find({"user_id": ObjectId(user_id), "status": "active"})
    return [m["trip_id"] for m in memberships]


@_cached(ttl=30)
def get_overview(user_id, range_type="month", start=None, end=None):
    db = get_db()
    trip_ids = _get_user_trip_ids(user_id)
    date_from, date_to = _get_time_range(range_type, start, end)

    if not trip_ids:
        return {
            "total_trips": 0,
            "total_members": 0,
            "total_spent": 0,
            "expense_count": 0,
            "pending_settlements": 0,
            "activity_count": 0,
            "total_budget": 0,
        }

    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)

    trips = list(db["trips"].find(
        {"_id": {"$in": trip_ids}},
        {"start_date": 1, "end_date": 1}
    ))
    trip_map = {t["_id"]: t for t in trips}

    active_trips = 0
    for t in trips:
        st = t.get("start_date")
        et = t.get("end_date")
        if st and et:
            st_day = st.replace(hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)
            et_day = et.replace(hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)
            if et_day < today or st_day > today:
                continue
        active_trips += 1

    member_count_result = db["members"].count_documents(
        {"trip_id": {"$in": trip_ids}, "status": "active"}
    )

    expense_pipeline = [
        {"$match": {"trip_id": {"$in": trip_ids}, "date": {"$gte": date_from, "$lte": date_to}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
    ]
    expense_result = list(db["expenses"].aggregate(expense_pipeline))
    total_spent = expense_result[0]["total"] if expense_result else 0
    expense_count = expense_result[0]["count"] if expense_result else 0

    pending_settlements = db["settlements"].count_documents(
        {"trip_id": {"$in": trip_ids}, "status": "pending"}
    )

    activity_count = db["activity_feed"].count_documents({
        "actor_id": ObjectId(user_id),
        "created_at": {"$gte": date_from, "$lte": date_to}
    })

    budget_result = list(db["budgets"].aggregate([
        {"$match": {"trip_id": {"$in": trip_ids}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]))
    total_budget = budget_result[0]["total"] if budget_result else 0

    return {
        "total_trips": active_trips,
        "total_members": member_count_result,
        "total_spent": total_spent,
        "expense_count": expense_count,
        "pending_settlements": pending_settlements,
        "activity_count": activity_count,
        "total_budget": total_budget,
    }


def get_dashboard_expenses(user_id, range_type="month", start=None, end=None, limit=20):
    db = get_db()
    trip_ids = _get_user_trip_ids(user_id)
    date_from, date_to = _get_time_range(range_type, start, end)

    if not trip_ids:
        return []

    expenses = list(
        db["expenses"].find({"trip_id": {"$in": trip_ids}, "date": {"$gte": date_from, "$lte": date_to}})
        .sort("date", -1)
        .limit(limit)
    )

    if not expenses:
        return []

    unique_trip_ids = set(e["trip_id"] for e in expenses)
    trips = list(db["trips"].find(
        {"_id": {"$in": list(unique_trip_ids)}},
        {"title": 1}
    ))
    trip_cache = {str(t["_id"]): t["title"] for t in trips}

    result = []
    for e in expenses:
        tid = str(e["trip_id"])
        e["_id"] = str(e["_id"])
        e["trip_id"] = tid
        e["trip_title"] = trip_cache.get(tid, "Unknown")
        e["created_by"] = str(e["created_by"])
        e["split_among"] = [str(uid) for uid in e["split_among"]]
        e["date"] = e["date"].strftime("%Y-%m-%d") if hasattr(e["date"], "strftime") else e["date"]
        if isinstance(e.get("created_at"), datetime):
            e["created_at"] = e["created_at"].replace(tzinfo=timezone.utc).isoformat()
        for s in e.get("splits", []):
            s["user_id"] = str(s["user_id"])
        result.append(e)

    return result


def _resolve_trip_titles(db, trip_ids):
    ids = list(set(trip_ids))
    trips = list(db["trips"].find(
        {"_id": {"$in": ids}},
        {"title": 1}
    ))
    return {str(t["_id"]): t["title"] for t in trips}


def _resolve_users(db, user_ids):
    ids = list(set(user_ids))
    users = list(db["users"].find(
        {"_id": {"$in": ids}},
        {"full_name": 1, "username": 1, "profile_photo_url": 1}
    ))
    return {
        str(u["_id"]): {
            "full_name": u.get("full_name", ""),
            "username": u.get("username", ""),
            "profile_photo_url": u.get("profile_photo_url", ""),
        }
        for u in users
    }


def get_dashboard_settlements(user_id):
    db = get_db()
    trip_ids = _get_user_trip_ids(user_id)

    if not trip_ids:
        return {"i_owe": [], "owed_to_me": []}

    i_owe = list(
        db["settlements"].find({"trip_id": {"$in": trip_ids}, "from_user_id": ObjectId(user_id), "status": "pending"})
        .sort("amount", -1)
    )
    owed_to_me = list(
        db["settlements"].find({"trip_id": {"$in": trip_ids}, "to_user_id": ObjectId(user_id), "status": "pending"})
        .sort("amount", -1)
    )

    all_trip_ids = set()
    all_user_ids = set()
    for s in i_owe + owed_to_me:
        all_trip_ids.add(s["trip_id"])
        all_user_ids.add(s["to_user_id"])
        all_user_ids.add(s["from_user_id"])

    trip_cache = _resolve_trip_titles(db, list(all_trip_ids))

    user_cache = _resolve_users(db, list(all_user_ids))

    def get_trip_title(tid):
        return trip_cache.get(str(tid), "Unknown")

    def get_user_display(uid):
        u = user_cache.get(str(uid))
        if u:
            return u["full_name"] or u["username"]
        return "Unknown"

    def serialize(s, direction):
        return {
            "_id": str(s["_id"]),
            "trip_title": get_trip_title(s["trip_id"]),
            "other_user": get_user_display(s["to_user_id"] if direction == "owe" else s["from_user_id"]),
            "amount": s["amount"],
            "status": s["status"],
        }

    return {
        "i_owe": [serialize(s, "owe") for s in i_owe],
        "owed_to_me": [serialize(s, "owed") for s in owed_to_me],
    }


def get_dashboard_budget(user_id):
    db = get_db()
    trip_ids = _get_user_trip_ids(user_id)

    if not trip_ids:
        return {
            "total_budget": 0,
            "total_spent": 0,
            "health": "no_budget",
            "percentage_used": 0,
            "budgets": [],
        }

    budgets = list(db["budgets"].find({"trip_id": {"$in": trip_ids}}))
    budget_trip_ids = [b["trip_id"] for b in budgets]

    expense_pipeline = [
        {"$match": {"trip_id": {"$in": budget_trip_ids}}},
        {"$group": {"_id": "$trip_id", "total": {"$sum": "$amount"}}},
    ]
    spent_by_trip = {
        str(r["_id"]): r["total"]
        for r in db["expenses"].aggregate(expense_pipeline)
    }

    trips = _resolve_trip_titles(db, [str(t) for t in budget_trip_ids])

    total_budget = 0
    total_spent = 0
    budget_list = []

    for b in budgets:
        tid = b["trip_id"]
        tid_s = str(tid)
        amt = b.get("total_amount", 0)
        spent = spent_by_trip.get(tid_s, 0)
        total_budget += amt
        total_spent += spent
        budget_list.append({
            "trip_id": tid_s,
            "trip_title": trips.get(tid_s, "Unknown"),
            "budget": amt,
            "spent": spent,
        })

    health = "over_budget" if total_spent > total_budget else "near_limit" if total_budget > 0 and total_spent > 0.8 * total_budget else "under_budget"
    percentage_used = round((total_spent / total_budget) * 100, 1) if total_budget > 0 else 0

    return {
        "total_budget": total_budget,
        "total_spent": total_spent,
        "health": health if total_budget > 0 else "no_budget",
        "percentage_used": percentage_used,
        "budgets": budget_list,
    }
