from datetime import datetime, timezone, timedelta
from io import BytesIO
from bson.objectid import ObjectId
from config.database import get_db
from fpdf import FPDF
from services.trip_service import _compute_trip_status

IST_OFFSET = timedelta(hours=5, minutes=30)

def now_ist():
    return datetime.now(timezone.utc) + IST_OFFSET


def to_ist(dt):
    if hasattr(dt, "strftime") and hasattr(dt, "hour"):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone(IST_OFFSET))
    return dt



class TripReportPDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font("Helvetica", "B", 10)
            self.set_text_color(100, 100, 100)
            self.cell(0, 8, "TripSync", align="L")
            self.cell(0, 8, f"Page {self.page_no()}", align="R", new_x="LMARGIN", new_y="NEXT")
            self.line(10, 16, 200, 16)
            self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 7)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Generated on {now_ist().strftime('%d %b %Y, %I:%M %p IST')}", align="C")

    def section_title(self, title):
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(30, 60, 110)
        self.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(30, 60, 110)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def sub_section(self, label, value):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(60, 60, 60)
        self.cell(50, 7, label + ":")
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 30, 30)
        self.cell(0, 7, str(value), new_x="LMARGIN", new_y="NEXT")

    def no_data(self):
        self.set_font("Helvetica", "I", 10)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, "No Data Available", new_x="LMARGIN", new_y="NEXT")
        self.ln(2)


def generate_trip_report(trip_id: str) -> BytesIO:
    db = get_db()
    trip = db["trips"].find_one({"_id": ObjectId(trip_id)})
    if not trip:
        raise ValueError("Trip not found")

    members = list(db["members"].find({"trip_id": ObjectId(trip_id), "status": "active"}))
    member_user_ids = [m["user_id"] for m in members]
    member_users = list(db["users"].find({"_id": {"$in": member_user_ids}}))
    user_map = {str(u["_id"]): u for u in member_users}

    expenses = list(db["expenses"].find({"trip_id": ObjectId(trip_id)}).sort("date", -1))
    settlements = list(db["settlements"].find({"trip_id": ObjectId(trip_id)}).sort("created_at", -1))
    locations = list(db["locations"].find({"trip_id": ObjectId(trip_id)}).sort("visit_date", 1))
    itineraries = list(db["itineraries"].find({"trip_id": ObjectId(trip_id)}).sort("date", 1))
    memories = list(db["memories"].find({"trip_id": ObjectId(trip_id)}).sort("upload_date", -1))
    budget = db["budgets"].find_one({"trip_id": ObjectId(trip_id)})

    total_spent = sum(e["amount"] for e in expenses)
    total_budget = budget["total_amount"] if budget else 0
    remaining = max(0, total_budget - total_spent) if total_budget else 0
    pct_used = round((total_spent / total_budget) * 100, 1) if total_budget > 0 else 0
    if not budget:
        health = "No Budget"
    elif total_spent > total_budget:
        health = "Over Budget"
    elif total_spent == total_budget:
        health = "At Budget"
    elif total_spent > 0.8 * total_budget:
        health = "Near Limit"
    else:
        health = "Under Budget"

    trip_title = trip.get("title", "Untitled Trip")
    safe_title = "".join(c if c.isalnum() or c in " _-" else "_" for c in trip_title)

    pdf = TripReportPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=20)

    # ── COVER PAGE ──
    pdf.add_page()
    pdf.ln(50)
    pdf.set_font("Helvetica", "B", 28)
    pdf.set_text_color(30, 60, 110)
    pdf.cell(0, 15, "TripSync", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)
    pdf.set_font("Helvetica", "", 12)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 8, "Trip Report", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)
    pdf.set_font("Helvetica", "I", 10)
    pdf.cell(0, 6, "Generated: " + now_ist().strftime('%d %b %Y, %I:%M %p IST'), align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(10)
    pdf.set_draw_color(30, 60, 110)
    pdf.line(60, pdf.get_y(), 150, pdf.get_y())
    pdf.ln(15)
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(0, 12, trip_title, align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(8)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(80, 80, 80)
    start = trip.get("start_date", "")
    end = trip.get("end_date", "")
    date_str = ""
    if start and end:
        if hasattr(start, "strftime"):
            start = start.strftime("%d %b %Y")
        if hasattr(end, "strftime"):
            end = end.strftime("%d %b %Y")
        date_str = f"{start} - {end}"
    pdf.cell(0, 7, date_str, align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, f"Total Members: {len(members)}", align="C", new_x="LMARGIN", new_y="NEXT")
    status = _compute_trip_status(trip)
    pdf.cell(0, 7, f"Status: {status.title()}", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(10)

    # ── TRIP INFORMATION (Section 1) ──
    pdf.add_page()
    pdf.section_title("Trip Information")
    pdf.sub_section("Trip Name", trip_title)
    pdf.sub_section("Destination", trip.get("destination", ""))
    pdf.sub_section("Start Date", start)
    pdf.sub_section("End Date", end)
    pdf.sub_section("Members Count", str(len(members)))
    pdf.ln(4)

    # ── MEMBERS (Section 2) ──
    pdf.section_title("Members")
    for m in members:
        uid = str(m["user_id"])
        u = user_map.get(uid, {})
        name = u.get("full_name") or u.get("username") or "Unknown"
        role = m.get("role", "viewer")
        role_label = {"admin": "Host", "editor": "Editor", "member": "Editor", "viewer": "Viewer"}.get(role, role.title())
        joined = m.get("joined_at", "")
        if hasattr(joined, "strftime"):
            joined = to_ist(joined).strftime("%d %b %Y")
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(30, 30, 30)
        pdf.cell(0, 6, f"{name}", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(0, 5, f"  Role: {role_label}   Joined: {joined}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    # ── EXPENSES (Individual) ──
    pdf.section_title("Expenses")
    pdf.sub_section("Total Expenses", str(len(expenses)))
    pdf.sub_section("Total Amount", f"Rs. {total_spent/100:,.2f}")
    pdf.ln(2)
    if expenses:
        # Table header
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_fill_color(240, 240, 245)
        pdf.cell(55, 6, "Expense Name", border=1, fill=True)
        pdf.cell(25, 6, "Category", border=1, fill=True)
        pdf.cell(35, 6, "Paid By", border=1, fill=True)
        pdf.cell(0, 6, "Amount", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 8)
        for e in expenses[:30]:
            paid_by = e.get("paid_by", "")
            if isinstance(paid_by, dict):
                payer_names = []
                for pid, amt in paid_by.items():
                    name = user_map.get(str(pid), {}).get("full_name") or user_map.get(str(pid), {}).get("username") or str(pid)[:8]
                    payer_names.append(name)
                payer = ", ".join(payer_names)
            else:
                pid = str(paid_by)
                payer = user_map.get(pid, {}).get("full_name") or user_map.get(pid, {}).get("username") or pid[:8]
            amt = e.get("amount", 0)
            title = e.get("title", "Unknown")
            cat = e.get("category", "other")
            pdf.cell(55, 5, title[:40], border=1)
            pdf.cell(25, 5, cat.title()[:15], border=1)
            pdf.cell(35, 5, payer[:20], border=1)
            pdf.cell(0, 5, f"Rs. {amt/100:,.2f}", border=1, new_x="LMARGIN", new_y="NEXT")
        if len(expenses) > 30:
            pdf.set_font("Helvetica", "I", 8)
            pdf.set_text_color(150, 150, 150)
            pdf.cell(0, 5, f"... and {len(expenses) - 30} more expenses", new_x="LMARGIN", new_y="NEXT")
            pdf.set_text_color(30, 30, 30)
    else:
        pdf.no_data()
    pdf.ln(4)

    # ── BUDGET SUMMARY ──
    pdf.section_title("Budget Summary")
    pdf.sub_section("Budget", f"Rs. {total_budget/100:,.2f}" if total_budget else "Not Set")
    pdf.sub_section("Spent", f"Rs. {total_spent/100:,.2f}")
    pdf.sub_section("Remaining", f"Rs. {remaining/100:,.2f}")
    pdf.sub_section("Status", health)
    pdf.ln(4)

    # ── TOP SPENDERS ──
    pdf.section_title("Top Spenders")
    spender_totals = {}
    for e in expenses:
        paid_by = e.get("paid_by")
        if isinstance(paid_by, dict):
            for pid, amt in paid_by.items():
                spender_totals[pid] = spender_totals.get(pid, 0) + amt
        else:
            pid = str(paid_by) if paid_by else ""
            if pid:
                spender_totals[pid] = spender_totals.get(pid, 0) + e["amount"]
    sorted_spenders = sorted(spender_totals.items(), key=lambda x: -x[1])
    if sorted_spenders:
        for rank, (uid, amt) in enumerate(sorted_spenders, 1):
            u = user_map.get(uid, {})
            name = u.get("full_name") or u.get("username") or uid[:8]
            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(30, 30, 30)
            pdf.cell(10, 6, f"{rank}.")
            pdf.cell(60, 6, name)
            pdf.cell(0, 6, f"Rs. {amt/100:,.2f}", new_x="LMARGIN", new_y="NEXT")
    else:
        pdf.no_data()
    pdf.ln(4)

    # ── SETTLEMENT SUMMARY ──
    pdf.section_title("Settlement Summary")
    if settlements:
        for s in settlements:
            from_id = str(s.get("from_user_id", ""))
            to_id = str(s.get("to_user_id", ""))
            from_name = user_map.get(from_id, {}).get("full_name") or user_map.get(from_id, {}).get("username") or from_id[:8]
            to_name = user_map.get(to_id, {}).get("full_name") or user_map.get(to_id, {}).get("username") or to_id[:8]
            amt = s.get("amount", 0)
            st = s.get("status", "pending")
            paid_at = s.get("paid_at") or s.get("created_at", "")
            if hasattr(paid_at, "strftime"):
                paid_at = to_ist(paid_at).strftime("%d %b %Y")
            pdf.set_font("Helvetica", "", 9)
            pdf.set_text_color(30, 30, 30)
            pdf.cell(0, 5, f"{from_name}  ->  {to_name}   Rs. {amt/100:,.2f}", new_x="LMARGIN", new_y="NEXT")
            pdf.set_text_color(100, 100, 100)
            pdf.cell(0, 5, f"  Status: {st.title()}   {paid_at}", new_x="LMARGIN", new_y="NEXT")
    else:
        pdf.no_data()
    pdf.ln(4)

    # ── PLACES VISITED ──
    pdf.section_title("Places Visited")
    if locations:
        for loc in locations:
            name = loc.get("name", "Unknown")
            cat = loc.get("category", "other")
            lat = loc.get("latitude", "")
            lng = loc.get("longitude", "")
            added_by_id = str(loc.get("added_by", ""))
            added_by = user_map.get(added_by_id, {}).get("full_name") or user_map.get(added_by_id, {}).get("username") or ""
            vdate = loc.get("visit_date", "")
            if hasattr(vdate, "strftime"):
                vdate = to_ist(vdate).strftime("%d %b %Y")
            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(30, 30, 30)
            pdf.cell(0, 6, name, new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("Helvetica", "", 9)
            pdf.set_text_color(100, 100, 100)
            pdf.cell(0, 5, f"  Category: {cat.title()}   Coordinates: {lat}, {lng}", new_x="LMARGIN", new_y="NEXT")
            pdf.cell(0, 5, f"  Added by: {added_by}   Date: {vdate}", new_x="LMARGIN", new_y="NEXT")
    else:
        pdf.no_data()
    pdf.ln(4)

    # ── ITINERARY SUMMARY ──
    pdf.section_title("Itinerary Summary")
    if itineraries:
        for item in itineraries:
            title = item.get("title", "Unknown")
            date = item.get("date", "")
            if hasattr(date, "strftime"):
                date = to_ist(date).strftime("%d %b %Y")
            start_t = item.get("start_time", "")
            end_t = item.get("end_time", "")
            time_str = f"{start_t} - {end_t}" if start_t and end_t else start_t or end_t or ""
            location = item.get("location", "")
            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(30, 30, 30)
            pdf.cell(0, 6, f"{title}", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("Helvetica", "", 9)
            pdf.set_text_color(100, 100, 100)
            pdf.cell(0, 5, f"  Date: {date}   Time: {time_str}", new_x="LMARGIN", new_y="NEXT")
            if location:
                pdf.cell(0, 5, f"  Location: {location}", new_x="LMARGIN", new_y="NEXT")
    else:
        pdf.no_data()
    pdf.ln(4)

    # ── MEMORIES SUMMARY ──
    pdf.section_title("Memories Summary")
    pdf.sub_section("Total Memories", str(len(memories)))
    pdf.ln(2)
    if memories:
        for mem in memories:
            caption = mem.get("caption", "Untitled")
            uploader_id = str(mem.get("uploader_id", ""))
            uploader = user_map.get(uploader_id, {}).get("full_name") or user_map.get(uploader_id, {}).get("username") or ""
            udate = mem.get("upload_date", "")
            if hasattr(udate, "strftime"):
                udate = to_ist(udate).strftime("%d %b %Y")
            pdf.set_font("Helvetica", "", 9)
            pdf.set_text_color(30, 30, 30)
            pdf.cell(0, 5, f"{caption}  -  {uploader}  -  {udate}", new_x="LMARGIN", new_y="NEXT")
    else:
        pdf.no_data()
    pdf.ln(4)

    pdf_bytes = pdf.output()
    buf = BytesIO(pdf_bytes)
    buf.seek(0)
    return buf, safe_title
