from flask import Blueprint, request, g
from middleware.auth_middleware import require_auth
from middleware.config_enforcement import require_config_enabled
from models.settlement_model import PaySettlementSchema
from services.settlement_service import get_settlements, get_my_settlements, pay_settlement, get_balance_sheet, recalculate_settlements
from services.socket_service import emit_settlements_updated
from marshmallow import ValidationError

settlement_bp = Blueprint("settlements", __name__)


@settlement_bp.route("", methods=["GET"])
@require_auth
def list_settlements(trip_id):
    settlements = get_settlements(trip_id)
    return {"success": True, "data": {"settlements": settlements}}


@settlement_bp.route("/my", methods=["GET"])
@require_auth
def my_settlements(trip_id):
    result = get_my_settlements(trip_id, g.current_user["_id"])
    return {"success": True, "data": result}


@settlement_bp.route("/balances", methods=["GET"])
@require_auth
def balance_sheet(trip_id):
    sheet = get_balance_sheet(trip_id)
    return {"success": True, "data": {"balances": sheet}}


@settlement_bp.route("/<settlement_id>/pay", methods=["POST"])
@require_auth
@require_config_enabled("enableSettlements")
def pay(trip_id, settlement_id):
    data = request.get_json() or {}
    settlement = pay_settlement(trip_id, settlement_id, g.current_user["_id"], data)
    recalculate_settlements(trip_id)
    emit_settlements_updated(trip_id, settlement)
    return {"success": True, "data": {"settlement": settlement}, "message": "Payment marked"}



