import pymongo
from pymongo import DESCENDING

MONGO_URI = "mongodb+srv://Pulse_DD:pulse123@clustertesting0.zcigs.mongodb.net"

def create_dlr_indexes():
    client = pymongo.MongoClient(
        MONGO_URI,
        tls=True,
        tlsAllowInvalidCertificates=True,
        connectTimeoutMS=20000
    )
    db = client["onedb"]
    collection = db["activities"]
    
    print("Creating indexes for DLR report...")
    
    # Compound index for general filtering and sorting
    index1 = collection.create_index([
        ("accountId", 1), 
        ("channel", 1), 
        ("type", 1), 
        ("activityTimestamp", DESCENDING)
    ])
    print(f"Index 1 created: {index1}")
    
    # Compound index including status
    index2 = collection.create_index([
        ("accountId", 1), 
        ("channel", 1), 
        ("type", 1), 
        ("updatedStatus.status", 1), 
        ("activityTimestamp", DESCENDING)
    ])
    print(f"Index 2 created: {index2}")
    
    client.close()
    print("Done!")

if __name__ == "__main__":
    create_dlr_indexes()
