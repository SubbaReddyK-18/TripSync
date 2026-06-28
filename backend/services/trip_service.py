import secrets
import string
from datetime import datetime, timezone, date as date_cls, timedelta
from bson.objectid import ObjectId
from config.database import get_db
from middleware.error_handler import AppError
from services.activity_service import create_activity
from services.audit_helper import log_and_audit, get_user_name


def _compute_trip_status(trip: dict) -> str:
    if trip.get("status") == "cancelled":
        return "cancelled"
    # Use IST (UTC+5:30) date for status calculations
    ist_now = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
    now = ist_now.date()
    start = trip.get("start_date")
    end = trip.get("end_date")
    if isinstance(start, datetime):
        start = start.date()
    if isinstance(end, datetime):
        end = end.date()
    if isinstance(start, date_cls) and isinstance(end, date_cls):
        if now < start:
            return "planning"
        elif now > end:
            return "completed"
        else:
            return "ongoing"
    return trip.get("status", "planning")


def _ensure_dt(val):
    return datetime.combine(val, datetime.min.time()) if not isinstance(val, datetime) else val


def _generate_invite_code(length=8):
    chars = string.ascii_uppercase + string.digits
    db = get_db()
    while True:
        code = "".join(secrets.choice(chars) for _ in range(length))
        if not db["trips"].find_one({"invite_code": code}):
            return code


def create_trip(data: dict, admin_id: str) -> dict:
    db = get_db()
    invite_code = _generate_invite_code()

    trip = {
        "title": data["title"],
        "description": data.get("description", ""),
        "destination": data["destination"],
        "start_date": _ensure_dt(data["start_date"]),
        "end_date": _ensure_dt(data["end_date"]),
        "currency": data.get("currency", "INR"),
        "invite_code": invite_code,
        "admin_id": ObjectId(admin_id),
        "created_at": datetime.now(timezone.utc),
    }
    trip["status"] = _compute_trip_status(trip)

    result = db["trips"].insert_one(trip)

    db["members"].insert_one({
        "trip_id": result.inserted_id,
        "user_id": ObjectId(admin_id),
        "role": "admin",
        "joined_at": datetime.now(timezone.utc),
        "invited_by": None,
        "status": "active",
    })

    trip["_id"] = str(result.inserted_id)
    trip["admin_id"] = str(trip["admin_id"])

    create_activity(str(result.inserted_id), admin_id, "trip_created", f"Created trip {data['title']}")
    log_and_audit(admin_id, "TRIP_CREATED", f"Created trip {data['title']}", str(result.inserted_id), data['title'])

    return trip


def get_user_trips(user_id: str) -> list:
    db = get_db()
    memberships = db["members"].find({"user_id": ObjectId(user_id), "status": "active"})
    trip_ids = [m["trip_id"] for m in memberships]

    if not trip_ids:
        return []

    trips = list(db["trips"].find({"_id": {"$in": trip_ids}}).sort("created_at", -1))

    member_counts = {
        str(r["_id"]): r["count"]
        for r in db["members"].aggregate([
            {"$match": {"trip_id": {"$in": trip_ids}, "status": "active"}},
            {"$group": {"_id": "$trip_id", "count": {"$sum": 1}}}
        ])
    }

    expense_counts = {
        str(r["_id"]): r["count"]
        for r in db["expenses"].aggregate([
            {"$match": {"trip_id": {"$in": trip_ids}}},
            {"$group": {"_id": "$trip_id", "count": {"$sum": 1}}}
        ])
    }

    for t in trips:
        t["_id"] = str(t["_id"])
        t["admin_id"] = str(t["admin_id"])
        t["status"] = _compute_trip_status(t)
        t["member_count"] = member_counts.get(t["_id"], 0)
        t["expense_count"] = expense_counts.get(t["_id"], 0)

    return trips


def get_trip(trip_id: str) -> dict:
    db = get_db()
    trip = db["trips"].find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise AppError("Trip not found", "TRIP_NOT_FOUND", 404)

    trip["_id"] = str(trip["_id"])
    trip["admin_id"] = str(trip["admin_id"])
    trip["status"] = _compute_trip_status(trip)

    members = list(db["members"].find({"trip_id": ObjectId(trip_id), "status": "active"}))
    trip["member_count"] = len(members)
    trip["member_ids"] = [str(m["user_id"]) for m in members]

    return trip


def update_trip(trip_id: str, data: dict, user_id: str) -> dict:
    db = get_db()
    trip = db["trips"].find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise AppError("Trip not found", "TRIP_NOT_FOUND", 404)

    member = db["members"].find_one({"trip_id": ObjectId(trip_id), "user_id": ObjectId(user_id), "status": "active"})
    if not member or member["role"] not in ("admin",):
        raise AppError("Only admins can update trip details", "FORBIDDEN", 403)

    allowed = ["title", "description", "destination", "start_date", "end_date", "currency", "status"]
    set_fields = {}
    for k, v in data.items():
        if k in allowed and v is not None:
            if k in ("start_date", "end_date"):
                set_fields[k] = _ensure_dt(v)
            else:
                set_fields[k] = v

    if set_fields:
        if "status" not in set_fields and ("start_date" in set_fields or "end_date" in set_fields):
            temp_trip = {**trip, **set_fields}
            set_fields["status"] = _compute_trip_status(temp_trip)
        db["trips"].update_one({"_id": ObjectId(trip_id)}, {"$set": set_fields})

    log_and_audit(user_id, "TRIP_UPDATED", f"Updated trip {trip.get('title', '')}", trip_id, trip.get('title', ''))

    return get_trip(trip_id)


def delete_trip(trip_id: str, user_id: str):
    db = get_db()
    trip = db["trips"].find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise AppError("Trip not found", "TRIP_NOT_FOUND", 404)

    if str(trip["admin_id"]) != user_id:
        raise AppError("Only the trip admin can delete the trip", "FORBIDDEN", 403)

    log_and_audit(user_id, "TRIP_DELETED", f"Deleted trip {trip.get('title', '')}", trip_id, trip.get('title', ''))

    db["trips"].delete_one({"_id": ObjectId(trip_id)})
    db["members"].delete_many({"trip_id": ObjectId(trip_id)})
    db["expenses"].delete_many({"trip_id": ObjectId(trip_id)})
    db["settlements"].delete_many({"trip_id": ObjectId(trip_id)})
    db["budgets"].delete_many({"trip_id": ObjectId(trip_id)})
    db["itineraries"].delete_many({"trip_id": ObjectId(trip_id)})
    db["comments"].delete_many({"trip_id": ObjectId(trip_id)})
    db["activity_feed"].delete_many({"trip_id": ObjectId(trip_id)})


def join_trip(invite_code: str, user_id: str) -> dict:
    db = get_db()
    trip = db["trips"].find_one({"invite_code": invite_code})
    if not trip:
        raise AppError("Invalid invite code", "INVALID_INVITE_CODE", 404)

    existing = db["members"].find_one({
        "trip_id": trip["_id"],
        "user_id": ObjectId(user_id),
    })
    if existing:
        if existing["status"] == "active":
            raise AppError("Already a member of this trip", "ALREADY_MEMBER", 409)
        db["members"].update_one(
            {"_id": existing["_id"]},
            {"$set": {"status": "active", "joined_at": datetime.now(timezone.utc)}}
        )
    else:
        db["members"].insert_one({
            "trip_id": trip["_id"],
            "user_id": ObjectId(user_id),
            "role": "editor",
            "joined_at": datetime.now(timezone.utc),
            "invited_by": None,
            "status": "active",
        })

    trip["_id"] = str(trip["_id"])
    trip["admin_id"] = str(trip["admin_id"])

    create_activity(str(trip["_id"]), user_id, "member_joined", "Joined the trip")
    from services.audit_helper import update_last_active
    update_last_active(user_id)

    members_list = list(db["members"].find({"trip_id": trip["_id"], "status": "active"}))
    notifications = []
    for m in members_list:
        if str(m["user_id"]) != user_id:
            notifications.append({
                "recipient_id": m["user_id"],
                "trip_id": trip["_id"],
                "type": "member_joined",
                "message": f"New member joined {trip['title']}",
                "reference_id": None,
                "reference_type": None,
                "is_read": False,
                "created_at": datetime.now(timezone.utc),
            })
    if notifications:
        db["notifications"].insert_many(notifications)

    return trip


def regenerate_invite_code(trip_id: str, user_id: str) -> str:
    db = get_db()
    member = db["members"].find_one({"trip_id": ObjectId(trip_id), "user_id": ObjectId(user_id), "status": "active"})
    if not member or member["role"] not in ("admin",):
        raise AppError("Only admins can regenerate invite code", "FORBIDDEN", 403)

    new_code = _generate_invite_code()
    db["trips"].update_one({"_id": ObjectId(trip_id)}, {"$set": {"invite_code": new_code}})
    return new_code


def get_trip_members(trip_id: str) -> list:
    db = get_db()
    members = list(db["members"].find({"trip_id": ObjectId(trip_id), "status": "active"}))
    if not members:
        return []

    user_ids = [m["user_id"] for m in members]
    users = list(db["users"].find(
        {"_id": {"$in": user_ids}},
        {"password_hash": 0}
    ))
    user_map = {str(u["_id"]): u for u in users}

    results = []
    for m in members:
        uid = str(m["user_id"])
        user = user_map.get(uid)
        if user:
            user["_id"] = uid
            results.append({
                "user": user,
                "role": m["role"],
                "joined_at": m["joined_at"],
            })
    return results


def update_member_role(trip_id: str, target_user_id: str, role: str, requester_id: str):
    db = get_db()
    requester = db["members"].find_one({
        "trip_id": ObjectId(trip_id), "user_id": ObjectId(requester_id), "status": "active"
    })
    if not requester or requester["role"] != "admin":
        raise AppError("Only admins can change roles", "FORBIDDEN", 403)

    db["members"].update_one(
        {"trip_id": ObjectId(trip_id), "user_id": ObjectId(target_user_id)},
        {"$set": {"role": role}},
    )


def remove_member(trip_id: str, target_user_id: str, requester_id: str):
    db = get_db()
    requester = db["members"].find_one({
        "trip_id": ObjectId(trip_id), "user_id": ObjectId(requester_id), "status": "active"
    })
    if not requester or requester["role"] != "admin":
        raise AppError("Only admins can remove members", "FORBIDDEN", 403)

    if str(requester["user_id"]) == target_user_id:
        raise AppError("Cannot remove yourself as admin. Transfer admin first.", "FORBIDDEN", 403)

    db["members"].update_one(
        {"trip_id": ObjectId(trip_id), "user_id": ObjectId(target_user_id)},
        {"$set": {"status": "removed"}},
    )
