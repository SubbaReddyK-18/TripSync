from datetime import datetime
from flask import Blueprint, send_file, g, request
from middleware.auth_middleware import require_auth
from services.member_service import require_editor
from services.report_service import generate_trip_report, get_report_data
from services.export_service import export_trip_report_xlsx, export_trip_report_csv
from middleware.error_handler import AppError

report_bp = Blueprint("report", __name__)


@report_bp.route("", methods=["GET"])
@require_auth
def download_report(trip_id):
    fmt = request.args.get("format", "pdf")
    valid_formats = {"pdf", "csv", "xlsx"}
    if fmt not in valid_formats:
        fmt = "pdf"

    require_editor(trip_id, g.current_user["_id"])

    if fmt == "pdf":
        try:
            buf, title = generate_trip_report(trip_id)
            filename = f"{title.lower().replace(' ', '_')}_report_{datetime.now().strftime('%d_%b_%Y')}.pdf"
            return send_file(
                buf,
                mimetype="application/pdf",
                as_attachment=True,
                download_name=filename,
            )
        except ValueError as e:
            raise AppError(str(e), "REPORT_ERROR", 404)
        except Exception as e:
            raise AppError("Failed to generate report", "REPORT_ERROR", 500)

    data = get_report_data(trip_id)
    trip = data["trip"]
    members = data["members"]
    user_map = data["user_map"]
    expenses = data["expenses"]
    settlements = data["settlements"]
    locations = data["locations"]
    budget = data["budget"]

    trip_title = trip.get("title", "Untitled Trip")
    safe_title = "".join(c if c.isalnum() or c in " _-" else "_" for c in trip_title)
    date_str = datetime.now().strftime('%d_%b_%Y')

    if fmt == "xlsx":
        buf = export_trip_report_xlsx(trip, members, user_map, expenses, settlements, locations, budget)
        filename = f"{safe_title.lower().replace(' ', '_')}_report_{date_str}.xlsx"
        return send_file(buf, mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", as_attachment=True, download_name=filename)

    if fmt == "csv":
        buf = export_trip_report_csv(trip, members, user_map, expenses, settlements, locations, budget)
        filename = f"{safe_title.lower().replace(' ', '_')}_report_{date_str}.csv"
        return send_file(buf, mimetype="text/csv", as_attachment=True, download_name=filename)
