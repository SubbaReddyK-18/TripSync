from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
from flask import request
import jwt
from bson.objectid import ObjectId
from config.database import get_db

socketio = SocketIO(cors_allowed_origins="*")


def authenticate_socket(token):
    try:
        payload = jwt.decode(
            token,
            request.app.config["JWT_SECRET_KEY"],
            algorithms=["HS256"],
            options={"require": ["sub", "jti", "type"]},
        )
        db = get_db()
        user = db["users"].find_one({"_id": ObjectId(payload["sub"])})
        if user:
            return str(user["_id"])
    except Exception:
        pass
    return None


@socketio.on("connect")
def on_connect():
    token = request.args.get("token")
    if not token:
        disconnect()
        return

    user_id = authenticate_socket(token)
    if not user_id:
        disconnect()
        return

    join_room(f"user:{user_id}")


@socketio.on("disconnect")
def on_disconnect():
    pass


@socketio.on("join_trip")
def on_join_trip(data):
    trip_id = data.get("trip_id")
    if trip_id:
        join_room(f"trip:{trip_id}")


@socketio.on("leave_trip")
def on_leave_trip(data):
    trip_id = data.get("trip_id")
    if trip_id:
        leave_room(f"trip:{trip_id}")


def emit_trip_event(trip_id, event, data):
    socketio.emit(event, data, room=f"trip:{trip_id}")


def emit_user_event(user_id, event, data):
    socketio.emit(event, data, room=f"user:{user_id}")
