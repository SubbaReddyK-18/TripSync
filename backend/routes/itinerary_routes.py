from flask import Blueprint, request, g
from middleware.auth_middleware import require_auth
from models.itinerary_model import CreateItineraryItemSchema, UpdateItineraryItemSchema
from services.itinerary_service import create_item, get_trip_itinerary, get_item, update_item, delete_item
from services.socket_service import emit_itinerary_added, emit_itinerary_deleted
from marshmallow import ValidationError

itinerary_bp = Blueprint("itinerary", __name__)


@itinerary_bp.route("", methods=["POST"])
@require_auth
def create(trip_id):
    schema = CreateItineraryItemSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as e:
        return {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Validation failed", "details": e.messages}}, 422

    item = create_item(trip_id, data, g.current_user["_id"])
    emit_itinerary_added(trip_id, item)
    return {"success": True, "data": {"item": item}, "message": "Itinerary item added"}, 201


@itinerary_bp.route("", methods=["GET"])
@require_auth
def list_itinerary(trip_id):
    items = get_trip_itinerary(trip_id)
    return {"success": True, "data": {"items": items}}


@itinerary_bp.route("/<item_id>", methods=["GET"])
@require_auth
def get(trip_id, item_id):
    item = get_item(trip_id, item_id)
    return {"success": True, "data": {"item": item}}


@itinerary_bp.route("/<item_id>", methods=["PATCH"])
@require_auth
def update(trip_id, item_id):
    schema = UpdateItineraryItemSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as e:
        return {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Validation failed", "details": e.messages}}, 422

    item = update_item(trip_id, item_id, data, g.current_user["_id"])
    return {"success": True, "data": {"item": item}, "message": "Itinerary item updated"}


@itinerary_bp.route("/<item_id>", methods=["DELETE"])
@require_auth
def delete(trip_id, item_id):
    delete_item(trip_id, item_id, g.current_user["_id"])
    emit_itinerary_deleted(trip_id, item_id)
    return {"success": True, "data": {}, "message": "Itinerary item deleted"}
