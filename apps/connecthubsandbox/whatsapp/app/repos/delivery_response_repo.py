import pymongo
from pymongo import DESCENDING, ASCENDING
from bson import ObjectId
from datetime import datetime
import re
import os

# Global MongoDB Client to avoid connection overhead
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://Pulse_DD:pulse123@clustertesting0.zcigs.mongodb.net")
mongo_client = None

def get_db():
    global mongo_client
    if mongo_client is None:
        mongo_client = pymongo.MongoClient(
            MONGO_URI,
            tls=True,
            tlsAllowInvalidCertificates=True,
            connectTimeoutMS=20000,
            retryWrites=True
        )
    return mongo_client["onedb"]

# RECOMMENDED INDEXES for performance:
# collection.create_index([("accountId", 1), ("channel", 1), ("type", 1), ("activityTimestamp", -1)])
# collection.create_index([("accountId", 1), ("channel", 1), ("type", 1), ("updatedStatus.status", 1), ("activityTimestamp", -1)])

def fetch_delivery_response_report(limit, offset, searchString, start_date, end_date, sortField, sortOrder, status, direction, accountId, accountNo):
    db = get_db()
    collection = db["activities"]

    # Base query
    query = {
        "accountId": int(accountId) if str(accountId).isdigit() else accountId,
        "accountNo": accountNo,
        "channel": "Whatsapp",
        "type": "Message"
    }

    # Direction Filter
    if direction and direction.lower() != "all":
        query["direction"] = direction
    
    # Status Filter
    if status and status.lower() != "all":
        query["updatedStatus.status"] = status.lower()

    # Date Range Filter
    is_id_search = searchString and searchString.strip().lower().startswith("wamid")
    
    if start_date and end_date and not is_id_search:
        s_date = start_date.replace(" ", "T")
        e_date = end_date.replace(" ", "T")
        
        query["activityTimestamp"] = {
            "$gte": s_date,
            "$lte": e_date
        }

    # Search Filter
    if searchString:
        regex_pattern = {"$regex": searchString, "$options": "i"}
        query["$or"] = [
            {"details.m_dst": regex_pattern},
            {"details.dst": regex_pattern},
            {"details.m_receiveMsg": regex_pattern},
            {"details.receiveMsg": regex_pattern},
            {"details.m_id": regex_pattern},
            {"details.id": regex_pattern}
        ]

    # Sorting
    sort_criteria = [("activityTimestamp", DESCENDING)]  # Default sort
    if sortField:
        db_sort_field = "activityTimestamp" # Default
        if sortField == "mobileNumber":
            db_sort_field = "details.m_dst"
        elif sortField == "message":
            db_sort_field = "details.m_receiveMsg"
        elif sortField == "sentDate":
            db_sort_field = "activityTimestamp"
        
        direction = ASCENDING if sortOrder == "asc" else DESCENDING
        sort_criteria = [(db_sort_field, direction)]

    # Execute Query
    total_count = collection.count_documents(query)
    cursor = collection.find(query).sort(sort_criteria).skip(offset).limit(limit)
    fetchData = list(cursor)

    # Process Data
    payload = []
    for item in fetchData:
        details = item.get("details", {})
        updated_status = item.get("updatedStatus", [])
        
        # Extract Status Timestamps
        sent_date = item.get("activityTimestamp")
        delivery_date = None
        read_date = None
        current_status = "sent" # Default

        # Sort statuses by timestamp to find latest
        if updated_status:
            latest_status_obj = updated_status[-1]
            current_status = latest_status_obj.get("status")

            for status_obj in updated_status:
                s = status_obj.get("status", "").lower()
                ts = status_obj.get("updatedOn")
                
                if s == "delivered":
                    delivery_date = ts
                elif s == "read":
                    read_date = ts

        # Extract Template Name
        raw_msg = details.get("m_receiveMsg") or details.get("receiveMsg") or ""
        template_name = ""
        if isinstance(raw_msg, dict):
            template_name = raw_msg.get("name", "")
            # Extract body text from template components
            components = raw_msg.get("components", []) if isinstance(raw_msg.get("components"), list) else []
            message_content = next((comp.get("text") for comp in components if isinstance(comp, dict) and comp.get("type") == "BODY"), "")
        else:
            template_name = "-"
            message_content = str(raw_msg)
            
        # Extract Error Details
        error_details_raw = item.get("errorDetails", [])
        status_details = ""
        if error_details_raw:
            try:
                # Handle list of list of objects structure from sample
                if isinstance(error_details_raw, list) and len(error_details_raw) > 0:
                    first_err = error_details_raw[0]
                    if isinstance(first_err, list) and len(first_err) > 0:
                        err_obj = first_err[0]
                        status_details = err_obj.get("error_data", {}).get("details") or err_obj.get("message", "")
                    elif isinstance(first_err, dict):
                        status_details = first_err.get("error_data", {}).get("details") or first_err.get("message", "")
            except Exception:
                pass
        
        # Determine Message Type / Direction
        msg_type_val = item.get("direction", "")
        
        # Support both m_type and type keys
        type_val = details.get("m_type") or details.get("type") or ""

        payload.append({
            "m_id": details.get("m_id") or details.get("id") or "",
            "m_dst": details.get("m_dst") or details.get("dst") or "",
            "m_templateName": template_name,
            "m_receiveMsg": message_content,
            "m_type": type_val,
            "m_src": details.get("m_src") or details.get("src") or "",
            "m_msgType": msg_type_val,
            "m_createdOn": sent_date,
            "m_deliveredOn": delivery_date,
            "m_readOn": read_date,
            "m_status": current_status,
            "m_statusDetails": status_details
        })

    return {
        "statusCode": 200,
        "response": "Fetched Successfully",
        "data": {
            "total": total_count,
            "records": payload
        }
    }
