def compute_equal_splits(amount: int, user_ids: list) -> list:
    count = len(user_ids)
    share = amount // count
    remainder = amount % count

    splits = []
    for i, uid in enumerate(user_ids):
        split_amount = share + (1 if i < remainder else 0)
        splits.append({"user_id": uid, "amount": split_amount, "is_paid": False})

    return splits


def compute_custom_splits(amount: int, user_ids: list, custom_splits: list) -> list:
    total_custom = sum(s.get("amount", 0) for s in custom_splits)
    if total_custom != amount:
        raise ValueError("Custom split amounts must sum to the total amount")

    user_split_map = {s["user_id"]: s["amount"] for s in custom_splits}

    splits = []
    for uid in user_ids:
        split_amount = user_split_map.get(uid, 0)
        splits.append({"user_id": uid, "amount": split_amount, "is_paid": False})

    return splits
