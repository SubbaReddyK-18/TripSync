import os
import logging
from dotenv import load_dotenv

# Load root .env first, then instance .env overrides
root_dotenv = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(root_dotenv)
dotenv_path = os.path.join(os.path.dirname(__file__), "instance", ".env")
load_dotenv(dotenv_path, override=True)

from flask import Flask
from flask_cors import CORS
from config.settings import config_by_name
from config.database import init_db
from config.cloudinary import init_cloudinary
from config.socketio import socketio
from middleware.error_handler import register_error_handlers
from middleware.request_logger import log_request, start_timer


from flask.json.provider import DefaultJSONProvider
from datetime import datetime, timezone

class CustomJSONProvider(DefaultJSONProvider):
    def default(self, o):
        if isinstance(o, datetime):
            
            if o.tzinfo is None:
                o = o.replace(tzinfo=timezone.utc)
            return o.isoformat()
        return super().default(o)


def create_app(config_name=None):
    if config_name is None:
        config_name = os.environ.get("FLASK_ENV", "development")

    app = Flask(__name__)
    app.json = CustomJSONProvider(app)
    app.config.from_object(config_by_name[config_name])

    _init_extensions(app)
    _register_middleware(app)
    _register_blueprints(app)
    register_error_handlers(app)
    _init_services(app)
    _init_socketio(app)
    create_cli(app)

    @app.route("/api/v1/health")
    def health():
        return {"success": True, "data": {"status": "healthy"}}

    return app


def _init_extensions(app):
    CORS(app, origins=app.config["ALLOWED_ORIGINS"], supports_credentials=True)


def _register_middleware(app):
    app.before_request(start_timer)
    app.after_request(log_request)


def _register_blueprints(app):
    from routes.auth_routes import auth_bp
    from routes.user_routes import user_bp
    from routes.trip_routes import trip_bp
    from routes.expense_routes import expense_bp
    from routes.settlement_routes import settlement_bp
    from routes.budget_routes import budget_bp
    from routes.comment_routes import comment_bp
    from routes.notification_routes import notification_bp
    from routes.itinerary_routes import itinerary_bp
    from routes.dashboard_routes import dashboard_bp
    from routes.location_routes import location_bp
    from routes.upload_routes import upload_bp
    from routes.report_routes import report_bp
    from routes.swagger_routes import swagger_bp
    from routes.admin_routes import admin_bp

    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(user_bp, url_prefix="/api/v1/users")
    app.register_blueprint(trip_bp, url_prefix="/api/v1/trips")
    app.register_blueprint(expense_bp, url_prefix="/api/v1/trips/<trip_id>/expenses")
    app.register_blueprint(settlement_bp, url_prefix="/api/v1/trips/<trip_id>/settlements")
    app.register_blueprint(budget_bp, url_prefix="/api/v1/trips/<trip_id>/budget")
    app.register_blueprint(comment_bp, url_prefix="/api/v1/trips/<trip_id>/comments")
    app.register_blueprint(itinerary_bp, url_prefix="/api/v1/trips/<trip_id>/itinerary")
    app.register_blueprint(location_bp, url_prefix="/api/v1/trips/<trip_id>/locations")

    app.register_blueprint(upload_bp, url_prefix="/api/v1/upload")
    app.register_blueprint(report_bp, url_prefix="/api/v1/trips/<trip_id>/report")
    app.register_blueprint(notification_bp, url_prefix="/api/v1/notifications")
    app.register_blueprint(dashboard_bp, url_prefix="/api/v1/dashboard")
    app.register_blueprint(admin_bp, url_prefix="/api/v1/admin")
    app.register_blueprint(swagger_bp, url_prefix="/docs")


def _init_services(app):
    db = init_db(app.config["MONGO_URI"])
    # Automatic master admin promotion migration
    db["users"].update_many(
        {"email": {"$regex": "vu241fa04b47", "$options": "i"}},
        {"$set": {"role": "admin"}}
    )
    # Backfill is_verified for users created before email verification was added
    db["users"].update_many(
        {"is_verified": {"$exists": False}},
        {"$set": {"is_verified": True}}
    )
    # TTL index to auto-cleanup pending registrations after 24 hours
    db["pending_registrations"].create_index("created_at", expireAfterSeconds=86400)

    if app.config["CLOUDINARY_CLOUD_NAME"]:
        init_cloudinary()
    # Ensure local uploads directory exists
    import os
    os.makedirs(os.path.join(app.root_path, "static", "uploads"), exist_ok=True)


def _init_socketio(app):
    socketio.init_app(app, cors_allowed_origins=app.config["ALLOWED_ORIGINS"])


if __name__ == "__main__":
    app = create_app()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    socketio.run(app, debug=app.config.get("DEBUG", False), port=5000, allow_unsafe_werkzeug=True)

