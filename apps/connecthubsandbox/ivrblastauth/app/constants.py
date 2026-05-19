from datetime import datetime,timedelta
from os import getenv

DB_CONNECTION_STRING = (
    "mysql+pymysql://admin:%23Pulse%23%242024@pulsedb-feb29.cluster-cia2xris1iid.ap-south-1.rds.amazonaws.com:3306/{db_name}"
)
COOKIES_KEY_NAME = "accessToken"
SESSION_TIME = timedelta(hours=12)
NEGATIVE_SESSION_TIME = datetime.utcnow() - timedelta(days=1)
HASH_SALT = getenv("HASH_SALT", "SomeRandomStringHere")