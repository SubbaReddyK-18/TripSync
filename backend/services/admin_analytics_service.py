from datetime import datetime, timedelta, timezone
from bson.objectid import ObjectId
from config.database import get_db


def _get_date_range(range_key):
    now = datetime.now(timezone.utc)

    if range_key == "day":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        prev_start = start - timedelta(days=1)

    elif range_key == "week":
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        days_since_monday = today_start.weekday()
        start = today_start - timedelta(days=days_since_monday)
        prev_start = start - timedelta(days=7)

    elif range_key == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if start.month == 1:
            prev_start = start.replace(year=start.year - 1, month=12)
        else:
            prev_start = start.replace(month=start.month - 1)

    elif range_key == "year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        prev_start = start.replace(year=start.year - 1)

    else:
        return None, None

    return start, prev_start


def _count_with_date_filter(db, collection, date_field, start, end=None):
    query = {date_field: {"$gte": start}}
    if end:
        query[date_field]["$lt"] = end
    return db[collection].count_documents(query)


def _count_previous(db, collection, date_field, prev_start, start):
    return db[collection].count_documents({date_field: {"$gte": prev_start, "$lt": start}})


def _sum_expenses(db, start=None, end=None):
    query = {}
    if start:
        query["created_at"] = {"$gte": start}
        if end:
            query["created_at"]["$lt"] = end
    pipeline = [{"$match": query}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
    result = list(db["expenses"].aggregate(pipeline))
    return result[0]["total"] if result else 0


def _count_active_users(db, start, end=None):
    match = {"created_at": {"$gte": start}}
    if end:
        match["created_at"]["$lt"] = end

    user_sets = []

    trips_users = db["trips"].distinct("admin_id", match)
    user_sets.append(set(trips_users))

    exp_users = db["expenses"].distinct("created_by", match)
    user_sets.append(set(exp_users))

    loc_users = db["locations"].distinct("added_by", match)
    user_sets.append(set(loc_users))

    set_match = {"created_at": {"$gte": start}}
    if end:
        set_match["created_at"]["$lt"] = end
    set_from = db["settlements"].distinct("from_user_id", set_match)
    set_to = db["settlements"].distinct("to_user_id", set_match)
    user_sets.append(set(set_from) | set(set_to))

    combined = set()
    for s in user_sets:
        combined |= s
    return len(combined)


def get_platform_analytics(range_key="all"):
    db = get_db()

    hero_users = db["users"].count_documents({})
    hero_admins = db["users"].count_documents({"role": "admin"})

    start, prev_start = _get_date_range(range_key)

    if start is None:
        active_users = hero_users
        active_users_prev = None

        total_trips = db["trips"].count_documents({})
        total_expenses = db["expenses"].count_documents({})
        total_expense_volume = _sum_expenses(db)
        total_places = db["locations"].count_documents({})
        total_settlements = db["settlements"].count_documents({})
        total_users = db["users"].count_documents({})
        trips_per_month = _get_trips_per_month(db)
        expense_category_distribution = _get_expense_category_distribution(db)
        monthly_expense_volume = _get_monthly_expense_volume(db)

        return {
            "hero_users": hero_users,
            "hero_admins": hero_admins,
            "active_users": {"value": active_users, "growth": None},
            "trips_created": {"value": total_trips, "growth": None},
            "expenses_logged": {"value": total_expenses, "growth": None},
            "expense_volume": {"value": total_expense_volume, "growth": None},
            "places_added": {"value": total_places, "growth": None},
            "settlements_completed": {"value": total_settlements, "growth": None},
            "new_users": {"value": total_users, "growth": None},
            "trips_per_month": trips_per_month,
            "expense_category_distribution": expense_category_distribution,
            "monthly_expense_volume": monthly_expense_volume,
        }

    active_users = _count_active_users(db, start)
    active_users_prev = _count_active_users(db, prev_start, start)

    current_trips = _count_with_date_filter(db, "trips", "created_at", start)
    previous_trips = _count_previous(db, "trips", "created_at", prev_start, start)

    current_expenses = _count_with_date_filter(db, "expenses", "created_at", start)
    previous_expenses = _count_previous(db, "expenses", "created_at", prev_start, start)

    current_expense_volume = _sum_expenses(db, start)
    previous_expense_volume = _sum_expenses(db, prev_start, start)

    current_places = _count_with_date_filter(db, "locations", "created_at", start)
    previous_places = _count_previous(db, "locations", "created_at", prev_start, start)

    current_settlements = _count_with_date_filter(db, "settlements", "created_at", start)
    previous_settlements = _count_previous(db, "settlements", "created_at", prev_start, start)

    current_users = _count_with_date_filter(db, "users", "created_at", start)
    previous_users = _count_previous(db, "users", "created_at", prev_start, start)

    def growth(cur, prev):
        if prev and prev > 0:
            return round(((cur - prev) / prev) * 100, 1)
        return None

    return {
        "hero_users": hero_users,
        "hero_admins": hero_admins,
        "active_users": {"value": active_users, "growth": growth(active_users, active_users_prev)},
        "trips_created": {"value": current_trips, "growth": growth(current_trips, previous_trips)},
        "expenses_logged": {"value": current_expenses, "growth": growth(current_expenses, previous_expenses)},
        "expense_volume": {"value": current_expense_volume, "growth": growth(current_expense_volume, previous_expense_volume)},
        "places_added": {"value": current_places, "growth": growth(current_places, previous_places)},
        "settlements_completed": {"value": current_settlements, "growth": growth(current_settlements, previous_settlements)},
        "new_users": {"value": current_users, "growth": growth(current_users, previous_users)},
        "trips_per_month": _get_trips_per_month(db),
        "expense_category_distribution": _get_expense_category_distribution(db),
        "monthly_expense_volume": _get_monthly_expense_volume(db),
    }


def _get_trips_per_month(db):
    pipeline = [
        {
            "$group": {
                "_id": {
                    "year": {"$year": "$created_at"},
                    "month": {"$month": "$created_at"},
                },
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id.year": 1, "_id.month": 1}},
    ]
    results = list(db["trips"].aggregate(pipeline))
    return [
        {
            "month": f"{r['_id']['year']}-{str(r['_id']['month']).zfill(2)}",
            "count": r["count"],
            "label": _month_name(r["_id"]["month"]),
        }
        for r in results
    ]


def _get_expense_category_distribution(db):
    pipeline = [
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
        {"$sort": {"total": -1}},
    ]
    results = list(db["expenses"].aggregate(pipeline))
    grand_total = sum(r["total"] for r in results) or 1
    return [
        {
            "category": r["_id"] or "other",
            "total": r["total"],
            "count": r["count"],
            "percentage": round((r["total"] / grand_total) * 100, 1),
        }
        for r in results
    ]


def _get_monthly_expense_volume(db):
    pipeline = [
        {
            "$group": {
                "_id": {
                    "year": {"$year": "$date"},
                    "month": {"$month": "$date"},
                },
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id.year": 1, "_id.month": 1}},
    ]
    results = list(db["expenses"].aggregate(pipeline))
    return [
        {
            "month": f"{r['_id']['year']}-{str(r['_id']['month']).zfill(2)}",
            "total": r["total"],
            "count": r["count"],
            "label": _month_name(r["_id"]["month"]),
        }
        for r in results
    ]


def _month_name(num):
    names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return names[num] if 1 <= num <= 12 else f"Month {num}"
