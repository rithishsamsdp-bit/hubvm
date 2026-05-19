// FlowEditor.jsx
import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  useEdgesState,
  useNodesState,
  BackgroundVariant,
} from "reactflow";
import { useNavigate, useLocation } from "react-router-dom";
import "reactflow/dist/style.css";

import "./FlowEditor.css";
import FlowTopbar from "./components/FlowTopbar";
import FlowLeftPanel from "./components/FlowLeftPanel";
import SidePanel from "./SidePanel";

import nodeTypes from "./nodes/nodeTypes";
import CustomEdge from "./edges/customEdge.jsx";

import directline from "./default/directLine.js";
import businessHours from "./default/businessHours.js";
import callRouting from "./default/callRouting.js";
import custom from "./default/custom.js";
import { useCallFlow } from "../store/useCallFlow.js";

import { Loader } from "../components/Index.jsx";

const templateMap = {
  direct: directline,
  businesshour: businessHours,
  callrouting: callRouting,
  scratch: custom,
};

const edgeTypes = { custom: CustomEdge };

const PANEL_DISABLED_TYPES = new Set(["callStart"]);
// "callEnd"
const NEW_NODE_TYPE = "timeCase";

const getInitialCounter = (nodes) => {
  let maxId = 0;
  nodes.forEach((n) => {
    const num = parseInt(n.id, 10);
    if (!isNaN(num) && num > maxId) {
      maxId = num;
    }
  });
  return maxId + 1;
};

export default function FlowEditor() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const name = params.get("name");
  const template = params.get("template");
  const selectedTemplate = templateMap[template] || { nodes: [], edges: [] };
  useEffect(() => {
    if (!name?.trim() || !template?.trim()) {
      navigate("/admin-callflow");
    }
  }, [name, template, navigate]);

  const [nodes, setNodes, onNodesChange] = useNodesState(() => {
    return selectedTemplate.nodes.map((node) => {
      const isChildNode = node.data?.fromNodeId;
      return {
        ...node,
        data: {
          ...node.data,
          onDelete: () => {
            if (node.type === "keypad" || node.type === "timeRule") {
              cascadeDeleteByParentId(node.id);
            } else {
              if (selectedNode?.id === node.id) setSelectedNode(null);
              setNodes((cur) => cur.filter((n) => n.id !== node.id));
              setEdges((cur) =>
                cur.filter((e) => e.source !== node.id && e.target !== node.id),
              );
            }
          },
        },
      };
    });
  });

  const [edges, setEdges, onEdgesChange] = useEdgesState(() => {
    return selectedTemplate.edges.map((edge) => {
      return {
        ...edge,
        data: {
          ...(edge.data || {}),
          onDelete: () =>
            setEdges((cur) => cur.filter((e) => e.id !== edge.id)),
        },
      };
    });
  });

  const [selectedNode, setSelectedNode] = useState(null);
  const idCounter = useRef(getInitialCounter(selectedTemplate.nodes));
  const nextId = useCallback(() => String(idCounter.current++), []);

  const { createCallflow, createCallFlowLoading } = useCallFlow();

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue =
        "You have unsaved changes. Are you sure you want to leave?";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (selectedNode) {
      const stillExists = nodes.some((n) => n.id === selectedNode.id);
      if (!stillExists) {
        setSelectedNode(null); // ✅ close panel if node was deleted
      }
    }
  }, [nodes, selectedNode]);

  const onConnect = useCallback(
    (params) => {
      const edgeId = `e-${params.source}-${params.target}`;
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            id: edgeId,
            type: "custom",

            data: {
              onDelete: () =>
                setEdges((cur) => cur.filter((e) => e.id !== edgeId)),
            },
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  const cascadeDeleteByParentId = useCallback(
    (parentId) => {
      setNodes((curNodes) => {
        const childIds = new Set(
          curNodes
            .filter((n) => n.data?.fromNodeId === parentId)
            .map((n) => n.id),
        );

        setEdges((curEdges) =>
          curEdges.filter(
            (e) =>
              e.source !== parentId &&
              e.target !== parentId &&
              !childIds.has(e.source) &&
              !childIds.has(e.target),
          ),
        );

        // ✅ Close side panel if selected node is deleted
        if (
          selectedNode &&
          (selectedNode.id === parentId || childIds.has(selectedNode.id))
        ) {
          setSelectedNode(null);
        }

        return curNodes.filter((n) => n.id !== parentId && !childIds.has(n.id));
      });
    },
    [setNodes, setEdges, selectedNode],
  );

  const handleAddNode = useCallback(
    (label, type) => {
      const id = nextId();
      const position = { x: 220, y: 150 };

      setNodes((nds) => [
        ...nds,
        {
          id,
          type,
          position,
          data: {
            label,
            onDelete: () => {
              if (type === "keypad" || type === "timeRule") {
                // ✅ cascade delete parent + its children + all their edges
                cascadeDeleteByParentId(id);
              } else {
                // normal nodes: delete node + connected edges
                if (selectedNode && selectedNode.id === id) {
                  setSelectedNode(null); // close side panel
                }
                setNodes((cur) => cur.filter((n) => n.id !== id));
                setEdges((cur) =>
                  cur.filter((e) => e.source !== id && e.target !== id),
                );
              }
            },
          },
        },
      ]);
    },
    [nextId, setNodes, setEdges, cascadeDeleteByParentId],
  );

  const onNodeClick = useCallback((_evt, node) => {
    if (PANEL_DISABLED_TYPES.has(node.type)) return;
    setSelectedNode(node);
  }, []);

  const handleDataChange = useCallback(
    (newData, fullReplace = false) => {
      if (!selectedNode) return;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === selectedNode.id
            ? { ...n, data: fullReplace ? { ...newData } : { ...n.data, ...newData } }
            : n,
        ),
      );
    },
    [selectedNode, setNodes],
  );

    const handleSidebarClose = useCallback(
    (updatedData) => {
      if (!selectedNode) return;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === selectedNode.id
            ? { ...n, data: updatedData }
            : n,
        ),
      );
      setSelectedNode(null);
    },
    [selectedNode, setNodes],
  );

  // NEW: update a child node (created from a branch) by nodeId
  const syncChildNode = useCallback(
    ({ nodeId, label }) => {
      if (!nodeId) return;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, label } } : n,
        ),
      );
    },
    [setNodes],
  );

  // NEW: remove a child node (and any connected edges)
  const removeChildNode = useCallback(
    (nodeId) => {
      if (!nodeId) return;
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId),
      );
    },
    [setNodes, setEdges],
  );

  // Create a node from the side panel "Add Branch". Return newId so panel can link it.
  const handleImmediateBranchAdd = useCallback(
    (payload) => {
      if (!selectedNode) return null;

      const title = (payload?.title ?? "").trim() || "New Node";
      const newId = nextId();

      const baseX = selectedNode.position?.x ?? 0;
      const baseY = selectedNode.position?.y ?? 0;
      const position = { x: baseX + 280, y: baseY + 40 };

      // 1) Add the child node
      setNodes((nds) => [
        ...nds,
        {
          id: newId,
          type: NEW_NODE_TYPE,
          position,
          style: {
            backgroundColor: "#2A2A2A",
            color: "var(--color-white)",
            height: 34,
            borderRadius: 40,
            padding: 10,
            fontFamily: "var(--roboto)",
            fontSize: "var(--font-sm)",
            fontWeight: 500,
          },
          data: {
            label: title,
            fromNodeId: selectedNode.id, // used for cascade deletes, etc.
            onDelete: () => {
              if (selectedNode && selectedNode.id === newId) {
                setSelectedNode(null); // ✅ Close side panel
              }
              // deleting the child node also removes its edges
              setNodes((cur) => cur.filter((n) => n.id !== newId));
              setEdges((cur) =>
                cur.filter((e) => e.source !== newId && e.target !== newId),
              );
            },
          },
        },
      ]);

      // 2) Connect parent → child and give the edge a working delete handler
      const edgeId = `e-${selectedNode.id}-${newId}`;
      setEdges((eds) =>
        addEdge(
          {
            id: edgeId,
            source: selectedNode.id,
            target: newId,
            type: "custom",
            data: {
              onDelete: () =>
                setEdges((cur) => cur.filter((e) => e.id !== edgeId)),
            },
          },
          eds,
        ),
      );

      return newId; // panel can store nodeId on the branch
    },
    [selectedNode, nextId, setNodes, setEdges],
  );

  const createFlow = useCallback(async () => {
    try {
      const cleanedNodes = nodes.map((n) => {
        const data = { ...n.data };

        // Ensure messageType exists for audio-capable nodes
        if (n.type === "audioMsg" || n.type === "voicemail") {
          if (!data.messageType) data.messageType = "tts";
          if (data.messageType === "tts") {
            delete data.audioFileName;
          } else {
            delete data.instructionMsg;
          }
        }
        if (n.type === "keypad") {
          if (!data.instructionMsgType) data.instructionMsgType = "tts";
          if (!data.reminderMsgType) data.reminderMsgType = "tts";
          if (data.instructionMsgType === "tts") {
            delete data.instructionAudioName;
          } else {
            delete data.instructionMsg;
          }
          if (data.reminderMsgType === "tts") {
            delete data.reminderAudioName;
          } else {
            delete data.reminderMsg;
          }
        }
        if (n.type === "ringTo") {
          ["busyAnnouncement", "unavailableAnnouncement"].forEach(key => {
            if (data[key]) {
              if (!data[key].messageType) data[key].messageType = "tts";
              if (data[key].messageType === "tts") {
                delete data[key].audioFileName;
              } else {
                delete data[key].instructionMsg;
              }
            }
          });
        }

        return { ...n, data };
      });

      await createCallflow(name, cleanedNodes, edges);
      navigate(-1);
    } catch (error) {
      console.error("Failed to create Callflow", error);
    }
  }, [nodes, edges, name, navigate, createCallflow]);

  const exit = useCallback(() => {
    navigate(-1);
  }, []);

  const defaultEdgeOptions = useMemo(
    () => ({ type: "smoothstep", animated: false }),
    [],
  );

  if (createCallFlowLoading) {
    return (
      <div className="App_loading_container">
        <Loader />
      </div>
    );
  }

  return (
    <div className="FlowEditor">
      <FlowTopbar submit={createFlow} exit={exit} name={name} type="create" />

      <div className="FlowEditor_center">
        <FlowLeftPanel onAddNode={handleAddNode} />

        <div style={{ position: "relative", flex: 1 }}>
          <ReactFlow
            style={{ backgroundColor: "#f1f5f9" }}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            edgeTypes={edgeTypes}
            nodeTypes={nodeTypes}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={1.5}
          >
            <Controls />
            <Background
              color="#BFBFBF"
              size={1}
              gap={16}
              variant={BackgroundVariant.Dots}
            />
          </ReactFlow>

          {selectedNode && !PANEL_DISABLED_TYPES.has(selectedNode.type) && (
            <SidePanel
              node={selectedNode}
              onClose={handleSidebarClose}
              onAddBranch={handleImmediateBranchAdd}
              onDataChange={handleDataChange}
              onSyncChildNode={syncChildNode}
              onRemoveChildNode={removeChildNode}
              callflowName={name}
            />
          )}
        </div>
      </div>
    </div>
  );
}
