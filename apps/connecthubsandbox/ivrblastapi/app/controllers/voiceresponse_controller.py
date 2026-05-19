import os, boto3, aiohttp, pydub, uuid
from typing import Union
from fastapi import APIRouter, Depends, File, Form, UploadFile, Request, Response, status, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from services import voiceresponse_service
from models.dto import VoiceResponseDeleteRequest, VoiceResponseFetchRequest, VoiceResponseFieldCheckRequest

router = APIRouter(
    prefix="/ivrBlast/voiceresponse",
    tags=["VoiceResponse"]
)

@router.post("/create/uploadfile", status_code=status.HTTP_201_CREATED, response_model=dict)
async def voiceResponseCreateUF(backgroundtasks: BackgroundTasks, tokenRequest: Request, filename: str = Form(...), audioimportfile: Union[UploadFile, None] = File(None), audiolink: Union[str, None] = Form(None)):

    # Token Validation Start #
    token = tokenRequest.cookies.get("accessToken")
    data = voiceresponse_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    # Token Validation Stop #

    # Audio File Validation Start #
    if audioimportfile and audioimportfile.filename != '' :
        audiofile = await audioimportfile.read()
        audiofile_extension = audioimportfile.filename.split('.')[-1]
    elif audiolink and audiolink != '':
        async with aiohttp.ClientSession() as session:
            async with session.get(audiolink) as response:
                if response.status == 200:
                    audiofile = await response.read()
                    audiofile_extension = audiolink.split("/")[-1].split('.')[-1]
                else:
                    return JSONResponse(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        content={
                            "message": f"Accessing Audio From Link Failed"
                        },
                        headers={"WWW-Authenticate": "Bearer"},
                    )
    else:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "message": f"No Audio Input"
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    allowed_extensions = ['wav', 'mp3', 'ogg', 'flac']
    if audiofile_extension not in allowed_extensions:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "message": f"Invalid File Format"
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Audio File Validation Stop #

    audiofile_name = uuid.uuid4()
    file_path = f"/tmp/{audiofile_name}.{audiofile_extension}"
    with open(file_path, "wb") as file:
        file.write(audiofile)

    # WAV Conversion Start #
    wav_file_path = f"/tmp/{filename}.wav"
    audio = pydub.AudioSegment.from_file(file_path)
    audio = audio.set_channels(1).set_frame_rate(8000)
    audio.export(wav_file_path, format="wav")
    os.remove(file_path)
    # WAV Conversion Stop #

    # Audio File Upload Start #
    result = backgroundtasks.add_task(voiceresponse_service.S3Upload, wav_file_path, filename, data.encryption)
    if isinstance(result, JSONResponse):
        return result
    # Audio File Upload Stop #

    # MySql Logging Start #
    await voiceresponse_service.create(
        filename,
        data.encryption
    )
    # MySql Logging Stop #

    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={
            "message": f"Voice Response Created Successfully"
        }
    )

@router.post("/create/texttospeech", status_code=status.HTTP_201_CREATED, response_model=dict)
async def voiceResponseCreateTTS(backgroundtasks: BackgroundTasks, tokenRequest: Request, filename: str = Form(...), responsecontent: str = Form(...)):

    # Token Validation Start #
    token = tokenRequest.cookies.get("accessToken")
    data = voiceresponse_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    # Token Validation Stop #

    # Polly TTS Conversion Start #
    try:
        polly_client = boto3.client(
            "polly",
            region_name="ap-south-1",
            aws_access_key_id="AKIAZNKPUTOKP22FGS7M",
            aws_secret_access_key="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"
        )
        response = polly_client.synthesize_speech(
            Text=responsecontent,
            OutputFormat="mp3",
            VoiceId="Joanna"
        )
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "message": f"Text to Speech Conversion Failed"
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Polly TTS Conversion Stop #

    # mp3_file_path = f"/tmp/{filename}.mp3"
    # with open(mp3_file_path, "wb") as file:
    #     file.write(response["AudioStream"].read())

    # # MP3 To WAV Conversion Start #
    # wav_file_path = f"/tmp/{filename}.wav"
    # audio = pydub.AudioSegment.from_mp3(mp3_file_path)
    # audio = audio.set_channels(1).set_frame_rate(8000)
    # audio.export(wav_file_path, format="wav")
    # os.remove(mp3_file_path)
    # # MP3 To WAV Conversion Stop #

    # # Audio File Upload Start #
    # result = backgroundtasks.add_task(voiceresponse_service.S3Upload, wav_file_path, filename, data.encryption)
    # if isinstance(result, JSONResponse):
    #     return result
    # # Audio File Upload Stop #

    # MySql Logging Start #
    await voiceresponse_service.create(
        filename,
        data.encryption
    )
    # MySql Logging Stop #

    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={
            "message": f"Voice Response Created Successfully"
        }
    )

@router.post("/delete", status_code=status.HTTP_200_OK, response_model=dict)
async def voiceResponseDelete(backgroundtasks: BackgroundTasks, tokenRequest: Request, request: VoiceResponseDeleteRequest, response: Response):

    # Token Validation Start #
    token = tokenRequest.cookies.get("accessToken")
    data = voiceresponse_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    # Token Validation Stop #

    # Audio File Delete Start #
    result = backgroundtasks.add_task(voiceresponse_service.S3Delete, request.voiceresponsename, data.encryption)
    if isinstance(result, JSONResponse):
        return result
    # Audio File Delete Stop #

    # MySql Logging Start #
    await voiceresponse_service.delete(
        request.voiceresponseid,
        request.voiceresponsename,
        data.encryption
    )
    # MySql Logging Stop #

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "message": f"Voice Response Deleted Successfully"
        }
    )

@router.post("/fetch", status_code=status.HTTP_200_OK, response_model=dict)
async def voiceResponseFetch(tokenRequest: Request, request: VoiceResponseFetchRequest) -> dict:

    # Token Validation Start #
    token = tokenRequest.cookies.get("accessToken")
    data = voiceresponse_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    # Token Validation Stop #

    # MySql Fetching Start #
    result = voiceresponse_service.fetch(
        request.limit,
        request.offset,
        request.searchString,
        data.encryption
    )
    # MySql Fetching Stop #

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "message": f"Voice Response Fetched Successfully",
            "data": result
        }
    )

@router.post("/check", status_code=status.HTTP_200_OK, response_model=dict)
async def voiceResponseCheck(request: VoiceResponseFieldCheckRequest, tokenRequest: Request) -> dict:

    # Token Validation Start #
    token = tokenRequest.cookies.get("accessToken")
    data = voiceresponse_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    # Token Validation Stop #

    # MySql Fetching Start #
    result = voiceresponse_service.check(
        request.voiceresponsename,
        data.encryption
    )
    # MySql Fetching Stop #

    if result["uniqueConstraint"] == "Yes":
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Unique Constraint Triggered",
                "data": result["data"]
            }
        )
    else:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Successful"
            }
        )