import pymongo
from pymongo import DESCENDING, ASCENDING
from bson import ObjectId
from datetime import datetime

class WhatsappGroupRepo:
    def __init__(self):
        self.mongo_url = "mongodb+srv://Pulse_DD:pulse123@clustertesting0.zcigs.mongodb.net"
        self.db_name = "onedb"

    def _get_collection(self, collection_name):
        client = pymongo.MongoClient(self.mongo_url)
        db = client[self.db_name]
        return client, db[collection_name]

    def create_group(self, group_name, account_id, contacts):
        """
        Creates a new group and bulk inserts contacts.
        contacts: list of dicts { "countryCode": str, "msisdn": str, ... }
        """
        client = pymongo.MongoClient(self.mongo_url)
        try:
            db = client[self.db_name]
            groups_collection = db["whatsapp_groups"]
            contacts_collection = db["whatsapp_contacts"]

            # 1. Create Group Document
            group_doc = {
                "groupName": group_name,
                "accountId": int(account_id) if str(account_id).isdigit() else account_id,
                "totalContacts": len(contacts),
                "createdAt": datetime.now(),
                "status": "Active"
            }
            group_result = groups_collection.insert_one(group_doc)
            group_id = group_result.inserted_id

            # 2. Prepare Contacts with Group ID
            contact_docs = []
            for contact in contacts:
                contact["groupId"] = group_id
                contact["accountId"] = group_doc["accountId"]
                contact["createdAt"] = datetime.now()
                contact_docs.append(contact)

            # 3. Bulk Insert Contacts
            if contact_docs:
                contacts_collection.insert_many(contact_docs)

            return str(group_id)
        except Exception as e:
            print(f"Error creating group: {e}")
            raise e
        finally:
            client.close()

    def get_groups(self, account_id, limit=100, offset=0, search_string=None):
        client = pymongo.MongoClient(self.mongo_url)
        try:
            db = client[self.db_name]
            groups_collection = db["whatsapp_groups"]

            query = {
                "accountId": int(account_id) if str(account_id).isdigit() else account_id,
                "status": "Active"
            }
            
            if search_string:
                query["groupName"] = {"$regex": search_string, "$options": "i"}

            total_count = groups_collection.count_documents(query)
            
            cursor = groups_collection.find(query).sort("createdAt", DESCENDING).skip(offset).limit(limit)
            
            groups = []
            for doc in cursor:
                doc["_id"] = str(doc["_id"])
                groups.append(doc)
                
            return groups, total_count
        except Exception as e:
            print(f"Error fetching groups: {e}")
            return [], 0
        finally:
            client.close()

    def delete_group(self, group_id, account_id):
        client = pymongo.MongoClient(self.mongo_url)
        try:
            db = client[self.db_name]
            groups_collection = db["whatsapp_groups"]

            query = {
                "_id": ObjectId(group_id),
                "accountId": int(account_id) if str(account_id).isdigit() else account_id
            }
            
            groups_collection.update_one(query, {"$set": {"status": "Deleted"}})
            return True
        except Exception as e:
            print(f"Error deleting group: {e}")
            return False
        finally:
            client.close()
            
    def get_group_contacts(self, group_id, limit=100000):
        # Fetch only msisdn and countryCode usually for campaigns
        client = pymongo.MongoClient(self.mongo_url)
        try:
            db = client[self.db_name]
            contacts_collection = db["whatsapp_contacts"]

            cursor = contacts_collection.find({"groupId": ObjectId(group_id)}, {"_id": 0, "countryCode": 1, "msisdn": 1, "attributes": 1})
            return list(cursor)
        except Exception as e:
            print(f"Error getting group contacts: {e}")
            return []
        finally:
            client.close()
