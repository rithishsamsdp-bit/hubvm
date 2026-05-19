// FlowEditor.jsx
import { useCallback, useMemo, useState, useEffect } from "react";
import ReactFlow, {
    Background,
    Controls,
    useEdgesState,
    useNodesState,
    BackgroundVariant,
} from "reactflow";
import { useNavigate, useLocation } from 'react-router-dom';
import "reactflow/dist/style.css";

import "./FlowEditor.css";
import FlowTopbar from "./components/FlowTopbar";
import SidePanel from "./SidePanel";

import nodeTypes from "./nodes/nodeTypes";
import CustomEdge from "./edges/customEdge.jsx";

import { useCallFlow } from "../store/useCallFlow.js";

import { Loader } from "../components/Index.jsx";

const edgeTypes = { custom: CustomEdge };

const PANEL_DISABLED_TYPES = new Set(["callStart"]);
// "callEnd"

export default function FlowEditor() {
    const { viewCallFlowLoading, viewCallflow, Nodes, Edges } = useCallFlow();
    const navigate = useNavigate();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const viewid = params.get("viewid");
    const name = params.get("name");

    useEffect(() => {
        if (!viewid?.trim() || !name?.trim()) {
            navigate("/admin-callflow");
        }
    }, [viewid, name, navigate]);

    useEffect(() => {
        viewCallflow(viewid);
    }, [])

    const [nodes, setNodes, onNodesChange] = useNodesState(Nodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(Edges);
    const [selectedNode, setSelectedNode] = useState(null);

    useEffect(() => {
        setNodes(Nodes);
        setEdges(Edges);
    }, [Nodes, Edges])

    useEffect(() => {
        if (selectedNode) {
            const stillExists = nodes.some(n => n.id === selectedNode.id);
            if (!stillExists) {
                setSelectedNode(null);
            }
        }
    }, [nodes, selectedNode]);


    const onNodeClick = useCallback((_evt, node) => {
        if (PANEL_DISABLED_TYPES.has(node.type)) return;
        setSelectedNode(node);
    }, []);


    const handleSidebarClose = useCallback((updatedData) => {
        if (!selectedNode) return;
        setNodes((nds) =>
            nds.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, ...updatedData } } : n))
        );
        setSelectedNode(null);
    }, [selectedNode, setNodes]);



    const exit = useCallback(() => {
        navigate(-1);
    }, [])

    const defaultEdgeOptions = useMemo(() => ({ type: "smoothstep", animated: false }), []);


    if (viewCallFlowLoading) {
        return (
            <div className='App_loading_container'>
                <Loader />
            </div>
        )
    }

    return (
        <div className="FlowEditor">
            <FlowTopbar exit={exit} name={name} type="view" />

            <div className="FlowEditor_center">


                <div style={{ position: "relative", flex: 1 }}>
                    <ReactFlow
                        style={{ backgroundColor: "#f1f5f9" }}
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        edgeTypes={edgeTypes}
                        nodeTypes={nodeTypes}
                        onNodeClick={onNodeClick}
                        defaultEdgeOptions={defaultEdgeOptions}
                        fitView
                        fitViewOptions={{ padding: 0.2 }}
                        minZoom={0.2}
                        maxZoom={1.5}
                    >
                        <Controls />
                        <Background color="#BFBFBF" size={1} gap={16} variant={BackgroundVariant.Dots} />
                    </ReactFlow>

                    {selectedNode && !PANEL_DISABLED_TYPES.has(selectedNode.type) && (
                        <SidePanel
                            node={selectedNode}
                            onClose={handleSidebarClose}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
