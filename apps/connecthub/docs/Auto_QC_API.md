# Auto QC API Documentation

## Overview
The Auto QC API endpoint provides a flexible mechanism to ingest Quality Control statistics. It consumes JSON data, appends standard authentication metrics (like checking token validity and user's account ID), and persists the payloads securely into the `auto_qc` MongoDB collection.

## Authentication
This API enforces JWT Bearer Authentication. Similar to other endpoints in the system, standard Access Tokens are required.
- The `accessToken` must be passed via the `Authorization: Bearer <token>` header or inside browser cookies.
- If the token is missing or expired, a `401 Unauthorized` status will be returned.

---

## Endpoint Details

**HTTP Method:** `POST`
**URL:** `/telephony/auto_qc/insert`
**Content-Type:** `application/json`

### Request Payload
The backend database for Auto QC runs on MongoDB and is intentionally schemaless—any JSON field provided will be safely ingested into the database document. The server automatically attaches standard values like:
- `createdAt`: Current System Timestamp
- `accountId`: Decoded from the provided user's `accessToken`

#### Example Request Body
```json
{
  "campaignId": "CAMP-49202",
  "callId": "123984af-1234-4bc3-982c-callIDXYZ",
  "agentId": "1002",
  "qcStatus": "Passed",
  "score": 85.5,
  "qaComments": "Satisfactory support, minor delay in holding."
}
```

---

## Response Formatting

**1. Success (201 Created)**
When data is fully verified and successfully uploaded to the MongoDB instance.
```json
{
  "status": "success",
  "message": "Data inserted successfully",
  "inserted_id": "60a4c9b3e1f40d1c9cd12b74"
}
```

**2. Unauthorized User (401 Unauthorized)**
```json
{
  "status": "failed",
  "message": "Authentication token missing" 
}
```

**3. Bad Request (400 Bad Request)**
If the request payload contains an empty body or malformed JSON data.
```json
{
  "detail": "Invalid JSON in request body"
}
```

**4. Server Error (500 Internal Server Error)**
If MongoDB encounters an error creating the document (e.g. timeout execution exception).
```json
{
  "detail": "Exception message from MongoDB driver"
}
```
