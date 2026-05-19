import React, { useCallback, useContext, useState, useRef, useEffect } from "react";
import ReactFlow, {
    addEdge,
    Controls,
    Background,
    useEdgesState,
    ConnectionLineType,
    reconnectEdge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useNavigate } from 'react-router-dom';


//icons
import { MdDelete } from "react-icons/md";
import { TiDeleteOutline } from "react-icons/ti";




import IvrGatherinput from "./call flow components/IvrGatherinput.jsx";
import IvrStart from "./call flow components/IvrStart.jsx";
import Ivr from "./call flow components/Ivr.jsx";
import Hangup from './call flow components/Hangup.jsx'
import userContext from "../../Contexter.js";
import "./style/Ivrflow.css";
import { Select, Input, Form, message } from "antd";
import { IvrBlastCallFlow } from "../../store/IvrBlastCallFlow.js";

import { IvrBlast } from "../../store/IvrBlast.js";




const initialEdges = [

];



const initialInput = {
    id: "1",
    type: "IvrGatherinput",
    data: {
        GIIvr: "{\"v_voiceresponseName\":\"Not Selected\",\"v_voiceresponseUrl\":\"\"}", replay: "false", replayvalue: "", timeout: "", option: "", value: { 1: ["", ""] }
    },
    position: { x: 250, y: 25 },
};

const Ivrr = {
    id: "1",
    type: "Ivr",
    data: { value: { Ivr: "{\"v_voiceresponseName\":\"Not Selected\",\"v_voiceresponseUrl\":\"\"}" } },
    position: { x: 300, y: 30 }
};

const Hangupp = {
    id: "1",
    type: "Hangup",
    data: { value: "Hnagup" },
    position: { x: 400, y: 50 }
};

const nodeTypes = {
    IvrGatherinput: IvrGatherinput,
    IvrStart: IvrStart,
    Ivr: Ivr,
    Hangup: Hangup,
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

    const { IvrflowCreate, IvrFlowCheck } = IvrBlast();
    const edgeUpdateSuccessful = useRef(true);
    const contexter = useContext(userContext);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [showDiv, setShowDiv] = useState(false);
    const [loading, setLoading] = useState(false);
    const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);
    const [form] = Form.useForm();
    const navigate = useNavigate();

    const { GetSelectIvr, Ivr } = IvrBlastCallFlow();

    useEffect(() => {
        GetSelectIvr();
    }, []);



    useEffect(() => {
        const handleBeforeUnload = (event) => {
            const message = "Are you sure you want to leave? Any unsaved data will be lost!";
            event.returnValue = message;
            return message;
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);


    const onEdgeUpdateStart = useCallback(() => {
        edgeUpdateSuccessful.current = false;
    }, []);

    const onEdgeUpdate = useCallback((oldEdge, newConnection) => {
        edgeUpdateSuccessful.current = true;
        setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
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
            if (el.id === contexter.objectEdit.id && el.type === "IvrGatherinput") {
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
                if (el.id === contexter.objectEdit.id && el.type === "IvrGatherinput") {
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
            if (el.id === contexter.objectEdit.id && el.type === "IvrGatherinput") {
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
        if (type === "IvrGatherinput" || type === "Ivr" || type === "Hangup") {
            setShowDiv(true);
        } else {
            setShowDiv(false);
        }

    };

    const onRemove = (id) => {
        console.log(id);
        console.log(contexter.nodes);
        contexter.setNodes((els) => els.filter((el) => { return el.id !== id }));
        setEdges((els) => els.filter((el) => {
            return (el.source !== id && el.target !== id)
        }));
        contexter.setObjectEdit({});
        setShowDiv(false);
    };

    const replayvalue = (value) => {
        const newElements = contexter.nodes.map((el) => {
            if (el.id === contexter.objectEdit.id && (el.type === "IvrGatherinput")) {
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

    };

    const Gioptionvalue = (value) => {
        const newElements = contexter.nodes.map((el) => {
            if (el.id === contexter.objectEdit.id && (el.type === "IvrGatherinput")) {
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
            if (el.id === contexter.objectEdit.id && (el.type === "IvrGatherinput")) {
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

    const GIIvrupdate = (value) => {
        const newElements = contexter.nodes.map((el) => {
            if (el.id === contexter.objectEdit.id) {
                return {
                    ...el,
                    data: {
                        ...el.data,
                        GIIvr: value
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
                GIIvr: value

            }
        }));

    };

    const handleIvrChange = (value) => {
        updateAgentValue(value);
    }

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
    // Update the edge type dynamically
    // const edgesWithUpdatedTypes = edges.map((edge) => {
    //     edge.type = "smoothstep";
    //     return edge;
    // });



    const handleCancel = () => {
        navigate(`/ivrblast/Ivrflow`);
    };


    const handleSaveClick = async (values) => {

        const { flow_name } = values;


        // console.log('Flow name saved:', flow_name);
        let a = JSON.stringify(contexter.nodes);
        let b = JSON.stringify(edges);

        let data = {
            flow_name: flow_name,
            flow_data: a,
            flow_position: b
        }
        // console.log(data);
        await IvrflowCreate(data);
        setLoading(false);
        navigate(`/ivrblast/Ivrflow`);
    };

    const handleSaveaction = async () => {
        setLoading(true);
        form.submit();
    };

    const defaultEdgeOptions = {
        // animated: true,
        type: 'smoothstep',
    };






    return (
        <div className='Ivr-flow-conatiner'>
            {loading ? (<div className="Ivr-flow-main-Loading-container">Loading</div>) : (<div className="Ivr-flow-main-container">
                <div className="Ivr-flow-left-container">
                    <div style={{
                        padding: '8px', display: 'flex',
                        flexDirection: 'column', gap: '10px'
                    }}>
                        <button className="Ivr-flow-cancel-btn" onClick={handleCancel}>Cancel</button>
                        <button className="Ivr-flow-save-btn" onClick={() => handleSaveaction()}>Save</button>
                    </div>

                    <hr style={{ marginBottom: '8px' }} />
                    <div style={{
                        padding: '2px', display: 'flex',
                        flexDirection: 'column', gap: '10px'
                    }}>
                        <button className="Ivr-flow-input-btn" onClick={() => {
                            const elements = contexter.nodes;
                            const maxID = elements.length > 0 ? Math.max(...elements.map(el => parseInt(el.id))) : 0;
                            contexter.setNodes([...elements, { ...initialInput, id: `${maxID + 1}` }]);
                        }}
                        >
                            Gather Input
                        </button>
                        <button className="Ivr-flow-input-btn" onClick={() => {
                            const elements = contexter.nodes;
                            const maxID = elements.length > 0 ? Math.max(...elements.map(el => parseInt(el.id))) : 0;
                            contexter.setNodes([...elements, { ...Ivrr, id: `${maxID + 1}` }]);
                        }}
                        >
                            Ivr
                        </button>
                        <button className="Ivr-flow-input-btn" onClick={() => {
                            const elements = contexter.nodes;
                            const maxID = elements.length > 0 ? Math.max(...elements.map(el => parseInt(el.id))) : 0;
                            contexter.setNodes([...elements, { ...Hangupp, id: `${maxID + 1}` }]);
                        }}
                        >
                            Hangup
                        </button>
                    </div>


                </div>
                <div className="Ivr-flow-center-container">
                    <div className="Ivr-flow-center-container-heading-conatiner">
                        <div className="Ivr-flow-center-container-heading">
                            <Form
                                form={form}
                                name="flow_form"
                                onFinish={handleSaveClick}
                                initialValues={{ flow_name: '' }}
                            >
                                <Form.Item
                                    name="flow_name"
                                    rules={[
                                        { required: true, message: 'Please input the Flow name!' },
                                        {
                                            validator: async (_, value) => {
                                                if (!value) return;
                                                const response = await IvrFlowCheck(value);
                                                if (response?.res?.data?.data) {
                                                    return Promise.reject('This IvrFlow name already exists. Please choose a different name.');
                                                }
                                            },
                                        },
                                    ]}
                                >
                                    <Input
                                        placeholder="Enter the Flow name"
                                    />
                                </Form.Item>
                            </Form>

                        </div>
                    </div>


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
            </div>)}

            {showDiv && (
                <div className="Ivr-flow-right-container">
                    {contexter.objectEdit && contexter.objectEdit.type === "IvrGatherinput" && (
                        <>
                            <div className='Ivr-gartherinput-right-heading-container'>

                                <h2 className='Ivr-gartherinput-right-heading'>
                                    Gather Input
                                </h2>
                                <button className="Ivr-gatherinput-delete" onClick={() => onRemove(contexter.objectEdit.id)}>
                                    <MdDelete />
                                </button>
                            </div>
                            <div className="Ivr-gatherinput-inputbox-container-1">
                                <p className="Ivr-gartherinput-textbox-label">
                                    Select Ivr
                                </p>
                                <Select
                                    style={{
                                        width: '100%',
                                        zIndex: 10000
                                    }}
                                    // value={contexter.objectEdit.data?.GIIvr}
                                    onChange={(value, option) => GIIvrupdate(value, option)}
                                    options={Ivr?.map(ivr => ({
                                        value: JSON.stringify({
                                            v_voiceresponseName: ivr.v_voiceresponseName,
                                            v_voiceresponseUrl: ivr.v_voiceresponseUrl,
                                            v_voiceresponseId: ivr.v_voiceresponseId
                                        }),
                                        label: ivr.v_voiceresponseName,
                                        key: ivr.v_voiceresponseId
                                    }))}
                                />
                                <p className="Ivr-gartherinput-textbox-label">
                                    Time out
                                </p>
                                <input
                                    value={contexter.objectEdit.data.timeout}
                                    className="Dail-ringtime-textbox"
                                    onChange={(e) => GiTimeoutvalue(e.target.value, { key: 'timeout' })}
                                />
                                <p className="Ivr-gartherinput-textbox-label">Option</p>
                                <input
                                    value={contexter.objectEdit.data.option}
                                    className="Dail-ringtime-textbox"
                                    onChange={(e) => Gioptionvalue(e.target.value, { key: 'option' })}
                                />



                                {Object.entries(contexter.objectEdit.data.value).map(([key, value]) => (
                                    <div className="Ivr-gartherinput-form-container" key={key}>

                                        <div className="Ivr-gartherinput-form-container-1">
                                            <p className="Ivr-gartherinput-textbox-label-2">
                                                Caller presses
                                            </p>
                                            <button className="Ivr-gatherinput-delete-remove" onClick={() => onRemoveField(key, contexter.objectEdit.id)}>
                                                <TiDeleteOutline />
                                            </button>
                                        </div>
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
                                    </div>
                                ))}
                            </div>


                            <div className="Ivr-gatherinput-last-btn-container">
                                <button className="Ivr-garther-input-addmore-btn" onClick={handleAddValue} disabled={Object.keys(contexter.objectEdit.data.value).length >= 10}>Add more</button>
                            </div>

                            <div className="Ivr-gatherinput-last-btn-container">
                                <button className="Ivr-garther-input-addmore-btn" onClick={handleReplayButtonClick}>Replay</button>
                            </div>

                            <div className="Ivr-gatherinput-last-btn-container">
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
                    {contexter.objectEdit && contexter.objectEdit.type === "Ivr" && (
                        <>
                            <div className='Ivr-gartherinput-right-heading-container'>
                                <h2 className='Ivr-gartherinput-right-heading'>
                                    Ivr
                                </h2>
                                <button className="Ivr-gatherinput-delete" onClick={() => onRemove(contexter.objectEdit.id)}>
                                    <MdDelete />
                                </button>
                            </div>

                            <div className="Ivr-gatherinput-inputbox-container-1">

                                <p className="Ivr-gartherinput-textbox-label">
                                    Select Ivr
                                </p>
                                <Select
                                    defaultValue={contexter.objectEdit.data.value.Recording}
                                    style={{
                                        width: '100%',
                                        zIndex: 10000
                                    }}
                                    onChange={(value, option) => handleIvrChange(value, option)}
                                    options={Ivr.map(ivr => ({
                                        value: JSON.stringify({
                                            v_voiceresponseName: ivr.v_voiceresponseName,
                                            v_voiceresponseUrl: ivr.v_voiceresponseUrl,
                                            v_voiceresponseId: ivr.v_voiceresponseId
                                        }),
                                        label: ivr.v_voiceresponseName,
                                        key: ivr.v_voiceresponseId
                                    }))}
                                />


                            </div>


                        </>
                    )}
                    {contexter.objectEdit && contexter.objectEdit.type === "Hangup" && (
                        <>
                            <div className='Ivr-gartherinput-right-heading-container'>
                                <h2 className='Ivr-gartherinput-right-heading'>
                                    Hangup
                                </h2>
                                <button className="Ivr-gatherinput-delete" onClick={() => onRemove(contexter.objectEdit.id)}>  <MdDelete />
                                </button>
                            </div>

                        </>
                    )}
                </div>
            )}
            {/* <button onClick={handleDeployClick}>Deploy</button> */}
        </div>
    );
};

export default Ivrflow;
