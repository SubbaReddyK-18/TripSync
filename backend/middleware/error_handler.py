import logging

logger = logging.getLogger("tripsync.error")


class AppError(Exception):
    def __init__(self, message, code="APP_ERROR", status_code=400, details=None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}


def register_error_handlers(app):
    @app.errorhandler(AppError)
    def handle_app_error(error):
        return {
            "success": False,
            "error": {
                "code": error.code,
                "message": error.message,
                "details": error.details,
            }
        }, error.status_code

    @app.errorhandler(400)
    def bad_request(e):
        return {"success": False, "error": {"code": "BAD_REQUEST", "message": "Invalid request"}}, 400

    @app.errorhandler(401)
    def unauthorized(e):
        return {"success": False, "error": {"code": "UNAUTHORIZED", "message": "Authentication required"}}, 401

    @app.errorhandler(403)
    def forbidden(e):
        return {"success": False, "error": {"code": "FORBIDDEN", "message": "Access denied"}}, 403

    @app.errorhandler(404)
    def not_found(e):
        return {"success": False, "error": {"code": "NOT_FOUND", "message": "Resource not found"}}, 404

    @app.errorhandler(413)
    def payload_too_large(e):
        return {"success": False, "error": {"code": "PAYLOAD_TOO_LARGE", "message": "File too large"}}, 413

    @app.errorhandler(422)
    def unprocessable(e):
        return {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Validation failed"}}, 422

    @app.errorhandler(429)
    def too_many_requests(e):
        return {"success": False, "error": {"code": "RATE_LIMIT_EXCEEDED", "message": "Too many requests"}}, 429

    @app.errorhandler(500)
    def internal_error(e):
        return {"success": False, "error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred"}}, 500

    @app.errorhandler(Exception)
    def catch_all(error):
        logger.exception("Unhandled exception: %s", error)
        return {"success": False, "error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred"}}, 500
