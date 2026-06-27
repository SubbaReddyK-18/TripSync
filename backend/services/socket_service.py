from config.socketio import emit_trip_event


def emit_expense_added(trip_id, expense):
    emit_trip_event(trip_id, "expense_added", {"expense": expense})


def emit_expense_updated(trip_id, expense):
    emit_trip_event(trip_id, "expense_updated", {"expense": expense})


def emit_expense_deleted(trip_id, expense_id):
    emit_trip_event(trip_id, "expense_deleted", {"expense_id": expense_id})


def emit_budget_updated(trip_id, budget):
    emit_trip_event(trip_id, "budget_updated", {"budget": budget})


def emit_memory_added(trip_id, memory):
    emit_trip_event(trip_id, "memory_added", {"memory": memory})


def emit_memory_deleted(trip_id, memory_id):
    emit_trip_event(trip_id, "memory_deleted", {"memory_id": memory_id})


def emit_comment_added(trip_id, comment):
    emit_trip_event(trip_id, "comment_added", {"comment": comment})


def emit_comment_deleted(trip_id, comment_id):
    emit_trip_event(trip_id, "comment_deleted", {"comment_id": comment_id})


def emit_itinerary_added(trip_id, item):
    emit_trip_event(trip_id, "itinerary_added", {"item": item})


def emit_itinerary_deleted(trip_id, item_id):
    emit_trip_event(trip_id, "itinerary_deleted", {"item_id": item_id})


def emit_location_added(trip_id, location):
    emit_trip_event(trip_id, "location_added", {"location": location})


def emit_location_deleted(trip_id, location_id):
    emit_trip_event(trip_id, "location_deleted", {"location_id": location_id})


def emit_settlements_updated(trip_id, settlements):
    emit_trip_event(trip_id, "settlements_updated", {"settlements": settlements})


def emit_member_joined(trip_id, member):
    emit_trip_event(trip_id, "member_joined", {"member": member})


def emit_member_left(trip_id, user_id):
    emit_trip_event(trip_id, "member_left", {"user_id": user_id})
