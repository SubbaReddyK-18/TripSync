from datetime import datetime, timezone, timedelta
from bson.objectid import ObjectId
from config.database import get_db


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


def get_overview(user_id, range_type="month", start=None, end=None):
    db = get_db()
    trip_ids = _get_user_trip_ids(user_id)
    date_from, date_to = _get_time_range(range_type, start, end)

    # Calculate active trips dynamically based on current date
    now = datetime.now(timezone.utc)
    active_trips = 0
    for tid in trip_ids:
        trip = db["trips"].find_one({"_id": tid})
        if trip:
            st = trip.get("start_date")
            et = trip.get("end_date")
            if st and et:
                st_day = st.replace(hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)
                et_day = et.replace(hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)
                today = now.replace(hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)

                # Eligible active trip: end date >= today and start date <= today
                if et_day < today:
                    continue
                if st_day > today:
                    continue
                active_trips += 1
            else:
                active_trips += 1

    total_trips = active_trips
    total_members = 0
    for tid in trip_ids:
        total_members += db["members"].count_documents({"trip_id": tid, "status": "active"})

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

    total_budget = 0
    for tid in trip_ids:
        budget = db["budgets"].find_one({"trip_id": tid})
        if budget:
            total_budget += budget["total_amount"]

    return {
        "total_trips": total_trips,
        "total_members": total_members,
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

    expenses = list(
        db["expenses"].find({"trip_id": {"$in": trip_ids}, "date": {"$gte": date_from, "$lte": date_to}})
        .sort("date", -1)
        .limit(limit)
    )

    trip_cache = {}
    result = []
    for e in expenses:
        tid = str(e["trip_id"])
        if tid not in trip_cache:
            trip = db["trips"].find_one({"_id": ObjectId(tid)}, {"title": 1})
            trip_cache[tid] = trip["title"] if trip else "Unknown"
        e["_id"] = str(e["_id"])
        e["trip_id"] = tid
        e["trip_title"] = trip_cache[tid]
        e["created_by"] = str(e["created_by"])
        e["split_among"] = [str(uid) for uid in e["split_among"]]
        e["date"] = e["date"].strftime("%Y-%m-%d") if hasattr(e["date"], "strftime") else e["date"]
        if isinstance(e.get("created_at"), datetime):
            e["created_at"] = e["created_at"].replace(tzinfo=timezone.utc).isoformat()
        for s in e.get("splits", []):
            s["user_id"] = str(s["user_id"])
        result.append(e)

    return result


def get_dashboard_settlements(user_id):
    db = get_db()
    trip_ids = _get_user_trip_ids(user_id)

    i_owe = list(
        db["settlements"].find({"trip_id": {"$in": trip_ids}, "from_user_id": ObjectId(user_id), "status": "pending"})
        .sort("amount", -1)
    )
    owed_to_me = list(
        db["settlements"].find({"trip_id": {"$in": trip_ids}, "to_user_id": ObjectId(user_id), "status": "pending"})
        .sort("amount", -1)
    )

    trip_cache = {}
    user_cache = {}

    def resolve_trip(tid):
        tid_s = str(tid)
        if tid_s not in trip_cache:
            trip = db["trips"].find_one({"_id": tid}, {"title": 1})
            trip_cache[tid_s] = trip["title"] if trip else "Unknown"
        return trip_cache[tid_s]

    def resolve_user(uid):
        uid_s = str(uid)
        if uid_s not in user_cache:
            u = db["users"].find_one({"_id": uid}, {"full_name": 1, "username": 1})
            user_cache[uid_s] = u["full_name"] or u["username"] if u else "Unknown"
        return user_cache[uid_s]

    def serialize(s, direction):
        return {
            "_id": str(s["_id"]),
            "trip_title": resolve_trip(s["trip_id"]),
            "other_user": resolve_user(s["to_user_id"] if direction == "owe" else s["from_user_id"]),
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

    total_budget = 0
    total_spent = 0
    budgets = []

    for tid in trip_ids:
        budget = db["budgets"].find_one({"trip_id": tid})
        if budget:
            total_budget += budget["total_amount"]
            spent_pipeline = [
                {"$match": {"trip_id": tid}},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
            ]
            spent_result = list(db["expenses"].aggregate(spent_pipeline))
            spent = spent_result[0]["total"] if spent_result else 0
            total_spent += spent
            trip = db["trips"].find_one({"_id": tid}, {"title": 1})
            budgets.append({
                "trip_id": str(tid),
                "trip_title": trip["title"] if trip else "Unknown",
                "budget": budget["total_amount"],
                "spent": spent,
            })

    health = "over_budget" if total_spent > total_budget else "near_limit" if total_budget > 0 and total_spent > 0.8 * total_budget else "under_budget"
    percentage_used = round((total_spent / total_budget) * 100, 1) if total_budget > 0 else 0

    return {
        "total_budget": total_budget,
        "total_spent": total_spent,
        "health": health if total_budget > 0 else "no_budget",
        "percentage_used": percentage_used,
        "budgets": budgets,
    }
