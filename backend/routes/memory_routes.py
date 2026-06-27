from flask import Blueprint, request, g
from middleware.auth_middleware import require_auth
from middleware.config_enforcement import require_config_enabled
from models.memory_model import CreateMemorySchema, UpdateMemorySchema
from services.memory_service import create_memory, get_trip_memories, get_memory, update_memory, delete_memory
from services.socket_service import emit_memory_added, emit_memory_deleted
from marshmallow import ValidationError

memory_bp = Blueprint("memories", __name__)


@memory_bp.route("", methods=["POST"])
@require_auth
@require_config_enabled("enableMemories")
def create(trip_id):
    schema = CreateMemorySchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as e:
        return {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Validation failed", "details": e.messages}}, 422

    memory = create_memory(trip_id, data, g.current_user["_id"])
    emit_memory_added(trip_id, memory)
    return {"success": True, "data": {"memory": memory}, "message": "Memory uploaded"}, 201


@memory_bp.route("", methods=["GET"])
@require_auth
def list_memories(trip_id):
    memories = get_trip_memories(trip_id)
    return {"success": True, "data": {"memories": memories}}


@memory_bp.route("/<memory_id>", methods=["GET"])
@require_auth
def get(trip_id, memory_id):
    memory = get_memory(trip_id, memory_id)
    return {"success": True, "data": {"memory": memory}}


@memory_bp.route("/<memory_id>", methods=["PATCH"])
@require_auth
@require_config_enabled("enableMemories")
def update(trip_id, memory_id):
    schema = UpdateMemorySchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as e:
        return {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Validation failed", "details": e.messages}}, 422

    memory = update_memory(trip_id, memory_id, data, g.current_user["_id"])
    return {"success": True, "data": {"memory": memory}, "message": "Memory updated"}


@memory_bp.route("/<memory_id>", methods=["DELETE"])
@require_auth
@require_config_enabled("enableMemories")
def delete(trip_id, memory_id):
    delete_memory(trip_id, memory_id, g.current_user["_id"])
    emit_memory_deleted(trip_id, memory_id)
    return {"success": True, "data": {}, "message": "Memory deleted"}
