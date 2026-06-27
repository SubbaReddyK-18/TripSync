from datetime import datetime, timezone
from bson.objectid import ObjectId
from config.database import get_db
from middleware.error_handler import AppError
from services.member_service import require_editor
from services.audit_helper import log_and_audit


def create_budget(trip_id: str, data: dict, user_id: str) -> dict:
    db = get_db()
    require_editor(trip_id, user_id)
    existing = db["budgets"].find_one({"trip_id": ObjectId(trip_id)})
    if existing:
        raise AppError("Budget already exists for this trip", "BUDGET_EXISTS", 409)

    budget = {
        "trip_id": ObjectId(trip_id),
        "total_amount": data["total_amount"],
        "currency": data.get("currency", "INR"),
        "category_limits": data.get("category_limits", {}),
        "created_by": ObjectId(user_id),
        "created_at": datetime.now(timezone.utc),
    }

    result = db["budgets"].insert_one(budget)
    budget["_id"] = str(result.inserted_id)
    budget["trip_id"] = trip_id
    budget["created_by"] = user_id

    return budget


def get_budget(trip_id: str) -> dict:
    db = get_db()
    budget = db["budgets"].find_one({"trip_id": ObjectId(trip_id)})
    if not budget:
        raise AppError("Budget not found", "BUDGET_NOT_FOUND", 404)

    budget["_id"] = str(budget["_id"])
    budget["trip_id"] = str(budget["trip_id"])
    budget["created_by"] = str(budget["created_by"])

    if "history" in budget:
        for h in budget["history"]:
            if isinstance(h.get("updated_at"), datetime):
                h["updated_at"] = h["updated_at"].replace(tzinfo=timezone.utc).isoformat()
            if isinstance(h.get("updated_by"), ObjectId):
                h["updated_by"] = str(h["updated_by"])

    return budget


def update_budget(trip_id: str, data: dict, user_id: str = None) -> dict:
    db = get_db()
    if user_id:
        require_editor(trip_id, user_id)
    budget = db["budgets"].find_one({"trip_id": ObjectId(trip_id)})
    if not budget:
        raise AppError("Budget not found", "BUDGET_NOT_FOUND", 404)

    allowed = ["total_amount", "category_limits"]
    set_fields = {k: v for k, v in data.items() if k in allowed and v is not None}

    if "total_amount" in set_fields and set_fields["total_amount"] != budget["total_amount"]:
        updated_by_name = ""
        if user_id:
            user = db["users"].find_one({"_id": ObjectId(user_id)}, {"full_name": 1})
            if user:
                updated_by_name = user.get("full_name", "")
        history_entry = {
            "old_amount": budget["total_amount"],
            "new_amount": set_fields["total_amount"],
            "updated_by": ObjectId(user_id) if user_id else None,
            "updated_by_name": updated_by_name,
            "reason": data.get("reason", ""),
            "updated_at": datetime.now(timezone.utc),
        }
        db["budgets"].update_one(
            {"trip_id": ObjectId(trip_id)},
            {"$push": {"history": history_entry}, "$set": set_fields}
        )
        if user_id:
            log_and_audit(user_id, "TRIP_UPDATED", f"Updated budget from ₹{budget['total_amount']} to ₹{set_fields['total_amount']}", trip_id)
    elif set_fields:
        db["budgets"].update_one({"trip_id": ObjectId(trip_id)}, {"$set": set_fields})

    return get_budget(trip_id)


def get_budget_history(trip_id: str) -> list:
    db = get_db()
    budget = db["budgets"].find_one({"trip_id": ObjectId(trip_id)}, {"history": 1})
    if not budget or "history" not in budget:
        return []
    history = []
    for h in budget["history"]:
        entry = {
            "old_amount": h["old_amount"],
            "new_amount": h["new_amount"],
            "updated_by_name": h.get("updated_by_name", ""),
            "reason": h.get("reason", ""),
            "updated_at": h["updated_at"].replace(tzinfo=timezone.utc).isoformat() if isinstance(h.get("updated_at"), datetime) else h.get("updated_at"),
        }
        history.append(entry)
    return list(reversed(history))


def get_budget_analytics(trip_id: str) -> dict:
    db = get_db()
    budget = db["budgets"].find_one({"trip_id": ObjectId(trip_id)})

    pipeline = [
        {"$match": {"trip_id": ObjectId(trip_id)}},
        {"$group": {
            "_id": "$category",
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1},
        }},
    ]
    category_spending = list(db["expenses"].aggregate(pipeline))

    total_spent = sum(c["total"] for c in category_spending)
    daily_pipeline = [
        {"$match": {"trip_id": ObjectId(trip_id)}},
        {"$group": {
            "_id": "$date",
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ]
    daily_spending = list(db["expenses"].aggregate(daily_pipeline))

    expenses = list(db["expenses"].find({"trip_id": ObjectId(trip_id)}))
    user_spending_map = {}
    for e in expenses:
        paid_by = e.get("paid_by")
        if isinstance(paid_by, dict):
            for uid_str, amt in paid_by.items():
                if uid_str not in user_spending_map:
                    user_spending_map[uid_str] = {"total": 0, "count": 0}
                user_spending_map[uid_str]["total"] += amt
                user_spending_map[uid_str]["count"] += 1
        else:
            uid_str = str(paid_by)
            if uid_str not in user_spending_map:
                user_spending_map[uid_str] = {"total": 0, "count": 0}
            user_spending_map[uid_str]["total"] += e.get("amount", 0)
            user_spending_map[uid_str]["count"] += 1

    top_spenders = []
    sorted_user_spending = sorted(user_spending_map.items(), key=lambda x: -x[1]["total"])
    for uid_str, info in sorted_user_spending:
        try:
            user_obj_id = ObjectId(uid_str)
        except Exception:
            continue
        user = db["users"].find_one({"_id": user_obj_id}, {"full_name": 1, "username": 1, "profile_photo_url": 1})
        if user:
            user["_id"] = str(user["_id"])
            top_spenders.append({"user": user, "total": info["total"], "count": info["count"]})

    result = {
        "total_spent": total_spent,
        "daily_spending": [{"date": d["_id"], "amount": d["total"], "count": d["count"]} for d in daily_spending],
        "category_spending": [
            {"category": c["_id"], "total": c["total"], "count": c["count"]}
            for c in category_spending
        ],
        "top_spenders": top_spenders,
    }

    if budget:
        budget["_id"] = str(budget["_id"])
        budget["trip_id"] = str(budget["trip_id"])
        budget["created_by"] = str(budget["created_by"])
        if "history" in budget:
            for h in budget["history"]:
                if isinstance(h.get("updated_at"), datetime):
                    h["updated_at"] = h["updated_at"].replace(tzinfo=timezone.utc).isoformat()
                if isinstance(h.get("updated_by"), ObjectId):
                    h["updated_by"] = str(h["updated_by"])
        result["budget"] = budget
        result["total_budget"] = budget["total_amount"]

        if total_spent > budget["total_amount"]:
            result["health"] = "over_budget"
        elif total_spent == budget["total_amount"]:
            result["health"] = "at_budget"
        elif total_spent > 0.8 * budget["total_amount"]:
            result["health"] = "near_limit"
        else:
            result["health"] = "under_budget"

        result["percentage_used"] = round((total_spent / budget["total_amount"]) * 100, 1) if budget["total_amount"] > 0 else 0
    else:
        result["budget"] = None
        result["total_budget"] = 0
        result["health"] = "no_budget"
        result["percentage_used"] = 0

    return result
