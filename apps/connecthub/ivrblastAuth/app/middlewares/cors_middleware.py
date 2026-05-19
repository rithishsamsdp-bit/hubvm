from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


# function for enabling CORS on web server
def add(app: FastAPI):

    origins= [
        "http://connecthub.pulsework360.com",
        "https://connecthub.pulsework360.com",
        "http://localhost:5173",
        "https://connecthub-ivr.pulsework360.com",
        "https://connecthubtest-ivr.pulsework360.com"
    ]

    app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"])
