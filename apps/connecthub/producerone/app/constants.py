from datetime import timedelta
import os

SYNC_DB_CONNECTION_STRING = (
    "mysql+pymysql://admin:%23Pulse%23%242024@pulsedb-feb29.cluster-cia2xris1iid.ap-south-1.rds.amazonaws.com:3306/onedb"
)
ASYNC_DB_CONNECTION_STRING = (
    "mysql+asyncmy://admin:%23Pulse%23%242024@pulsedb-feb29.cluster-cia2xris1iid.ap-south-1.rds.amazonaws.com:3306/onedb"
)

ASYNC_DB_CONNECTION_STRING2 = (
    "mysql+asyncmy://admin:%23Pulse%23%242024@pulsedb-feb29.cluster-cia2xris1iid.ap-south-1.rds.amazonaws.com:3306/onedb"
)
COOKIES_KEY_NAME = "accessToken"
SESSION_TIME = timedelta(hours=12)
HASH_SALT = os.getenv("HASH_SALT", "SomeRandomStringHere")