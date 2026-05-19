from time import time
from hashlib import sha256
from random import randint
from constants import HASH_SALT
import time
import random


class HashLib:
    @staticmethod
    def hash(password: str) -> str:
        to_hash = password + HASH_SALT
        return sha256(to_hash.encode()).hexdigest()

    @staticmethod
    def validate(plain_password: str, hashed_password: str) -> bool:
        return hash(plain_password) == hashed_password

    @staticmethod
    def random_hash() -> str:
        random_number = randint(0, 999999)
        timestamp = time()
        to_hash = f"{timestamp} {random_number} {HASH_SALT}"
        return sha256(to_hash.encode()).hexdigest()

def generate_lead_id():
    timestamp = int(time.time() * 1000)  # milliseconds
    node_id = 1
    counter = random.randint(0, 999)
    raw = (timestamp << 10) | (node_id << 5) | (counter % 32)
    chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    base36 = ''
    while raw > 0 and len(base36) < 10:
        raw, i = divmod(raw, 36)
        base36 = chars[i] + base36

    return base36.zfill(10)

def alphanumericUniqueId():
    timestamp = int(time.time() * 1000)
    node_id = 1
    counter = random.randint(0, 999)
    raw = (timestamp << 10) | (node_id << 5) | (counter % 32)
    chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    base36 = ''
    while raw > 0 and len(base36) < 10:
        raw, i = divmod(raw, 36)
        base36 = chars[i] + base36
    return base36.zfill(10)    