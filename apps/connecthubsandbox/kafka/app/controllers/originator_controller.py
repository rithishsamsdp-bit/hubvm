import json
import os
import re
import logging
from fastapi import APIRouter, Request, Response, status
from fastapi.responses import JSONResponse
from aiokafka import AIOKafkaProducer
from services import campaign_service, freeswitch_service
from models.dto import CampaignRunRequest, HangupResponseModel, getIvrRequest
from ESL import ESLconnection
from dotenv import load_dotenv
import asyncio

load_dotenv()

router = APIRouter(
    prefix="/kafkaapi/campaign",
    tags=["Campaign"]
)

FS_SERVER = os.getenv("FS_SERVER")
FS_PORT = os.getenv("FS_PORT")
FS_PASSWORD = os.getenv("FS_PASSWORD")

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "kafka-service:9092")
KAFKA_TOPIC = "campaign_requests"
KAFKA_HANGUP_TOPIC = "hangup-events"

async def get_kafka_producer():
    producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BROKER)
    await producer.start()
    return producer

@router.post("/ratio-trigger", status_code=status.HTTP_200_OK)
async def campaign_run(request: CampaignRunRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = campaign_service.decode(token)
    if isinstance(data, JSONResponse):
        return data

    numbers_data = campaign_service.fetchNumbers(
        database=data.encryption,
        campaignid=request.campaign_id,
        ratiolimit=request.ratiolimit
    )

    logging.info(f"Received {numbers_data['totalRecordsCount']} leads for campaign_id: {request.campaign_id}")

    if not numbers_data["totalRecords"]:
        await campaign_service.updateCampaignStatus(
            campaign_id=request.campaign_id,
            status="completed",
            database=data.encryption
        )
        return {
            "message": "No leads available for the campaign.",
            "status": "NO_LEADS",
            "totalRecordsCount": 0
        }

    caller_ids = []
    dynamic_callerid_status = "disable"
    batch_count = 0
    if hasattr(request, 'callerid_dynamic') and request.callerid_dynamic and request.callerid_dynamic.status == "enable":
        dynamic_callerid_status = "enable"
        batch_count = request.callerid_dynamic.batch_count
        caller_ids = campaign_service.fetchDynamicCallerIds(
            campaignid=request.campaign_id,
            batch_count=batch_count,
            database=data.encryption
        )
        logging.debug(f"Caller IDs fetched: {caller_ids}, batch_count: {batch_count}")
        # if not caller_ids:
        #     return {
        #         "message": "No active caller IDs found for the campaign.",
        #         "status": "ERROR"
        #     }

    # Store dynamic caller ID config
    await campaign_service.updateDynamicCallerIdConfig(
        campaignid=request.campaign_id,
        status=dynamic_callerid_status,
        batch_count=batch_count,
        database=data.encryption
    )
    await campaign_service.updateCarrierIndex(
        campaign_id=request.campaign_id,
        new_index=0,
        database=data.encryption
    )
    await campaign_service.updateCampaignStatus(
        campaign_id=request.campaign_id,
        status="running",
        database=data.encryption
    )

    async with await get_kafka_producer() as producer:
        try:
            processed_ids = set()
            for i, lead in enumerate(numbers_data["totalRecords"]):
                lead_id = lead["c_Id"]
                lead_number = lead["c_campaignNumber"]
                if lead_id in processed_ids:
                    logging.warning(f"Skipping duplicate c_Id: {lead_id} for campaign_id: {request.campaign_id}")
                    continue
                processed_ids.add(lead_id)
                carrier_name = caller_ids[i % len(caller_ids)] if caller_ids else numbers_data["carrierName"]
                message = {
                    "lead_number": lead_number,
                    "campaign_id": request.campaign_id,
                    "callerId": carrier_name,
                    "carrierName": numbers_data["carrierName"],
                    "carrierPrefix": numbers_data["carrierPrefix"],
                    "campaignName": numbers_data["campaignName"],
                    "database": data.encryption,
                    "reset_count": i == 0,
                    "c_Id": lead_id
                }
                await producer.send_and_wait(KAFKA_TOPIC, json.dumps(message).encode("utf-8"))
                logging.debug(f"Sent Kafka message for c_Id: {lead_id}, lead_number: {lead_number}, carrierName: {carrier_name}")
        except Exception as e:
            logging.error(f"Kafka error: {e}")
            return {
                "message": f"Failed to send campaign requests to Kafka: {str(e)}",
                "status": "ERROR"
            }

    return {
        "message": "Campaign requests added to queue.",
        "status": "SUCCESS",
        "totalRecordsCount": len(processed_ids)
    }
    
@router.post("/stop", status_code=status.HTTP_200_OK)
async def stop_campaign(request: Request, response: Response):
    token = request.cookies.get("accessToken")
    data = campaign_service.decode(token)
    if isinstance(data, JSONResponse):
        return data

    request_data = await request.json()
    campaign_id = request_data.get("campaign_id")

    if not campaign_id:
        return {"message": "Missing campaign_id", "status": "ERROR"}
    
    campaign_status = campaign_service.getCampaignStatus(campaign_id, database=data.encryption)
    if campaign_status == "stopped" or campaign_status == "completed":
        return {"message": "Campaign is already in a " + campaign_status + " state", "status": "INVALID_STATE"}

    leads_count = campaign_service.getRemainingLeadsCount(campaign_id, database=data.encryption)
    if leads_count["remaining_leads"] > 0:
        await campaign_service.updateCampaignStatus(campaign_id, "stopped", database=data.encryption)
        message = "Campaign stopped successfully"
    else:
        message = "Campaign completed as no leads remain"

    return {"message": message, "status": "SUCCESS"}

@router.post("/resume", status_code=status.HTTP_200_OK)
async def resume_campaign(request: Request, response: Response):
    token = request.cookies.get("accessToken")
    data = campaign_service.decode(token)
    if isinstance(data, JSONResponse):
        return data

    request_data = await request.json()
    campaign_id = request_data.get("campaign_id")

    if not campaign_id:
        logging.error(f"Missing campaign_id: {campaign_id}")
        return {"message": "Missing campaign_id", "status": "ERROR"}

    campaign_status = campaign_service.getCampaignStatus(campaign_id, database=data.encryption)
    if campaign_status != "stopped":
        logging.info(f"Campaign {campaign_id} is not stopped: {campaign_status}")
        return {"message": "Campaign is not in a stopped state", "status": "INVALID_STATE"}
    
    ratio_count = campaign_service.getRatioCount(campaign_id, database=data.encryption)
    if ratio_count == "0":
        logging.info(f"Ratio count is 0 for campaign_id: {campaign_id}")
        return {"message": "Ratio count is 0", "status": "INVALID_STATE"}
    
    call_count = freeswitch_service.execute_freeswitch_command("show", "calls count")
    if call_count is None:
        logging.error(f"Failed to retrieve live call count for campaign_id: {campaign_id}")
        return {"message": "Failed to retrieve live call count", "status": "ERROR"}
    
    match = re.search(r"(\d+)", call_count)
    call_count_int = int(match.group(1)) if match else 0
    calculate_trigger = ratio_count - call_count_int
    if calculate_trigger <= 0:
        logging.info(f"No additional leads needed for campaign_id: {campaign_id}, calculate_trigger: {calculate_trigger}")
        await campaign_service.updateCampaignStatus(campaign_id, "running", database=data.encryption)
        return {"message": "No additional leads needed, campaign resumed", "status": "SUCCESS", "totalRecordsCount": 0}
    if calculate_trigger > 110:
        logging.warning(f"High ratio for campaign_id: {campaign_id}: {calculate_trigger}")
        return {"message": f"Caution: Ratio is high ({calculate_trigger}). Check the server status before resuming.", "status": "HIGH_RATIO"}

    # Fetch dynamic caller ID config from database
    callerid_config = campaign_service.getDynamicCallerIdConfig(campaign_id, data.encryption)
    logging.debug(f"Dynamic caller ID config for campaign_id: {campaign_id}: {callerid_config}")

    caller_ids = []
    if callerid_config["status"] == "enable" and callerid_config["batch_count"] > 0:
        caller_ids = campaign_service.fetchDynamicCallerIds(
            campaignid=campaign_id,
            batch_count=callerid_config["batch_count"],
            database=data.encryption
        )
        logging.debug(f"Caller IDs fetched for campaign_id: {campaign_id}, batch_count: {callerid_config['batch_count']}: {caller_ids}")
        if not caller_ids:
            logging.error(f"No active caller IDs found for campaign_id: {campaign_id}")
            # return {"message": "No active caller IDs found for the campaign.", "status": "ERROR"}

    # Reset carrier index
    await campaign_service.updateCarrierIndex(
        campaign_id=campaign_id,
        new_index=0,
        database=data.encryption
    )

    await campaign_service.updateCampaignStatus(campaign_id, "running", database=data.encryption)
    numbers_data = campaign_service.fetchNumbers(database=data.encryption, campaignid=campaign_id, ratiolimit=calculate_trigger)

    if not numbers_data["totalRecords"]:
        logging.info(f"No more leads available for campaign_id: {campaign_id}")
        return {"message": "No more leads available", "status": "COMPLETED"}

    async with await get_kafka_producer() as producer:
        try:
            processed_ids = set()
            for i, lead in enumerate(numbers_data["totalRecords"]):
                lead_id = lead["c_Id"]
                lead_number = lead["c_campaignNumber"]
                if lead_id in processed_ids:
                    logging.warning(f"Skipping duplicate c_Id: {lead_id} for campaign_id: {campaign_id}")
                    continue
                processed_ids.add(lead_id)
                carrier_name = caller_ids[i % len(caller_ids)] if caller_ids else numbers_data["carrierName"]
                message = {
                    "lead_number": lead_number,
                    "campaign_id": campaign_id,
                    "callerId": carrier_name,
                    "carrierName": numbers_data["carrierName"],
                    "carrierPrefix": numbers_data["carrierPrefix"],
                    "campaignName": numbers_data["campaignName"],
                    "database": data.encryption,
                    "reset_count": i == 0,
                    "c_Id": lead_id
                }
                await producer.send_and_wait(KAFKA_TOPIC, json.dumps(message).encode("utf-8"))
                logging.debug(f"Sent Kafka message for c_Id: {lead_id}, lead_number: {lead_number}, callerId: {carrier_name}")
        except Exception as e:
            logging.error(f"Kafka error for campaign_id: {campaign_id}: {e}")
            return {"message": f"Failed to send campaign requests to Kafka: {str(e)}", "status": "ERROR"}

    return {
        "message": f"Campaign resumed successfully with ratio {calculate_trigger}",
        "status": "SUCCESS",
        "totalRecordsCount": len(processed_ids)
    }

@router.post("/restart", status_code=status.HTTP_200_OK)
async def restart_campaign(request: Request, response: Response):
    token = request.cookies.get("accessToken")
    data = campaign_service.decode(token)
    if isinstance(data, JSONResponse):
        return data

    request_data = await request.json()
    campaign_id = request_data.get("campaign_id")
    ratiolimit = request_data.get("ratiolimit")

    if not campaign_id or not ratiolimit:
        logging.error(f"Missing campaign_id: {campaign_id} or ratiolimit: {ratiolimit}")
        return {"message": "Missing campaign_id or ratiolimit", "status": "ERROR"}

    # Fetch dynamic caller ID config from database
    callerid_config = campaign_service.getDynamicCallerIdConfig(campaign_id, data.encryption)
    logging.debug(f"Dynamic caller ID config for campaign_id: {campaign_id}: {callerid_config}")

    caller_ids = []
    if callerid_config["status"] == "enable" and callerid_config["batch_count"] > 0:
        caller_ids = campaign_service.fetchDynamicCallerIds(
            campaignid=campaign_id,
            batch_count=callerid_config["batch_count"],
            database=data.encryption
        )
        logging.debug(f"Caller IDs fetched for campaign_id: {campaign_id}, batch_count: {callerid_config['batch_count']}: {caller_ids}")
        if not caller_ids:
            logging.error(f"No active caller IDs found for campaign_id: {campaign_id}")
            # return {
            #     "message": "No active caller IDs found for the campaign.",
            #     "status": "ERROR"
            # }

    # Reset carrier index
    await campaign_service.updateCarrierIndex(
        campaign_id=campaign_id,
        new_index=0,
        database=data.encryption
    )

    await campaign_service.resetCampaignLeads(campaign_id, database=data.encryption)
    await campaign_service.updateCampaignStatus(campaign_id, "running", database=data.encryption)
    numbers_data = campaign_service.fetchNumbers(database=data.encryption, campaignid=campaign_id, ratiolimit=ratiolimit)

    if not numbers_data["totalRecords"]:
        logging.info(f"No leads available for campaign_id: {campaign_id}")
        return {"message": "No leads available", "status": "NO_LEADS"}

    async with await get_kafka_producer() as producer:
        try:
            processed_ids = set()
            for i, lead in enumerate(numbers_data["totalRecords"]):
                lead_id = lead["c_Id"]
                lead_number = lead["c_campaignNumber"]
                if lead_id in processed_ids:
                    logging.warning(f"Skipping duplicate c_Id: {lead_id} for campaign_id: {campaign_id}")
                    continue
                processed_ids.add(lead_id)
                carrier_name = caller_ids[i % len(caller_ids)] if caller_ids else numbers_data["carrierName"]
                message = {
                    "lead_number": lead_number,
                    "campaign_id": campaign_id,
                    "callerId": carrier_name,
                    "carrierName": numbers_data["carrierName"],
                    "carrierPrefix": numbers_data["carrierPrefix"],
                    "campaignName": numbers_data["campaignName"],
                    "database": data.encryption,
                    "reset_count": i == 0,
                    "c_Id": lead_id
                }
                await producer.send_and_wait(KAFKA_TOPIC, json.dumps(message).encode("utf-8"))
                logging.debug(f"Sent Kafka message for c_Id: {lead_id}, lead_number: {lead_number}, carrierName: {carrier_name}")
        except Exception as e:
            logging.error(f"Kafka error for campaign_id: {campaign_id}: {e}")
            return {
                "message": f"Failed to send campaign requests to Kafka: {str(e)}",
                "status": "ERROR"
            }

    return {
        "message": "Campaign restarted successfully",
        "status": "SUCCESS",
        "totalRecordsCount": len(processed_ids)
    }

@router.post("/hangup-trigger", status_code=status.HTTP_200_OK)
async def handle_hangup(request: HangupResponseModel, tokenRequest: Request, response: Response):
    """Handle hangup and trigger the next lead with dynamic caller ID support"""
    # token = tokenRequest.cookies.get("accessToken")
    # data = campaign_service.decode(token)
    # if isinstance(data, JSONResponse):
    #     return data

    campaign_id = request.campaign_id
    lead_number = request.lead_number
    database = "pulsef6dafca5d2ddf0949dd251508abd654f"

    if not campaign_id or not lead_number:
        logging.error(f"Missing campaign_id: {campaign_id} or lead_number: {lead_number}")
        return {"message": "Missing campaign_id or lead_number", "status": "ERROR"}

    if len(str(lead_number)) < 10:
        logging.error(f"Invalid lead_number: {lead_number}, must be at least 10 digits")
        return {"message": "Lead number must be at least 10 digits long", "status": "ERROR"}

    campaign_status = campaign_service.getCampaignStatus(campaign_id, database)
    if campaign_status == "stopped":
        logging.info(f"Campaign {campaign_id} is stopped. No new lead triggered.")
        return {"message": "Campaign is paused. No new lead will be triggered.", "status": "PAUSED"}

    leadUpdateStatus = await campaign_service.updateLeadStatus(campaign_id, lead_number, "completed", database)
    logging.debug(f"Lead status updated for campaign_id: {campaign_id}, lead_number: {lead_number}: {leadUpdateStatus}")

    numbers_data = campaign_service.fetchNumbers(database=database, campaignid=campaign_id, ratiolimit=1)
    logging.info(f"Fetched {numbers_data['totalRecordsCount']} leads for campaign_id: {campaign_id}")

    if not numbers_data["totalRecords"]:
        await campaign_service.updateCampaignStatus(campaign_id, "completed", database)
        logging.info(f"No more leads available for campaign_id: {campaign_id}. Campaign marked as completed.")
        return {"message": "No more leads available", "status": "COMPLETED"}

    next_lead = numbers_data["totalRecords"][0]
    next_lead_number = next_lead["c_campaignNumber"]
    next_lead_id = next_lead["c_Id"]

    # Get dynamic caller ID config
    callerid_config = campaign_service.getDynamicCallerIdConfig(campaign_id, database)
    logging.debug(f"Dynamic caller ID config for campaign_id: {campaign_id}: {callerid_config}")

    carrier_name = numbers_data["carrierName"]
    if callerid_config["status"] == "enable" and callerid_config["batch_count"] > 0:
        caller_ids = campaign_service.fetchDynamicCallerIds(
            campaignid=campaign_id,
            batch_count=callerid_config["batch_count"],
            database=database
        )
        logging.debug(f"Caller IDs fetched for campaign_id: {campaign_id}, batch_count: {callerid_config['batch_count']}: {caller_ids}")
        if caller_ids:
            current_index = callerid_config["last_carrier_index"]
            carrier_name = caller_ids[current_index % len(caller_ids)]
            new_index = (current_index + 1) % callerid_config["batch_count"]
            await campaign_service.updateCarrierIndex(campaign_id, new_index, database)

    async with await get_kafka_producer() as producer:
        try:
            message = {
                "lead_number": next_lead_number,
                "campaign_id": campaign_id,
                "callerId": carrier_name,
                "carrierName": numbers_data["carrierName"],
                "carrierPrefix": numbers_data["carrierPrefix"],
                "campaignName": numbers_data["campaignName"],
                "database": database,
                "reset_count": True,
                "c_Id": next_lead_id
            }
            await producer.send_and_wait(KAFKA_TOPIC, json.dumps(message).encode("utf-8"))
            logging.info(f"Sent Kafka message for c_Id: {next_lead_id}, lead_number: {next_lead_number}, carrierName: {carrier_name}")
        except Exception as e:
            logging.error(f"Kafka error for campaign_id: {campaign_id}: {e}")
            return {
                "message": f"Failed to send Kafka message: {str(e)}",
                "status": "ERROR"
            }

    return {
        "message": "Next lead triggered",
        "status": "SUCCESS",
        "lead_number": next_lead_number,
        "leadUpdateStatus": leadUpdateStatus,
        "carrierName": carrier_name
    }

@router.post("/get-Ivr", status_code=status.HTTP_200_OK, response_model=dict)
def getIvr(request: getIvrRequest, response: Response):
    campaignid = request.campaignid
    database = request.database
    result = campaign_service.getIvr(
        campaignid,
        database
    )
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "message": f"Flow Fetched Successfully",
            "data": result
        }
    )

@router.post("/getLiveCalls", status_code=status.HTTP_200_OK)
def getLiveCalls(request: getIvrRequest, response: Response):
    campaignid = request.campaignid
    database = request.database
    call_count = freeswitch_service.execute_freeswitch_command("show", "calls count")

    if call_count is None:
        return {"message": "Failed to retrieve live call count", "status": "ERROR"}

    match = re.search(r"(\d+)", call_count)
    call_count_int = int(match.group(1)) if match else 0

    return {"status": "SUCCESS", "callCount": call_count_int}