"use client";
import { Workflow } from "@prisma/client";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  useReactFlow,
  Connection,
  Edge,
  addEdge,
  getOutgoers,
} from "@xyflow/react";
import React, { useCallback, useEffect, useState } from "react";
import "@xyflow/react/dist/style.css";
import { CreateFlowNode } from "@/lib/workflow/createFlowNode";
import { TaskType } from "@/types/task";
import NodeComponent from "./nodes/NodeComponent";
import { AppNode } from "@/types/appNode";
import DeletableEdge from "./edges/DeletableEdge";
import { TaskRegistry } from "@/lib/workflow/task/registry";
import { useTheme } from "next-themes";

const nodeTypes = {
  FlowScrapeNode: NodeComponent,
};

const edgeTypes = {
  default: DeletableEdge,
};

const snapGrid: [number, number] = [50, 50];
const fitViewOptions = { padding: 1 };

// Mirrors ThemePaletteBar's PALETTES array exactly
const PALETTE_COLORS: Record<string, { primary: string; accent: string }> = {
  amber: { primary: "#f59e0b", accent: "#3d5afe" },
  emerald: { primary: "#16a34a", accent: "#ef4444" },
  indigo: { primary: "#6366f1", accent: "#eab308" },
  azure: { primary: "#0ea5e9", accent: "#f97316" },
  violet: { primary: "#9333ea", accent: "#84cc16" },
  crimson: { primary: "#f43f5e", accent: "#14b8a6" },
  cobalt: { primary: "#4169e1", accent: "#ff8c42" },
  teal: { primary: "#14b8a6", accent: "#e879f9" },
  ocean: { primary: "#0891b2", accent: "#ff7849" },
  mint: { primary: "#10b981", accent: "#ec4899" },
};

// Converts a hex color to RGB components for use in rgba()
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

function FlowEditor({ workflow }: { workflow: Workflow }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { setViewport, screenToFlowPosition, updateNodeData } = useReactFlow();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [palette, setPalette] = useState("amber");

  // Read palette from localStorage + watch for live changes via MutationObserver
  useEffect(() => {
    const saved = localStorage.getItem("fs-palette") ?? "amber";
    setPalette(saved);

    const observer = new MutationObserver(() => {
      const attr =
        document.documentElement.getAttribute("data-palette") ?? "amber";
      setPalette(attr);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-palette"],
    });
    return () => observer.disconnect();
  }, []);

  const { primary: paletteColor, accent: accentColor } =
    PALETTE_COLORS[palette] ?? PALETTE_COLORS.amber;

  const paletteRgb = hexToRgb(paletteColor);
  const accentRgb = hexToRgb(accentColor);

  // ── Background colors ──────────────────────────────────────────────────────
  const canvasBg = isDark ? "#0d0f14" : "#f0f2f8";
  const dotColor = isDark
    ? `rgba(${paletteRgb}, 0.35)`
    : `rgba(${paletteRgb}, 0.30)`;

  // ── Node CSS injected into the page so NodeComponent picks it up ───────────
  // We target .react-flow__node and its children using CSS variables set here
  const nodeStyles = `
    :root {
      --palette-primary: ${paletteColor};
      --palette-primary-rgb: ${paletteRgb};
      --palette-accent: ${accentColor};
      --palette-accent-rgb: ${accentRgb};
    }

    /* ── Base node wrapper ── */
    .react-flow__node {
      border-radius: 12px !important;
      border: none !important;
      padding: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      filter: none !important;
    }

    /* ── The actual visible node card ── */
    .react-flow__node > div,
    .react-flow__node .node-card {
      border-radius: 12px !important;
      border: 1.5px solid ${
        isDark ? `rgba(${paletteRgb}, 0.40)` : `rgba(${paletteRgb}, 0.28)`
      } !important;
      background: ${
        isDark
          ? `linear-gradient(135deg, #1a1d27 0%, #13151e 100%)`
          : `linear-gradient(135deg, #ffffff 0%, #f5f7ff 100%)`
      } !important;
      box-shadow:
        0 0 0 1px ${
          isDark ? `rgba(${paletteRgb}, 0.12)` : `rgba(${paletteRgb}, 0.10)`
        },
        0 4px 12px ${
          isDark ? `rgba(0, 0, 0, 0.55)` : `rgba(${paletteRgb}, 0.14)`
        },
        0 12px 32px ${
          isDark ? `rgba(0, 0, 0, 0.40)` : `rgba(${paletteRgb}, 0.08)`
        },
        inset 0 1px 0 ${
          isDark ? `rgba(255, 255, 255, 0.06)` : `rgba(255, 255, 255, 0.80)`
        } !important;
      transition:
        box-shadow 0.18s ease,
        border-color 0.18s ease,
        transform 0.15s ease !important;
    }

    /* ── Hover state ── */
    .react-flow__node:hover > div,
    .react-flow__node:hover .node-card {
      border-color: ${
        isDark ? `rgba(${paletteRgb}, 0.70)` : `rgba(${paletteRgb}, 0.55)`
      } !important;
      box-shadow:
        0 0 0 2px ${`rgba(${paletteRgb}, 0.22)`},
        0 8px 24px ${
          isDark ? `rgba(0, 0, 0, 0.65)` : `rgba(${paletteRgb}, 0.22)`
        },
        0 20px 48px ${
          isDark ? `rgba(0, 0, 0, 0.50)` : `rgba(${paletteRgb}, 0.12)`
        },
        inset 0 1px 0 ${
          isDark ? `rgba(255, 255, 255, 0.08)` : `rgba(255, 255, 255, 0.90)`
        } !important;
      transform: translateY(-1px) !important;
    }

    /* ── Selected node ── */
    .react-flow__node.selected > div,
    .react-flow__node.selected .node-card {
      border-color: ${paletteColor} !important;
      box-shadow:
        0 0 0 2px ${`rgba(${paletteRgb}, 0.35)`},
        0 0 16px ${`rgba(${paletteRgb}, 0.25)`},
        0 8px 24px ${isDark ? `rgba(0,0,0,0.65)` : `rgba(${paletteRgb}, 0.20)`},
        inset 0 1px 0 ${
          isDark ? `rgba(255, 255, 255, 0.08)` : `rgba(255, 255, 255, 0.90)`
        } !important;
    }

    /* ── Node header / top bar (if your NodeComponent has one) ── */
    .react-flow__node .node-header,
    .react-flow__node [class*="header"] {
      background: ${
        isDark
          ? `linear-gradient(90deg, rgba(${paletteRgb}, 0.18) 0%, rgba(${paletteRgb}, 0.08) 100%)`
          : `linear-gradient(90deg, rgba(${paletteRgb}, 0.12) 0%, rgba(${paletteRgb}, 0.04) 100%)`
      } !important;
      border-bottom: 1px solid ${
        isDark ? `rgba(${paletteRgb}, 0.25)` : `rgba(${paletteRgb}, 0.18)`
      } !important;
      border-radius: 10px 10px 0 0 !important;
    }

    /* ── Handles (connection dots) ── */
    .react-flow__handle {
      width: 10px !important;
      height: 10px !important;
      border-radius: 50% !important;
      border: 2px solid ${paletteColor} !important;
      background: ${isDark ? "#0d0f14" : "#ffffff"} !important;
      box-shadow:
        0 0 0 2px ${`rgba(${paletteRgb}, 0.20)`},
        0 2px 6px ${`rgba(${paletteRgb}, 0.35)`} !important;
      transition: transform 0.15s ease, box-shadow 0.15s ease !important;
    }

    .react-flow__handle:hover {
      transform: scale(1.35) !important;
      box-shadow:
        0 0 0 3px ${`rgba(${paletteRgb}, 0.35)`},
        0 4px 10px ${`rgba(${paletteRgb}, 0.50)`} !important;
    }

    /* ── Edges ── */
    .react-flow__edge-path {
      stroke: ${
        isDark ? `rgba(${paletteRgb}, 0.65)` : `rgba(${paletteRgb}, 0.55)`
      } !important;
      stroke-width: 2px !important;
      filter: drop-shadow(0 0 4px rgba(${paletteRgb}, 0.35)) !important;
    }

    .react-flow__edge.animated .react-flow__edge-path {
      stroke-dasharray: 6 3 !important;
    }

    .react-flow__edge.selected .react-flow__edge-path {
      stroke: ${paletteColor} !important;
      stroke-width: 2.5px !important;
      filter: drop-shadow(0 0 6px rgba(${paletteRgb}, 0.60)) !important;
    }

    /* ── Controls panel ── */
    .react-flow__controls {
      border-radius: 10px !important;
      overflow: hidden !important;
      border: 1px solid ${
        isDark ? `rgba(${paletteRgb}, 0.30)` : `rgba(${paletteRgb}, 0.20)`
      } !important;
      box-shadow:
        0 4px 16px ${isDark ? "rgba(0,0,0,0.50)" : `rgba(${paletteRgb}, 0.15)`} !important;
      background: ${isDark ? "#1a1d27" : "#ffffff"} !important;
    }

    .react-flow__controls-button {
      background: ${isDark ? "#1a1d27" : "#ffffff"} !important;
      border-bottom: 1px solid ${
        isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"
      } !important;
      color: ${isDark ? `rgba(${paletteRgb}, 0.80)` : `rgba(${paletteRgb}, 0.75)`} !important;
      transition: background 0.15s !important;
    }

    .react-flow__controls-button:hover {
      background: ${
        isDark ? `rgba(${paletteRgb}, 0.12)` : `rgba(${paletteRgb}, 0.08)`
      } !important;
    }

    .react-flow__controls-button svg {
      fill: currentColor !important;
    }

    /* ── Mini-map (if enabled later) ── */
    .react-flow__minimap {
      border-radius: 10px !important;
      border: 1px solid ${`rgba(${paletteRgb}, 0.25)`} !important;
      overflow: hidden !important;
    }
  `;

  useEffect(() => {
    const styleTag = document.getElementById("flow-editor-theme-styles");
    if (styleTag) {
      styleTag.textContent = nodeStyles;
    } else {
      const el = document.createElement("style");
      el.id = "flow-editor-theme-styles";
      el.textContent = nodeStyles;
      document.head.appendChild(el);
    }
    return () => {
      const el = document.getElementById("flow-editor-theme-styles");
      if (el) el.remove();
    };
  }, [nodeStyles]);

  // ── Existing workflow loading logic (unchanged) ───────────────────────────
  useEffect(() => {
    try {
      const flow = JSON.parse(workflow.definition);
      if (!flow) return;
      setNodes(flow.nodes || []);
      setEdges(flow.edges || []);
      if (!flow.viewport) return;
      const { x = 0, y = 0, zoom = 1 } = flow.viewport;
      setViewport({ x, y, zoom });
    } catch (error) {}
  }, [workflow.definition, setEdges, setNodes, setViewport]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const taskType = event.dataTransfer.getData("application/reactflow");
      if (typeof taskType === "undefined" || !taskType) return;
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const newNode = CreateFlowNode(taskType as TaskType, position);
      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes, screenToFlowPosition],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true }, eds));
      if (!connection.targetHandle) return;
      const node = nodes.find((nd) => nd.id === connection.target);
      if (!node) return;
      const nodeInputs = node.data.inputs;
      updateNodeData(node.id, {
        inputs: {
          ...nodeInputs,
          [connection.targetHandle]: "",
        },
      });
    },
    [setEdges, updateNodeData, nodes],
  );

  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      if (connection.source === connection.target) return false;

      const source = nodes.find((node) => node.id === connection.source);
      const target = nodes.find((node) => node.id === connection.target);
      if (!source || !target) {
        console.error("Invalid connection: source or target node not found");
        return false;
      }

      const sourceTask = TaskRegistry[source.data.type];
      const targetTask = TaskRegistry[target.data.type];

      const output = sourceTask?.outputs.find(
        (o) => o.name === connection.sourceHandle,
      );
      const input = targetTask?.inputs.find(
        (o) => o.name === connection.targetHandle,
      );

      if (input?.type !== output?.type) {
        console.error("Invalid connection: type mismatch");
        return false;
      }

      const hasCycle = (node: AppNode, visited = new Set()) => {
        if (visited.has(node.id)) return false;
        visited.add(node.id);
        for (const outgoer of getOutgoers(node, nodes, edges)) {
          if (outgoer.id === connection.source) return true;
          if (hasCycle(outgoer, visited)) return true;
        }
      };
      return !hasCycle(target);
    },
    [nodes, edges],
  );

  return (
    <main className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onEdgesChange={onEdgesChange}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        snapToGrid
        snapGrid={snapGrid}
        fitViewOptions={fitViewOptions}
        fitView
        onDragOver={onDragOver}
        onDrop={onDrop}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        style={{ background: canvasBg }}
      >
        <Controls position="top-left" fitViewOptions={fitViewOptions} />
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color={dotColor}
          style={{ backgroundColor: canvasBg }}
        />
      </ReactFlow>
    </main>
  );
}

export default FlowEditor;
