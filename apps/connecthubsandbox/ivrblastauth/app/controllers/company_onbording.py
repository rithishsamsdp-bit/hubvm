from fastapi import APIRouter ,HTTPException, Request, status, Depends
from fastapi.security import OAuth2PasswordBearer
from typing import Dict,Union
from models import dto
from services import auth_service
from fastapi.responses import JSONResponse
from services import onboard_Service

router = APIRouter(
    prefix="/auth/onboarding",
    tags=["Onboarding"]
)


@router.post("/create", status_code=status.HTTP_201_CREATED, response_model=Dict[str,Union[str, dict]])
async def custOnboarding(request: dto.custOnboarding, tokenRequest: Request)-> Dict[str, Union[str, dict]]:
    try:
        token = tokenRequest.cookies.get("accessToken")
        data = auth_service.decode(token)
        print(type(data))
        if isinstance(data, JSONResponse):
            return data
        else:
            response = onboard_Service.onboarding_CustomerService(request.dict(),'connecthub')

            return response
    except Exception as e:
        raise HTTPException(status_code=500, detail="Unexpected error: " + str(e))
    
@router.post("/validate", status_code=status.HTTP_200_OK, response_model=Dict[str,Union[str, dict]])
async def validate(request: dto.validatecompanycode,  tokenRequest: Request)-> Dict[str, Union[str, dict]]:
    try:
        token = tokenRequest.cookies.get("accessToken")
        data = auth_service.decode(token)
        print(type(data))
        if isinstance(data, JSONResponse):
            return data
        else:
            return JSONResponse(
                    status_code=status.HTTP_200_OK,
                    content={
                    "isValid": "true"
                    }
                )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Unexpected error: " + str(e))