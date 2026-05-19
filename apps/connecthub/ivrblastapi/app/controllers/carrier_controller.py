import os
from fastapi import APIRouter, Request, Response, status
from fastapi.responses import JSONResponse
from services import carrier_service, xml_service
from models.dto import CarrierCreateRequest, CarrierUpdateRequest, CarrierDeleteRequest, CarrierFetchRequest, CarierFieldCheckRequest

router = APIRouter(
    prefix="/ivrBlast/carrier",
    tags=["Carrier"]
)

@router.post("/create", status_code=status.HTTP_201_CREATED, response_model=dict)
async def carrierCreate(request: CarrierCreateRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = carrier_service.decode(token)
    if isinstance(data, JSONResponse):
        return data

    xml_filename = f"{request.carriername}.xml"

    xml_content = f"""<include>
    <gateway name="{request.carriername}">
        <param name="username" value="{request.carriername}"/>
        <param name="password" value="{request.carriersecret}"/>
        <param name="realm" value="{request.carrierhost}"/>
        <param name="proxy" value="{request.carrierhost}:{request.carrierport}"/>
        <param name="register" value="false"/>
        <param name="context" value="Pulse-Inbound"/>
        <param name="caller-id-in-from" value="true"/>
        <param name="extension" value="{request.carriername}"/>
    </gateway>
</include>"""

    xml_response = xml_service.create_and_upload_xml(xml_filename, xml_content)

    if "error" in xml_response:
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"message": "Failed to upload XML", "error": xml_response["error"]})

    await carrier_service.create(
        request.carriername,
        request.carriersecret,
        request.carrierhost,
        request.carrierport,
        request.carrierprefix,
        data.encryption
    )

    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={"message": "Carrier Created Successfully"}
    )

@router.post("/update", status_code=status.HTTP_200_OK, response_model=dict)
async def carrierUpdate(request: CarrierUpdateRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = carrier_service.decode(token)
    if isinstance(data, JSONResponse):
        return data

    current_carrier = await carrier_service.get_carrier_by_id(request.carrierid, data.encryption)
    if not current_carrier:
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"message": "Carrier not found"})

    old_carriername = current_carrier["carriername"]
    new_carriername = request.carriername

    xml_filename = f"{new_carriername}.xml"

    xml_content = f"""<include>
    <gateway name="{request.carriername}">
        <param name="username" value="{request.carriername}"/>
        <param name="password" value="{request.carriersecret}"/>
        <param name="realm" value="{request.carrierhost}"/>
        <param name="proxy" value="{request.carrierhost}:{request.carrierport}"/>
        <param name="register" value="false"/>
        <param name="context" value="Pulse-Inbound"/>
        <param name="caller-id-in-from" value="true"/>
        <param name="extension" value="{request.carriername}"/>
    </gateway>
</include>"""

    if old_carriername != new_carriername:
        xml_service.delete_xml_from_server(f"{old_carriername}.xml")

    xml_response = xml_service.create_and_upload_xml(xml_filename, xml_content)

    if "error" in xml_response:
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"message": "Failed to update XML", "error": xml_response["error"]})

    await carrier_service.update(
        request.carrierid,
        new_carriername,
        request.carriersecret,
        request.carrierhost,
        request.carrierport,
        request.carrierprefix,
        data.encryption
    )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "Carrier Updated Successfully"}
    )

@router.post("/delete", status_code=status.HTTP_200_OK, response_model=dict)
async def carrierDelete(request: CarrierDeleteRequest, tokenRequest: Request, response: Response):
    token = tokenRequest.cookies.get("accessToken")
    data = carrier_service.decode(token)
    if isinstance(data, JSONResponse):
        return data

    current_carrier = await carrier_service.get_carrier_by_id(request.carrierid, data.encryption)
    if not current_carrier:
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"message": "Carrier not found"})

    carriername = current_carrier["carriername"]

    xml_response = xml_service.delete_xml_from_server(f"{carriername}.xml")

    if "error" in xml_response:
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"message": "Failed to delete XML", "error": xml_response["error"]})

    await carrier_service.delete(
        request.carrierid,
        data.encryption
    )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "Carrier Deleted Successfully"}
    )

@router.post("/fetch", status_code=status.HTTP_200_OK, response_model=dict)
async def carrierFetch(request: CarrierFetchRequest, tokenRequest: Request) -> dict:

    token = tokenRequest.cookies.get("accessToken")
    data = carrier_service.decode(token)
    if isinstance(data, JSONResponse):
        return data

    result = carrier_service.fetch(
        request.limit,
        request.offset,
        request.searchString,
        data.encryption
    )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "message": f"Carrier Fetched Successfully",
            "data": result
        }
    )

@router.post("/check", status_code=status.HTTP_200_OK, response_model=dict)
async def carrierCheck(request: CarierFieldCheckRequest, tokenRequest: Request) -> dict:

    token = tokenRequest.cookies.get("accessToken")
    data = carrier_service.decode(token)
    if isinstance(data, JSONResponse):
        return data

    result = carrier_service.check(
        request.carriername,
        data.encryption
    )

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
