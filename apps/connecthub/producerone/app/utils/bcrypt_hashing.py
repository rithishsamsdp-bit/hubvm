from time import time
from random import randint

from passlib.context import CryptContext
from constants import HASH_SALT

CONTEXT = CryptContext(
    schemes=["bcrypt"],
    bcrypt__rounds=10,   # default is 12
)

class HashLib:
    @staticmethod
    def hash(password: str) -> str:
        to_hash = password
        return CONTEXT.hash(to_hash)

    @staticmethod
    def validate(plain_password: str, hashed_password: str) -> bool:
        try:
            to_verify = plain_password
            return CONTEXT.verify(to_verify, hashed_password)
        except Exception as e:
            print(e)
            return False
    
    @staticmethod
    def random_hash() -> str:
        timestamp = time()
        random_number = randint(0, 999999)
        return CONTEXT.hash(f"{timestamp} {random_number} {HASH_SALT}")
    
    