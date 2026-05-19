import React, { useContext, useEffect, useState } from "react";
import ReactFlow, {
    Controls,
    Background,
    ConnectionLineType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './style/Ivrflowview.css';
import { Spin } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import IvrGatherinput from "./call flow components/IvrGatherinput.jsx";
import IvrStart from "./call flow components/IvrStart.jsx";
import Ivr from "./call flow components/Ivr.jsx";
import Hangup from './call flow components/Hangup.jsx'
import userContext from "../../Contexter.js";

import { IoArrowBack } from "react-icons/io5";
import { IvrBlast } from "../../store/IvrBlast";


const nodeTypes = {
    IvrGatherinput: IvrGatherinput,
    IvrStart: IvrStart,
    Ivr: Ivr,
    Hangup: Hangup,
};




const Ivrflowview = () => {

    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const contexter = useContext(userContext);
    const edges = contexter.initialEdges;
    const navigate = useNavigate();

    const { selectedIvrFlowData, selectedIvrFlow, selectedFlowdataFetch } = IvrBlast();

    const [id, setid] = useState(parseInt(params.get('FlowId')));

    useEffect(() => {
        const fetchData = async () => {
            console.log(id);
            await selectedIvrFlow(id);
        };
        fetchData();
    }, [id]);


    useEffect(() =>{
        contexter.setNodes(selectedIvrFlowData[0]?.i_flowOData);
        contexter.setinitialEdges(selectedIvrFlowData[0]?.i_flowOPosition);
    },[selectedIvrFlowData]);



    const handleBack = () => {
        navigate(`/ivrblast/Ivrflow`);
    };

    const defaultEdgeOptions = {
        // animated: true,
        type: 'smoothstep',
    };

    return (
        <div className='Ivr-flow-view-conatiner'>
            {selectedFlowdataFetch ? (
                <div className="Ivr-flow-view-main-loading-container">   
                <Spin size="large" />
                </div>
                ) : (
                <div className="Ivr-flow-view-main-container">

                    <div className="Ivr-flow-view-center-container">

                        <div className="Ivr-flow-view-center-container-heading-conatiner">
                            <button onClick={handleBack} className="Ivr-flow-view-center-container-backbutton"><IoArrowBack /></button>
                            <div className="Ivr-flow-view-center-container-heading">
                                <p>{selectedIvrFlowData[0]?.i_flowName}</p>
                            </div>
                        </div>


                        <ReactFlow
                            nodes={contexter.nodes}
                            edges={edges}
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
            )}

        </div>
    );
};

export default Ivrflowview;
