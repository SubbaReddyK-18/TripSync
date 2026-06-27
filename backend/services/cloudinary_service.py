import os
import uuid
import cloudinary.uploader
import cloudinary.api
from flask import current_app


def _local_storage_available():
    return current_app and current_app.root_path


def _local_upload(file_bytes, folder):
    upload_dir = os.path.join(current_app.root_path, "static", "uploads", folder.replace("/", os.sep))
    os.makedirs(upload_dir, exist_ok=True)
    ext_map = {
        b"\xff\xd8": "jpg",
        b"\x89PNG": "png",
        b"GIF8": "gif",
        b"RIFF": "webp",
        b"ftyp": "mp4",
    }
    ext = "bin"
    for sig, e in ext_map.items():
        if file_bytes[:len(sig)] == sig:
            ext = e
            break
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(upload_dir, filename)
    with open(filepath, "wb") as f:
        f.write(file_bytes)
    rel_path = f"static/uploads/{folder.replace(os.sep, '/')}/{filename}"
    return {
        "url": f"/{rel_path}",
        "public_id": rel_path,
        "format": ext,
        "bytes": len(file_bytes),
    }


def upload_file(file_bytes, folder: str = "tripsync", resource_type: str = "auto") -> dict:
    cloud_name = cloudinary.config().cloud_name
    if cloud_name and not cloud_name.startswith("your_"):
        try:
            result = cloudinary.uploader.upload(
                file_bytes,
                folder=folder,
                resource_type=resource_type,
            )
            return {
                "url": result["secure_url"],
                "public_id": result["public_id"],
                "format": result.get("format"),
                "bytes": result.get("bytes"),
            }
        except Exception:
            if _local_storage_available():
                return _local_upload(file_bytes, folder)
            raise

    if _local_storage_available():
        return _local_upload(file_bytes, folder)
    raise RuntimeError(
        "Cloudinary is not configured and no local storage backend is available. "
        "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET "
        "environment variables."
    )


def delete_file(public_id: str):
    cloud_name = cloudinary.config().cloud_name
    if cloud_name and not cloud_name.startswith("your_"):
        try:
            cloudinary.uploader.destroy(public_id)
            return
        except Exception:
            pass
    if _local_storage_available():
        filepath = os.path.join(current_app.root_path, public_id.replace("/", os.sep))
        if os.path.exists(filepath):
            os.remove(filepath)

