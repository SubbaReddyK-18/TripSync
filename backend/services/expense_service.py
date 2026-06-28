from datetime import datetime, timezone
from bson.objectid import ObjectId
from config.database import get_db
from middleware.error_handler import AppError
from services.splitting_service import compute_equal_splits, compute_custom_splits
from services.activity_service import create_activity
from services.member_service import is_member, require_editor
from services.audit_helper import log_and_audit


def _ensure_dt(val):
    return datetime.combine(val, datetime.min.time()) if not isinstance(val, datetime) else val


def create_expense(trip_id: str, data: dict, user_id: str) -> dict:
    db = get_db()
    require_editor(trip_id, user_id)

    paid_by = data["paid_by"]
    if isinstance(paid_by, dict):
        total_paid = 0
        normalized_paid_by = {}
        for uid_str, amt in paid_by.items():
            try:
                amt_val = int(amt)
            except (ValueError, TypeError):
                raise AppError("Payment amount must be a number", "INVALID_PAID_BY_AMOUNT", 400)
            if amt_val < 0:
                raise AppError("Payment amount cannot be negative", "INVALID_PAID_BY_AMOUNT", 400)
            total_paid += amt_val
            normalized_paid_by[str(uid_str)] = amt_val
        if total_paid != data["amount"]:
            raise AppError("Sum of paid amounts must equal the total expense amount", "INVALID_PAID_BY_TOTAL", 400)
        expense_paid_by = normalized_paid_by
    else:
        expense_paid_by = str(paid_by)

    expense = {
        "trip_id": ObjectId(trip_id),
        "title": data["title"],
        "amount": data["amount"],
        "currency": data.get("currency", "INR"),
        "category": data.get("category", "other"),
        "date": _ensure_dt(data["date"]),
        "paid_by": expense_paid_by,
        "split_type": data.get("split_type", "equal"),
        "split_among": [ObjectId(uid) for uid in data["split_among"]],
        "splits": [],
        "notes": data.get("notes", ""),
        "receipts": data.get("receipts", []),
        "created_by": ObjectId(user_id),
        "created_at": datetime.now(timezone.utc),
    }

    if expense["split_type"] == "equal":
        expense["splits"] = compute_equal_splits(
            data["amount"], data["split_among"]
        )
    else:
        if not data.get("splits"):
            raise AppError("Custom splits are required for custom split type", "MISSING_SPLITS", 400)
        expense["splits"] = compute_custom_splits(
            data["amount"], data["split_among"], data["splits"]
        )

    result = db["expenses"].insert_one(expense)
    expense["_id"] = str(result.inserted_id)
    expense["trip_id"] = trip_id
    expense["created_by"] = str(expense["created_by"])
    expense["split_among"] = [str(uid) for uid in expense["split_among"]]
    for s in expense["splits"]:
        s["user_id"] = str(s["user_id"])

    create_activity(trip_id, user_id, "expense_added", f"Added expense {data['title']}")
    log_and_audit(user_id, "EXPENSE_ADDED", f"Added expense {data['title']}", trip_id)

    members = list(db["members"].find({"trip_id": ObjectId(trip_id), "status": "active"}))
    notifications = []
    now = datetime.now(timezone.utc)
    for m in members:
        if str(m["user_id"]) != user_id:
            notifications.append({
                "recipient_id": ObjectId(m["user_id"]),
                "trip_id": ObjectId(trip_id),
                "type": "expense_added",
                "message": f"New expense '{data['title']}' added",
                "reference_id": None,
                "reference_type": None,
                "is_read": False,
                "created_at": now,
            })
    if notifications:
        db["notifications"].insert_many(notifications)

    return expense


def get_trip_expenses(trip_id: str, filters: dict = None) -> list:
    db = get_db()
    query = {"trip_id": ObjectId(trip_id)}

    if filters:
        if filters.get("category"):
            query["category"] = filters["category"]
        if filters.get("paid_by"):
            uid_str = filters["paid_by"]
            query["$or"] = [
                {"paid_by": uid_str},
                {f"paid_by.{uid_str}": {"$exists": True}}
            ]
        if filters.get("date_from") and filters.get("date_to"):
            try:
                date_from = datetime.strptime(filters["date_from"], "%Y-%m-%d")
                date_to = datetime.strptime(filters["date_to"], "%Y-%m-%d")
            except (ValueError, TypeError):
                date_from = filters["date_from"]
                date_to = filters["date_to"]
            query["date"] = {"$gte": date_from, "$lte": date_to}

    expenses = list(db["expenses"].find(query).sort("date", -1))
    for e in expenses:
        e["_id"] = str(e["_id"])
        e["trip_id"] = str(e["trip_id"])
        e["created_by"] = str(e["created_by"])
        e["split_among"] = [str(uid) for uid in e["split_among"]]
        for s in e["splits"]:
            s["user_id"] = str(s["user_id"])

    return expenses


def get_expense(trip_id: str, expense_id: str) -> dict:
    db = get_db()
    expense = db["expenses"].find_one({"_id": ObjectId(expense_id), "trip_id": ObjectId(trip_id)})
    if not expense:
        raise AppError("Expense not found", "EXPENSE_NOT_FOUND", 404)

    expense["_id"] = str(expense["_id"])
    expense["trip_id"] = str(expense["trip_id"])
    expense["created_by"] = str(expense["created_by"])
    expense["split_among"] = [str(uid) for uid in expense["split_among"]]
    for s in expense["splits"]:
        s["user_id"] = str(s["user_id"])

    return expense


def update_expense(trip_id: str, expense_id: str, data: dict, user_id: str) -> dict:
    db = get_db()
    expense = db["expenses"].find_one({"_id": ObjectId(expense_id), "trip_id": ObjectId(trip_id)})
    if not expense:
        raise AppError("Expense not found", "EXPENSE_NOT_FOUND", 404)

    if str(expense["created_by"]) != user_id:
        raise AppError("Only the creator can edit this expense", "FORBIDDEN", 403)

    allowed = ["title", "amount", "paid_by", "category", "date", "split_type", "split_among", "splits", "notes", "receipts"]
    set_fields = {}

    for k in allowed:
        if k in data:
            set_fields[k] = _ensure_dt(data[k]) if k == "date" else data[k]

    if "split_among" in set_fields:
        set_fields["split_among"] = [ObjectId(uid) for uid in set_fields["split_among"]]

    # Validate paid_by contributions against the final amount if either changes
    new_paid_by = set_fields.get("paid_by", expense.get("paid_by"))
    new_amount = set_fields.get("amount", expense["amount"])

    if isinstance(new_paid_by, dict):
        total_paid = 0
        normalized_paid_by = {}
        for uid_str, amt in new_paid_by.items():
            try:
                amt_val = int(amt)
            except (ValueError, TypeError):
                raise AppError("Payment amount must be a number", "INVALID_PAID_BY_AMOUNT", 400)
            if amt_val < 0:
                raise AppError("Payment amount cannot be negative", "INVALID_PAID_BY_AMOUNT", 400)
            total_paid += amt_val
            normalized_paid_by[str(uid_str)] = amt_val
        if total_paid != new_amount:
            raise AppError("Sum of paid amounts must equal the total expense amount", "INVALID_PAID_BY_TOTAL", 400)
        if "paid_by" in set_fields:
            set_fields["paid_by"] = normalized_paid_by
    elif "paid_by" in set_fields:
        set_fields["paid_by"] = str(set_fields["paid_by"])

    # Recalculate splits if any of: amount, split_type, or split_among changed
    if "amount" in set_fields or "split_type" in set_fields or "split_among" in set_fields:
        amount = set_fields.get("amount", expense["amount"])
        split_among = set_fields.get("split_among", [str(u) for u in expense["split_among"]])
        split_type = set_fields.get("split_type", expense.get("split_type", "equal"))

        if split_type == "equal":
            user_ids_str = [str(uid) for uid in split_among] if split_among and isinstance(split_among[0], ObjectId) else split_among
            set_fields["splits"] = compute_equal_splits(amount, user_ids_str)
        elif split_type == "custom":
            if "splits" not in set_fields:
                raise AppError("Custom splits required", "MISSING_SPLITS", 400)
            user_ids_str = [str(uid) for uid in split_among] if split_among and isinstance(split_among[0], ObjectId) else split_among
            set_fields["splits"] = compute_custom_splits(amount, user_ids_str, set_fields["splits"])

    if set_fields:
        db["expenses"].update_one({"_id": ObjectId(expense_id)}, {"$set": set_fields})

    create_activity(trip_id, user_id, "expense_updated", f"Updated expense {data.get('title', expense['title'])}")
    log_and_audit(user_id, "EXPENSE_UPDATED", f"Updated expense {data.get('title', expense['title'])}", trip_id)

    return get_expense(trip_id, expense_id)


def delete_expense(trip_id: str, expense_id: str, user_id: str):
    db = get_db()
    expense = db["expenses"].find_one({"_id": ObjectId(expense_id), "trip_id": ObjectId(trip_id)})
    if not expense:
        raise AppError("Expense not found", "EXPENSE_NOT_FOUND", 404)

    if str(expense["created_by"]) != user_id:
        raise AppError("Only the creator can delete this expense", "FORBIDDEN", 403)

    log_and_audit(user_id, "EXPENSE_DELETED", f"Deleted expense {expense['title']}", trip_id)

    db["expenses"].delete_one({"_id": ObjectId(expense_id)})

    create_activity(trip_id, user_id, "expense_deleted", f"Deleted expense {expense['title']}")
