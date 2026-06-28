from datetime import datetime, timezone
from bson.objectid import ObjectId
from config.database import get_db
from middleware.error_handler import AppError
from services.activity_service import create_activity
from services.audit_helper import log_and_audit


def _build_net_balances(trip_id: str, members: list) -> dict:
    db = get_db()
    expenses = db["expenses"].find({"trip_id": ObjectId(trip_id)})

    net = {str(m["user_id"]): 0 for m in members}

    for expense in expenses:
        expense_amount = int(round(expense.get("amount", 0)))
        payer_data = expense.get("paid_by")
        if isinstance(payer_data, dict):
            for payer_id, amount in payer_data.items():
                if payer_id not in net:
                    net[payer_id] = 0
                net[payer_id] += int(round(amount))
        else:
            payer_id = str(payer_data) if isinstance(payer_data, ObjectId) else payer_data
            if payer_id not in net:
                net[payer_id] = 0
            net[payer_id] += expense_amount

        for split in expense.get("splits", []):
            uid = str(split["user_id"]) if isinstance(split["user_id"], ObjectId) else split["user_id"]
            if uid not in net:
                net[uid] = 0
            net[uid] -= int(round(split.get("amount", 0)))

    # Subtract already-settled payments so they are not re-generated as pending
    settled = db["settlements"].find({"trip_id": ObjectId(trip_id), "status": "settled"})
    for s in settled:
        from_id = str(s["from_user_id"]) if isinstance(s["from_user_id"], ObjectId) else s["from_user_id"]
        to_id = str(s["to_user_id"]) if isinstance(s["to_user_id"], ObjectId) else s["to_user_id"]
        s_amount = int(round(s.get("amount", 0)))
        if from_id not in net:
            net[from_id] = 0
        if to_id not in net:
            net[to_id] = 0
        # Payer of settlement reduced their debt (net goes up for them)
        net[from_id] += s_amount
        # Receiver of settlement reduced their credit (net goes down for them)
        net[to_id] -= s_amount

    # Sanitize final net dictionary values to be pure integers
    for uid in list(net.keys()):
        net[uid] = int(round(net[uid]))

    return net


def _minimize_settlements(net: dict) -> list:
    creditors = sorted([(uid, bal) for uid, bal in net.items() if bal > 0], key=lambda x: -x[1])
    debtors = sorted([(uid, bal) for uid, bal in net.items() if bal < 0], key=lambda x: x[1])

    transactions = []
    ci, di = 0, 0

    while ci < len(creditors) and di < len(debtors):
        c_id, c_bal = creditors[ci]
        d_id, d_bal = debtors[di]

        amount = min(c_bal, abs(d_bal))

        transactions.append({
            "from_user_id": d_id,
            "to_user_id": c_id,
            "amount": amount,
        })

        creditors[ci] = (c_id, c_bal - amount)
        debtors[di] = (d_id, d_bal + amount)

        if creditors[ci][1] == 0:
            ci += 1
        if debtors[di][1] == 0:
            di += 1

    return transactions


def _clear_pending_settlements(trip_id: str):
    """Only clear PENDING settlements; preserve settled (paid) history."""
    db = get_db()
    db["settlements"].delete_many({"trip_id": ObjectId(trip_id), "status": "pending"})


def get_balance_sheet(trip_id: str) -> list:
    db = get_db()
    members = list(db["members"].find({"trip_id": ObjectId(trip_id), "status": "active"}))
    if not members:
        return []

    net = _build_net_balances(trip_id, members)

    user_ids = [m["user_id"] for m in members]
    users = list(db["users"].find(
        {"_id": {"$in": list(set(user_ids))}},
        {"full_name": 1, "username": 1}
    ))
    user_map = {str(u["_id"]): u for u in users}

    balance_sheet = []
    for m in members:
        uid = str(m["user_id"])
        user = user_map.get(uid)
        balance_sheet.append({
            "user_id": uid,
            "full_name": user["full_name"] if user else "Unknown",
            "username": user["username"] if user else "unknown",
            "balance": net.get(uid, 0),
        })

    balance_sheet.sort(key=lambda x: -x["balance"])
    return balance_sheet


def recalculate_settlements(trip_id: str):
    db = get_db()
    members = list(db["members"].find({"trip_id": ObjectId(trip_id), "status": "active"}))
    if not members:
        return []

    # Build net balances first (accounts for settled payments), then clear pending only
    net = _build_net_balances(trip_id, members)
    transactions = _minimize_settlements(net)

    _clear_pending_settlements(trip_id)

    now = datetime.now(timezone.utc)
    results = []
    for t in transactions:
        settlement = {
            "trip_id": ObjectId(trip_id),
            "from_user_id": ObjectId(t["from_user_id"]),
            "to_user_id": ObjectId(t["to_user_id"]),
            "amount": t["amount"],
            "currency": _get_trip_currency(trip_id),
            "status": "pending",
            "payment_method": None,
            "payment_note": None,
            "paid_at": None,
            "confirmed_at": None,
            "created_at": now,
        }
        result = db["settlements"].insert_one(settlement)
        settlement["_id"] = str(result.inserted_id)
        settlement["trip_id"] = trip_id
        settlement["from_user_id"] = t["from_user_id"]
        settlement["to_user_id"] = t["to_user_id"]
        results.append(settlement)

    return results


def _get_trip_currency(trip_id: str) -> str:
    db = get_db()
    trip = db["trips"].find_one({"_id": ObjectId(trip_id)}, {"currency": 1})
    return trip["currency"] if trip else "INR"


def _serialize_timestamps(s: dict) -> dict:
    for field in ("created_at", "paid_at", "confirmed_at"):
        val = s.get(field)
        if isinstance(val, datetime):
            if val.tzinfo is None:
                val = val.replace(tzinfo=timezone.utc)
            s[field] = val.isoformat()
        elif val is None:
            s[field] = None
    return s


def get_settlements(trip_id: str) -> list:
    db = get_db()
    settlements = list(db["settlements"].find({"trip_id": ObjectId(trip_id)}).sort("status", 1))
    results = []
    for s in settlements:
        s["_id"] = str(s["_id"])
        s["trip_id"] = str(s["trip_id"])
        s["from_user_id"] = str(s["from_user_id"])
        s["to_user_id"] = str(s["to_user_id"])
        _serialize_timestamps(s)
        results.append(s)
    return results


def get_my_settlements(trip_id: str, user_id: str) -> dict:
    db = get_db()
    owed = list(db["settlements"].find({
        "trip_id": ObjectId(trip_id), "from_user_id": ObjectId(user_id)
    }).sort("status", 1))

    owed_to_me = list(db["settlements"].find({
        "trip_id": ObjectId(trip_id), "to_user_id": ObjectId(user_id)
    }).sort("status", 1))

    def serialize(s):
        s["_id"] = str(s["_id"])
        s["trip_id"] = str(s["trip_id"])
        s["from_user_id"] = str(s["from_user_id"])
        s["to_user_id"] = str(s["to_user_id"])
        _serialize_timestamps(s)
        return s

    return {
        "i_owe": [serialize(s) for s in owed],
        "owed_to_me": [serialize(s) for s in owed_to_me],
    }


def pay_settlement(trip_id: str, settlement_id: str, user_id: str, data: dict = None) -> dict:
    db = get_db()
    settlement = db["settlements"].find_one({"_id": ObjectId(settlement_id), "trip_id": ObjectId(trip_id)})
    if not settlement:
        raise AppError("Settlement not found", "SETTLEMENT_NOT_FOUND", 404)

    if str(settlement["from_user_id"]) != user_id:
        raise AppError("Only the payer can mark as paid", "FORBIDDEN", 403)

    if settlement["status"] != "pending":
        raise AppError("Settlement is not pending", "INVALID_STATUS", 400)

    updates = {
        "status": "settled",
        "paid_at": datetime.now(timezone.utc),
        "payment_method": data.get("payment_method") if data else None,
        "payment_note": data.get("payment_note") if data else None,
    }

    db["settlements"].update_one({"_id": ObjectId(settlement_id)}, {"$set": updates})

    create_activity(trip_id, user_id, "settlement_paid", "Settled a payment")
    log_and_audit(user_id, "SETTLEMENT_COMPLETED", f"Settled payment of ₹{settlement.get('amount', 0)}", trip_id)

    settlement.update(updates)
    settlement["_id"] = str(settlement["_id"])
    settlement["trip_id"] = trip_id
    settlement["from_user_id"] = str(settlement["from_user_id"])
    settlement["to_user_id"] = str(settlement["to_user_id"])
    _serialize_timestamps(settlement)

    return settlement



