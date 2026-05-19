import ESL

HOST = "15.206.176.146"
PORT = "8021"
PASSWORD = "Pulse#$2024"

# Connect to FreeSWITCH
con = ESL.ESLconnection(HOST, PORT, PASSWORD)

if con.connected():
    print("Connected to FreeSWITCH ESL")

    # Send a simple API command
    response = con.api("status")
    print("FreeSWITCH Status:\n")
    print(response.getBody())

else:
    print("Connection Failed")