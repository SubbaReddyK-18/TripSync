from flask import Blueprint, request, g
from middleware.auth_middleware import require_auth
from models.budget_model import CreateBudgetSchema, UpdateBudgetSchema
from services.budget_service import create_budget, get_budget, update_budget, get_budget_analytics, get_budget_history
from services.socket_service import emit_budget_updated
from marshmallow import ValidationError

budget_bp = Blueprint("budget", __name__)


@budget_bp.route("", methods=["POST"])
@require_auth
def create(trip_id):
    schema = CreateBudgetSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as e:
        return {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Validation failed", "details": e.messages}}, 422

    budget = create_budget(trip_id, data, g.current_user["_id"])
    emit_budget_updated(trip_id, budget)
    return {"success": True, "data": {"budget": budget}, "message": "Budget created"}, 201


@budget_bp.route("", methods=["GET"])
@require_auth
def get(trip_id):
    budget = get_budget(trip_id)
    return {"success": True, "data": {"budget": budget}}


@budget_bp.route("", methods=["PATCH"])
@require_auth
def update(trip_id):
    schema = UpdateBudgetSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as e:
        return {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Validation failed", "details": e.messages}}, 422

    budget = update_budget(trip_id, data, g.current_user["_id"])
    emit_budget_updated(trip_id, budget)
    return {"success": True, "data": {"budget": budget}, "message": "Budget updated"}


@budget_bp.route("/history", methods=["GET"])
@require_auth
def history(trip_id):
    history_data = get_budget_history(trip_id)
    return {"success": True, "data": {"history": history_data}}


@budget_bp.route("/analytics", methods=["GET"])
@require_auth
def analytics(trip_id):
    analytics_data = get_budget_analytics(trip_id)
    return {"success": True, "data": analytics_data}
