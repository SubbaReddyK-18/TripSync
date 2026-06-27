from flask import Blueprint, request, g
from middleware.auth_middleware import require_auth
from models.comment_model import CreateCommentSchema
from services.comment_service import create_comment, get_comments, delete_comment
from services.socket_service import emit_comment_added, emit_comment_deleted
from marshmallow import ValidationError

comment_bp = Blueprint("comments", __name__)


@comment_bp.route("", methods=["POST"])
@require_auth
def create(trip_id):
    schema = CreateCommentSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as e:
        return {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Validation failed", "details": e.messages}}, 422

    comment = create_comment(trip_id, data, g.current_user["_id"])
    emit_comment_added(trip_id, comment)
    return {"success": True, "data": {"comment": comment}, "message": "Comment added"}, 201


@comment_bp.route("", methods=["GET"])
@require_auth
def list_comments(trip_id):
    target_type = request.args.get("target_type")
    target_id = request.args.get("target_id")
    if not target_type or not target_id:
        return {"success": False, "error": {"code": "MISSING_PARAMS", "message": "target_type and target_id are required"}}, 400

    comments = get_comments(trip_id, target_type, target_id)
    return {"success": True, "data": {"comments": comments}}


@comment_bp.route("/<comment_id>", methods=["DELETE"])
@require_auth
def delete(trip_id, comment_id):
    delete_comment(trip_id, comment_id, g.current_user["_id"])
    emit_comment_deleted(trip_id, comment_id)
    return {"success": True, "data": {}, "message": "Comment deleted"}
