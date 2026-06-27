import os
from datetime import timedelta


class BaseConfig:
    SECRET_KEY = os.environ.get("SECRET_KEY", "fallback-secret")
    MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/tripsync")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "fallback-jwt-secret")
    JWT_ACCESS_TOKEN_EXPIRES = int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRES", 3600))
    JWT_REFRESH_TOKEN_EXPIRES = int(os.environ.get("JWT_REFRESH_TOKEN_EXPIRES", 2592000))

    CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
    CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY", "")
    CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET", "")

    raw_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173")
    if raw_origins.strip() == "*":
        ALLOWED_ORIGINS = "*"
    else:
        ALLOWED_ORIGINS = [
            origin.strip().rstrip("/")
            for origin in raw_origins.split(",")
            if origin.strip()
        ]
        if "*" in ALLOWED_ORIGINS:
            ALLOWED_ORIGINS = "*"

    RATE_LIMIT_PER_MINUTE = int(os.environ.get("RATE_LIMIT_PER_MINUTE", 120))
    MAX_CONTENT_LENGTH = int(os.environ.get("MAX_CONTENT_LENGTH", 52428800))
    BCRYPT_ROUNDS = 12

    SOCKETIO_ASYNC_MODE = os.environ.get("SOCKETIO_ASYNC_MODE", "threading")

    # SMTP (keep these)
    SMTP_HOST = os.environ.get("SMTP_HOST", "")
    SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
    SMTP_USER = os.environ.get("SMTP_USER", "")
    SMTP_PASS = os.environ.get("SMTP_PASS", "")

    # Mail
    MAIL_FROM = os.environ.get("MAIL_FROM", "noreply@tripsync.app")

    # Brevo API
    BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "")

    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")


class DevelopmentConfig(BaseConfig):
    DEBUG = True
    PROPAGATE_EXCEPTIONS = False


class ProductionConfig(BaseConfig):
    DEBUG = False


class TestingConfig(BaseConfig):
    TESTING = True
    MONGO_URI = "mongodb://localhost:27017/tripsync_test"


config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}