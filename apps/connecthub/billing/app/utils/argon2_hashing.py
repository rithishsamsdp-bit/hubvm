from passlib.context import CryptContext

# Create a context for Argon2
CONTEXT = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__time_cost=2,       # number of iterations
    argon2__memory_cost=51200, # in KB (~50 MB)
    argon2__parallelism=2      # number of parallel threads
)

class HashLib:
    @staticmethod
    def hash(password: str) -> str:
        """Hash a password using Argon2."""
        return CONTEXT.hash(password)

    @staticmethod
    def validate(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return CONTEXT.verify(plain_password, hashed_password)