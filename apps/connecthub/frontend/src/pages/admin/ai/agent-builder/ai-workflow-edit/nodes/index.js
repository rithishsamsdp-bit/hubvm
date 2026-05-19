import PremiumNode from "./PremiumNode.jsx";

export const nodeTypes = {
  premium: PremiumNode,
};

export const initialNodes = [
  {
    id: "start",
    type: "premium",
    position: { x: 250, y: 150 },
    data: { label: "Start", nodeType: "start" },
  },
];
