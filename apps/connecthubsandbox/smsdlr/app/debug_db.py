import mysql.connector
from mysql.connector import errorcode
import logging
import sys

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

config = {
    'host': 'pulsedb-feb29.cluster-cia2xris1iid.ap-south-1.rds.amazonaws.com',
    'user': 'admin',
    'password': '#Pulse#$2024',
    'database': 'onedb',
    'autocommit': False,
    'connect_timeout': 10  # 10 seconds timeout
}

logger.info(f"Testing connection to {config['host']}...")

try:
    start_time = sys.time() if hasattr(sys, 'time') else None 
    # sys.time doesn't exist, using time module
    import time
    start_time = time.time()
    
    conn = mysql.connector.connect(**config)
    duration = time.time() - start_time
    
    logger.info(f"✅ Successfully connected in {duration:.2f} seconds!")
    conn.close()
    
except mysql.connector.Error as err:
    duration = time.time() - start_time
    if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
        logger.error("❌ Something is wrong with your user name or password")
    elif err.errno == errorcode.ER_BAD_DB_ERROR:
        logger.error("❌ Database does not exist")
    else:
        logger.error(f"❌ Connection failed: {err}")
    logger.info(f"Failed after {duration:.2f} seconds")
except Exception as e:
    logger.error(f"❌ Unexpected error: {e}")
