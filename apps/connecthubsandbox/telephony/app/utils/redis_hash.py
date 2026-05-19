import hashlib

def generate_cache_hash_key(key_base: str) -> str:
    """Generate SHA256 hash for use as a Redis hash field."""
    return hashlib.sha256(key_base.encode()).hexdigest()