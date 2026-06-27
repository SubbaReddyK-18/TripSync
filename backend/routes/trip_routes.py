from flask import Blueprint, request, g
from middleware.auth_middleware import require_auth
from middleware.config_enforcement import require_config_enabled
from models.trip_model import CreateTripSchema, UpdateTripSchema
from models.member_model import UpdateMemberRoleSchema, InviteMemberSchema
from services.trip_service import (
    create_trip, get_user_trips, get_trip, update_trip, delete_trip,
    join_trip, regenerate_invite_code, get_trip_members, update_member_role, remove_member,
)
from services.activity_service import get_activity_feed
from services.settlement_service import recalculate_settlements
from services.socket_service import emit_member_joined, emit_member_left
from marshmallow import ValidationError

trip_bp = Blueprint("trips", __name__)


@trip_bp.route("", methods=["POST"])
@require_auth
@require_config_enabled("enableTrips")
def create():
    schema = CreateTripSchema()
    json_data = request.get_json()
    if not json_data:
        return {"success": False, "error": {"code": "INVALID_JSON", "message": "Request body must be valid JSON"}}, 400

    try:
        data = schema.load(json_data)
    except ValidationError as e:
        field_errors = []
        for field, errors in e.messages.items():
            if isinstance(errors, list):
                field_errors.append(f"{field}: {', '.join(errors)}")
            else:
                field_errors.append(f"{field}: {errors}")
        message = "; ".join(field_errors) if field_errors else "Validation failed"
        return {"success": False, "error": {"code": "VALIDATION_ERROR", "message": message, "details": e.messages}}, 422

    trip = create_trip(data, g.current_user["_id"])
    return {"success": True, "data": {"trip": trip}, "message": "Trip created"}, 201


@trip_bp.route("", methods=["GET"])
@require_auth
def list_trips():
    trips = get_user_trips(g.current_user["_id"])
    return {"success": True, "data": {"trips": trips}}


@trip_bp.route("/<trip_id>", methods=["GET"])
@require_auth
def get(trip_id):
    trip = get_trip(trip_id)
    return {"success": True, "data": {"trip": trip}}


@trip_bp.route("/<trip_id>", methods=["PATCH"])
@require_auth
def update(trip_id):
    schema = UpdateTripSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as e:
        return {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Validation failed", "details": e.messages}}, 422

    trip = update_trip(trip_id, data, g.current_user["_id"])
    return {"success": True, "data": {"trip": trip}, "message": "Trip updated"}


@trip_bp.route("/<trip_id>", methods=["DELETE"])
@require_auth
def delete(trip_id):
    delete_trip(trip_id, g.current_user["_id"])
    return {"success": True, "data": {}, "message": "Trip deleted"}


@trip_bp.route("/<trip_id>/join", methods=["POST"])
@require_auth
def join(trip_id):
    trip = get_trip(trip_id)
    result = join_trip(trip["invite_code"], g.current_user["_id"])
    recalculate_settlements(trip_id)
    emit_member_joined(trip_id, {"user_id": g.current_user["_id"]})
    return {"success": True, "data": {"trip": result}, "message": "Joined trip successfully"}


@trip_bp.route("/join-by-code", methods=["POST"])
@require_auth
def join_by_code():
    data = request.get_json() or {}
    invite_code = data.get("invite_code", "").strip().upper()
    if not invite_code:
        return {"success": False, "error": {"code": "MISSING_CODE", "message": "Invite code is required"}}, 400

    result = join_trip(invite_code, g.current_user["_id"])
    recalculate_settlements(str(result["_id"]))
    emit_member_joined(str(result["_id"]), {"user_id": g.current_user["_id"]})
    return {"success": True, "data": {"trip": result}, "message": "Joined trip successfully"}


@trip_bp.route("/<trip_id>/invite", methods=["POST"])
@require_auth
def invite(trip_id):
    schema = InviteMemberSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as e:
        return {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Validation failed", "details": e.messages}}, 422

    from config.database import get_db
    db = get_db()
    invited_user = db["users"].find_one({"email": data["email"]})
    if not invited_user:
        return {"success": False, "error": {"code": "USER_NOT_FOUND", "message": "No user with that email"}}, 404

    result = join_trip(get_trip(trip_id)["invite_code"], str(invited_user["_id"]))
    recalculate_settlements(trip_id)

    from services.notification_service import create_notification
    create_notification(
        str(invited_user["_id"]), trip_id, "invite",
        f"You've been invited to join {result['title']}"
    )
    emit_member_joined(trip_id, {"user_id": str(invited_user["_id"])})

    return {"success": True, "data": {}, "message": "Invitation sent"}


@trip_bp.route("/<trip_id>/invite_code/regenerate", methods=["POST"])
@require_auth
def regenerate(trip_id):
    new_code = regenerate_invite_code(trip_id, g.current_user["_id"])
    return {"success": True, "data": {"invite_code": new_code}, "message": "Invite code regenerated"}


@trip_bp.route("/<trip_id>/members", methods=["GET"])
@require_auth
def members(trip_id):
    members_list = get_trip_members(trip_id)
    return {"success": True, "data": {"members": members_list}}


@trip_bp.route("/<trip_id>/members/<user_id>", methods=["PATCH"])
@require_auth
def update_member(trip_id, user_id):
    schema = UpdateMemberRoleSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as e:
        return {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Validation failed", "details": e.messages}}, 422

    update_member_role(trip_id, user_id, data["role"], g.current_user["_id"])
    return {"success": True, "data": {}, "message": "Member role updated"}


@trip_bp.route("/<trip_id>/members/<user_id>", methods=["DELETE"])
@require_auth
def remove_member_route(trip_id, user_id):
    remove_member(trip_id, user_id, g.current_user["_id"])
    recalculate_settlements(trip_id)
    emit_member_left(trip_id, user_id)
    return {"success": True, "data": {}, "message": "Member removed"}


@trip_bp.route("/<trip_id>/activity", methods=["GET"])
@require_auth
def activity(trip_id):
    limit = int(request.args.get("limit", 50))
    days = int(request.args.get("days", 7))
    activities = get_activity_feed(trip_id, limit=limit, days=days)
    return {"success": True, "data": {"activities": activities}}
