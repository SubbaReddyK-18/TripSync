from flask import Blueprint, request, g, send_file
from bson.objectid import ObjectId
from middleware.auth_middleware import require_auth
from middleware.error_handler import AppError
from services.admin_activity_service import get_activity_logs, get_action_types
from services.user_service import get_all_users, get_user_stats, update_user_role, update_user_status

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/activity-logs", methods=["GET"])
@require_auth
def activity_logs():
    if g.current_user.get("role") != "admin":
        raise AppError("Admin access required", "FORBIDDEN", 403)

    search = request.args.get("search", "")
    user_filter = request.args.get("userId", "")
    action_filter = request.args.get("actionType", "")
    date_from = request.args.get("dateFrom", "")
    date_to = request.args.get("dateTo", "")
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 50))

    result = get_activity_logs(
        search=search,
        user_filter=user_filter if user_filter else None,
        action_filter=action_filter if action_filter else None,
        date_from=date_from if date_from else None,
        date_to=date_to if date_to else None,
        page=page,
        per_page=per_page,
    )
    return {"success": True, "data": result}


@admin_bp.route("/activity-logs/action-types", methods=["GET"])
@require_auth
def list_action_types():
    if g.current_user.get("role") != "admin":
        raise AppError("Admin access required", "FORBIDDEN", 403)
    return {"success": True, "data": {"action_types": get_action_types()}}


@admin_bp.route("/analytics", methods=["GET"])
@require_auth
def analytics():
    if g.current_user.get("role") != "admin":
        raise AppError("Admin access required", "FORBIDDEN", 403)

    range_key = request.args.get("range", "all")
    valid_ranges = {"day", "week", "month", "year", "all"}
    if range_key not in valid_ranges:
        range_key = "all"

    from services.admin_analytics_service import get_platform_analytics
    data = get_platform_analytics(range_key)
    return {"success": True, "data": data}


@admin_bp.route("/analytics/export", methods=["GET"])
@require_auth
def export_analytics():
    if g.current_user.get("role") != "admin":
        raise AppError("Admin access required", "FORBIDDEN", 403)

    range_key = request.args.get("range", "all")
    fmt = request.args.get("format", "pdf")
    valid_ranges = {"day", "week", "month", "year", "all"}
    valid_formats = {"pdf", "csv", "xlsx"}
    if range_key not in valid_ranges:
        range_key = "all"
    if fmt not in valid_formats:
        fmt = "pdf"

    from services.admin_analytics_service import get_platform_analytics
    from services.export_service import export_analytics as do_export
    data = get_platform_analytics(range_key)
    buf, mimetype, filename = do_export(data, range_key, fmt)
    return send_file(buf, mimetype=mimetype, as_attachment=True, download_name=filename)


@admin_bp.route("/users", methods=["GET"])
@require_auth
def users():
    if g.current_user.get("role") != "admin":
        raise AppError("Admin access required", "FORBIDDEN", 403)

    from services.user_service import get_all_users
    result = get_all_users()
    return {"success": True, "data": result}


@admin_bp.route("/users/<user_id>/stats", methods=["GET"])
@require_auth
def user_stats(user_id):
    if g.current_user.get("role") != "admin":
        raise AppError("Admin access required", "FORBIDDEN", 403)
    stats = get_user_stats(user_id)
    return {"success": True, "data": stats}


@admin_bp.route("/users/<user_id>/role", methods=["PATCH"])
@require_auth
def change_user_role(user_id):
    if g.current_user.get("role") != "admin":
        raise AppError("Admin access required", "FORBIDDEN", 403)
    data = request.get_json() or {}
    new_role = data.get("role")
    if not new_role:
        raise AppError("Role is required", "MISSING_ROLE", 400)
    update_user_role(user_id, new_role)
    return {"success": True, "data": {}, "message": f"User role updated to {new_role}"}


@admin_bp.route("/users/<user_id>/status", methods=["PATCH"])
@require_auth
def toggle_user_status(user_id):
    if g.current_user.get("role") != "admin":
        raise AppError("Admin access required", "FORBIDDEN", 403)
    data = request.get_json() or {}
    is_active = data.get("is_active")
    if is_active is None:
        raise AppError("is_active is required", "MISSING_STATUS", 400)
    update_user_status(user_id, is_active)
    return {"success": True, "data": {}, "message": f"User {'activated' if is_active else 'deactivated'}"}


@admin_bp.route("/activity-logs/export", methods=["GET"])
@require_auth
def export_activity_logs():
    if g.current_user.get("role") != "admin":
        raise AppError("Admin access required", "FORBIDDEN", 403)

    fmt = request.args.get("format", "csv")
    valid_formats = {"pdf", "csv", "xlsx"}
    if fmt not in valid_formats:
        fmt = "csv"

    search = request.args.get("search", "")
    user_filter = request.args.get("userId", "")
    action_filter = request.args.get("actionType", "")
    date_from = request.args.get("dateFrom", "")
    date_to = request.args.get("dateTo", "")

    from services.admin_activity_service import get_activity_logs
    from services.export_service import export_logs
    result = get_activity_logs(
        search=search,
        user_filter=user_filter if user_filter else None,
        action_filter=action_filter if action_filter else None,
        date_from=date_from if date_from else None,
        date_to=date_to if date_to else None,
        page=1,
        per_page=10000,
    )
    logs = result.get("logs", [])
    buf, mimetype, filename = export_logs(logs, fmt)
    return send_file(buf, mimetype=mimetype, as_attachment=True, download_name=filename)


@admin_bp.route("/system-config", methods=["GET"])
@require_auth
def get_config():
    if g.current_user.get("role") != "admin":
        raise AppError("Admin access required", "FORBIDDEN", 403)

    from services.admin_config_service import get_system_config
    config = get_system_config()
    return {"success": True, "data": config}


@admin_bp.route("/system-config", methods=["PUT"])
@require_auth
def update_config():
    if g.current_user.get("role") != "admin":
        raise AppError("Admin access required", "FORBIDDEN", 403)

    from services.admin_config_service import update_system_config
    data = request.get_json() or {}
    config = update_system_config(data)
    return {"success": True, "data": config, "message": "Configuration updated"}
