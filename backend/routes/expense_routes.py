from flask import Blueprint, request, g
from middleware.auth_middleware import require_auth
from middleware.config_enforcement import require_config_enabled
from models.expense_model import CreateExpenseSchema, UpdateExpenseSchema
from services.expense_service import create_expense, get_trip_expenses, get_expense, update_expense, delete_expense
from services.settlement_service import recalculate_settlements
from services.socket_service import emit_expense_added, emit_expense_updated, emit_expense_deleted
from marshmallow import ValidationError

expense_bp = Blueprint("expenses", __name__)


@expense_bp.route("", methods=["POST"])
@require_auth
@require_config_enabled("enableExpenses")
def create(trip_id):
    schema = CreateExpenseSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as e:
        return {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Validation failed", "details": e.messages}}, 422

    expense = create_expense(trip_id, data, g.current_user["_id"])
    recalculate_settlements(trip_id)
    emit_expense_added(trip_id, expense)
    return {"success": True, "data": {"expense": expense}, "message": "Expense added"}, 201


@expense_bp.route("", methods=["GET"])
@require_auth
def list_expenses(trip_id):
    filters = {}
    if request.args.get("category"):
        filters["category"] = request.args["category"]
    if request.args.get("paid_by"):
        filters["paid_by"] = request.args["paid_by"]
    if request.args.get("date_from") and request.args.get("date_to"):
        filters["date_from"] = request.args["date_from"]
        filters["date_to"] = request.args["date_to"]

    expenses = get_trip_expenses(trip_id, filters)
    return {"success": True, "data": {"expenses": expenses}}


@expense_bp.route("/<expense_id>", methods=["GET"])
@require_auth
def get(trip_id, expense_id):
    expense = get_expense(trip_id, expense_id)
    return {"success": True, "data": {"expense": expense}}


@expense_bp.route("/<expense_id>", methods=["PATCH"])
@require_auth
@require_config_enabled("enableExpenses")
def update(trip_id, expense_id):
    schema = UpdateExpenseSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as e:
        return {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Validation failed", "details": e.messages}}, 422

    expense = update_expense(trip_id, expense_id, data, g.current_user["_id"])
    recalculate_settlements(trip_id)
    emit_expense_updated(trip_id, expense)
    return {"success": True, "data": {"expense": expense}, "message": "Expense updated"}


@expense_bp.route("/<expense_id>", methods=["DELETE"])
@require_auth
@require_config_enabled("enableExpenses")
def delete(trip_id, expense_id):
    delete_expense(trip_id, expense_id, g.current_user["_id"])
    recalculate_settlements(trip_id)
    emit_expense_deleted(trip_id, expense_id)
    return {"success": True, "data": {}, "message": "Expense deleted"}
