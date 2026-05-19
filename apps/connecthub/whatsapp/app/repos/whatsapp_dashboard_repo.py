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

def fetch_dashboard_stats(accountId, accountNo, startDate, endDate, campaignId, templateId):
    db = get_db()
    collection = db["activities"]

    # Match Stage
    match_query = {
        "accountId": int(accountId) if str(accountId).isdigit() else accountId,
        "accountNo": accountNo,
        "channel": "Whatsapp",
        "type": "Message"
    }

    if startDate and endDate:
        s_date = startDate.replace(" ", "T")
        e_date = endDate.replace(" ", "T")
        match_query["activityTimestamp"] = {
            "$gte": s_date,
            "$lte": e_date
        }

    if campaignId:
         match_query["campaignId"] = int(campaignId) if str(campaignId).isdigit() else campaignId

    
    pipeline = [
        {"$match": match_query},
        {"$facet": {
            "counts": [
                {"$group": {
                    "_id": None,
                    "totalRequest": {"$sum": 1},
                    "totalSent": {
                        "$sum": {
                            "$cond": [{
                                "$gt": [{
                                    "$size": {
                                        "$filter": {
                                            "input": {"$ifNull": ["$updatedStatus", []]},
                                            "as": "st",
                                            "cond": {"$eq": ["$$st.status", "sent"]}
                                        }
                                    }
                                }, 0]
                            }, 1, 0]
                        }
                    },
                    "totalDelivered": {
                        "$sum": {
                            "$cond": [{
                                "$gt": [{
                                    "$size": {
                                        "$filter": {
                                            "input": {"$ifNull": ["$updatedStatus", []]},
                                            "as": "st",
                                            "cond": {"$eq": ["$$st.status", "delivered"]}
                                        }
                                    }
                                }, 0]
                            }, 1, 0]
                        }
                    },
                    "totalRead": {
                         "$sum": {
                            "$cond": [{
                                "$gt": [{
                                    "$size": {
                                        "$filter": {
                                            "input": {"$ifNull": ["$updatedStatus", []]},
                                            "as": "st",
                                            "cond": {"$eq": ["$$st.status", "read"]}
                                        }
                                    }
                                }, 0]
                            }, 1, 0]
                        }
                    },
                    "totalFailed": {
                         "$sum": {
                            "$cond": [{
                                "$gt": [{
                                    "$size": {
                                        "$filter": {
                                            "input": {"$ifNull": ["$updatedStatus", []]},
                                            "as": "st",
                                            "cond": {"$eq": ["$$st.status", "failed"]}
                                        }
                                    }
                                }, 0]
                            }, 1, 0]
                        }
                    }
                }}
            ],
            "daily_trend": [
                {
                    "$addFields": {
                        "dateStr": {"$substr": ["$activityTimestamp", 0, 10]}
                    }
                },
                {"$group": {
                    "_id": "$dateStr",
                    "sent": {"$sum": 1}, # Total messages that day
                    "read": {
                         "$sum": {
                            "$cond": [{
                                "$gt": [{
                                    "$size": {
                                        "$filter": {
                                            "input": {"$ifNull": ["$updatedStatus", []]},
                                            "as": "st",
                                            "cond": {"$eq": ["$$st.status", "read"]}
                                        }
                                    }
                                }, 0]
                            }, 1, 0]
                        }
                    }
                }},
                {"$sort": {"_id": 1}}
            ]
        }}
    ]

    try:
        result = list(collection.aggregate(pipeline))
        
        counts = result[0]["counts"][0] if result and result[0]["counts"] else {
            "totalRequest": 0, "totalSent": 0, "totalDelivered": 0, "totalRead": 0, "totalFailed": 0
        }
        daily_trend = result[0]["daily_trend"] if result else []
        
        donut_data = [
            {"name": "Sent", "value": counts.get("totalSent", 0), "color": "#F59E0B"},
            {"name": "Read", "value": counts.get("totalRead", 0), "color": "#25D366"},
            {"name": "Failed", "value": counts.get("totalFailed", 0), "color": "#EF4444"}
        ]
        
        formatted_trend = []
        for item in daily_trend:
            try:
                dt = datetime.strptime(item["_id"], "%Y-%m-%d")
                label = dt.strftime("%d %b") # 17 Feb
                formatted_trend.append({
                    "label": label,
                    "date": item["_id"],
                    "sent": item["sent"],
                    "read": item["read"]
                })
            except:
                pass

        return {
            "statusCode": 200,
            "response": "Fetched Successfully",
            "data": {
                "counts": {
                    "totalRequest": counts.get("totalRequest", 0),
                    "totalSent": counts.get("totalSent", 0),
                    "totalDelivered": counts.get("totalDelivered", 0),
                    "totalRead": counts.get("totalRead", 0),
                    "totalFailed": counts.get("totalFailed", 0)
                },
                "donutData": donut_data,
                "barData": formatted_trend
            }
        }

    except Exception as e:
        print(f"Error fetching dashboard stats: {e}")
        return {
            "statusCode": 500,
            "response": "Internal Server Error",
            "error": str(e)
        }
