from datetime import datetime, timezone
from bson.objectid import ObjectId
from config.database import get_db
from middleware.error_handler import AppError
from services.activity_service import create_activity
from services.member_service import is_member
from services.notification_service import create_notification
from services.trip_service import _compute_trip_status
from services.audit_helper import log_and_audit


ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "video/mp4", "video/webm", "video/quicktime",
}


def create_memory(trip_id: str, data: dict, user_id: str) -> dict:
    db = get_db()

    if not is_member(trip_id, user_id):
        raise AppError("Not a member of this trip", "NOT_MEMBER", 403)

    trip = db["trips"].find_one({"_id": ObjectId(trip_id)})
    if trip and _compute_trip_status(trip) == "planning":
        raise AppError("Cannot add memories to upcoming trips. Memories can only be added during or after the trip.", "TRIP_NOT_ACTIVE", 400)

    memory = {
        "trip_id": ObjectId(trip_id),
        "cloudinary_url": data["cloudinary_url"],
        "cloudinary_public_id": data["cloudinary_public_id"],
        "file_type": data["file_type"],
        "caption": data.get("caption", ""),
        "tags": data.get("tags", []),
        "uploader_id": ObjectId(user_id),
        "upload_date": datetime.now(timezone.utc),
    }

    result = db["memories"].insert_one(memory)
    memory["_id"] = str(result.inserted_id)
    memory["trip_id"] = trip_id
    memory["uploader_id"] = user_id
    memory["upload_date"] = memory["upload_date"].isoformat()

    create_activity(trip_id, user_id, "memory_added", "Added a memory")
    log_and_audit(user_id, "MEMORY_ADDED", "Uploaded a memory", trip_id)

    members = list(db["members"].find({"trip_id": ObjectId(trip_id), "status": "active"}))
    for m in members:
        if str(m["user_id"]) != user_id:
            create_notification(str(m["user_id"]), trip_id, "memory_added", f"New memory added to {trip['title']}")

    return memory


def get_trip_memories(trip_id: str) -> list:
    db = get_db()
    memories = list(db["memories"].find({"trip_id": ObjectId(trip_id)}).sort("upload_date", -1))
    for m in memories:
        m["_id"] = str(m["_id"])
        m["trip_id"] = str(m["trip_id"])
        m["uploader_id"] = str(m["uploader_id"])
        uploader = db["users"].find_one({"_id": ObjectId(m["uploader_id"])}, {"full_name": 1, "username": 1, "profile_photo_url": 1})
        m["uploader"] = {
            "_id": str(uploader["_id"]),
            "full_name": uploader["full_name"],
            "username": uploader["username"],
            "profile_photo_url": uploader.get("profile_photo_url", ""),
        } if uploader else None
    return memories


def get_memory(trip_id: str, memory_id: str) -> dict:
    db = get_db()
    memory = db["memories"].find_one({"_id": ObjectId(memory_id), "trip_id": ObjectId(trip_id)})
    if not memory:
        raise AppError("Memory not found", "MEMORY_NOT_FOUND", 404)

    memory["_id"] = str(memory["_id"])
    memory["trip_id"] = str(memory["trip_id"])
    memory["uploader_id"] = str(memory["uploader_id"])
    return memory


def update_memory(trip_id: str, memory_id: str, data: dict, user_id: str) -> dict:
    db = get_db()
    memory = db["memories"].find_one({"_id": ObjectId(memory_id), "trip_id": ObjectId(trip_id)})
    if not memory:
        raise AppError("Memory not found", "MEMORY_NOT_FOUND", 404)

    if str(memory["uploader_id"]) != user_id:
        raise AppError("Only the uploader can edit this memory", "FORBIDDEN", 403)

    allowed = ["caption", "tags"]
    set_fields = {k: v for k, v in data.items() if k in allowed and v is not None}

    if set_fields:
        db["memories"].update_one({"_id": ObjectId(memory_id)}, {"$set": set_fields})

    return get_memory(trip_id, memory_id)


def delete_memory(trip_id: str, memory_id: str, user_id: str):
    db = get_db()
    memory = db["memories"].find_one({"_id": ObjectId(memory_id), "trip_id": ObjectId(trip_id)})
    if not memory:
        raise AppError("Memory not found", "MEMORY_NOT_FOUND", 404)

    if str(memory["uploader_id"]) != user_id:
        raise AppError("Only the uploader can delete this memory", "FORBIDDEN", 403)

    from services.cloudinary_service import delete_file
    try:
        delete_file(memory["cloudinary_public_id"])
    except Exception:
        pass

    log_and_audit(user_id, "MEMORY_DELETED", f"Deleted memory {memory.get('caption', '')}", trip_id)

    db["memories"].delete_one({"_id": ObjectId(memory_id)})
