from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure


client = None
db = None


def init_db(uri: str):
    global client, db
    try:
        client = MongoClient(uri, maxPoolSize=10, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")
    except ConnectionFailure:
        raise RuntimeError("Failed to connect to MongoDB")

    db = client.get_database()

    _create_indexes()
    return db


def _create_indexes():
    users = db["users"]
    users.create_index("username", unique=True)
    users.create_index("email", unique=True)

    trips = db["trips"]
    trips.create_index("invite_code", unique=True)
    trips.create_index("admin_id")

    members = db["members"]
    members.create_index([("trip_id", ASCENDING), ("user_id", ASCENDING)], unique=True)
    members.create_index("trip_id")
    members.create_index("user_id")

    expenses = db["expenses"]
    expenses.create_index("trip_id")
    expenses.create_index([("trip_id", ASCENDING), ("date", DESCENDING)])

    settlements = db["settlements"]
    settlements.create_index("trip_id")
    settlements.create_index([("trip_id", ASCENDING), ("status", ASCENDING)])

    budgets = db["budgets"]
    budgets.create_index("trip_id", unique=True)

    itineraries = db["itineraries"]
    itineraries.create_index("trip_id")
    itineraries.create_index([("trip_id", ASCENDING), ("date", ASCENDING)])

    memories = db["memories"]
    memories.create_index("trip_id")

    comments = db["comments"]
    comments.create_index("trip_id")
    comments.create_index([("target_type", ASCENDING), ("target_id", ASCENDING)])
    comments.create_index("parent_comment_id")

    notifications = db["notifications"]
    notifications.create_index([("recipient_id", ASCENDING), ("is_read", ASCENDING)])
    notifications.create_index("created_at")

    activity_feed = db["activity_feed"]
    activity_feed.create_index("trip_id")
    activity_feed.create_index([("trip_id", ASCENDING), ("created_at", DESCENDING)])

    locations = db["locations"]
    locations.create_index("trip_id")
    locations.create_index([("trip_id", ASCENDING), ("visit_date", DESCENDING)])

    activity_logs = db["activity_logs"]
    activity_logs.create_index("createdAt")
    activity_logs.create_index([("createdAt", DESCENDING)])
    activity_logs.create_index("userId")
    activity_logs.create_index("actionType")

    system_config = db["system_config"]

    token_blacklist = db["token_blacklist"]
    token_blacklist.create_index("jti", unique=True)
    token_blacklist.create_index("expires_at", expireAfterSeconds=0)

    refresh_tokens = db["refresh_tokens"]
    refresh_tokens.create_index("user_id")
    refresh_tokens.create_index("token_hash")
    refresh_tokens.create_index("expires_at", expireAfterSeconds=0)


def get_db():
    if db is None:
        raise RuntimeError("Database not initialized")
    return db


def close_db():
    global client
    if client:
        client.close()
