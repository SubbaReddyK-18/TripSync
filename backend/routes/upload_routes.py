import uuid
from flask import Blueprint, request, g
from middleware.auth_middleware import require_auth
from services.cloudinary_service import upload_file
from middleware.error_handler import AppError

upload_bp = Blueprint("upload", __name__)

ALLOWED_CONTENT_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "video/mp4", "video/webm", "video/quicktime",
}


@upload_bp.route("", methods=["POST"])
@require_auth
def upload():
    if "file" not in request.files:
        raise AppError("No file provided", "NO_FILE", 400)

    file = request.files["file"]
    if not file.filename:
        raise AppError("No file selected", "NO_FILE", 400)

    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise AppError(f"File type {content_type} not allowed", "INVALID_FILE_TYPE", 400)

    file_bytes = file.read()
    folder = f"tripsync/{g.current_user['_id']}"

    result = upload_file(file_bytes, folder=folder)

    file_type = "video" if content_type.startswith("video/") else "image"

    return {
        "success": True,
        "data": {
            "cloudinary_url": result["url"],
            "cloudinary_public_id": result["public_id"],
            "file_type": file_type,
            "format": result.get("format"),
            "bytes": result.get("bytes"),
        },
        "message": "File uploaded",
    }, 201
