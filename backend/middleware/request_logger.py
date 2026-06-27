import time
import logging
from flask import request, g

logger = logging.getLogger("tripsync.request")


def log_request(response):
    if request.path.startswith("/api/"):
        duration = time.time() - g.get("request_start", time.time())
        user_id = g.get("current_user", {}).get("_id", "anonymous")
        logger.info(
            f"{request.method} {request.path} user={user_id} status={response.status_code} duration={duration:.3f}s"
        )
    return response


def start_timer():
    g.request_start = time.time()
