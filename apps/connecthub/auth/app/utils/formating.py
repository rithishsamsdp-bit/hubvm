from typing import Dict, Any, List
def format_string(email: str) -> str:
    return email.strip() \
                .replace(" ", "") \
                .replace("\n","") \
                .replace("\r","") \
                .lower()


ALLOWED_MUTABLE_KEYS = {
    "tabs",
    "contactactions",
    "campaignactions",
    "formbuilderactions",
    "membergroupactions",
    "phonemembergroupactions",
    "queueactions",
    "callflowactions",
    "phonenumberactions",
    "features",  # kept for roles,
    "options",
    "menu"
}

def validatePlanUpdate(existing: dict, new: dict) -> dict:
    violations = []

    # --- Plan fields cannot change ---
    for key in ("name", "price", "trial", "valid_until"):
        if existing.get("plan", {}).get(key) != new.get("plan", {}).get(key):
            violations.append(f"Plan field '{key}' cannot be changed")

    # --- Roles structure validation ---
    for role, role_data in existing.get("roles", {}).items():
        if role not in new.get("roles", {}):
            violations.append(f"Role '{role}' is missing")
            continue
        if "name" in role_data and role_data["name"] != new["roles"][role].get("name"):
            violations.append(f"Role name for '{role}' cannot be changed")

    # --- Limits validation ---
    for key, val in existing.get("limits", {}).get("features", {}).items():
        new_val = new.get("limits", {}).get("features", {}).get(key)
        if new_val is None:
            violations.append(f"Feature limit key '{key}' is missing")
        elif new_val < val:
            violations.append(f"Feature '{key}' limit cannot be reduced")

    # --- Recursive comparison ---
    def recursive_check(e_val, n_val, path=""):
        # Leaf values: allow change if any ancestor key is mutable
        if any(part in ALLOWED_MUTABLE_KEYS for part in path.split(".")):
            return
        if isinstance(e_val, dict) and isinstance(n_val, dict):
            # Check for missing or extra keys
            for k in e_val:
                if k not in n_val:
                    violations.append(f"Key {path + k} missing in new plan")
                    continue
                recursive_check(e_val[k], n_val[k], path + k + ".")
            for k in n_val:
                if k not in e_val:
                    violations.append(f"Extra key {path + k} found in new plan")
        elif isinstance(e_val, list) and isinstance(n_val, list):
            if e_val != n_val:
                violations.append(f"List at {path[:-1]} cannot be changed")
        else:
            if e_val != n_val:
                violations.append(f"Value at {path[:-1]} cannot be changed")

    recursive_check(existing, new)
    return {"data": {"errors": violations}}




