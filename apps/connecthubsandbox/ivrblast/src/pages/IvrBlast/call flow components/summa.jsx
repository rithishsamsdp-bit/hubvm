import React, { useContext, useState } from "react";
import ReactFlow, { removeElements, addEdge, Controls, Background } from "react-flow-renderer";
import Gatherinput from "./components/Gatherinput.js";
import Dail from "./components/Dail.js";
import Queue from "./components/Queue.js";
import Voicemail from "./components/Voicemail.js";
import Hangup from "./components/Hangup.js"
import Ivr from "./components/Ivr.js";
import Recording from "./components/Recording.js";
import userContext from '../../../Contexter.js';
import "./Flow.css";
import { Select, Switch } from "antd";

const nodeTypes = {
    Gatherinput: Gatherinput,
    Dail: Dail,
    Queue: Queue,
    Voicemail: Voicemail,
    Hangup: Hangup,
    Ivr: Ivr,
    Recording: Recording,
};

const initialInput = {
    id: "1",
    type: "Gatherinput",
    data: { 1: ["", ""] },
    position: { x: 250, y: 25 },
};

const Daill = {
    id: "1",
    type: "Dail",
    data: { value: { agent: "Not selected", ringtime: "" } },
    position: { x: 300, y: 30 }
};

const Queuee = {
    id: "1",
    type: "Queue",
    data: { value: { agent: "Not selected", ringtime: "" } },
    position: { x: 300, y: 30 }
};

const Voicemaill = {
    id: "1",
    type: "Voicemail",
    data: { value: { agent: "Not selected", ringtime: "" } },
    position: { x: 300, y: 30 }
};

const Hangupp = {
    id: "1",
    type: "Hangup",
    data: { value: "Hnagup" },
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
    data: { value: { Recording: "yes" } },
    position: { x: 300, y: 30 }
};

const Flow = () => {
    const contexter = useContext(userContext);
    const [showDiv, setShowDiv] = useState(false);
    const [ivrEnabled, setIvrEnabled] = useState(false);


    const onElementsRemove = (elementsToRemove) =>
        contexter.setElements((els) => removeElements(elementsToRemove, els));



    const onConnect = (params) => {
        const { source, target, type, ...rest } = params;
        const sourceNodeId = source.split('__')[0];
        contexter.setElements((els) =>
            addEdge(
                {
                    ...rest,
                    source,
                    target,
                    arrowHeadType: "arrowclosed",
                    id: `reactflow__edge-${source}-${target}`,
                    sourceType: getNodeById(sourceNodeId)?.type,
                    targetType: getNodeById(target)?.type,

                },
                els
            )
        );
    };

    const getNodeById = (id) => {
        return contexter.elements.find((el) => el.id === id);
    };

    const onElementClick = (_, { id, type, data }) => {
        contexter.setObjectEdit({ id, type, data });
        console.log(id, type, data)
        if (type === "Gatherinput" || type === "Dail" || type === "Queue" || type === "Voicemail" || type === "Ivr" || type === "Recording") {
            setShowDiv(true);
        }

    };

    const onPaneClick = () => {
        contexter.setObjectEdit({});
        setShowDiv(false);
    };

    const onSubmit = () => {
        // alert(JSON.stringify(contexter.elements));
        let a = JSON.stringify(contexter.elements);
        console.log(a);
    };

    const onValueChange = (valueKey, value, index) => {
        const newElements = contexter.elements.map((el) => {
            if (el.id === contexter.objectEdit.id) {
                const newData = [...el.data[valueKey]];
                newData[index] = value;
                return {
                    ...el,
                    data: {
                        ...el.data,
                        [valueKey]: newData
                    }
                };
            }
            return el;
        });
        contexter.setElements(newElements);
        contexter.setObjectEdit((prev) => ({ ...prev, data: { ...prev.data, [valueKey]: newElements.find(el => el.id === prev.id)?.data[valueKey] } }));
    };

    const handleAddValue = () => {
        const currentKeys = Object.keys(contexter.objectEdit.data);
        const lastIndex = currentKeys.length > 0 ? parseInt(currentKeys[currentKeys.length - 1].replace("value", "")) : 0;
        const newKey = `${lastIndex + 1}`;
        const newElements = contexter.elements.map((el) => {
            if (el.id === contexter.objectEdit.id && el.type === "Gatherinput") {
                return {
                    ...el,
                    data: {
                        ...el.data,
                        [newKey]: ["", ""] // Add new key with two empty strings
                    }
                };
            }
            return el;
        });
        contexter.setElements(newElements);
        contexter.setObjectEdit((prev) => ({
            ...prev,
            data: {
                ...prev.data,
                [newKey]: ["", ""]
            }
        }));
    };

    const onRemove = (id) => {
        contexter.setElements((els) => els.filter((el) => el.id !== id && el.source !== id && el.target !== id));

        contexter.setObjectEdit({});
        setShowDiv(false);
    };

    const onRemoveField = (keyToRemove) => {
        const newObjectEditData = { ...contexter.objectEdit.data };
        delete newObjectEditData[keyToRemove];

        // Reindex the remaining keys
        const reindexedData = Object.fromEntries(
            Object.entries(newObjectEditData).map(([key, value], index) => [`${index + 1}`, value])
        );

        const newElements = contexter.elements.map((el) => {
            if (el.id === contexter.objectEdit.id && el.type === "Gatherinput") {
                return {
                    ...el,
                    data: reindexedData
                };
            }
            return el;
        });

        contexter.setElements(newElements);
        contexter.setObjectEdit((prev) => ({
            ...prev,
            data: reindexedData
        }));

    };

    const dialSelectValueFun = (value, option) => {
        if (!option) {
            console.error("Option is undefined");
            return;
        }

        const keyParts = option.key.split('-');

        if (keyParts.length === 2 || keyParts[1] === "agent") {
            updateAgentValue(value);
        } else if (option.key === "ringtime") {
            updateRingtimeValue(value);
        }
    };

    const updateAgentValue = (value) => {
        const newElements = contexter.elements.map((el) => {
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
            }
            return el;
        });

        contexter.setElements(newElements);
        contexter.setObjectEdit((prev) => ({ ...prev, data: { ...prev.data, value: { ...prev.data.value, agent: value } } }));
    };


    const updateRingtimeValue = (value) => {
        const newElements = contexter.elements.map((el) => {
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
            }
            return el;
        });

        contexter.setElements(newElements);
        contexter.setObjectEdit((prev) => ({ ...prev, data: { ...prev.data, value: { ...prev.data.value, ringtime: value } } }));
    };

    const toggleIvrEnabled = () => {
        setIvrEnabled(!ivrEnabled);
        const newElements = contexter.elements.map((el) => {
            if (el.id === contexter.objectEdit.id && el.type === "Gatherinput") {
                return {
                    ...el,
                    data: {
                        ...el.data,
                        ivrEnabled: !ivrEnabled
                    }
                };
            }
            return el;
        });
        contexter.setElements(newElements);
    };






    return (
        <div className="flow-conatiner">
            <div className="flow-main-container">
                <div className="flow-left-container">
                    <button className="flow-deploy-btn" onClick={onSubmit}>Deploy</button>
                    <hr />
                    <button className="flow-input-btn" onClick={() => contexter.setElements((els) => [...els, { ...initialInput, id: `${els.length + 1}` }])}>
                        &#10133; &nbsp; Gather Input
                    </button>
                    <button className="flow-input-btn" onClick={() => contexter.setElements((els) => [...els, { ...Daill, id: `${els.length + 1}` }])}>
                        &#10133; &nbsp; Dial
                    </button>
                    <button className="flow-input-btn" onClick={() => contexter.setElements((els) => [...els, { ...Queuee, id: `${els.length + 1}` }])}>
                        &#10133; &nbsp; Queue
                    </button>
                    <button className="flow-input-btn" onClick={() => contexter.setElements((els) => [...els, { ...Voicemaill, id: `${els.length + 1}` }])}>
                        &#10133; &nbsp; Voicemail
                    </button>
                    <button className="flow-input-btn" onClick={() => contexter.setElements((els) => [...els, { ...Hangupp, id: `${els.length + 1}` }])}>
                        &#10133; &nbsp; Hangup
                    </button>
                    <button className="flow-input-btn" onClick={() => contexter.setElements((els) => [...els, { ...Ivrr, id: `${els.length + 1}` }])}>
                        &#10133; &nbsp; IVR
                    </button>
                    <button className="flow-input-btn" onClick={() => contexter.setElements((els) => [...els, { ...Recordingg, id: `${els.length + 1}` }])}>
                        &#10133; &nbsp; Recording
                    </button>
                </div>
                <div className="flow-center-container">
                    <ReactFlow
                        elements={contexter.elements}
                        onElementsRemove={onElementsRemove}
                        onConnect={onConnect}
                        deleteKeyCode={46}
                        onElementClick={onElementClick}
                        onPaneClick={onPaneClick}
                        nodeTypes={nodeTypes}

                    >
                        <Controls />
                        <Background />
                    </ReactFlow>
                </div>
            </div>
            {showDiv && (
                <div className="flow-right-container" style={{ textAlign: "left", padding: 10 }}>
                    {contexter.objectEdit && contexter.objectEdit.type === "Gatherinput" && (
                        <>
                            <div className='gartherinpit-right-heding-container'><h2 className='gartherinpit-right-heding'>Gather Input</h2><button className="gather-input-delete" onClick={() => onRemove(contexter.objectEdit.id)}><i class="ri-delete-bin-5-fill"></i></button></div>
                            IVR: <Switch checkedChildren="Enabled"
                                unCheckedChildren="Disabled"
                                defaultChecked={contexter.objectEdit.data.ivrEnabled}
                                onChange={toggleIvrEnabled} ></Switch>
                            <div ><span className="garther-input-textbox">Select Ivr</span></div>

                            {contexter.objectEdit && contexter.objectEdit.type === "Gatherinput" && contexter.objectEdit.ivrEnabled && (
                                <Select
                                    style={{
                                        width: '100%',
                                        zIndex: 10000
                                    }}
                                    options={[
                                        {
                                            value: 'jack',
                                            label: 'Jack',
                                            key: 'jack-agent'
                                        },
                                        {
                                            value: 'lucy',
                                            label: 'Lucy',
                                            key: 'lucy-agent'
                                        },
                                        {
                                            value: 'Yiminghe',
                                            label: 'Yiminghe',
                                            key: 'yiminghe-agent'
                                        },
                                        {
                                            value: 'disabled',
                                            label: 'Disabled',
                                            disabled: true,
                                            key: 'disabled-agent'
                                        },
                                    ]}
                                />
                            )}

                            {Object.entries(contexter.objectEdit.data).map(([key, value]) => (
                                <div className="gartherinput-form-container" key={key}>
                                    <hr />
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }} ><span className="garther-input-textbox">Caller presses</span> <button className="gather-input-delete-remove" onClick={() => onRemoveField(key)}><i className="ri-delete-bin-5-fill"></i></button></div>
                                    <input value={value[0]} onChange={(e) => onValueChange(key, e.target.value, 0)} />
                                    <br />
                                    <span className="garther-input-textbox">Or says</span>
                                    <br />
                                    <input value={value[1]} onChange={(e) => onValueChange(key, e.target.value, 1)} />
                                    <br />
                                    <br />

                                </div>
                            ))}
                            <div style={{ display: "flex" }}>
                                <button className="garther-input-addmore-btn" onClick={handleAddValue}>Add more</button>

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
                                options={[
                                    {
                                        value: 'jack',
                                        label: 'Jack',
                                        key: 'jack-agent'
                                    },
                                    {
                                        value: 'lucy',
                                        label: 'Lucy',
                                        key: 'lucy-agent'
                                    },
                                    {
                                        value: 'Yiminghe',
                                        label: 'Yiminghe',
                                        key: 'yiminghe-agent'
                                    },
                                    {
                                        value: 'disabled',
                                        label: 'Disabled',
                                        disabled: true,
                                        key: 'disabled-agent'
                                    },
                                ]}
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
                        </>
                    )}
                    {contexter.objectEdit && contexter.objectEdit.type === "Queue" && (
                        <>
                            <div className='gartherinpit-right-heding-container'><h2 className='gartherinpit-right-heding'>Queue</h2><button className="gather-input-delete" onClick={() => onRemove(contexter.objectEdit.id)}><i className="ri-delete-bin-5-fill"></i></button></div>
                            <div ><span className="garther-input-textbox">Select Agent</span></div>
                            <Select
                                defaultValue={contexter.objectEdit.data.value.agent}
                                style={{
                                    width: '100%',
                                    zIndex: 10000
                                }}
                                onChange={(value, option) => dialSelectValueFun(value, option)}
                                options={[
                                    {
                                        value: 'jack',
                                        label: 'Jack',
                                        key: 'jack-agent'
                                    },
                                    {
                                        value: 'lucy',
                                        label: 'Lucy',
                                        key: 'lucy-agent'
                                    },
                                    {
                                        value: 'Yiminghe',
                                        label: 'Yiminghe',
                                        key: 'yiminghe-agent'
                                    },
                                    {
                                        value: 'disabled',
                                        label: 'Disabled',
                                        disabled: true,
                                        key: 'disabled-agent'
                                    },
                                ]}
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
                                options={[
                                    {
                                        value: 'jack',
                                        label: 'Jack',
                                        key: 'jack-agent'
                                    },
                                    {
                                        value: 'lucy',
                                        label: 'Lucy',
                                        key: 'lucy-agent'
                                    },
                                    {
                                        value: 'Yiminghe',
                                        label: 'Yiminghe',
                                        key: 'yiminghe-agent'
                                    },
                                    {
                                        value: 'disabled',
                                        label: 'Disabled',
                                        disabled: true,
                                        key: 'disabled-agent'
                                    },
                                ]}
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
                                options={[
                                    {
                                        value: 'Ivr 1',
                                        label: 'Ivr 1',
                                        key: 'jack-agent'
                                    },
                                    {
                                        value: 'Ivr 2',
                                        label: 'Ivr 2',
                                        key: 'lucy-agent'
                                    },
                                    {
                                        value: 'Ivr 3',
                                        label: 'Ivr 3',
                                        key: 'yiminghe-agent'
                                    },
                                    {
                                        value: 'disabled',
                                        label: 'Disabled',
                                        disabled: true,
                                        key: 'disabled-agent'
                                    },
                                ]}
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

                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default Flow;
