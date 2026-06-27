from datetime import datetime, timezone
from bson.objectid import ObjectId
from config.database import get_db
from middleware.error_handler import AppError
from services.member_service import is_member, require_editor
from services.notification_service import create_notification


def create_comment(trip_id: str, data: dict, user_id: str) -> dict:
    db = get_db()

    require_editor(trip_id, user_id)

    target_type = data["target_type"]
    target_id = data["target_id"]

    collection_map = {"expense": "expenses", "memory": "memories", "itinerary_item": "itineraries"}
    target_collection = collection_map[target_type]
    target = db[target_collection].find_one({"_id": ObjectId(target_id)})
    if not target:
        raise AppError(f"{target_type} not found", "TARGET_NOT_FOUND", 404)

    comment = {
        "trip_id": ObjectId(trip_id),
        "target_type": target_type,
        "target_id": ObjectId(target_id),
        "author_id": ObjectId(user_id),
        "text": data["text"],
        "parent_comment_id": ObjectId(data["parent_comment_id"]) if data.get("parent_comment_id") else None,
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc),
    }

    result = db["comments"].insert_one(comment)
    comment["_id"] = str(result.inserted_id)
    comment["trip_id"] = trip_id
    comment["target_id"] = target_id
    comment["author_id"] = user_id
    comment["parent_comment_id"] = str(comment["parent_comment_id"]) if comment["parent_comment_id"] else None
    comment["created_at"] = comment["created_at"].replace(tzinfo=timezone.utc).isoformat()

    if target_type == "memory":
        uploader_id = target.get("uploader_id")
        if uploader_id and str(uploader_id) != user_id:
            author = db["users"].find_one({"_id": ObjectId(user_id)}, {"full_name": 1})
            author_name = author["full_name"] if author else "Someone"
            create_notification(str(uploader_id), trip_id, "comment", f"{author_name} commented on your memory")

    return comment


def get_comments(trip_id: str, target_type: str, target_id: str) -> list:
    db = get_db()
    comments = list(db["comments"].find({
        "trip_id": ObjectId(trip_id),
        "target_type": target_type,
        "target_id": ObjectId(target_id),
    }).sort("created_at", 1))

    results = []
    for c in comments:
        c["_id"] = str(c["_id"])
        c["trip_id"] = str(c["trip_id"])
        c["target_id"] = str(c["target_id"])
        c["author_id"] = str(c["author_id"])
        c["parent_comment_id"] = str(c["parent_comment_id"]) if c.get("parent_comment_id") else None
        c["created_at"] = c["created_at"].replace(tzinfo=timezone.utc).isoformat() if isinstance(c["created_at"], datetime) else c["created_at"]

        author = db["users"].find_one({"_id": ObjectId(c["author_id"])}, {"full_name": 1, "username": 1, "profile_photo_url": 1})
        c["author"] = {
            "_id": str(author["_id"]),
            "full_name": author["full_name"],
            "username": author["username"],
            "profile_photo_url": author.get("profile_photo_url", ""),
        } if author else None

        results.append(c)

    return results


def delete_comment(trip_id: str, comment_id: str, user_id: str):
    db = get_db()
    comment = db["comments"].find_one({"_id": ObjectId(comment_id), "trip_id": ObjectId(trip_id)})
    if not comment:
        raise AppError("Comment not found", "COMMENT_NOT_FOUND", 404)

    if str(comment["author_id"]) != user_id:
        raise AppError("Only the author can delete this comment", "FORBIDDEN", 403)

    has_replies = db["comments"].find_one({"parent_comment_id": ObjectId(comment_id)})

    if has_replies:
        db["comments"].update_one(
            {"_id": ObjectId(comment_id)},
            {"$set": {"is_deleted": True, "text": "[deleted]"}}
        )
    else:
        db["comments"].delete_one({"_id": ObjectId(comment_id)})
