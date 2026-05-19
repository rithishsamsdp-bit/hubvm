# repos/message_repo.py — MongoDB Data access layer for messages
from datetime import datetime, timezone
from bson import ObjectId
import re
from db.context import get_mongo_db
from repos import user_repo
from sqlalchemy.ext.asyncio import AsyncSession

def _serialize_mongo(doc, sender_cache=None) -> dict:
    if not doc:
        return None
    sender = sender_cache.get(doc["senderId"]) if sender_cache else None
    return {
        "msg_id": str(doc["_id"]),
        "msg_roomId": doc["roomId"],
        "msg_senderId": doc["senderId"],
        "msg_type": doc["type"],
        "msg_content": doc["content"],
        "msg_fileMeta": doc.get("fileMeta"),
        "msg_isPinned": doc.get("isPinned", False),
        "msg_isDeleted": doc.get("isDeleted", False),
        "msg_isEdited": doc.get("isEdited", False),
        "msg_editedAt": doc.get("editedAt"),
        "msg_replyTo": doc.get("replyTo"),
        "msg_createdOn": doc["createdAt"],
        "sender": sender,
        "reads": [{"r_userId": uid} for uid in doc.get("readBy", [])]
    }

class MockSender:
    def __init__(self, name):
        self.u_memberName = name

class MockMessage:
    def __init__(self, data):
        self.msg_id = data["msg_id"]
        self.msg_roomId = data["msg_roomId"]
        self.msg_senderId = data["msg_senderId"]
        self.msg_type = data["msg_type"]
        self.msg_content = data["msg_content"]
        self.msg_fileMeta = data["msg_fileMeta"]
        self.msg_isPinned = data["msg_isPinned"]
        self.msg_isDeleted = data["msg_isDeleted"]
        self.msg_isEdited = data.get("msg_isEdited", False)
        self.msg_editedAt = data.get("msg_editedAt")
        self.msg_replyTo = data.get("msg_replyTo")
        self.msg_createdOn = data["msg_createdOn"]
        self.sender = data["sender"]

        class MockRead:
            def __init__(self, uid):
                self.r_userId = uid
        self.reads = [MockRead(r["r_userId"]) for r in data["reads"]]

async def _populate_senders(session, docs):
    """Fetch sender details from MySQL to attach to Mongo documents."""
    sender_ids = list(set([doc["senderId"] for doc in docs]))
    sender_cache = {}
    for sid in sender_ids:
        u = await user_repo.get_user_by_id(session, sid)
        if u:
            sender_cache[sid] = MockSender(u.u_memberName)
    return sender_cache

async def create_message(
    session: AsyncSession,
    room_id: int,
    sender_id: int,
    msg_type: str,
    content: str,
    file_meta: dict | None = None,
    reply_to: dict | None = None,
) -> MockMessage:
    db = get_mongo_db()

    sender = await user_repo.get_user_by_id(session, sender_id)
    extension_no = sender.u_memberExtensionNo if sender else None

    doc = {
        "roomId": room_id,
        "senderId": sender_id,
        "extensionNo": extension_no,
        "type": msg_type,
        "content": content,
        "fileMeta": file_meta,
        "replyTo": reply_to,
        "isPinned": False,
        "isDeleted": False,
        "isEdited": False,
        "readBy": [sender_id],
        "createdAt": datetime.now(timezone.utc)
    }
    result = await db.chat_messages.insert_one(doc)
    doc["_id"] = result.inserted_id

    sender_cache = await _populate_senders(session, [doc])
    return MockMessage(_serialize_mongo(doc, sender_cache))

async def get_messages(
    session: AsyncSession,
    room_id: int,
    limit: int = 50,
    before_id: str | None = None,
) -> list[MockMessage]:
    db = get_mongo_db()
    query = {"roomId": room_id, "isDeleted": False}
    
    # Reliable pagination logic using createdAt timestamp
    if before_id and ObjectId.is_valid(before_id):
        ref_doc = await db.chat_messages.find_one({"_id": ObjectId(before_id)}, {"createdAt": 1})
        if ref_doc and "createdAt" in ref_doc:
            query["createdAt"] = {"$lt": ref_doc["createdAt"]}
        else:
            # Fallback if reference doc is missing
            query["_id"] = {"$lt": ObjectId(before_id)}
            
    cursor = db.chat_messages.find(query).sort("createdAt", -1).limit(limit)
    docs = await cursor.to_list(length=limit)
    docs.reverse()
    
    sender_cache = await _populate_senders(session, docs)
    return [MockMessage(_serialize_mongo(doc, sender_cache)) for doc in docs]

async def search_messages(
    session: AsyncSession,
    room_id: int,
    query: str,
    limit: int = 30,
) -> list[MockMessage]:
    db = get_mongo_db()
    q = {"roomId": room_id, "isDeleted": False, "content": {"$regex": re.compile(query, re.IGNORECASE)}}
    cursor = db.chat_messages.find(q).sort("_id", -1).limit(limit)
    docs = await cursor.to_list(length=limit)
    sender_cache = await _populate_senders(session, docs)
    return [MockMessage(_serialize_mongo(doc, sender_cache)) for doc in docs]

async def get_pinned_messages(session: AsyncSession, room_id: int) -> list[MockMessage]:
    db = get_mongo_db()
    query = {"roomId": room_id, "isDeleted": False, "isPinned": True}
    cursor = db.chat_messages.find(query).sort("_id", -1)
    docs = await cursor.to_list(length=100)
    sender_cache = await _populate_senders(session, docs)
    return [MockMessage(_serialize_mongo(doc, sender_cache)) for doc in docs]

async def pin_message(session: AsyncSession, msg_id: str, pin: bool):
    if ObjectId.is_valid(msg_id):
        db = get_mongo_db()
        await db.chat_messages.update_one({"_id": ObjectId(msg_id)}, {"$set": {"isPinned": pin}})

async def soft_delete_message(session: AsyncSession, msg_id: str):
    if ObjectId.is_valid(msg_id):
        db = get_mongo_db()
        await db.chat_messages.update_one(
            {"_id": ObjectId(msg_id)}, 
            {"$set": {"isDeleted": True, "content": "[This message was deleted]"}}
        )

async def mark_read(session: AsyncSession, msg_id: str, user_id: int):
    if ObjectId.is_valid(msg_id):
        db = get_mongo_db()
        await db.chat_messages.update_one(
            {"_id": ObjectId(msg_id)},
            {"$addToSet": {"readBy": user_id}}
        )

async def mark_room_read(session: AsyncSession, room_id: int, user_id: int):
    db = get_mongo_db()
    query = {
        "roomId": room_id,
        "isDeleted": False,
        "readBy": {"$ne": user_id}
    }
    # Find messages first to return their IDs
    cursor = db.chat_messages.find(query, {"_id": 1})
    docs = await cursor.to_list(length=None)
    ids = [str(doc["_id"]) for doc in docs]
    
    if ids:
        await db.chat_messages.update_many(query, {"$addToSet": {"readBy": user_id}})
    return ids

async def get_unread_count(session: AsyncSession, room_id: int, user_id: int) -> int:
    db = get_mongo_db()
    query = {
        "roomId": room_id,
        "isDeleted": False,
        "senderId": {"$ne": user_id},
        "readBy": {"$ne": user_id}
    }
    return await db.chat_messages.count_documents(query)

async def get_message_by_id(session: AsyncSession, msg_id: str) -> MockMessage | None:
    if not ObjectId.is_valid(msg_id):
        return None
    db = get_mongo_db()
    doc = await db.chat_messages.find_one({"_id": ObjectId(msg_id)})
    if not doc:
        return None
    sender_cache = await _populate_senders(session, [doc])
    return MockMessage(_serialize_mongo(doc, sender_cache))

async def edit_message(session: AsyncSession, msg_id: str, new_content: str) -> MockMessage | None:
    if not ObjectId.is_valid(msg_id):
        return None
    db = get_mongo_db()
    await db.chat_messages.update_one(
        {"_id": ObjectId(msg_id)},
        {"$set": {"content": new_content, "isEdited": True, "editedAt": datetime.now(timezone.utc)}}
    )
    doc = await db.chat_messages.find_one({"_id": ObjectId(msg_id)})
    if not doc:
        return None
    sender_cache = await _populate_senders(session, [doc])
    return MockMessage(_serialize_mongo(doc, sender_cache))
