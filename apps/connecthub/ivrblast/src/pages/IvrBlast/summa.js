import React, { useCallback, useContext, useState, useRef, useEffect } from "react";
import ReactFlow, {
    addEdge,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    updateEdge,
    MarkerType, Position,
    ConnectionLineType
} from 'reactflow';
import 'reactflow/dist/style.css';
import Gatherinput from "./call flow components/Gatherinput.jsx";
import Dail from "./call flow components/Dail.jsx";
import Queue from "./call flow components/Queue.jsx";
import Voicemail from "./call flow components/Voicemail.jsx";
import Hangup from "./call flow components/Hangup.jsx"
import Ivr from "./call flow components/Ivr.jsx";
import Recording from "./call flow components/Recording.jsx";
import Api from "./call flow components/Api.jsx";
import Variables from "./call flow components/Variables.jsx";
import Start from "./call flow components/Start.jsx";
import userContext from "../../Contexter.js";
import "./style/Ivrflow.css";
import { Select, Switch } from "antd";
import axios from "axios";
const initialEdges = [

];







const initialInput = {
    id: "1",
    type: "Gatherinput",
    data: { GIIvr: "Not selected", replay: "false", replayvalue: "", timeout: "", option: "", value: { 1: ["", ""] } },
    position: { x: 250, y: 25 },
};

const Daill = {
    id: "1",
    type: "Dail",
    data: {
        value: { agent: "Not selected", ringtime: "", option: "" }
    },
    position: { x: 300, y: 30 }
};

const Queuee = {
    id: "1",
    type: "Queue",
    data: { value: { agent: "Not selected", ringtime: "", option: "" } },
    position: { x: 300, y: 30 }
};

const Voicemaill = {
    id: "1",
    type: "Voicemail",
    data: { value: { agent: "Not selected", ringtime: "", option: "" } },
    position: { x: 300, y: 30 }
};

const Hangupp = {
    id: "1",
    type: "Hangup",
    data: { value: "Hnagup" },
    position: { x: 300, y: 30 }
};

const Startt = {
    id: "1",
    type: "Start",
    data: { value: "Call Flow Start" },
    position: { x: 300, y: 30 }
};

const Ivrr = {
    id: "1",
    type: "Ivr",
    data: { value: { Ivr: "Not selected" } },
    position: { x: 300, y: 30 }
};

const Recordingg = {
    id: "1",
    type: "Recording",
    data: { value: { Recording: "yes", option: "" } },
    position: { x: 300, y: 30 }
};

const Apii = {
    id: "1",
    type: "Api",
    data: { value: { Method: "Not selected", URL: "", AdditionalData: "" } },
    position: { x: 300, y: 30 }
};

const variabless = {
    id: "1",
    type: "Variables",
    data: { value: { key: "", value: "" } },
    position: { x: 400, y: 30 }
};

const nodeTypes = {
    Gatherinput: Gatherinput,
    Dail: Dail,
    Queue: Queue,
    Voicemail: Voicemail,
    Hangup: Hangup,
    Ivr: Ivr,
    Recording: Recording,
    Api: Api,
    Start: Start,
    Variables: Variables
};


const numbers = [
    {
        value: '0',
        label: '0',
        key: '0'
    },
    {
        value: '1',
        label: '1',
        key: '1'
    },
    {
        value: '2',
        label: '2',
        key: '2'
    },
    {
        value: '3',
        label: '3',
        key: '3'
    },
    {
        value: '4',
        label: '4',
        key: '4'
    },
    {
        value: '5',
        label: '5',
        key: '5'
    },
    {
        value: '6',
        label: '6',
        key: '6'
    },
    {
        value: '7',
        label: '7',
        key: '7'
    },
    {
        value: '8',
        label: '8',
        key: '8'
    },
    {
        value: '9',
        label: '9',
        key: '9'
    },
    {
        value: 'Not selected',
        label: 'Not selected',
        key: 'Not selected'
    }
]

const onInit = (reactFlowInstance) => console.log('flow loaded:', reactFlowInstance);


const Ivrflow = () => {
    const edgeUpdateSuccessful = useRef(true);
    const contexter = useContext(userContext);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [showDiv, setShowDiv] = useState(false);
    const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);
    const [AgentDetails, setAgentDetails] = useState();
    const [QueueName, setQueueName] = useState();
    const [ivrName, setivrName] = useState();


    const fetchData = async () => {
        try {
            const response = await axios.get('https://connecthub.pulsework360.com/skiluhhh');
            console.log(response.data);
            setAgentDetails(response.data.AgentDetails && response.data.AgentDetails.length > 0 
                ? response.data.AgentDetails 
                : []);

            setQueueName(response.data.QueueName && response.data.QueueName.length > 0 ? response.data.QueueName :[] );
            setivrName(response.data.ivrName && response.data.ivrName.length > 0 ? response.data.ivrName :[]);
        } catch (error) {
            console.error('Error fetching data:', error);
            setAgentDetails([]);
            setQueueName([]);
            setivrName([])

        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onEdgeUpdateStart = useCallback(() => {
        edgeUpdateSuccessful.current = false;
    }, []);

    const onEdgeUpdate = useCallback((oldEdge, newConnection) => {
        edgeUpdateSuccessful.current = true;
        setEdges((els) => updateEdge(oldEdge, newConnection, els));
    }, []);

    const onEdgeUpdateEnd = useCallback((_, edge) => {
        if (!edgeUpdateSuccessful.current) {
            setEdges((eds) => eds.filter((e) => e.id !== edge.id));
        }

        edgeUpdateSuccessful.current = true;
    }, []);

    const onRemoveField = (keyToRemove, id) => {
        const newObjectEditData = { ...contexter.objectEdit.data.value };
        delete newObjectEditData[keyToRemove];
        // console.log(keyToRemove,id);

        // Reindex the remaining keys
        const reindexedData = Object.fromEntries(
            Object.entries(newObjectEditData).map(([key, value], index) => [`${index + 1}`, value])
        );

        const newElements = contexter.nodes.map((el) => {
            if (el.id === contexter.objectEdit.id && el.type === "Gatherinput") {
                return {
                    ...el,
                    data: {
                        ...el.data,
                        value: reindexedData
                    }
                };
            }
            return el;
        });
        contexter.setNodes(newElements);
        let edgess = edges.filter(edge => !(edge.source === id && edge.sourceHandle === keyToRemove));
        // console.log(edgess);
        function decreaseSourceHandle(data) {
            for (let i = 0; i < data.length; i++) {
                if (data[i].source == id && data[i].sourceHandle > keyToRemove) {
                    data[i].sourceHandle -= 1;
                    data[i].sourceHandle = data[i].sourceHandle.toString();
                }
            }
            return data;
        }
        const modifiedData = decreaseSourceHandle(edgess);
        // const modifiedDataString = JSON.stringify(modifiedData);
        setEdges(modifiedData);
        contexter.setObjectEdit((prev) => ({
            ...prev,
            data: {
                ...prev.data,
                value: reindexedData
            }
        }));

    };

    const onValueChange = (valueKey, value, index) => {
        // console.log(valueKey);
        const newElements = contexter.nodes.map((el) => {
            if (el.id === contexter.objectEdit.id && valueKey !== "GIivrfile") {
                const newData = Array.isArray(el.data.value[valueKey]) ? [...el.data.value[valueKey]] : [];
                newData[index] = value;
                return {
                    ...el,
                    data: {
                        ...el.data,
                        value: {
                            ...el.data.value,
                            [valueKey]: newData
                        }
                    }
                };
            }
            return el;
        });
        contexter.setNodes(newElements);
        contexter.setObjectEdit((prev) => ({
            ...prev,
            data: {
                ...prev.data,
                value: {
                    ...prev.data.value,
                    [valueKey]: newElements.find(el => el.id === prev.id)?.data.value[valueKey]
                }
            }
        }));

    };

    const handleAddValue = () => {
        const currentKeys = Object.keys(contexter.objectEdit.data.value);
        const lastIndex = currentKeys.length > 0 ? parseInt(currentKeys[currentKeys.length - 1].replace("value", "")) : 0;
        // console.log(currentKeys);
        // console.log(lastIndex);
        if (lastIndex <= "9") {

            const newKey = `${lastIndex + 1}`;

            const newElements = contexter.nodes.map((el) => {
                if (el.id === contexter.objectEdit.id && el.type === "Gatherinput") {
                    return {
                        ...el,
                        data: {
                            ...el.data,
                            value: {
                                ...el.data.value,
                                [newKey]: ["", ""]
                            }
                        }
                    };
                }
                return el;
            });
            contexter.setNodes(newElements);
            contexter.setObjectEdit((prev) => ({
                ...prev,
                data: {
                    ...prev.data,
                    value: {
                        ...prev.data.value,
                        [newKey]: ["", ""]
                    }
                }
            }));


        }


    };

    const handleReplayButtonClick = () => {
        const newElements = contexter.nodes.map((el) => {
            if (el.id === contexter.objectEdit.id && el.type === "Gatherinput") {
                return {
                    ...el,
                    data: {
                        ...el.data,
                        replay: el.data.replay === "true" ? "false" : "true"
                    }
                };
            }
            return el;
        });
        contexter.setNodes(newElements);

        contexter.setObjectEdit((prev) => ({
            ...prev,
            data: {
                ...prev.data,
                replay: prev.data.replay === "true" ? "false" : "true"
            }
        }));
    };



    const onPaneClick = () => {
        contexter.setObjectEdit({});
        setShowDiv(false);
    };

    const onElementClick = (_, { id, type, data }) => {
        contexter.setObjectEdit({ id, type, data });
        // console.log(id, type, data);
        if (type === "Gatherinput" || type === "Dail" || type === "Queue" || type === "Voicemail" || type === "Ivr" || type === "Recording" || type === "Api" || type === "Hangup" || type === "Variables") {
            setShowDiv(true);
        }

    };

    const onRemove = (id) => {
        contexter.setNodes((els) => els.filter((el) => { return el.id !== id }));
        setEdges((els) => els.filter((el) => {
            return (el.source !== id && el.target !== id)
        }));
        contexter.setObjectEdit({});
        setShowDiv(false);
    };

    const dialSelectValueFun = (value, option) => {
        if (!option) {
            // console.error("Option is undefined");
            return;
        }

        const keyParts = option.key.split('-');

        if (keyParts.length === 2 || keyParts[1] === "agent") {
            updateAgentValue(value);
        } else if (option.key === "ringtime" || option.key === "Api" || option.Key === "option") {
            updateRingtimeValue(value);
        }
    };

    const updateAgentValue = (value) => {
        const newElements = contexter.nodes.map((el) => {
            if (el.id === contexter.objectEdit.id && (el.type === "Dail" || el.type === "Queue" || el.type === "Voicemail")) {
                return {
                    ...el,
                    data: {
                        value: {
                            ...el.data.value,
                            agent: value
                        }
                    }
                };
            } else if (el.id === contexter.objectEdit.id && (el.type === "Ivr")) {
                return {
                    ...el,
                    data: {
                        value: {
                            ...el.data.value,
                            Ivr: value
                        }
                    }
                };
            } else if (el.id === contexter.objectEdit.id && (el.type === "Recording")) {
                return {
                    ...el,
                    data: {
                        value: {
                            ...el.data.value,
                            Recording: value
                        }
                    }
                };
            } else if (el.id === contexter.objectEdit.id && (el.type === "Api")) {
                return {
                    ...el,
                    data: {
                        value: {
                            ...el.data.value,
                            Method: value
                        }
                    }
                };
            }
            return el;
        });

        contexter.setNodes(newElements);
        contexter.setObjectEdit((prev) => ({ ...prev, data: { ...prev.data, value: { ...prev.data.value, agent: value, Ivr: value, Recording: value, Method: value } } }));
    };


    const replayvalue = (value) => {
        const newElements = contexter.nodes.map((el) => {
            if (el.id === contexter.objectEdit.id && (el.type === "Gatherinput")) {
                return {
                    ...el,
                    data: {
                        ...el.data,
                        replayvalue: value
                    }
                };
            }

            return el;
        });

        contexter.setNodes(newElements);
        contexter.setObjectEdit((prev) => ({
            ...prev,
            data: {
                ...prev.data,
                replayvalue: value
            }
        }));

    }

    const updateRingtimeValue = (value) => {
        const newElements = contexter.nodes.map((el) => {
            if (el.id === contexter.objectEdit.id && (el.type === "Dail" || el.type === "Queue" || el.type === "Voicemail")) {
                return {
                    ...el,
                    data: {
                        value: {
                            ...el.data.value,
                            ringtime: value
                        }
                    }
                };
            } else if (el.id === contexter.objectEdit.id && (el.type === "Api")) {
                return {
                    ...el,
                    data: {
                        value: {
                            ...el.data.value,
                            URL: value
                        }
                    }
                };

            }

            return el;
        });

        contexter.setNodes(newElements);
        contexter.setObjectEdit((prev) => ({
            ...prev,
            data: {
                ...prev.data,
                value: {
                    ...prev.data.value,
                    ringtime: value,
                    URL: value
                }
            }
        }));
    };

    const Gioptionvalue = (value) => {
        const newElements = contexter.nodes.map((el) => {
            if (el.id === contexter.objectEdit.id && (el.type === "Gatherinput")) {
                return {
                    ...el,
                    data: {
                        ...el.data,
                        option: value
                    }
                };
            }

            return el;
        });

        contexter.setNodes(newElements);
        contexter.setObjectEdit((prev) => ({
            ...prev,
            data: {
                ...prev.data,
                option: value

            }
        }));


    };

    const GiTimeoutvalue = (value) => {
        const newElements = contexter.nodes.map((el) => {
            if (el.id === contexter.objectEdit.id && (el.type === "Gatherinput")) {
                return {
                    ...el,
                    data: {
                        ...el.data,
                        timeout: value
                    }
                };
            }

            return el;
        });

        contexter.setNodes(newElements);
        contexter.setObjectEdit((prev) => ({
            ...prev,
            data: {
                ...prev.data,
                timeout: value

            }
        }));


    };

    const recordingoptionvalue = (value) => {

        const newElements = contexter.nodes.map((el) => {
            if (el.id === contexter.objectEdit.id) {
                return {
                    ...el,
                    data: {
                        value: {
                            ...el.data.value,
                            option: value
                        }
                    }
                };
            }
            return el;
        })

        contexter.setNodes(newElements);
        contexter.setObjectEdit((prev) => ({
            ...prev,
            data: {
                ...prev.data,
                value: {
                    ...prev.data.value,
                    option: value,
                }
            }
        }));
    };

    const voicemailoptionvalue = (value) => {

        const newElements = contexter.nodes.map((el) => {
            if (el.id === contexter.objectEdit.id) {
                return {
                    ...el,
                    data: {
                        value: {
                            ...el.data.value,
                            option: value
                        }
                    }
                };
            }
            return el;
        })

        contexter.setNodes(newElements);
        contexter.setObjectEdit((prev) => ({
            ...prev,
            data: {
                ...prev.data,
                value: {
                    ...prev.data.value,
                    option: value,
                }
            }
        }));
    };

    const optionvalue = (value) => {
        const newElements = contexter.nodes.map((el) => {
            if (el.id === contexter.objectEdit.id && (el.type === "Dail" || el.type === "Queue")) {
                return {
                    ...el,
                    data: {
                        value: {
                            ...el.data.value,
                            option: value
                        }
                    }
                };
            }
            return el;
        })

        contexter.setNodes(newElements);
        contexter.setObjectEdit((prev) => ({
            ...prev,
            data: {
                ...prev.data,
                value: {
                    ...prev.data.value,
                    option: value,
                }
            }
        }));
    };

    const apitextareavalue = (value) => {
        const newElements = contexter.nodes.map((el) => {
            if (el.id === contexter.objectEdit.id && (el.type === "Api")) {
                return {
                    ...el,
                    data: {
                        value: {
                            ...el.data.value,
                            AdditionalData: value
                        }
                    }
                };
            }
            return el;
        })

        contexter.setNodes(newElements);
        contexter.setObjectEdit((prev) => ({
            ...prev,
            data: {
                ...prev.data,
                value: {
                    ...prev.data.value,
                    AdditionalData: value,
                }
            }
        }));
    };

    const GIIvrupdate = (value) => {
        const newElements = contexter.nodes.map((el) => {
            if (el.id === contexter.objectEdit.id) {
                return {
                    ...el,
                    data: {
                        ...el.data,
                        GIIvr: { value }
                    }
                };
            }
            return el;
        });
        contexter.setNodes(newElements);
        contexter.setObjectEdit((prev) => ({
            ...prev,
            data: {
                ...prev.data,
                GIIvr: { value }

            }
        }));

    };


    const variablekey = (value) => {

        const newElements = contexter.nodes.map((el) => {
            if (el.id === contexter.objectEdit.id && (el.type === "Variables")) {
                return {
                    ...el,
                    data: {
                        value: {
                            ...el.data.value,
                            key: value
                        }
                    }
                };
            }
            return el;
        })

        contexter.setNodes(newElements);
        contexter.setObjectEdit((prev) => ({
            ...prev,
            data: {
                ...prev.data,
                value: {
                    ...prev.data.value,
                    key: value,
                }
            }
        }));
    };
    
    const variablevalue = (value) => {

        const newElements = contexter.nodes.map((el) => {
            if (el.id === contexter.objectEdit.id && (el.type === "Variables")) {
                return {
                    ...el,
                    data: {
                        value: {
                            ...el.data.value,
                            value: value
                        }
                    }
                };
            }
            return el;
        })

        contexter.setNodes(newElements);
        contexter.setObjectEdit((prev) => ({
            ...prev,
            data: {
                ...prev.data,
                value: {
                    ...prev.data.value,
                    value: value,
                }
            }
        }));
    };


    const handleDeployClick = () => {
        // console.log('Deploy button clicked');
        // console.log(nodes);
        // console.log(edges);
        let a = JSON.stringify(contexter.nodes);
        let b = JSON.stringify(edges);
        console.log(a);
        console.log(b);
    };

    // Update the edge type dynamically
    // const edgesWithUpdatedTypes = edges.map((edge) => {
    //     edge.type = "smoothstep";
    //     return edge;
    // });
    const defaultEdgeOptions = {
        // animated: true,
        type: 'smoothstep',
    };

    return (
        <div className='flow-conatiner'>
            <div className="flow-main-container">
                <div className="flow-left-container">
                    <button className="flow-deploy-btn" onClick={handleDeployClick}>Deploy</button>
                    <hr />
                    <button className="flow-input-btn" onClick={() => {
                        const elements = contexter.nodes;
                        const maxID = elements.length > 0 ? Math.max(...elements.map(el => parseInt(el.id))) : 0;
                        contexter.setNodes([...elements, { ...initialInput, id: `${maxID + 1}` }]);
                    }}
                    >
                        &#10133; &nbsp; Gather Input
                    </button>
                    <button className="flow-input-btn" onClick={() => {
                        const elements = contexter.nodes;
                        const maxID = elements.length > 0 ? Math.max(...elements.map(el => parseInt(el.id))) : 0;
                        contexter.setNodes([...elements, { ...Daill, id: `${maxID + 1}` }]);
                    }}
                    >
                        &#10133; &nbsp; Dail
                    </button>
                    <button className="flow-input-btn" onClick={() => {
                        const elements = contexter.nodes;
                        const maxID = elements.length > 0 ? Math.max(...elements.map(el => parseInt(el.id))) : 0;
                        contexter.setNodes([...elements, { ...Queuee, id: `${maxID + 1}` }]);
                    }}
                    >
                        &#10133; &nbsp; Queuee
                    </button>
                    <button className="flow-input-btn" onClick={() => {
                        const elements = contexter.nodes;
                        const maxID = elements.length > 0 ? Math.max(...elements.map(el => parseInt(el.id))) : 0;
                        contexter.setNodes([...elements, { ...Voicemaill, id: `${maxID + 1}` }]);
                    }}
                    >
                        &#10133; &nbsp; Voicemail
                    </button>
                    <button className="flow-input-btn" onClick={() => {
                        const elements = contexter.nodes;
                        const maxID = elements.length > 0 ? Math.max(...elements.map(el => parseInt(el.id))) : 0;
                        contexter.setNodes([...elements, { ...Hangupp, id: `${maxID + 1}` }]);
                    }}
                    >
                        &#10133; &nbsp; Hangup
                    </button>
                    <button className="flow-input-btn" onClick={() => {
                        const elements = contexter.nodes;
                        const maxID = elements.length > 0 ? Math.max(...elements.map(el => parseInt(el.id))) : 0;
                        contexter.setNodes([...elements, { ...Ivrr, id: `${maxID + 1}` }]);
                    }}
                    >
                        &#10133; &nbsp; Ivr
                    </button>
                    <button className="flow-input-btn" onClick={() => {
                        const elements = contexter.nodes;
                        const maxID = elements.length > 0 ? Math.max(...elements.map(el => parseInt(el.id))) : 0;
                        contexter.setNodes([...elements, { ...Recordingg, id: `${maxID + 1}` }]);
                    }}
                    >
                        &#10133; &nbsp; Recording
                    </button>
                    <button className="flow-input-btn" onClick={() => {
                        const elements = contexter.nodes;
                        const maxID = elements.length > 0 ? Math.max(...elements.map(el => parseInt(el.id))) : 0;
                        contexter.setNodes([...elements, { ...Apii, id: `${maxID + 1}` }]);
                    }}
                    >
                        &#10133; &nbsp; Api
                    </button>
                    <button className="flow-input-btn" onClick={() => {
                        const elements = contexter.nodes;
                        const maxID = elements.length > 0 ? Math.max(...elements.map(el => parseInt(el.id))) : 0;
                        contexter.setNodes([...elements, { ...variabless, id: `${maxID + 1}` }]);
                    }}
                    >
                        &#10133; &nbsp; variable
                    </button>
                </div>
                <div className="flow-center-container">
                    <ReactFlow
                        nodes={contexter.nodes}
                        edges={edges}
                        onNodesChange={contexter.onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onEdgeUpdate={onEdgeUpdate}
                        onEdgeUpdateStart={onEdgeUpdateStart}
                        onEdgeUpdateEnd={onEdgeUpdateEnd}
                        onNodeClick={onElementClick}
                        onConnect={onConnect}
                        onInit={onInit}
                        onPaneClick={onPaneClick}
                        fitView
                        attributionPosition="top-right"
                        nodeTypes={nodeTypes}
                        defaultEdgeOptions={defaultEdgeOptions}
                        connectionLineType={ConnectionLineType.SmoothStep}
                    >
                        <Controls />
                        <Background color="#aaa" gap={16} />
                    </ReactFlow>
                </div>
            </div>
            {showDiv && (
                <div className="flow-right-container" style={{ textAlign: "left", padding: 10 }}>
                    {contexter.objectEdit && contexter.objectEdit.type === "Gatherinput" && (
                        <>
                            <div className='gartherinpit-right-heding-container'><h2 className='gartherinpit-right-heding'>Gather Input</h2><button className="gather-input-delete" onClick={() => onRemove(contexter.objectEdit.id)}><i className="ri-delete-bin-5-fill"></i></button></div>
                            <div ><span className="garther-input-textbox">Select Ivr</span></div>
                            <Select
                                style={{
                                    width: '100%',
                                    zIndex: 10000
                                }}
                                value={contexter.objectEdit.data?.GIIvr}
                                onChange={(value, option) => GIIvrupdate(value, option)}
                                options={ivrName?.map(ivr => ({
                                    value: ivr.i_name,
                                    label: ivr.i_name,
                                    key: ivr.i_name + '-agent'
                                }))}
                            />
                            <div ><span className="garther-input-textbox">Time out</span></div>
                            <input
                                value={contexter.objectEdit.data.timeout}
                                className="Dail-ringtime-textbox"
                                onChange={(e) => GiTimeoutvalue(e.target.value, { key: 'timeout' })}
                            />
                            <div ><span className="garther-input-textbox">Option</span></div>
                            <input
                                value={contexter.objectEdit.data.option}
                                className="Dail-ringtime-textbox"
                                onChange={(e) => Gioptionvalue(e.target.value, { key: 'option' })}
                            />
                            {Object.entries(contexter.objectEdit.data.value).map(([key, value]) => (
                                <div className="gartherinput-form-container" key={key}>
                                    <hr />
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="garther-input-textbox">Caller presses</span> <button className="gather-input-delete-remove" onClick={() => onRemoveField(key, contexter.objectEdit.id)}><i className="ri-delete-bin-5-fill"></i></button></div>
                                    {/* <input value={value[0]} onChange={(e) => onValueChange(key, e.target.value, 0)} /> */}
                                    <Select
                                        defaultValue={value[0]}
                                        value={value[0]}
                                        style={{
                                            width: '100%',
                                            zIndex: 10000
                                        }}
                                        onChange={(value, option) => onValueChange(key, value, 0)}
                                        options={numbers.filter(num =>
                                            !Object.values(contexter.objectEdit.data.value)
                                                .concat(Object.values(contexter.objectEdit.data.replayvalue))
                                                .flat()
                                                .includes(num.value)
                                        )}
                                    />
                                    {/* <br />
                                    <span className="garther-input-textbox">Or says</span>
                                    <br /> */}
                                    {/* <input value={value[1]} onChange={(e) => onValueChange(key, e.target.value, 1)} /> */}
                                </div>
                            ))}

                            <div style={{ display: "flex", marginTop: `20px` }}>
                                <button className="garther-input-addmore-btn" onClick={handleAddValue} disabled={Object.keys(contexter.objectEdit.data.value).length >= 10}>Add more</button>
                            </div>

                            <div style={{ display: "flex", marginTop: `20px` }}>
                                <button className="garther-input-addmore-btn" onClick={handleReplayButtonClick}>Replay</button>
                            </div>

                            <div style={{ display: "flex", marginTop: `20px` }}>
                                {contexter.objectEdit.data.replay == "true" && (
                                    <>
                                        <Select
                                            defaultValue={contexter.objectEdit.data.replayvalue}
                                            value={contexter.objectEdit.data.replayvalue}
                                            style={{
                                                width: '100%',
                                                zIndex: 10000
                                            }}
                                            onChange={(value, option) => replayvalue(value)}
                                            options={numbers.filter(num => !Object.values(contexter.objectEdit.data.value).flat().includes(num.value))}
                                        />
                                    </>


                                )}
                            </div>

                        </>
                    )}
                    {contexter.objectEdit && contexter.objectEdit.type === "Dail" && (
                        <>
                            <div className='gartherinpit-right-heding-container'><h2 className='gartherinpit-right-heding'>Dial</h2><button className="gather-input-delete" onClick={() => onRemove(contexter.objectEdit.id)}><i className="ri-delete-bin-5-fill"></i></button></div>
                            <div ><span className="garther-input-textbox">Select Agent</span></div>
                            <Select
                                defaultValue={contexter.objectEdit.data.value.agent}
                                style={{
                                    width: '100%',
                                    zIndex: 10000
                                }}
                                onChange={(value, option) => dialSelectValueFun(value, option)}
                                options={AgentDetails?.map(agent => ({
                                    value: agent.a_phLogin,
                                    label: agent.a_userName,
                                    key: agent.a_phLogin.toString() + '-agent'
                                }))}
                            />
                            <br />
                            <span className="garther-input-textbox">Ring time</span>
                            <br />
                            <input
                                type="number"
                                value={contexter.objectEdit.data.value.ringtime}
                                className="Dail-ringtime-textbox"
                                onChange={(e) => dialSelectValueFun(e.target.value, { key: 'ringtime' })}
                            />
                            <br />
                            <span className="garther-input-textbox">Option</span>
                            <input
                                value={contexter.objectEdit.data.value.option}
                                className="Dail-ringtime-textbox"
                                onChange={(e) => optionvalue(e.target.value, { key: 'option' })}
                            />
                        </>
                    )}
                    {contexter.objectEdit && contexter.objectEdit.type === "Queue" && (
                        <>
                            <div className='gartherinpit-right-heding-container'><h2 className='gartherinpit-right-heding'>Queue</h2><button className="gather-input-delete" onClick={() => onRemove(contexter.objectEdit.id)}><i className="ri-delete-bin-5-fill"></i></button></div>
                            <div ><span className="garther-input-textbox">Select Queue</span></div>
                            <Select
                                defaultValue={contexter.objectEdit.data.value.agent}
                                style={{
                                    width: '100%',
                                    zIndex: 10000
                                }}
                                onChange={(value, option) => dialSelectValueFun(value, option)}
                                options={QueueName?.map(agent => ({
                                    value: agent.name,
                                    label: agent.name,
                                    key: agent.name.toString() + '-agent'
                                }))}
                            />
                            <br />
                            <span className="garther-input-textbox">Ring time</span>
                            <br />
                            <input
                                type="number"
                                value={contexter.objectEdit.data.value.ringtime}
                                className="Dail-ringtime-textbox"
                                onChange={(e) => dialSelectValueFun(e.target.value, { key: 'ringtime' })}
                            />
                            <br />
                            <span className="garther-input-textbox">Option</span>
                            <br />
                            <input
                                value={contexter.objectEdit.data.value.option}
                                className="Dail-ringtime-textbox"
                                onChange={(e) => optionvalue(e.target.value, { key: 'option' })}
                            />

                        </>
                    )}
                    {contexter.objectEdit && contexter.objectEdit.type === "Voicemail" && (
                        <>
                            <div className='gartherinpit-right-heding-container'><h2 className='gartherinpit-right-heding'>Voicemail</h2><button className="gather-input-delete" onClick={() => onRemove(contexter.objectEdit.id)}><i className="ri-delete-bin-5-fill"></i></button></div>
                            <div ><span className="garther-input-textbox">Select Agent</span></div>
                            <Select
                                defaultValue={contexter.objectEdit.data.value.agent}
                                style={{
                                    width: '100%',
                                    zIndex: 10000
                                }}
                                onChange={(value, option) => dialSelectValueFun(value, option)}
                                options={AgentDetails?.map(agent => ({
                                    value: agent.a_phLogin,
                                    label: agent.a_userName,
                                    key: agent.a_phLogin.toString() + '-agent'
                                }))}
                            />
                            <div><span className="garther-input-textbox">option</span></div>
                            <input
                                value={contexter.objectEdit.data.value.option}
                                className="Dail-ringtime-textbox"
                                onChange={(e) => voicemailoptionvalue(e.target.value, { key: 'option' })}
                            />

                        </>
                    )}
                    {contexter.objectEdit && contexter.objectEdit.type === "Ivr" && (
                        <>
                            <div className='gartherinpit-right-heding-container'><h2 className='gartherinpit-right-heding'>Ivr</h2><button className="gather-input-delete" onClick={() => onRemove(contexter.objectEdit.id)}><i className="ri-delete-bin-5-fill"></i></button></div>
                            <div ><span className="garther-input-textbox">Select Ivr</span></div>
                            <Select
                                defaultValue={contexter.objectEdit.data.value.Recording}
                                style={{
                                    width: '100%',
                                    zIndex: 10000
                                }}
                                onChange={(value, option) => dialSelectValueFun(value, option)}
                                options={ivrName?.map(ivr => ({
                                    value: ivr.i_name,
                                    label: ivr.i_name,
                                    key: ivr.i_name + '-agent'
                                }))}
                            />

                        </>
                    )}
                    {contexter.objectEdit && contexter.objectEdit.type === "Recording" && (
                        <>
                            <div className='gartherinpit-right-heding-container'><h2 className='gartherinpit-right-heding'>Ivr</h2><button className="gather-input-delete" onClick={() => onRemove(contexter.objectEdit.id)}><i className="ri-delete-bin-5-fill"></i></button></div>
                            <div ><span className="garther-input-textbox">Recording</span></div>
                            <Select
                                defaultValue="yes"
                                style={{
                                    width: '100%',
                                    zIndex: 10000
                                }}
                                onChange={(value, option) => dialSelectValueFun(value, option)}
                                options={[
                                    {
                                        value: 'yes',
                                        label: 'yes',
                                        key: 'yes-agent'
                                    },
                                    {
                                        value: 'No',
                                        label: 'No',
                                        key: 'No-agent'
                                    }
                                ]}
                            />
                            <div><span className="garther-input-textbox">option</span></div>
                            <input
                                value={contexter.objectEdit.data.value.option}
                                className="Dail-ringtime-textbox"
                                onChange={(e) => recordingoptionvalue(e.target.value, { key: 'option' })}
                            />
                        </>
                    )}
                    {contexter.objectEdit && contexter.objectEdit.type === "Api" && (
                        <>
                            <div className='gartherinpit-right-heding-container'><h2 className='gartherinpit-right-heding'>Api</h2><button className="gather-input-delete" onClick={() => onRemove(contexter.objectEdit.id)}><i className="ri-delete-bin-5-fill"></i></button></div>
                            <div ><span className="garther-input-textbox">Method</span></div>
                            <Select
                                defaultValue={contexter.objectEdit.data.value.Method}
                                style={{
                                    width: '100%',
                                    zIndex: 10000
                                }}
                                onChange={(value, option) => dialSelectValueFun(value, option)}
                                options={[
                                    {
                                        value: 'POST',
                                        label: 'POST',
                                        key: 'POST-agent'
                                    },
                                    {
                                        value: 'GET',
                                        label: 'GET',
                                        key: 'GET-agent'
                                    }
                                ]}
                            />
                            <br />
                            <span className="garther-input-textbox">Api URL</span>
                            <br />
                            <input
                                value={contexter.objectEdit.data.value.URL}
                                className="Dail-ringtime-textbox"
                                onChange={(e) => dialSelectValueFun(e.target.value, { key: 'Api' })}
                            />
                            {/* Conditionally render a text box if the selected method is 'POST' */}
                            {contexter.objectEdit.data.value.Method === 'POST' && (
                                <>
                                    <br />
                                    <span className="garther-input-textbox">Additional Data</span>
                                    <br />
                                    <textarea
                                        style={{ height: "200px" }}
                                        value={contexter.objectEdit.data.value.additionalData} // Assuming this is the additional data field
                                        className="Dail-ringtime-textbox"
                                        onChange={(e) => apitextareavalue(e.target.value, { key: 'AdditionalData' })}
                                    />
                                </>
                            )}
                        </>

                    )}
                    {contexter.objectEdit && contexter.objectEdit.type === "Hangup" && (
                        <>
                            <div className='gartherinpit-right-heding-container'><h2 className='gartherinpit-right-heding'>Hangup</h2><button className="gather-input-delete" onClick={() => onRemove(contexter.objectEdit.id)}><i className="ri-delete-bin-5-fill"></i></button></div>



                        </>
                    )}
                    {contexter.objectEdit && contexter.objectEdit.type === "Variables" && (
                        <>
                            <div className='gartherinpit-right-heding-container'><h2 className='gartherinpit-right-heding'>Variable</h2><button className="gather-input-delete" onClick={() => onRemove(contexter.objectEdit.id)}><i className="ri-delete-bin-5-fill"></i></button></div>
                            <div ><span className="garther-input-textbox">Key</span>                            <br />
                                <input
                                    value={contexter.objectEdit.data.value.key}
                                    className="Dail-ringtime-textbox"
                                    onChange={(e) => variablekey(e.target.value, { key: 'key' })}
                                />
                            </div>

                            <span className="garther-input-textbox">Value</span>
                            <br />
                            <input
                                value={contexter.objectEdit.data.value.value}
                                className="Dail-ringtime-textbox"
                                onChange={(e) => variablevalue(e.target.value, { key: 'value' })}
                            />

                        </>
                    )}
                </div>
            )}
            {/* <button onClick={handleDeployClick}>Deploy</button> */}
        </div>
    );
};

export default Ivrflow;
