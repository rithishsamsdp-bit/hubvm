from fastapi import status, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from models.dto import TokenModel
from repos import callflow_repo
from io import BytesIO
from pydub import AudioSegment
import jwt, uuid, os, shutil, boto3, xml.etree.ElementTree as ET

EFS_BASE_DIR = "/opt/freeswitch/storage"
os.makedirs(EFS_BASE_DIR, exist_ok=True)

polly_client = boto3.client(
    "polly",
    region_name="ap-south-1",
    aws_access_key_id="AKIAZNKPUTOKP22FGS7M",
    aws_secret_access_key="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"
)

SECRET_KEY = "SomeRandomSalt"
ALGORITHM = "HS256"

def decode(token: str):
    try:
        token_data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return TokenModel(**token_data)
    except jwt.ExpiredSignatureError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "message": "Token Expired"
            }
        )
    except jwt.InvalidTokenError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "message": "Token Invalid"
            }
        )

async def create(callflowname: str, callflowdata: dict, accountid: int, accountno: str, database: str):
    return await callflow_repo.create(callflowname, callflowdata, accountid, accountno, database)

async def update(callflowid: int, callflowname: str, callflowdata: dict, accountid: int, accountno: str, database: str):
    return await callflow_repo.update(callflowid, callflowname, callflowdata, accountid, accountno, database)

async def delete(callflowid: int, accountid: int, accountno: str, database:str):
    return await callflow_repo.delete(callflowid, accountid, accountno, database)

async def fetch(limit: int, offset: int, sortField: str, sortOrder: str, searchString: any, accountid: int, accountno: str, database: str):
    return await callflow_repo.fetch(limit, offset, sortField, sortOrder, searchString, accountid, accountno, database)

async def getCallFlow(callflowid: int, accountid: int, accountno: str, database: str):
    return await callflow_repo.getCallFlow(callflowid, accountid, accountno, database)

async def listQueueGroups(accountid: int, accountno: str, database: str):
    return await callflow_repo.listQueueGroups(accountid, accountno, database)

# async def modifywithFilePath(callflowname: str, callflowdata: dict, accountid: int, accountno: str, proxydirectory: str):
#     foldername = f"{callflowname.strip()}_{accountid}"
#     nodes = callflowdata.get("nodes", [])
#     TARGET_BASE = os.path.join(EFS_BASE_DIR, proxydirectory, "voiceresponse")
#     os.makedirs(os.path.join(TARGET_BASE, foldername), exist_ok=True)
#     LABELS = {"Keypad (IVR)", "Audio Message"}
#     for node in nodes:
#         data = node.get("data", {})
#         label = data.get("label")
#         node_type = node.get("type")
        
#         if label in LABELS or node_type in ["keypad", "audioMsg"]:
#             # Handle Instruction Message
#             instruction = data.get("instructionMsg")
#             if instruction and not str(instruction).startswith("/"):
#                 randomname = uuid.uuid4().hex
#                 filename = f"{callflowname.strip()}_{accountid}_{randomname}.wav"
#                 filepath = os.path.join(TARGET_BASE, foldername, filename)
#                 node["data"]["path"] = filepath
            
#             # Handle Reminder Message (for Keypad nodes)
#             reminder = data.get("reminderMessage")
#             if reminder and not str(reminder).startswith("/"):
#                 randomname = uuid.uuid4().hex
#                 filename = f"rem_{callflowname.strip()}_{accountid}_{randomname}.wav"
#                 filepath = os.path.join(TARGET_BASE, foldername, filename)
#                 node["data"]["reminderPath"] = filepath

#         # Handle Queue Busy Message
#         if node_type in ["ringTo"]:
#             ringfor = data.get("ringFor")
#             if ringfor in ["queue"]:
#                 busy = data.get("busyAnnouncement", {})
#                 busyoption = busy.get("option")
#                 if busyoption == "True":
#                     instructionMsg = busy.get("instructionMsg")
#                     if instructionMsg and not str(instructionMsg).startswith("/"):
#                         randomname = uuid.uuid4().hex
#                         filename = f"{callflowname.strip()}_{accountid}_{randomname}.wav"
#                         filepath = os.path.join(TARGET_BASE, foldername, filename)
#                         node["data"]["busyAnnouncement"]["path"] = filepath
            
#                 unavailable = data.get("unavailableAnnouncement", {})
#                 unavailableoption = unavailable.get("option")
#                 if unavailableoption == "True":
#                     instructionMsg = unavailable.get("instructionMsg")
#                     if instructionMsg and not str(instructionMsg).startswith("/"):
#                         randomname = uuid.uuid4().hex
#                         filename = f"{callflowname.strip()}_{accountid}_{randomname}.wav"
#                         filepath = os.path.join(TARGET_BASE, foldername, filename)
#                         node["data"]["unavailableAnnouncement"]["path"] = filepath

#     return callflowdata


async def modifywithFilePath(callflowname: str, callflowdata: dict, accountid: int, accountno: str, proxydirectory: str):
    foldername = f"{callflowname.strip()}_{accountid}"
    nodes = callflowdata.get("nodes", [])
    TARGET_BASE = os.path.join(EFS_BASE_DIR, proxydirectory, "voiceresponse")
    os.makedirs(os.path.join(TARGET_BASE, foldername), exist_ok=True)
    LABELS = {"Keypad (IVR)", "Audio Message"}
    for node in nodes:
        data = node.get("data", {})
        label = data.get("label")
        node_type = node.get("type")

        if node_type in ["audioMsg", "voicemail"]:
            voicemessageType = data.get("messageType")
            if voicemessageType == "tts":
                # Handle Instruction Message
                instruction = data.get("instructionMsg")
                if instruction and not str(instruction).startswith("/"):
                    randomname = uuid.uuid4().hex
                    filename = f"{callflowname.strip()}_{accountid}_{randomname}.wav"
                    filepath = os.path.join(TARGET_BASE, foldername, filename)
                    node["data"]["path"] = filepath
            elif voicemessageType == "audio":
                tmp_filepath = data.get("path")
                folder, filename = os.path.split(tmp_filepath)
                tmp_foldername = f"{foldername}_tmp"
                tmp_folderpath = os.path.join(TARGET_BASE, tmp_foldername)
                new_tmp_filepath = os.path.join(tmp_folderpath, filename)
                if os.path.exists(tmp_filepath) and not os.path.exists(new_tmp_filepath):
                    if not os.path.exists(tmp_folderpath):
                        os.makedirs(tmp_folderpath, exist_ok=True)
                    shutil.move(tmp_filepath, new_tmp_filepath)
                    node["data"]["tmpPath"] = new_tmp_filepath
                else:
                    node["data"]["tmpPath"] = tmp_filepath
                newfolder = folder.replace(f"{foldername}_tmp", f"{foldername}")
                newpath = os.path.join(newfolder, filename)
                node["data"]["path"] = newpath

        if node_type in ["keypad"]:
            # Handle Instruction Message
            instructionMsgType = data.get("instructionMsgType")
            if instructionMsgType == "tts":
                instruction = data.get("instructionMsg")
                if instruction and not str(instruction).startswith("/"):
                    randomname = uuid.uuid4().hex
                    filename = f"{callflowname.strip()}_{accountid}_{randomname}.wav"
                    filepath = os.path.join(TARGET_BASE, foldername, filename)
                    node["data"]["path"] = filepath
            elif instructionMsgType == "audio":
                tmp_filepath = data.get("path")
                folder, filename = os.path.split(tmp_filepath)
                tmp_foldername = f"{foldername}_tmp"
                tmp_folderpath = os.path.join(TARGET_BASE, tmp_foldername)
                new_tmp_filepath = os.path.join(tmp_folderpath, filename)
                if os.path.exists(tmp_filepath) and not os.path.exists(new_tmp_filepath):
                    if not os.path.exists(tmp_folderpath):
                        os.makedirs(tmp_folderpath, exist_ok=True)
                    shutil.move(tmp_filepath, new_tmp_filepath)
                    node["data"]["tmpPath"] = new_tmp_filepath
                else:
                    node["data"]["tmpPath"] = tmp_filepath
                newfolder = folder.replace(f"{foldername}_tmp", f"{foldername}")
                newpath = os.path.join(newfolder, filename)
                node["data"]["path"] = newpath

            # Handle Reminder Message (for Keypad nodes)
            reminderMsgType = data.get("reminderMsgType")
            if reminderMsgType == "tts":
                reminder = data.get("reminderMessage")
                if reminder and not str(reminder).startswith("/"):
                    randomname = uuid.uuid4().hex
                    filename = f"{callflowname.strip()}_{accountid}_{randomname}.wav"
                    filepath = os.path.join(TARGET_BASE, foldername, filename)
                    node["data"]["reminderPath"] = filepath
            elif reminderMsgType == "audio":
                tmp_filepath = data.get("reminderPath")
                folder, filename = os.path.split(tmp_filepath)
                tmp_foldername = f"{foldername}_tmp"
                tmp_folderpath = os.path.join(TARGET_BASE, tmp_foldername)
                new_tmp_filepath = os.path.join(tmp_folderpath, filename)
                if os.path.exists(tmp_filepath) and not os.path.exists(new_tmp_filepath):
                    if not os.path.exists(tmp_folderpath):
                        os.makedirs(tmp_folderpath, exist_ok=True)
                    shutil.move(tmp_filepath, new_tmp_filepath)
                    node["data"]["tmpreminderPath"] = new_tmp_filepath
                else:
                    node["data"]["tmpreminderPath"] = tmp_filepath
                newfolder = folder.replace(f"{foldername}_tmp", f"{foldername}")
                newpath = os.path.join(newfolder, filename)
                node["data"]["reminderPath"] = newpath

        # Handle Queue Busy Message
        if node_type in ["ringTo"]:
            ringfor = data.get("ringFor")
            if ringfor in ["queue"]:
                busy = data.get("busyAnnouncement", {})
                busyoption = busy.get("option")
                if busyoption == "True":
                    voicemessageType = busy.get("messageType")
                    if voicemessageType == "tts":
                        instructionMsg = busy.get("instructionMsg")
                        if instructionMsg and not str(instructionMsg).startswith("/"):
                            randomname = uuid.uuid4().hex
                            filename = f"{callflowname.strip()}_{accountid}_{randomname}.wav"
                            filepath = os.path.join(TARGET_BASE, foldername, filename)
                            node["data"]["busyAnnouncement"]["path"] = filepath
                    elif voicemessageType == "audio":
                        tmp_filepath = busy.get("path")
                        folder, filename = os.path.split(tmp_filepath)
                        tmp_foldername = f"{foldername}_tmp"
                        tmp_folderpath = os.path.join(TARGET_BASE, tmp_foldername)
                        new_tmp_filepath = os.path.join(tmp_folderpath, filename)
                        if os.path.exists(tmp_filepath) and not os.path.exists(new_tmp_filepath):
                            if not os.path.exists(tmp_folderpath):
                                os.makedirs(tmp_folderpath, exist_ok=True)
                            shutil.move(tmp_filepath, new_tmp_filepath)
                            node["data"]["busyAnnouncement"]["tmpPath"] = new_tmp_filepath
                        else:
                            node["data"]["busyAnnouncement"]["tmpPath"] = tmp_filepath
                        newfolder = folder.replace(f"{foldername}_tmp", f"{foldername}")
                        newpath = os.path.join(newfolder, filename)
                        node["data"]["busyAnnouncement"]["path"] = newpath
                
                unavailable = data.get("unavailableAnnouncement", {})
                unavailableoption = unavailable.get("option")
                if unavailableoption == "True":
                    voicemessageType = unavailable.get("messageType")
                    if voicemessageType == "tts":
                        instructionMsg = unavailable.get("instructionMsg")
                        if instructionMsg and not str(instructionMsg).startswith("/"):
                            randomname = uuid.uuid4().hex
                            filename = f"{callflowname.strip()}_{accountid}_{randomname}.wav"
                            filepath = os.path.join(TARGET_BASE, foldername, filename)
                            node["data"]["unavailableAnnouncement"]["path"] = filepath
                    elif voicemessageType == "audio":
                        tmp_filepath = unavailable.get("path")
                        folder, filename = os.path.split(tmp_filepath)
                        tmp_foldername = f"{foldername}_tmp"
                        tmp_folderpath = os.path.join(TARGET_BASE, tmp_foldername)
                        new_tmp_filepath = os.path.join(tmp_folderpath, filename)
                        if os.path.exists(tmp_filepath) and not os.path.exists(new_tmp_filepath):
                            if not os.path.exists(tmp_folderpath):
                                os.makedirs(tmp_folderpath, exist_ok=True)
                            shutil.move(tmp_filepath, new_tmp_filepath)
                            node["data"]["unavailableAnnouncement"]["tmpPath"] = new_tmp_filepath
                        else:
                            node["data"]["unavailableAnnouncement"]["tmpPath"] = tmp_filepath
                        newfolder = folder.replace(f"{foldername}_tmp", f"{foldername}")
                        newpath = os.path.join(newfolder, filename)
                        node["data"]["unavailableAnnouncement"]["path"] = newpath

    return callflowdata

async def createVoiceResponse(callflowdata: dict):
    nodes = callflowdata.get("nodes", [])
    LABELS = {"Keypad (IVR)", "Audio Message", ""}
    tmp_folder = ""
    for node in nodes:
        data = node.get("data", {})
        label = data.get("label")
        node_type = node.get("type")
        
        if node_type in ["audioMsg", "voicemail"]:
            voicemessageType = data.get("messageType")
            if voicemessageType == "tts":
                # Synthesize Instruction Message
                instruction = data.get("instructionMsg")
                filepath = data.get("path")
                if instruction and filepath and not str(instruction).startswith("/"):
                    try:
                        os.makedirs(os.path.dirname(filepath), exist_ok=True)
                        response = polly_client.synthesize_speech(
                            Text=instruction,
                            OutputFormat="mp3",
                            VoiceId="Joanna"
                        )
                        mp3_bytes = BytesIO(response["AudioStream"].read())
                        audio = AudioSegment.from_file(mp3_bytes, format="mp3")
                        audio = audio.set_channels(1).set_frame_rate(8000)
                        audio.export(filepath, format="wav")
                    except Exception as e:
                        print(f"Error creating instruction audio: {e}")
            elif voicemessageType == "audio":
                filepath = data.get("path")
                tmp_filepath = data.get("tmpPath")
                if tmp_filepath and os.path.isfile(tmp_filepath):
                    os.makedirs(os.path.dirname(filepath), exist_ok=True)
                    shutil.move(tmp_filepath, filepath)
                    tmp_folder = os.path.dirname(tmp_filepath)
                if "tmpPath" in data:
                    del data["tmpPath"]

        if node_type in ["keypad"]:
            instructionMsgType = data.get("instructionMsgType")
            if instructionMsgType == "tts":
                # Synthesize Instruction Message
                instruction = data.get("instructionMsg")
                filepath = data.get("path")
                if instruction and filepath and not str(instruction).startswith("/"):
                    try:
                        os.makedirs(os.path.dirname(filepath), exist_ok=True)
                        response = polly_client.synthesize_speech(
                            Text=instruction,
                            OutputFormat="mp3",
                            VoiceId="Joanna"
                        )
                        mp3_bytes = BytesIO(response["AudioStream"].read())
                        audio = AudioSegment.from_file(mp3_bytes, format="mp3")
                        audio = audio.set_channels(1).set_frame_rate(8000)
                        audio.export(filepath, format="wav")
                    except Exception as e:
                        print(f"Error creating instruction audio: {e}")
            elif instructionMsgType == "audio":
                filepath = data.get("path")
                tmp_filepath = data.get("tmpPath")
                if tmp_filepath and os.path.isfile(tmp_filepath):
                    os.makedirs(os.path.dirname(filepath), exist_ok=True)
                    shutil.move(tmp_filepath, filepath)
                    tmp_folder = os.path.dirname(tmp_filepath)
                if "tmpPath" in data:
                    del data["tmpPath"]
            reminderMsgType = data.get("reminderMsgType")
            if reminderMsgType == "tts":
                # Synthesize Reminder Message
                reminder = data.get("reminderMessage")
                rem_filepath = data.get("reminderPath")
                if reminder and rem_filepath and not str(reminder).startswith("/"):
                    try:
                        os.makedirs(os.path.dirname(rem_filepath), exist_ok=True)
                        response = polly_client.synthesize_speech(
                            Text=reminder,
                            OutputFormat="mp3",
                            VoiceId="Joanna"
                        )
                        mp3_bytes = BytesIO(response["AudioStream"].read())
                        audio = AudioSegment.from_file(mp3_bytes, format="mp3")
                        audio = audio.set_channels(1).set_frame_rate(8000)
                        audio.export(rem_filepath, format="wav")
                    except Exception as e:
                        print(f"Error creating reminder audio: {e}")
            elif reminderMsgType == "audio":
                filepath = data.get("reminderPath")
                tmp_filepath = data.get("tmpreminderPath")
                if tmp_filepath and os.path.isfile(tmp_filepath):
                    os.makedirs(os.path.dirname(filepath), exist_ok=True)
                    shutil.move(tmp_filepath, filepath)
                    tmp_folder = os.path.dirname(tmp_filepath)
                if "tmpreminderPath" in data:
                    del data["tmpreminderPath"]

        if node_type in ["ringTo"]:
            ringfor = data.get("ringFor")
            if ringfor in ["queue"]:
                busy = data.get("busyAnnouncement", {})
                busyoption = busy.get("option")
                if busyoption == "True":
                    voicemessageType = busy.get("messageType")
                    if voicemessageType == "tts":
                        instruction = busy.get("instructionMsg")
                        filepath = busy.get("path")
                        if instruction and filepath and not str(instruction).startswith("/"):
                            try:
                                os.makedirs(os.path.dirname(filepath), exist_ok=True)
                                response = polly_client.synthesize_speech(
                                    Text=instruction,
                                    OutputFormat="mp3",
                                    VoiceId="Joanna"
                                )
                                mp3_bytes = BytesIO(response["AudioStream"].read())
                                audio = AudioSegment.from_file(mp3_bytes, format="mp3")
                                audio = audio.set_channels(1).set_frame_rate(8000)
                                audio.export(filepath, format="wav")
                            except Exception as e:
                                print(f"Error creating instruction audio: {e}")
                    elif voicemessageType == "audio":
                        filepath = busy.get("path")
                        tmp_filepath = busy.get("tmpPath")
                        if tmp_filepath and os.path.isfile(tmp_filepath):
                            os.makedirs(os.path.dirname(filepath), exist_ok=True)
                            shutil.move(tmp_filepath, filepath)
                            tmp_folder = os.path.dirname(tmp_filepath)
                        if "tmpPath" in busy:
                            del busy["tmpPath"]
                unavailable = data.get("unavailableAnnouncement", {})
                unavailableoption = unavailable.get("option")
                if unavailableoption == "True":
                    voicemessageType = unavailable.get("messageType")
                    if voicemessageType == "tts":
                        instruction = unavailable.get("instructionMsg")
                        filepath = unavailable.get("path")
                        if instruction and filepath and not str(instruction).startswith("/"):
                            try:
                                os.makedirs(os.path.dirname(filepath), exist_ok=True)
                                response = polly_client.synthesize_speech(
                                    Text=instruction,
                                    OutputFormat="mp3",
                                    VoiceId="Joanna"
                                )
                                mp3_bytes = BytesIO(response["AudioStream"].read())
                                audio = AudioSegment.from_file(mp3_bytes, format="mp3")
                                audio = audio.set_channels(1).set_frame_rate(8000)
                                audio.export(filepath, format="wav")
                            except Exception as e:
                                print(f"Error creating instruction audio: {e}")
                    elif voicemessageType == "audio":
                        filepath = unavailable.get("path")
                        tmp_filepath = unavailable.get("tmpPath")
                        if tmp_filepath and os.path.isfile(tmp_filepath):
                            os.makedirs(os.path.dirname(filepath), exist_ok=True)
                            shutil.move(tmp_filepath, filepath)
                            tmp_folder = os.path.dirname(tmp_filepath)
                        if "tmpPath" in unavailable:
                            del unavailable["tmpPath"]

    if (
        os.path.isdir(tmp_folder)
        and tmp_folder.startswith(EFS_BASE_DIR)
        and tmp_folder.endswith("_tmp")
    ):
        shutil.rmtree(tmp_folder)

async def deleteVoiceResponse(callflowname: str, accountid: int, proxydirectory: str):
    TARGET_PATH = os.path.join(EFS_BASE_DIR, proxydirectory, "voiceresponse")
    os.makedirs(TARGET_PATH, exist_ok=True)
    foldername = f"{callflowname.strip()}_{accountid}"
    filepath = os.path.join(TARGET_PATH, foldername)
    if os.path.exists(filepath):
        shutil.rmtree(filepath)

async def previewVoiceResponse(content: str, voiceid: str, language: str, engine: str):
    if content:
        response = polly_client.synthesize_speech(
            Text=content,
            OutputFormat="mp3",
            VoiceId=voiceid,
            LanguageCode=language,
            Engine=engine
        )
        mp3_bytes = BytesIO(response["AudioStream"].read())
        return mp3_bytes

async def uploadfileCreate(callflowname: str, file: UploadFile, proxydirectory: str, accountid: int):
    try:
        randomname = uuid.uuid4().hex
        filename = f"{callflowname.strip()}_{accountid}_{randomname}.wav"
        TARGET_BASE = os.path.join(EFS_BASE_DIR, proxydirectory, "voiceresponse")
        foldername = f"{callflowname.strip()}_{accountid}_tmp"
        filepath = os.path.join(TARGET_BASE, foldername, filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        file_bytes = await file.read()
        audio = AudioSegment.from_file(BytesIO(file_bytes))
        audio = audio.set_channels(1).set_frame_rate(8000)
        audio.export(filepath, format="wav")
        return {"filepath": filepath}
    except Exception as e:
        return {"error": str(e)}

async def uploadfileDelete(request: dict):
    try:
        filepath = request.filepath
        if not filepath.startswith(EFS_BASE_DIR):
            raise HTTPException(status_code=400, detail="Invalid file path")
        if not os.path.isfile(filepath):
            raise HTTPException(status_code=404, detail="File not found")
        os.remove(filepath)
    except Exception as e:
        return {"error": str(e)}

async def uploadfilePreview(request: dict):
    filepath = request.filepath
    if not filepath.startswith(EFS_BASE_DIR):
        raise HTTPException(status_code=400, detail="Invalid file path")
    if not os.path.isfile(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    try:
        audio = AudioSegment.from_file(filepath)
        mp3_io = BytesIO()
        audio.export(mp3_io, format="mp3")
        mp3_io.seek(0)
        return mp3_io
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))