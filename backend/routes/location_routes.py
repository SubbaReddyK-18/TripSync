from flask import Blueprint, request, g
from middleware.auth_middleware import require_auth
from middleware.config_enforcement import require_config_enabled
from models.location_model import CreateLocationSchema, UpdateLocationSchema
from services.location_service import (
    create_location, get_trip_locations, get_location,
    update_location, delete_location,
)
from services.socket_service import emit_location_added, emit_location_deleted
from marshmallow import ValidationError

location_bp = Blueprint("locations", __name__)


@location_bp.route("", methods=["POST"])
@require_auth
@require_config_enabled("enablePlaces")
def create(trip_id):
    schema = CreateLocationSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as e:
        return {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Validation failed", "details": e.messages}}, 422

    location = create_location(trip_id, data, g.current_user["_id"])
    emit_location_added(trip_id, location)
    return {"success": True, "data": {"location": location}, "message": "Location added"}, 201


@location_bp.route("", methods=["GET"])
@require_auth
def list_locations(trip_id):
    locations = get_trip_locations(trip_id)
    return {"success": True, "data": {"locations": locations}}


@location_bp.route("/<location_id>", methods=["GET"])
@require_auth
def get(trip_id, location_id):
    location = get_location(trip_id, location_id)
    return {"success": True, "data": {"location": location}}


@location_bp.route("/<location_id>", methods=["PATCH"])
@require_auth
@require_config_enabled("enablePlaces")
def update(trip_id, location_id):
    schema = UpdateLocationSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as e:
        return {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Validation failed", "details": e.messages}}, 422

    location = update_location(trip_id, location_id, data, g.current_user["_id"])
    return {"success": True, "data": {"location": location}, "message": "Location updated"}


@location_bp.route("/<location_id>", methods=["DELETE"])
@require_auth
@require_config_enabled("enablePlaces")
def delete(trip_id, location_id):
    delete_location(trip_id, location_id, g.current_user["_id"])
    emit_location_deleted(trip_id, location_id)
    return {"success": True, "data": {}, "message": "Location deleted"}
