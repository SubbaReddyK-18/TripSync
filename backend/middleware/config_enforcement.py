from functools import wraps
from flask import g
from services.admin_config_service import get_system_config


def require_config_enabled(config_key):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            config = get_system_config()
            if not config.get(config_key, True):
                return {
                    "success": False,
                    "error": {
                        "code": "FEATURE_DISABLED",
                        "message": "This feature is currently disabled by the administrator.",
                    },
                }, 403
            return f(*args, **kwargs)
        return decorated
    return decorator
