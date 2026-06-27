from flask import Blueprint, g
from middleware.auth_middleware import require_auth
from services.notification_service import get_notifications, mark_as_read, mark_all_as_read, get_unread_count

notification_bp = Blueprint("notifications", __name__)


@notification_bp.route("", methods=["GET"])
@require_auth
def list_notifications():
    notifications = get_notifications(g.current_user["_id"])
    return {"success": True, "data": {"notifications": notifications}}


@notification_bp.route("/<notification_id>/read", methods=["PATCH"])
@require_auth
def mark_read(notification_id):
    mark_as_read(notification_id, g.current_user["_id"])
    return {"success": True, "data": {}, "message": "Marked as read"}


@notification_bp.route("/read_all", methods=["PATCH"])
@require_auth
def mark_all_read():
    mark_all_as_read(g.current_user["_id"])
    return {"success": True, "data": {}, "message": "All marked as read"}


@notification_bp.route("/unread_count", methods=["GET"])
@require_auth
def unread_count():
    count = get_unread_count(g.current_user["_id"])
    return {"success": True, "data": {"unread_count": count}}
