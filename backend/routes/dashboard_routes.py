from flask import Blueprint, request, g
from middleware.auth_middleware import require_auth
from services.dashboard_service import (
    get_overview,
    get_dashboard_expenses,
    get_dashboard_settlements,
    get_dashboard_budget,
)
from services.activity_service import get_user_activity_feed

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/overview", methods=["GET"])
@require_auth
def overview():
    range_type = request.args.get("range", "month")
    start = request.args.get("start")
    end = request.args.get("end")
    data = get_overview(g.current_user["_id"], range_type, start, end)
    return {"success": True, "data": data}


@dashboard_bp.route("/expenses", methods=["GET"])
@require_auth
def expenses():
    range_type = request.args.get("range", "month")
    start = request.args.get("start")
    end = request.args.get("end")
    limit = int(request.args.get("limit", 20))
    data = get_dashboard_expenses(g.current_user["_id"], range_type, start, end, limit)
    return {"success": True, "data": {"expenses": data}}


@dashboard_bp.route("/settlements", methods=["GET"])
@require_auth
def settlements():
    data = get_dashboard_settlements(g.current_user["_id"])
    return {"success": True, "data": data}


@dashboard_bp.route("/budget", methods=["GET"])
@require_auth
def budget():
    data = get_dashboard_budget(g.current_user["_id"])
    return {"success": True, "data": data}


@dashboard_bp.route("/activity", methods=["GET"])
@require_auth
def activity():
    limit = int(request.args.get("limit", 10))
    days_arg = request.args.get("days")
    days = int(days_arg) if days_arg and days_arg != "all" else 7
    if days_arg == "all":
        days = None
    data = get_user_activity_feed(str(g.current_user["_id"]), limit=limit, days=days)
    return {"success": True, "data": {"activities": data}}
