import time
from typing import Dict, Any, List
import requests
import csv
import io
import json
from datetime import datetime
from bson import ObjectId

BATCH_SIZE = 5000

# ------------------------
# 1️⃣ CSV Header Validation
# ------------------------
def validate_csv_headers(csv_headers: List[str], required_headers: List[str], logger):
    """
    Validate that CSV contains all required headers.
    Extra headers are allowed. Case-insensitive.
    """
    logger.info("CSV headers: %s", csv_headers)
    logger.info("Required headers: %s", required_headers)

    if not csv_headers:
        raise ValueError("CSV file has no headers")

    csv_set = {h.strip().lower() for h in csv_headers}
    required_set = {h.strip().lower() for h in required_headers}

    missing_headers = required_set - csv_set
    if missing_headers:
        raise ValueError(f"Missing required columns in CSV: {', '.join(missing_headers)}")


# ------------------------
# 2️⃣ Build field map
# ------------------------
def build_field_map(form_schema: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    return {el["id"]: el for el in form_schema["elements"]}


# ------------------------
# 3️⃣ Normalize values
# ------------------------
def normalize_value(value: Any, field: Dict[str, Any]) -> Any:
    if value is None or value == "":
        if field["type"] == "Checkbox":
            return []
        if field["type"] == "Date":
            return {"start": "", "end": ""}
        return ""

    field_type = field["type"]

    if field_type in ["Single Line Text field", "Long Line Text field", "Number"]:
        return str(value)

    if field_type in ["Dropdown", "Radio"]:
        return str(value)

    if field_type == "Checkbox":
        return [v.strip() for v in str(value).split(",")]

    if field_type == "Time":
        return str(value)

    if field_type == "Date":
        try:
            date_obj = datetime.strptime(str(value), "%Y-%m-%d")
        except ValueError:
            date_obj = datetime.strptime(str(value), "%d/%m/%Y")
        return {
            "start": datetime.today().strftime("%Y-%m-%d"),
            "end": date_obj.strftime("%Y-%m-%d")
        }

    if field_type == "File Upload":
        return str(value)

    return str(value)


# ------------------------
# 4️⃣ Extract field IDs
# ------------------------
def extract_field_id(column_name: str) -> str:
    return column_name.split("_")[1]


# ------------------------
# 5️⃣ Convert one CSV row → form JSON
# ------------------------
def csv_row_to_form_json(row: Dict[str, Any], field_map: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    result = {}
    for column_name, cell_value in row.items():
        if not column_name.startswith("id_"):
            continue
        field_id = extract_field_id(column_name)
        field = field_map.get(field_id)
        if not field:
            continue
        label = field["label"]
        field_json = {
            "value": normalize_value(cell_value, field),
            "type": field["type"],
            "id": field_id,
            "layout": field.get("layout", {}),
            "options": field.get("options", []),
            "placeholder": field.get("placeholder", ""),
            "required": field.get("required", False),
            "defaultValue": field.get("defaultValue", "")
        }
        if "conditions" in field and field["conditions"] is not None:
            field_json["conditions"] = field["conditions"]
        result[label] = field_json
    return result


# ------------------------
# 6️⃣ Process CSV in batches
# ------------------------
def process_csv_to_form_json_batches(reader, form_schema: Dict[str, Any], campaignId: int, accountId: int, accountNo: str, mysql_cursor, mongo_db, logger):
    if isinstance(form_schema, str):
        form_schema = json.loads(form_schema)
    field_map = build_field_map(form_schema)
    collection = mongo_db[str(accountId)]
    batch = []
    batch_no = 1
    now = int(time.time())
    total = 0

    for row in reader:
        phone = row.get("phone_number")
        if not phone:
            continue
        total += 1
        custom_data = csv_row_to_form_json(row, field_map)
        lead_doc = {
            "p_leadID": str(ObjectId()),
            "p_leadaccountID": accountId,
            "p_leadaccountNo": accountNo,
            "p_leadCampaignID": campaignId,
            "p_leadPhoneNumber": phone,
            "p_customeData": custom_data,
            "p_totalAttempts": 0,
            "p_todayAttempts": 0,
            "p_leadlastAttemptDate": None,
            "p_leadnextCallTime": None,
            "p_leadStatus": "NEW",
            "p_leadLastResult": None,
            "p_createdAt": now,
            "p_updatedAt": now
        }
        batch.append(lead_doc)
        if len(batch) >= BATCH_SIZE:
            collection.insert_many(batch, ordered=False)
            logger.info("Inserted batch %s (%s leads)", batch_no, len(batch))
            batch.clear()
            batch_no += 1

    if batch:
        collection.insert_many(batch, ordered=False)
        logger.info("Inserted final batch %s (%s leads)", batch_no, len(batch))

    logger.info("CSV upload complete. Total leads=%s", total)


# ------------------------
# 7️⃣ Handle Predictive Lead Upload
# ------------------------
def handle_predective_lead_upload(payload: Dict[str, Any], mysql_conn, mysql_cursor, mongo_db, logger, task_id=None):
    """
    Handles predictive lead upload.
    Uses existing MySQL transaction + MongoDB connection.
    Exceptions are caught and can be logged or stored in a task table.
    """
    try:
        accountId = payload["accountId"]
        accountNo = payload["accountNo"]
        campaignId = payload["campaignId"]
        s3Link = payload.get("s3Link")
        if not s3Link:
            raise ValueError("s3Link missing in payload")

        response = requests.get(s3Link, timeout=30)
        response.raise_for_status()

        reader = csv.DictReader(io.StringIO(response.text))

        # Fetch form details
        mysql_cursor.execute(
            "SELECT * FROM p_relationaltable_campaigns_form WHERE rcf_campaignsId = %s",
            (campaignId,)
        )
        form_result = mysql_cursor.fetchone()
        if not form_result:
            raise ValueError(f"No form found for campaignId {campaignId}")

        rcf_formId = form_result['rcf_formId']

        mysql_cursor.execute(
            "SELECT f_formCsvTemplate, f_formPayload FROM p_form WHERE f_formId = %s",
            (rcf_formId,)
        )
        form_details = mysql_cursor.fetchone()
        if not form_details:
            raise ValueError(f"No form details found for formId {rcf_formId}")

        form_fields = form_details['f_formCsvTemplate']
        f_formPayload = form_details['f_formPayload']

        if isinstance(form_fields, str):
            form_fields = json.loads(form_fields)

        if "headers" not in form_fields:
            raise ValueError("Invalid form template: headers missing")

        validate_csv_headers(reader.fieldnames, form_fields["headers"], logger)
        logger.info("CSV header validation successful")

        process_csv_to_form_json_batches(reader, f_formPayload, campaignId, accountId, accountNo, mysql_cursor, mongo_db, logger)
        logger.info(f"CSV processing complete for campaignId={campaignId}")

        return True

    except Exception as e:
        logger.error(f"Lead upload failed: {e}", exc_info=True)
        if task_id:
            now_ts = int(time.time())
            try:
                mysql_cursor.execute(
                    "UPDATE p_backgroundtasks SET b_status=%s, b_message=%s, finished_at=%s WHERE b_id=%s",
                    ('FAILED', str(e), now_ts, task_id)
                )
                mysql_conn.commit()
            except:
                logger.exception("Failed to update task as FAILED")
        raise
