from config.database import get_db

DEFAULT_CONFIG = {
    "allowRegistrations": True,
    "enableTrips": True,
    "enableExpenses": True,
    "enableMemories": True,
    "enablePlaces": True,
    "enableSettlements": True,
}


def get_system_config():
    db = get_db()
    config = db["system_config"].find_one({"_id": "global"})
    if not config:
        db["system_config"].insert_one({"_id": "global", **DEFAULT_CONFIG})
        return dict(DEFAULT_CONFIG)
    config.pop("_id", None)
    return config


def update_system_config(updates):
    db = get_db()
    allowed = set(DEFAULT_CONFIG.keys())
    set_fields = {k: bool(v) for k, v in updates.items() if k in allowed}
    if not set_fields:
        return get_system_config()
    db["system_config"].update_one(
        {"_id": "global"},
        {"$set": set_fields},
        upsert=True,
    )
    return get_system_config()
