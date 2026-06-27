import time
from collections import defaultdict
from flask import request, g
from functools import wraps


_requests = defaultdict(list)


def rate_limit(max_requests: int, window_seconds: int = 60):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            ip = request.remote_addr or "unknown"
            key = f"{ip}:{request.path}"
            now = time.time()

            _requests[key] = [t for t in _requests[key] if now - t < window_seconds]

            if len(_requests[key]) >= max_requests:
                return {
                    "success": False,
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": f"Rate limit of {max_requests} requests per {window_seconds}s exceeded",
                    }
                }, 429

            _requests[key].append(now)
            return f(*args, **kwargs)

        return decorated
    return decorator
