from datetime import timedelta
import os

SYNC_DB_CONNECTION_STRING = (
    "mysql+pymysql://admin:%23Pulse%23%242024@pulsedb-feb29.cluster-cia2xris1iid.ap-south-1.rds.amazonaws.com:3306/{db_name}"
)
ASYNC_DB_CONNECTION_STRING = (
    "mysql+asyncmy://admin:%23Pulse%23%242024@pulsedb-feb29.cluster-cia2xris1iid.ap-south-1.rds.amazonaws.com:3306/{db_name}"
)
AST_DB_CONNECTION_STRING = os.getenv("AST_DATABASE_URL", "mysql+pymysql://admin:Pulse%40123@connecthub-ast-1.pulsework360.com:3306/asterisk")
COOKIES_KEY_NAME = "accessToken"
SESSION_TIME = timedelta(hours=12)
HASH_SALT = os.getenv("HASH_SALT", "SomeRandomStringHere")