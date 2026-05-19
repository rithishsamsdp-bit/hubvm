from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from starlette.status import HTTP_422_UNPROCESSABLE_ENTITY
from fastapi import  Request

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Structure your custom response
    errors = []
    for err in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in err["loc"][1:]),  # skip "body"
            "message": err["msg"]
        })

    return JSONResponse(
        status_code=HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "status": "validation_failed",
            "errors": errors
        }
    )
