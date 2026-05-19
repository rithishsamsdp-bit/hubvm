import asyncio
import sys
import os

# Add the app directory to the python path so we can import models and repos
sys.path.append(os.path.join(os.path.dirname(__file__), "app"))

from db.context import get_mongo_db, get_chat_session
from repos import user_repo

async def main():
    print("Starting backfill of extensionNo in MongoDB...")
    db = get_mongo_db()
    
    # 1. Get all unique senderIds from MongoDB chat_messages
    print("Fetching unique senderIds from MongoDB...")
    unique_sender_ids = await db.chat_messages.distinct("senderId")
    print(f"Found {len(unique_sender_ids)} unique senders.")
    
    # 2. Open MySQL session and fetch extension numbers for each sender
    SessionFactory = get_chat_session()
    async with SessionFactory() as session:
        for sender_id in unique_sender_ids:
            user = await user_repo.get_user_by_id(session, sender_id)
            if user and user.u_memberExtensionNo:
                extension_no = user.u_memberExtensionNo
                
                # 3. Update all MongoDB messages from this sender
                result = await db.chat_messages.update_many(
                    {"senderId": sender_id},
                    {"$set": {"extensionNo": extension_no}}
                )
                print(f"Updated {result.modified_count} messages for senderId {sender_id} with extensionNo {extension_no}")
            else:
                print(f"Skipping senderId {sender_id} - user not found in MySQL or no extension number")

    print("Backfill complete!")

if __name__ == "__main__":
    asyncio.run(main())
