import React, { useState, useCallback, useRef, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { nodeTypes } from "./nodes/index.js";
import { edgeTypes } from "./edges/index.js";
import WorkflowSidebar from "./sidepanel/WorkflowSidebar.jsx";
import Icon from "../../../../../constants/Icon.jsx";

const AIWorkflowEdit = ({ nodes, setNodes, edges, setEdges }) => {
  const [popoverMenu, setPopoverMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    sourceNodeId: null,
  });
  const [selectedElement, setSelectedElement] = useState(null); // Tracks selected node OR edge

  const reactFlowWrapper = useRef(null);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes],
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges],
  );

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) => {
        // Only show "Configure condition" if the source is not the start node
        const isFromStart = params.source === "start";

        // Default to "LLM Condition" unless the target is an action tool
        const targetNode = nodes.find(n => n.id === params.target);
        let defaultTransitionType = targetNode?.data?.nodeType === "action" ? "None" : "LLM Condition";

        return addEdge(
          {
            ...params,
            type: "premium",
            animated: true,
            label: defaultTransitionType !== "None" ? "Configure condition" : "",
            markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
            data: { transitionType: defaultTransitionType },
          },
          eds,
        );
      }),
    [nodes, setEdges],
  );

  const onSelectionChange = useCallback(({ nodes, edges }) => {
    if (nodes.length > 0) {
      setSelectedElement({ type: "node", data: nodes[0] });
    } else if (edges.length > 0) {
      setSelectedElement({ type: "edge", data: edges[0] });
    } else {
      setSelectedElement(null);
    }
  }, []);

  // Close popovers if clicked outside
  useEffect(() => {
    const handleClickOutside = () => {
      setPopoverMenu((prev) => ({ ...prev, visible: false }));
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleAddNodeClick = useCallback(
    (event, sourceNodeId) => {
      if (!reactFlowWrapper.current) return;
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();

      // Position popover relatively to the canvas wrapper
      const x = event.clientX - reactFlowBounds.left;
      const y = event.clientY - reactFlowBounds.top + 15;

      const sourceNode = nodes.find((n) => n.id === sourceNodeId);

      setPopoverMenu({
        visible: true,
        x,
        y,
        sourceNodeId,
        sourceNodeType: sourceNode?.data?.nodeType || "subagent",
      });
    },
    [nodes],
  );

  // Hydrate nodes with the add node callback
  const hydratedNodes = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onAddNodeClick: handleAddNodeClick,
      onDelete: (nodeId) => {
        setNodes((nds) => nds.filter((n) => n.id !== nodeId));
        setEdges((eds) =>
          eds.filter((e) => e.source !== nodeId && e.target !== nodeId),
        );
        setSelectedElement(null);
      },
      onDuplicate: (nodeId) => {
        const nodeToClone = nodes.find((n) => n.id === nodeId);
        if (!nodeToClone) return;

        const newNodeId = `${nodeToClone.data.nodeType}_${new Date().getTime()}`;
        const clonedNode = {
          ...nodeToClone,
          id: newNodeId,
          position: {
            x: nodeToClone.position.x + 50,
            y: nodeToClone.position.y + 50,
          },
          selected: false,
        };
        setNodes((nds) => nds.concat(clonedNode));
      },
    },
  }));

  const addNodeFromMenu = (typeStr, label) => {
    const sourceNodeId = popoverMenu.sourceNodeId;
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) return;

    const newNodeId = `${typeStr}_${new Date().getTime()}`;
    const newNodePos = {
      x: sourceNode.position.x,
      y: sourceNode.position.y + 120, // 120px below
    };

    const newNode = {
      id: newNodeId,
      type: "premium",
      position: newNodePos,
      data: { label: label, nodeType: typeStr },
    };

    const isFromStart = sourceNodeId === "start";
    let defaultTransitionType = typeStr === "action" ? "None" : "LLM Condition";

    const newEdge = {
      id: `e_${sourceNodeId}_${newNodeId}`,
      source: sourceNodeId,
      target: newNodeId,
      type: "premium",
      label: defaultTransitionType !== "None" ? "Configure condition" : "",
      markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
      data: { transitionType: defaultTransitionType },
    };

    setNodes((nds) => nds.concat(newNode));
    setEdges((eds) => eds.concat(newEdge));
  };

  return (
    <div className="workflow_tab_container">
      <div className="workflow_canvas_area" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={hydratedNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          onPaneClick={() =>
            setPopoverMenu((prev) => ({ ...prev, visible: false }))
          }
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#cbd5e1" gap={20} size={1} />
          <Controls />
        </ReactFlow>

        {popoverMenu.visible && (
          <div
            className="node_add_popover"
            style={{ left: popoverMenu.x, top: popoverMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="popover_option"
              onClick={(e) => {
                e.stopPropagation();
                addNodeFromMenu("subagent", "New subagent");
                setPopoverMenu((prev) => ({ ...prev, visible: false }));
              }}
            >
              <div className="popover_icon_wrap">
                <Icon name="user" size={14} color="#64748b" />
              </div>
              Subagent
            </div>

            {/* API Action Node */}
            <div
              className="popover_option"
              onClick={(e) => {
                e.stopPropagation();
                addNodeFromMenu("action", "New API Action");
                setPopoverMenu((prev) => ({ ...prev, visible: false }));
              }}
            >
              <div className="popover_icon_wrap">
                <Icon name="tool" size={14} color="#64748b" />
              </div>
              API Action
            </div>

            {/* Removed Agent Transfer and End nodes for simplicity */}
          </div>
        )}
      </div>

      <WorkflowSidebar
        selectedElement={selectedElement}
        nodes={nodes}
        setNodes={setNodes}
        edges={edges}
        setEdges={setEdges}
      />
    </div>
  );
};

export default AIWorkflowEdit;
