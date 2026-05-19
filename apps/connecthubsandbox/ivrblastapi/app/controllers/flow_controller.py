import json
from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from services import flow_service
from models.dto import FlowCreateRequest, FlowUpdateRequest, FlowDeleteRequest, FlowFetchRequest, FlowFieldCheckRequest
from datetime import datetime

router = APIRouter(
    prefix="/ivrBlast/flow",
    tags=["Flow"]
)

@router.post("/create", status_code=status.HTTP_201_CREATED, response_model=dict)
async def flowCreate(request: FlowCreateRequest, tokenRequest: Request, response: Response):

    # Token Validation Start #
    token = tokenRequest.cookies.get("accessToken")
    data = flow_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    # Token Validation Stop #

    # Flow Data Conversion Start #
    Flow_Data = json.loads(request.flow_data)
    Cleaned_Flow_Data = [
        {"id": items["id"], "type": items["type"], "data": items["data"]}
        for items in Flow_Data
    ]
    Flow_Position = json.loads(request.flow_position)
    Cleaned_Flow_Position = [
        {"source": item["source"], "sourceHandle": item["sourceHandle"], "target": item["target"], "targetHandle": item["targetHandle"]}
        for item in Flow_Position
    ]
    Sorted_Flow_Position = sorted(Cleaned_Flow_Position, key=lambda x: (int(x["source"]), int(x["target"])))

    # Start_Node = "1"
    # Current_Node = Start_Node
    # Change_Node = Start_Node
    # Renamed_Flow_Position = []
    # while len(Renamed_Flow_Position) < len(Sorted_Flow_Position):
    #     Node_Count = len([item for item in Sorted_Flow_Position if item['source'] == Change_Node])
    #     print("_COUNT_")
    #     print(Node_Count)
    #     print("_COUNT_")
    #     if Node_Count < 2:
    #         Node = [copy.deepcopy(item) for item in Sorted_Flow_Position if item['source'] == Change_Node]
    #         if not Node:
    #             print("No matching node found for sourcee:", Current_Node)
    #             break
    #         Node[0]['source'] = Current_Node
    #         Change_Node = Node[0]['target']
    #         Current_Node = str(int(Current_Node) + 1)
    #         Node[0]['target'] = Current_Node
    #         Renamed_Flow_Position.extend(Node)

    #         print(Change_Node)
    #         print(Current_Node)
    #         print(Renamed_Flow_Position)
    #         print(len(Renamed_Flow_Position))
    #         print(len(Sorted_Flow_Position))
    #     else:

    #         def renameMenuNode(Change_Node,Current_Node,Node_Count):
    #             for i in range(Node_Count):
    #                 Node = [copy.deepcopy(item) for item in Sorted_Flow_Position if item['source'] == Change_Node]
    #                 print(Node[i])
    #                 if not Node:
    #                     print("No matching node found for sourcee:", Current_Node)
    #                     break
    #                 Node[i]['source'] = str(int(Change_Node) + 1)
    #                 # Change_Node = Node[0]['target']
    #                 Current_Node = str(int(Current_Node) + 1)
    #                 Node[i]['target'] = Current_Node
    #                 Renamed_Flow_Position.append(Node[i])

    #                 print(Change_Node)
    #                 print(Current_Node)
    #                 print(Renamed_Flow_Position)
    #                 print(len(Renamed_Flow_Position))
    #                 print(len(Sorted_Flow_Position))

    #         renameMenuNode(Change_Node,Current_Node,Node_Count)
    #         Change_Node = str(int(Change_Node) + 1)
    #         Current_Node = str(int(Change_Node) + 1)
    #         print(Change_Node)
    #         print(Current_Node)
            # break
    Nodes = []

    for item in Sorted_Flow_Position:
        source = item.get('source')
        target = item.get('target')
        if source == "1":
            startNode = target
        result = next((item for item in Cleaned_Flow_Data if item["id"] == target), None)
        if result.get('type') == 'IvrGatherinput':
            menuNode = result
            menuNodeId = menuNode["id"]
            menuNodeType = "menu"
            menuNodeData = menuNode["data"]
            menuNodePrompt = []
            menuNodeIvr = json.loads(menuNodeData["GIIvr"])
            menuNodePrompt.append({
                "filename": menuNodeIvr["v_voiceresponseName"],
                "prompt": menuNodeIvr["v_voiceresponseUrl"]
            })
            dtmfMappings = []
            for key, value in menuNodeData["value"].items():
                result = next((item for item in Sorted_Flow_Position if item["source"] == target and item["sourceHandle"] == key), None)  
                dtmfMappings.append({
                    "key": value[0],
                    "targetNode": result["target"]
                })
            Nodes.append({
                "nodeId": menuNodeId,
                "nodeType": menuNodeType,
                "prompts": menuNodePrompt,
                "dtmfMappings": dtmfMappings
            })
        
        if result.get('type') == 'Ivr':
            ivrNode = result
            ivrNodeId = ivrNode["id"]
            ivrNodeType = "message"
            ivrNodeData = ivrNode["data"]
            ivrNodePrompt = []
            ivrNodeIvr = json.loads(ivrNodeData["value"]["Ivr"])
            ivrNodePrompt.append({
                "filename": ivrNodeIvr["v_voiceresponseName"],
                "prompt": ivrNodeIvr["v_voiceresponseUrl"]
            })
            actions = []
            actions.append({
                "actionType": "endCall",
                "target": ""
            })
            Nodes.append({
                "nodeId": ivrNodeId,
                "nodeType": ivrNodeType,
                "prompts": ivrNodePrompt,
                "actions": actions
            })
    timestamp = datetime.utcnow().replace(microsecond=0).isoformat() + 'Z'
    Converted_Flow = {"flowName": request.flow_name, "nodes": Nodes, "startNode": startNode, "timestamp": timestamp}
    # Flow Data Conversion Stop #

    # MySql Logging Start #
    await flow_service.create(
        request.flow_name,
        Converted_Flow,
        Flow_Data,
        Flow_Position,
        data.encryption
    )
    # MySql Logging Stop #

    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={
            "message": f"Flow Created Successfully",
        }
    )

@router.post("/update", status_code=status.HTTP_200_OK, response_model=dict)
async def flowUpdate(request: FlowUpdateRequest, tokenRequest: Request, response: Response):

    # Token Validation Start #
    token = tokenRequest.cookies.get("accessToken")
    data = flow_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    # Token Validation Stop #

    # Flow Data Conversion Start #
    Flow_Data = json.loads(request.flow_data)
    Cleaned_Flow_Data = [
        {"id": items["id"], "type": items["type"], "data": items["data"]}
        for items in Flow_Data
    ]
    Flow_Position = json.loads(request.flow_position)
    Cleaned_Flow_Position = [
        {"source": item["source"], "sourceHandle": item["sourceHandle"], "target": item["target"], "targetHandle": item["targetHandle"]}
        for item in Flow_Position
    ]
    Sorted_Flow_Position = sorted(Cleaned_Flow_Position, key=lambda x: (int(x["source"]), int(x["target"])))

    Nodes = []

    for item in Sorted_Flow_Position:
        source = item.get('source')
        target = item.get('target')
        if source == "1":
            startNode = target
        result = next((item for item in Cleaned_Flow_Data if item["id"] == target), None)
        if result.get('type') == 'IvrGatherinput':
            menuNode = result
            menuNodeId = menuNode["id"]
            menuNodeType = "menu"
            menuNodeData = menuNode["data"]
            menuNodePrompt = []
            menuNodeIvr = json.loads(menuNodeData["GIIvr"])
            menuNodePrompt.append({
                "filename": menuNodeIvr["v_voiceresponseName"],
                "prompt": menuNodeIvr["v_voiceresponseUrl"]
            })
            dtmfMappings = []
            for key, value in menuNodeData["value"].items():
                result = next((item for item in Sorted_Flow_Position if item["source"] == target and item["sourceHandle"] == key), None)  
                dtmfMappings.append({
                    "key": value[0],
                    "targetNode": result["target"]
                })
            Nodes.append({
                "nodeId": menuNodeId,
                "nodeType": menuNodeType,
                "prompts": menuNodePrompt,
                "dtmfMappings": dtmfMappings
            })
        
        if result.get('type') == 'Ivr':
            ivrNode = result
            ivrNodeId = ivrNode["id"]
            ivrNodeType = "message"
            ivrNodeData = ivrNode["data"]
            ivrNodePrompt = []
            ivrNodeIvr = json.loads(ivrNodeData["value"]["Ivr"])
            ivrNodePrompt.append({
                "filename": ivrNodeIvr["v_voiceresponseName"],
                "prompt": ivrNodeIvr["v_voiceresponseUrl"]
            })
            actions = []
            actions.append({
                "actionType": "endCall",
                "target": ""
            })
            Nodes.append({
                "nodeId": ivrNodeId,
                "nodeType": ivrNodeType,
                "prompts": ivrNodePrompt,
                "actions": actions
            })
    timestamp = datetime.utcnow().replace(microsecond=0).isoformat() + 'Z'
    Converted_Flow = {"flowName": request.flow_name, "nodes": Nodes, "startNode": startNode, "timestamp": timestamp}
    # Flow Data Conversion Stop #

    # MySql Logging Start #
    await flow_service.update(
        request.flow_id,
        request.flow_name,
        Converted_Flow,
        Flow_Data,
        Flow_Position,
        data.encryption
    )
    # MySql Logging Stop #

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "message": f"Flow Updated Successfully",
        }
    )

@router.post("/delete", status_code=status.HTTP_200_OK, response_model=dict)
async def flowDelete(request: FlowDeleteRequest, tokenRequest: Request, response: Response):
    
    # Token Validation Start #
    token = tokenRequest.cookies.get("accessToken")
    data = flow_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    # Token Validation Stop #

    # MySql Logging Start #
    await flow_service.delete(
        request.flow_id,
        data.encryption
    )
    # MySql Logging Stop #

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "message": f"Flow Deleted Successfully"
        }
    )

@router.post("/fetch", status_code=status.HTTP_200_OK, response_model=dict)
async def flowFetch(request: FlowFetchRequest, tokenRequest: Request) -> dict:

    # Token Validation Start #
    token = tokenRequest.cookies.get("accessToken")
    data = flow_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    # Token Validation Stop #

    # MySql Fetching Start #
    result = flow_service.fetch(
        request.limit,
        request.offset,
        request.searchString,
        data.encryption
    )
    # MySql Fetching Stop #

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "message": f"Flow Fetched Successfully",
            "data": result
        }
    )

@router.get("/list/voiceresponse", status_code=status.HTTP_200_OK, response_model=dict)
async def flowListVR(tokenRequest: Request) -> dict:

    # Token Validation Start #
    token = tokenRequest.cookies.get("accessToken")
    data = flow_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    # Token Validation Stop #

    # MySql Fetching Start #
    result = flow_service.listVR(
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
async def flowCheck(request: FlowFieldCheckRequest, tokenRequest: Request) -> dict:

    # Token Validation Start #
    token = tokenRequest.cookies.get("accessToken")
    data = flow_service.decode(token)
    if isinstance(data, JSONResponse):
        return data
    # Token Validation Stop #

    # MySql Fetching Start #
    result = flow_service.check(
        request.flow_name,
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