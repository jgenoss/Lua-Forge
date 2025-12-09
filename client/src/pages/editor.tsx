import React, { useState, useCallback, useRef, useEffect } from "react";
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Connection,
  Edge,
  Node,
} from "reactflow";
import "reactflow/dist/style.css";

import { Sidebar } from "@/components/editor/Sidebar";
import { PropertiesPanel } from "@/components/editor/PropertiesPanel";
import { FileExplorer } from "@/components/editor/FileExplorer";
import { CodeEditor } from "@/components/editor/CodeEditor";
import CustomNode from "@/components/editor/CustomNode";
import { Button } from "@/components/ui/button";
import {
  Download,
  Save,
  Code2,
  Layout,
  FileCode,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Define Node Types Registry
const nodeTypes = {
  // Eventos y Funciones
  "event-start": CustomNode,
  "function-def": CustomNode,
  "event-trigger": CustomNode,
  "event-net": CustomNode,
  "event-server": CustomNode,
  "register-net": CustomNode,
  "add-event-handler": CustomNode,
  "thread-create": CustomNode,
  wait: CustomNode,
  "register-key-mapping": CustomNode,

  // Entidades
  "create-ped": CustomNode,
  "create-object": CustomNode,
  "delete-entity": CustomNode,
  "set-entity-coords": CustomNode,
  "get-entity-coords": CustomNode,
  "freeze-entity": CustomNode,
  "set-entity-invincible": CustomNode,

  // Blips y Markers
  "add-blip-coord": CustomNode,
  "set-blip-sprite": CustomNode,
  "draw-marker": CustomNode,

  // QBCore / ESX
  "qb-core-object": CustomNode,
  "qb-notify": CustomNode,
  "qb-command": CustomNode,
  "esx-notify": CustomNode,
  "qb-trigger-callback": CustomNode,

  // Lógica y Matemáticas
  "logic-if": CustomNode,
  "logic-loop": CustomNode,
  "logic-print": CustomNode,
  "logic-math": CustomNode,
  "math-abs": CustomNode,
  "math-random": CustomNode,

  // Input
  "is-control-pressed": CustomNode,
  "is-control-just-pressed": CustomNode,
  "disable-control-action": CustomNode,

  // SQL
  "sql-query": CustomNode,
  "sql-insert": CustomNode,

  // Generico
  "native-control": CustomNode,
};

interface File {
  id: string;
  name: string;
  type: "client" | "server";
  active?: boolean;
  nodes: Node[];
  edges: Edge[];
  content?: string;
  headerCode?: string;
}

export default function EditorPage() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<File[]>([
    {
      id: "1",
      name: "client.lua",
      type: "client",
      active: true,
      nodes: [],
      edges: [],
    },
    {
      id: "2",
      name: "server.lua",
      type: "server",
      active: false,
      nodes: [],
      edges: [],
    },
  ]);

  const activeFile = files.find((f) => f.active) || files[0];

  const [nodes, setNodes, onNodesChange] = useNodesState(activeFile.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(activeFile.edges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string>(
    "-- Código Lua generado aparecerá aquí"
  );
  const [viewMode, setViewMode] = useState<"visual" | "code">("visual");
  const [isSyncing, setIsSyncing] = useState(false);

  const { toast } = useToast();

  // Cargar estado al cambiar de archivo
  useEffect(() => {
    setNodes(activeFile.nodes);
    setEdges(activeFile.edges);
    if (activeFile.content) {
      setGeneratedCode(activeFile.content);
    }
  }, [activeFile.id]);

  // Cargar proyecto guardado
  useEffect(() => {
    const saved = localStorage.getItem("luaforge_project");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFiles(parsed);
        const active = parsed.find((f: any) => f.active) || parsed[0];
        setNodes(active.nodes || []);
        setEdges(active.edges || []);
        setGeneratedCode(active.content || "-- Código cargado");
      } catch (e) {
        console.error("Error cargando guardado", e);
      }
    }
  }, []);

  const saveProject = () => {
    const updatedFiles = files.map((f) => {
      if (f.id === activeFile.id) {
        return {
          ...f,
          nodes: nodes,
          edges: edges,
          content: viewMode === "code" ? generatedCode : f.content,
        };
      }
      return f;
    });

    setFiles(updatedFiles);
    try {
      localStorage.setItem("luaforge_project", JSON.stringify(updatedFiles));
      toast({
        title: "Proyecto Guardado",
        description: "Tus cambios se han guardado localmente.",
        className: "bg-green-600 text-white border-none",
      });
    } catch (e) {
      toast({
        title: "Error al guardar",
        description: "No se pudo escribir en el almacenamiento local.",
        variant: "destructive",
      });
    }
  };

  // --- GENERADOR DE CÓDIGO (VISUAL -> LUA) ---
  const generateLuaCode = (currentNodes: Node[], currentEdges: Edge[]) => {
    if (isSyncing) return;

    // Validar que todos los nodos tengan datos básicos
    const validNodes = currentNodes.filter((node) => {
      if (!node.type || !node.data) return false;
      // Validar que nodos críticos tengan sus datos requeridos
      if (node.type === "logic-if" && !node.data.condition) {
        node.data.condition = "true"; // Valor por defecto
      }
      if (node.type === "wait" && !node.data.duration) {
        node.data.duration = 0;
      }
      return true;
    });

    let code = activeFile.headerCode
      ? activeFile.headerCode + "\n\n"
      : `-- Generado por LuaForge\nlocal QBCore = exports['qb-core']:GetCoreObject()\n\n`;

    const safePos = (n: Node) => ({
      x: (n.position as any)?.x || 0,
      y: (n.position as any)?.y || 0,
    });
    const getData = (n: Node, key: string, fallback: any = "") => {
      if (!n.data || n.data[key] === undefined || n.data[key] === null)
        return fallback;
      return n.data[key];
    };
    const escapeSingle = (s: string) => String(s || "").replace(/'/g, "\\'");

    const startNodes = validNodes
      .filter(
        (n) =>
          typeof n.type === "string" &&
          [
            "event-start",
            "register-net",
            "register-key-mapping",
            "qb-command",
            "thread-create",
            "function-def",
          ].includes(n.type as string)
      )
      .sort((a, b) => safePos(a).y - safePos(b).y);

    const visited = new Set<string>();
    const functionsStack: string[] = []; // Rastrea funciones abiertas

    const generateBlock = (
      parentId: string,
      indent: string,
      isInsideCallback = false
    ): string => {
      if (visited.has(parentId)) return "";
      visited.add(parentId);

      let block = "";
      const connections = currentEdges
        .filter((e) => e.source === parentId)
        .slice()
        .sort((a, b) => {
          const na = validNodes.find((n) => n.id === a.target);
          const nb = validNodes.find((n) => n.id === b.target);
          return (
            (na ? (na.position as any).x || 0 : 0) -
            (nb ? (nb.position as any).x || 0 : 0)
          );
        });

      for (const edge of connections) {
        const node = validNodes.find((n) => n.id === edge.target);
        if (!node) continue;

        if (edge.sourceHandle === "false" || edge.sourceHandle === "else")
          continue;

        const ntype = String(node.type);

        switch (ntype) {
          case "logic-if": {
            const condition = getData(node, "condition", "true");
            block += `${indent}if ${condition} then\n`;
            functionsStack.push("if");

            const outgoing = currentEdges
              .filter((e) => e.source === node.id)
              .slice()
              .sort((a, b) => {
                const na = validNodes.find((n) => n.id === a.target);
                const nb = validNodes.find((n) => n.id === b.target);
                return (
                  (na ? (na.position as any).x || 0 : 0) -
                  (nb ? (nb.position as any).x || 0 : 0)
                );
              });

            const trueEdge =
              outgoing.find(
                (e) =>
                  e.sourceHandle === "true" || e.sourceHandle === "flow-out"
              ) || outgoing[0];
            if (trueEdge) {
              block += generateBlock(
                trueEdge.target,
                indent + "    ",
                isInsideCallback
              );
            }

            const falseEdge =
              outgoing.find(
                (e) => e.sourceHandle === "false" || e.sourceHandle === "else"
              ) || (outgoing.length > 1 ? outgoing[1] : null);
            if (falseEdge) {
              block += `${indent}else\n`;
              block += generateBlock(
                falseEdge.target,
                indent + "    ",
                isInsideCallback
              );
            }

            block += `${indent}end\n`;
            functionsStack.pop();
            break;
          }

          case "qb-trigger-callback": {
            const eventName = String(
              getData(node, "eventName", "unknown_event")
            );
            block += `${indent}QBCore.Functions.TriggerCallback('${eventName}', function(result)\n`;
            functionsStack.push("callback");

            if (node.data?.codeBlock) {
              String(node.data.codeBlock)
                .split("\n")
                .forEach((ln: string) => {
                  if (ln.trim()) block += `${indent}    ${ln.trim()}\n`;
                });
            }

            // NO generar hijos aquí para evitar duplicación
            // Solo cerrar la función
            block += `${indent}end)\n`;
            functionsStack.pop();

            // Continuar con nodos hermanos (no hijos del callback)
            break;
          }

          case "native-control":
          case "create-ped": {
            if (node.data?.codeBlock) {
              String(node.data.codeBlock)
                .split("\n")
                .forEach((line: string) => {
                  if (line.trim()) block += `${indent}${line.trim()}\n`;
                });
            }
            block += generateBlock(node.id, indent, isInsideCallback);
            break;
          }

          case "qb-notify": {
            const msg = escapeSingle(
              String(getData(node, "message", "Alerta"))
            );
            const notifyType = String(getData(node, "notifyType", "success"));
            block += `${indent}QBCore.Functions.Notify('${msg}', '${notifyType}')\n`;
            block += generateBlock(node.id, indent, isInsideCallback);
            break;
          }

          case "logic-print": {
            const raw = String(getData(node, "message", ""));
            if (!raw) {
              block += `${indent}print('')\n`;
            } else if (
              raw.includes("%") ||
              raw.includes("..") ||
              raw.startsWith("(")
            ) {
              block += `${indent}print(${raw})\n`;
            } else {
              const safe = escapeSingle(raw);
              block += `${indent}print('${safe}')\n`;
            }
            block += generateBlock(node.id, indent, isInsideCallback);
            break;
          }

          case "wait": {
            const dur = parseInt(String(getData(node, "duration", 0))) || 0;
            block += `${indent}Wait(${dur})\n`;
            block += generateBlock(node.id, indent, isInsideCallback);
            break;
          }

          default: {
            if (node.data?.codeBlock) {
              String(node.data.codeBlock)
                .split("\n")
                .forEach((ln: string) => {
                  if (ln.trim()) block += `${indent}${ln.trim()}\n`;
                });
            }
            block += generateBlock(node.id, indent, isInsideCallback);
            break;
          }
        }
      }

      visited.delete(parentId);
      return block;
    };

    // Generar bloques de nivel superior
    startNodes.forEach((node) => {
      const ntype = String(node.type);
      if (ntype === "function-def") {
        const name = String(getData(node, "eventName", "unnamed_function"));
        code += `function ${name}()\n`;
        functionsStack.push("function");
        code += generateBlock(node.id, "    ");
        code += `end\n\n`;
        functionsStack.pop();
      } else if (ntype === "event-start") {
        const ev = String(getData(node, "eventName", "unknown_cmd"));
        code += `RegisterCommand('${ev}', function(source, args)\n`;
        functionsStack.push("command");
        code += generateBlock(node.id, "    ");
        code += `end, false)\n\n`;
        functionsStack.pop();
      } else if (ntype === "register-net") {
        const rawName = getData(
          node,
          "eventName",
          getData(node, "label", "net_event")
        );
        const nameStr = String(rawName);
        const finalName =
          nameStr.includes("'") ||
          nameStr.includes('"') ||
          nameStr.includes("..")
            ? nameStr
            : `'${nameStr}'`;
        code += `RegisterNetEvent(${finalName})\n`;
        code += `AddEventHandler(${finalName}, function()\n`;
        functionsStack.push("event");
        code += generateBlock(node.id, "    ");
        code += `end)\n\n`;
        functionsStack.pop();
      } else if (ntype === "register-key-mapping") {
        const cmdName = String(getData(node, "commandName", "cmd"));
        const desc = String(getData(node, "description", ""));
        const key = String(getData(node, "defaultKey", "E"));
        code += `RegisterKeyMapping('${cmdName}', '${escapeSingle(
          desc
        )}', 'keyboard', '${escapeSingle(key)}')\n\n`;
      }
    });

    // Validar balanceo de bloques
    const openBlocks = functionsStack.length;
    if (openBlocks > 0) {
      console.warn(`⚠️ Bloques sin cerrar: ${openBlocks}`);
      for (let i = 0; i < openBlocks; i++) {
        code += "end\n";
      }
    }

    setGeneratedCode(code);
    setFiles((prev) =>
      prev.map((f) => (f.id === activeFile.id ? { ...f, content: code } : f))
    );
  };

  // --- PARSER (LUA -> VISUAL) ---
  const applyCodeToVisual = () => {
    setIsSyncing(true);
    const code = generatedCode;
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Separar header y body
    const lines = code.split("\n");
    let firstActionIndex = -1;

    const actionKeywords = [
      "RegisterCommand",
      "RegisterNetEvent",
      "RegisterKeyMapping",
      "QBCore.Commands.Add",
      "CreateThread",
      "AddEventHandler",
      "function ",
      "QBCore.Functions.CreateCallback",
    ];

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (
        actionKeywords.some((kw) => trimmed.includes(kw)) &&
        !trimmed.startsWith("--")
      ) {
        firstActionIndex = i;
        break;
      }
    }

    let headerCode = "";
    let bodyCodeLines: string[] = [];

    if (firstActionIndex !== -1) {
      headerCode = lines.slice(0, firstActionIndex).join("\n").trim();
      bodyCodeLines = lines.slice(firstActionIndex);
    } else {
      headerCode = code;
    }

    // Sistema de stack para bloques anidados
    type StackItem = {
      id: string;
      x: number;
      y: number;
      type?: string; // 'function', 'if', 'else', 'callback', 'loop', 'event' (optional)
      indent?: number;
    };

    let blockStack: StackItem[] = [];
    let currentY = 100;
    const rootX = 100;
    const horizontalSpacing = 350;
    const verticalSpacing = 120;

    // Helpers
    const addNode = (
      type: string,
      label: string,
      data: any,
      x: number,
      y: number
    ) => {
      const id = `${type}-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      newNodes.push({
        id,
        type,
        data: { label, ...data },
        position: { x, y },
      });
      return id;
    };

    const linkNodes = (source: string, target: string, handle = "flow-out") => {
      newEdges.push({
        id: `e-${source}-${target}-${Date.now()}`,
        source,
        target,
        sourceHandle: handle,
        targetHandle: "flow-in",
      });
    };

    const getIndentLevel = (line: string) => {
      const match = line.match(/^(\s*)/);
      return match ? Math.floor(match[1].length / 4) : 0;
    };

    const cleanString = (str: string) => {
      return str.replace(/['"]/g, "").trim();
    };

    // Procesar línea por línea
    for (let i = 0; i < bodyCodeLines.length; i++) {
      const rawLine = bodyCodeLines[i];
      const line = rawLine.trim();
      const indent = getIndentLevel(rawLine);

      if (!line || line.startsWith("--")) continue;

      // Ajustar stack según indentación
      while (
        blockStack.length > 0 &&
        indent <= (blockStack[blockStack.length - 1].indent ?? -1)
      ) {
        blockStack.pop();
      }

      const parent =
        blockStack.length > 0 ? blockStack[blockStack.length - 1] : null;
      const parentX = parent ? parent.x : rootX;
      const parentY = parent ? parent.y : currentY;
      const currentX = parent ? parentX + horizontalSpacing : rootX;

      // 🔥 DETECTAR FUNCIONES NOMBRADAS
      const funcMatch = line.match(/^function\s+([a-zA-Z0-9_.:]+)\s*\((.*?)\)/);
      if (funcMatch) {
        const funcName = funcMatch[1];
        const params = funcMatch[2];
        const nodeId = addNode(
          "function-def",
          `Función: ${funcName}`,
          { eventName: funcName, params },
          rootX,
          currentY
        );
        blockStack = [
          { id: nodeId, x: rootX, y: currentY, type: "function", indent },
        ];
        currentY += verticalSpacing;
        continue;
      }

      // 🔥 DETECTAR COMANDOS (RegisterCommand)
      const cmdMatch = line.match(/RegisterCommand\s*\(\s*['"]([^'"]+)['"]/);
      if (cmdMatch) {
        const nodeId = addNode(
          "event-start",
          `Comando: ${cmdMatch[1]}`,
          { eventName: cmdMatch[1] },
          rootX,
          currentY
        );
        blockStack = [
          { id: nodeId, x: rootX, y: currentY, type: "command", indent },
        ];
        currentY += verticalSpacing;
        continue;
      }

      // 🔥 DETECTAR NET EVENTS
      const netMatch = line.match(/RegisterNetEvent\s*\(\s*(.+?)\s*\)/);
      if (netMatch) {
        const eventName = cleanString(netMatch[1]);
        const nodeId = addNode(
          "register-net",
          `Net: ${eventName}`,
          { eventName: netMatch[1] },
          rootX,
          currentY
        );
        blockStack = [
          { id: nodeId, x: rootX, y: currentY, type: "net-event", indent },
        ];
        currentY += verticalSpacing;
        continue;
      }

      // 🔥 DETECTAR AddEventHandler
      const handlerMatch = line.match(
        /AddEventHandler\s*\(\s*(.+?)\s*,\s*function/
      );
      if (handlerMatch) {
        // Ya tenemos el RegisterNetEvent, solo actualizar stack para la función
        continue;
      }

      // 🔥 DETECTAR KEY MAPPING
      const keyMatch = line.match(
        /RegisterKeyMapping\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/
      );
      if (keyMatch) {
        addNode(
          "register-key-mapping",
          `Tecla: ${keyMatch[4]}`,
          {
            commandName: keyMatch[1],
            description: keyMatch[2],
            defaultKey: keyMatch[4],
          },
          rootX,
          currentY
        );
        currentY += verticalSpacing;
        continue;
      }

      // 🔥 MEJORAS ADICIONALES PARA DETECCIÓN PERFECTA

      // 1️⃣ DETECTAR CREATETHREAD
      const threadMatch = line.match(/CreateThread\s*\(\s*function/);
      if (threadMatch) {
        const nodeId = addNode(
          "thread-create",
          "Create Thread",
          {},
          rootX,
          currentY
        );
        blockStack = [
          { id: nodeId, x: rootX, y: currentY, type: "thread", indent },
        ];
        currentY += verticalSpacing;
        continue;
      }

      // 2️⃣ DETECTAR CREAR CALLBACKS (SERVER SIDE)
      const createCallbackMatch = line.match(
        /QBCore\.Functions\.CreateCallback\s*\(\s*['"]([^'"]+)['"]/
      );
      if (createCallbackMatch) {
        const nodeId = addNode(
          "qb-create-callback",
          `Create Callback: ${createCallbackMatch[1]}`,
          { eventName: createCallbackMatch[1] },
          rootX,
          currentY
        );
        blockStack = [
          { id: nodeId, x: rootX, y: currentY, type: "callback-def", indent },
        ];
        currentY += verticalSpacing;
        continue;
      }

      // 3️⃣ DETECTAR ENTITIES (GetPlayerPed, etc)
      const pedMatch = line.match(
        /(PlayerPedId|GetPlayerPed|GetVehiclePedIsIn)\s*\(/
      );
      if (pedMatch) {
        const nodeId = addNode(
          "native-control",
          `Native: ${pedMatch[1]}`,
          { codeBlock: line },
          currentX,
          parentY
        );
        if (parent) linkNodes(parent.id, nodeId);
        blockStack[blockStack.length - 1] = {
          ...parent,
          id: nodeId,
          x: currentX,
          y: parentY,
        };
        continue;
      }

      // 4️⃣ DETECTAR COORDENADAS (GetEntityCoords, SetEntityCoords)
      const coordMatch = line.match(
        /(GetEntityCoords|SetEntityCoords|GetOffsetFromEntityInWorldCoords)\s*\(/
      );
      if (coordMatch) {
        const nodeId = addNode(
          "get-entity-coords",
          `Coords: ${coordMatch[1]}`,
          { codeBlock: line },
          currentX,
          parentY
        );
        if (parent) linkNodes(parent.id, nodeId);
        blockStack[blockStack.length - 1] = {
          ...parent,
          id: nodeId,
          x: currentX,
          y: parentY,
        };
        continue;
      }

      // 5️⃣ DETECTAR BLIPS
      const blipMatch = line.match(
        /(AddBlipForCoord|SetBlipSprite|SetBlipColour|BeginTextCommandSetBlipName)\s*\(/
      );
      if (blipMatch) {
        const nodeType = blipMatch[1].includes("Add")
          ? "add-blip-coord"
          : blipMatch[1].includes("Sprite")
          ? "set-blip-sprite"
          : "native-control";
        const nodeId = addNode(
          nodeType,
          `Blip: ${blipMatch[1]}`,
          { codeBlock: line },
          currentX,
          parentY
        );
        if (parent) linkNodes(parent.id, nodeId);
        blockStack[blockStack.length - 1] = {
          ...parent,
          id: nodeId,
          x: currentX,
          y: parentY,
        };
        continue;
      }

      // 6️⃣ DETECTAR MARKERS
      const markerMatch = line.match(/DrawMarker\s*\(/);
      if (markerMatch) {
        const nodeId = addNode(
          "draw-marker",
          "Draw Marker",
          { codeBlock: line },
          currentX,
          parentY
        );
        if (parent) linkNodes(parent.id, nodeId);
        blockStack[blockStack.length - 1] = {
          ...parent,
          id: nodeId,
          x: currentX,
          y: parentY,
        };
        continue;
      }

      // 7️⃣ DETECTAR SQL QUERIES
      const sqlMatch = line.match(
        /MySQL\.(Async\.)?(?:execute|fetchAll|fetchScalar|insert|update)\s*\(/
      );
      if (sqlMatch) {
        const operation = sqlMatch[0].includes("fetch")
          ? "query"
          : sqlMatch[0].includes("insert")
          ? "insert"
          : "update";
        const nodeId = addNode(
          `sql-${operation}`,
          `SQL: ${operation}`,
          { codeBlock: line },
          currentX,
          parentY
        );
        if (parent) linkNodes(parent.id, nodeId);
        blockStack[blockStack.length - 1] = {
          ...parent,
          id: nodeId,
          x: currentX,
          y: parentY,
        };
        continue;
      }

      // 8️⃣ DETECTAR EXPORTS
      const exportMatch = line.match(/exports\[['"]([^'"]+)['"]\]/);
      if (exportMatch) {
        const nodeId = addNode(
          "exports",
          `Export: ${exportMatch[1]}`,
          { codeBlock: line },
          currentX,
          parentY
        );
        if (parent) linkNodes(parent.id, nodeId);
        blockStack[blockStack.length - 1] = {
          ...parent,
          id: nodeId,
          x: currentX,
          y: parentY,
        };
        continue;
      }

      // 9️⃣ DETECTAR CONTROLES (IsControlPressed, etc)
      const controlMatch = line.match(
        /(IsControlPressed|IsControlJustPressed|IsDisabledControlPressed|DisableControlAction)\s*\(/
      );
      if (controlMatch) {
        const nodeType = controlMatch[1].includes("Disable")
          ? "disable-control-action"
          : "is-control-pressed";
        const nodeId = addNode(
          nodeType,
          `Control: ${controlMatch[1]}`,
          { codeBlock: line },
          currentX,
          parentY
        );
        if (parent) linkNodes(parent.id, nodeId);
        blockStack[blockStack.length - 1] = {
          ...parent,
          id: nodeId,
          x: currentX,
          y: parentY,
        };
        continue;
      }

      // 🔟 DETECTAR TABLAS Y JSON
      const jsonMatch = line.match(/(json\.encode|json\.decode)\s*\(/);
      if (jsonMatch) {
        const nodeType = jsonMatch[1].includes("encode")
          ? "json-encode"
          : "json-decode";
        const nodeId = addNode(
          nodeType,
          `JSON: ${jsonMatch[1]}`,
          { codeBlock: line },
          currentX,
          parentY
        );
        if (parent) linkNodes(parent.id, nodeId);
        blockStack[blockStack.length - 1] = {
          ...parent,
          id: nodeId,
          x: currentX,
          y: parentY,
        };
        continue;
      }

      // 1️⃣1️⃣ DETECTAR MATH OPERATIONS
      const mathMatch = line.match(
        /math\.(abs|ceil|floor|max|min|random|sqrt|sin|cos)\s*\(/
      );
      if (mathMatch) {
        const nodeId = addNode(
          `math-${mathMatch[1]}`,
          `Math: ${mathMatch[1]}`,
          { codeBlock: line },
          currentX,
          parentY
        );
        if (parent) linkNodes(parent.id, nodeId);
        blockStack[blockStack.length - 1] = {
          ...parent,
          id: nodeId,
          x: currentX,
          y: parentY,
        };
        continue;
      }

      // 1️⃣2️⃣ DETECTAR ESX FRAMEWORK
      const esxMatch = line.match(
        /ESX\.(ShowNotification|TriggerServerCallback|GetPlayerData)\s*\(/
      );
      if (esxMatch) {
        const nodeType = esxMatch[1].includes("Notification")
          ? "esx-notify"
          : esxMatch[1].includes("Callback")
          ? "qb-trigger-callback"
          : "native-control";
        const nodeId = addNode(
          nodeType,
          `ESX: ${esxMatch[1]}`,
          { codeBlock: line },
          currentX,
          parentY
        );
        if (parent) linkNodes(parent.id, nodeId);
        blockStack[blockStack.length - 1] = {
          ...parent,
          id: nodeId,
          x: currentX,
          y: parentY,
        };
        continue;
      }

      // 1️⃣3️⃣ MEJORAR DETECCIÓN DE FUNCIONES ANÓNIMAS
      if (line.includes("function(") && !line.includes("RegisterCommand")) {
        // Es una función callback inline
        const nodeId = addNode(
          "native-control",
          "Callback Function",
          { codeBlock: line },
          currentX,
          parentY
        );
        if (parent) linkNodes(parent.id, nodeId);
        blockStack.push({
          id: nodeId,
          x: currentX,
          y: parentY,
          type: "anonymous-function",
          indent,
        });
        continue;
      }

      // 1️⃣4️⃣ DETECTAR BREAK Y CONTINUE
      if (line === "break" || line === "continue") {
        const nodeId = addNode(
          "native-control",
          line === "break" ? "Break" : "Continue",
          { codeBlock: line },
          currentX,
          parentY
        );
        if (parent) linkNodes(parent.id, nodeId);
        continue;
      }

      // 1️⃣5️⃣ DETECTAR OPERACIONES CON TABLAS
      const tableMatch = line.match(/table\.(insert|remove|concat|sort)\s*\(/);
      if (tableMatch) {
        const nodeId = addNode(
          `table-${tableMatch[1]}`,
          `Table: ${tableMatch[1]}`,
          { codeBlock: line },
          currentX,
          parentY
        );
        if (parent) linkNodes(parent.id, nodeId);
        blockStack[blockStack.length - 1] = {
          ...parent,
          id: nodeId,
          x: currentX,
          y: parentY,
        };
        continue;
      }

      // 🔥 DETECTAR CALLBACKS
      const callbackMatch = line.match(
        /QBCore\.Functions\.TriggerCallback\s*\(\s*['"]([^'"]+)['"]/
      );
      if (callbackMatch) {
        const nodeId = addNode(
          "qb-trigger-callback",
          `Callback: ${callbackMatch[1]}`,
          { eventName: callbackMatch[1] },
          currentX,
          parentY
        );
        if (parent) linkNodes(parent.id, nodeId);
        blockStack.push({
          id: nodeId,
          x: currentX,
          y: parentY,
          type: "callback",
          indent,
        });
        continue;
      }

      // 🔥 DETECTAR IF STATEMENTS (con mejor regex)
      const ifMatch = line.match(/^if\s+(.+?)\s+then\s*$/);
      if (ifMatch) {
        const condition = ifMatch[1];
        const nodeId = addNode(
          "logic-if",
          "Condición IF",
          { condition },
          currentX,
          parentY
        );
        if (parent) linkNodes(parent.id, nodeId);
        blockStack.push({
          id: nodeId,
          x: currentX,
          y: parentY,
          type: "if",
          indent,
        });
        continue;
      }

      // 🔥 DETECTAR ELSE
      if (line === "else") {
        if (parent && parent.type === "if") {
          // Crear un marcador para el bloque else
          blockStack.pop();
          blockStack.push({
            id: parent.id,
            x: parent.x,
            y: parent.y + verticalSpacing,
            type: "else",
            indent,
          });
        }
        continue;
      }

      // 🔥 DETECTAR ELSEIF
      const elseifMatch = line.match(/^elseif\s+(.+?)\s+then\s*$/);
      if (elseifMatch) {
        const condition = elseifMatch[1];
        const nodeId = addNode(
          "logic-if",
          "Condición ELSEIF",
          { condition },
          currentX,
          parentY + verticalSpacing
        );
        if (parent && parent.type === "if") {
          linkNodes(parent.id, nodeId, "false");
        }
        blockStack.pop();
        blockStack.push({
          id: nodeId,
          x: currentX,
          y: parentY + verticalSpacing,
          type: "if",
          indent,
        });
        continue;
      }

      // 🔥 DETECTAR WHILE LOOPS
      const whileMatch = line.match(/^while\s+(.+?)\s+do\s*$/);
      if (whileMatch) {
        const condition = whileMatch[1];
        const nodeId = addNode(
          "logic-loop",
          "Bucle While",
          { condition },
          currentX,
          parentY
        );
        if (parent) linkNodes(parent.id, nodeId);
        blockStack.push({
          id: nodeId,
          x: currentX,
          y: parentY,
          type: "loop",
          indent,
        });
        continue;
      }

      // 🔥 DETECTAR FOR LOOPS
      const forMatch = line.match(/^for\s+(.+?)\s+do\s*$/);
      if (forMatch) {
        const loopVar = forMatch[1];
        const nodeId = addNode(
          "logic-loop",
          "Bucle For",
          { condition: loopVar },
          currentX,
          parentY
        );
        if (parent) linkNodes(parent.id, nodeId);
        blockStack.push({
          id: nodeId,
          x: currentX,
          y: parentY,
          type: "loop",
          indent,
        });
        continue;
      }

      // 🔥 DETECTAR END (cerrar bloques)
      if (line.startsWith("end")) {
        if (blockStack.length > 0) {
          blockStack.pop();
        }
        continue;
      }

      // 🔥 DETECTAR RETURN
      if (line.startsWith("return")) {
        const nodeId = addNode(
          "native-control",
          "Return",
          { codeBlock: line },
          currentX,
          parentY
        );
        if (parent) linkNodes(parent.id, nodeId);
        continue;
      }

      // Si estamos dentro de un bloque, procesar contenido
      if (parent) {
        let nodeId: string | null = null;
        let nodeType = "native-control";
        let label = "Código";
        let data: any = { codeBlock: line };

        // 🔥 DETECTAR WAIT
        const waitMatch = line.match(/^Wait\s*\(\s*(\d+)\s*\)/);
        if (waitMatch) {
          nodeType = "wait";
          label = "Esperar";
          data = { duration: waitMatch[1] };
        }
        // 🔥 DETECTAR PRINT (simple y complejo)
        else if (line.startsWith("print")) {
          nodeType = "logic-print";
          label = "Print";

          if (
            line.includes(":format") ||
            line.includes("%") ||
            line.includes("..")
          ) {
            const contentMatch = line.match(/^print\((.*)\)$/);
            data = { message: contentMatch ? contentMatch[1] : line };
          } else {
            const msgMatch = line.match(/print\s*\(\s*['"]([^'"]*)['"]\s*\)/);
            data = { message: msgMatch ? msgMatch[1] : line };
          }
        }
        // 🔥 DETECTAR NOTIFICACIONES QB
        else if (line.includes("QBCore.Functions.Notify")) {
          nodeType = "qb-notify";
          label = "Notificación";
          const msgMatch = line.match(/['"]([^'"]+)['"]/);
          const typeMatch = line.match(/['"]([^'"]+)['"],\s*['"]([^'"]+)['"]/);
          data = {
            message: msgMatch ? msgMatch[1] : "Alerta",
            notifyType: typeMatch ? typeMatch[2] : "success",
          };
        }
        // 🔥 DETECTAR TriggerEvent
        else if (
          line.includes("TriggerEvent") ||
          line.includes("TriggerServerEvent") ||
          line.includes("TriggerClientEvent")
        ) {
          nodeType = "event-trigger";
          const eventMatch = line.match(
            /Trigger(?:Server|Client)?Event\s*\(\s*['"]([^'"]+)['"]/
          );
          label = eventMatch ? `Trigger: ${eventMatch[1]}` : "Trigger Event";
          data = {
            eventName: eventMatch ? eventMatch[1] : "",
            codeBlock: line,
          };
        }
        // 🔥 DETECTAR VARIABLES LOCALES
        else if (line.startsWith("local ")) {
          const varMatch = line.match(/local\s+([a-zA-Z0-9_]+)\s*=/);
          label = varMatch ? `Variable: ${varMatch[1]}` : "Variable Local";
          data = { codeBlock: line };
        }
        // 🔥 DETECTAR LLAMADAS A FUNCIONES
        else if (
          line.includes(":") ||
          (line.includes("(") && !line.includes("="))
        ) {
          label = "Llamada";
          data = { codeBlock: line };
        }

        nodeId = addNode(nodeType, label, data, currentX, parentY);

        // Conectar según contexto
        if (parent.type === "else") {
          const ifNode = newNodes.find((n) => n.id === parent.id);
          if (ifNode) {
            linkNodes(parent.id, nodeId, "false");
          }
        } else {
          linkNodes(parent.id, nodeId);
        }

        // Actualizar posición para siguiente nodo en flujo lineal
        blockStack[blockStack.length - 1] = {
          ...parent,
          id: nodeId,
          x: currentX,
          y: parentY,
        };
      }
    }

    // Aplicar cambios
    setNodes(newNodes);
    setEdges(newEdges);
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id === activeFile.id) {
          return {
            ...f,
            nodes: newNodes,
            edges: newEdges,
            content: code,
            headerCode: headerCode,
          };
        }
        return f;
      })
    );

    toast({
      title: "✅ Código Convertido",
      description: `${newNodes.length} nodos generados correctamente.`,
      className: "bg-green-600 text-white border-none",
    });

    setTimeout(() => setIsSyncing(false), 500);
  };

  const handleCodeChange = (value: string | undefined) => {
    const val = value || "";
    setGeneratedCode(val);

    setFiles((prev) =>
      prev.map((f) => {
        if (f.id === activeFile.id) {
          return { ...f, content: val };
        }
        return f;
      })
    );
  };

  // --- MANEJO DE CAMBIOS SEGURO (SIN useEffect) ---
  const onGraphChange = useCallback(() => {
    if (isSyncing) return;
    generateLuaCode(nodes, edges);

    setFiles((prev) =>
      prev.map((f) => {
        if (f.id === activeFile.id) {
          return { ...f, nodes, edges };
        }
        return f;
      })
    );
  }, [nodes, edges, isSyncing, activeFile.id]);

  // Solo guardar al soltar un nodo (Drag Stop)
  const onNodeDragStop = useCallback(() => {
    onGraphChange();
  }, [onGraphChange]);

  // Guardar al conectar
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
      setTimeout(onGraphChange, 50);
    },
    [setEdges, onGraphChange]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow/type");
      const label = event.dataTransfer.getData("application/reactflow/label");
      if (typeof type === "undefined" || !type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label },
      };

      setNodes((nds) => nds.concat(newNode));
      setTimeout(onGraphChange, 50);
    },
    [reactFlowInstance, setNodes, onGraphChange]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    // ¡NO LLAMAMOS A onGraphChange AQUÍ!
  }, []);

  const updateNodeData = (key: string, value: any) => {
    if (!selectedNode) return;

    // Verificar si el valor realmente cambió
    if (selectedNode.data && selectedNode.data[key] === value) return;

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          const newData = { ...node.data, [key]: value };
          setSelectedNode({ ...node, data: newData });
          return { ...node, data: newData };
        }
        return node;
      })
    );

    // Debounce más largo para evitar regeneraciones múltiples
    setTimeout(onGraphChange, 800);
  };

  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setSelectedNode(null);
    setTimeout(onGraphChange, 50);
  };

  const handleFileSelect = (id: string) => {
    setFiles((prev) => prev.map((f) => ({ ...f, active: f.id === id })));
    setSelectedNode(null);
  };

  const handleFileCreate = (type: "client" | "server") => {
    const newFile: File = {
      id: Date.now().toString(),
      name: `new_${type}.lua`,
      type,
      active: true,
      nodes: [],
      edges: [],
    };
    setFiles((prev) =>
      prev.map((f) => ({ ...f, active: false } as File)).concat(newFile)
    );
  };

  const handleFileDelete = (id: string) => {
    setFiles((prev) => {
      const remaining = prev.filter((f) => f.id !== id);
      if (remaining.length > 0) remaining[0].active = true;
      return remaining;
    });
  };

  const handleMenuAction = (action: string) => {
    toast({ title: action, description: "Función simulada." });
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#1e1e1e] overflow-hidden text-gray-200 font-sans selection:bg-[#007fd4] selection:text-white">
      <header className="h-10 border-b border-[#2a2a2a] bg-[#1e1e1e] flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
              <Code2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm text-gray-200 tracking-wide">
              LuaVisual Editor
            </span>
          </div>
          <div className="h-4 w-px bg-[#3e3e42]" />
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
                >
                  Archivo
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#252526] border-[#3e3e42] text-gray-300">
                <DropdownMenuItem
                  onClick={() => handleMenuAction("Nuevo Proyecto")}
                >
                  Nuevo Proyecto
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuAction("Guardar")}>
                  Guardar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-[#2a2a2a] p-1 rounded flex gap-1 border border-[#3e3e42] mr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("visual")}
              className={`h-6 w-7 px-0 ${
                viewMode === "visual"
                  ? "bg-[#007fd4] text-white hover:bg-[#007fd4]/90"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Modo Visual"
            >
              <Layout className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("code")}
              className={`h-6 w-7 px-0 ${
                viewMode === "code"
                  ? "bg-[#007fd4] text-white hover:bg-[#007fd4]/90"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Modo Código"
            >
              <FileCode className="w-3.5 h-3.5" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-2 bg-[#007fd4] hover:bg-[#007fd4]/90 text-white rounded-sm"
            onClick={saveProject}
          >
            <Save className="w-3.5 h-3.5" />
            <span className="text-xs">Guardar</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white border border-[#3e3e42] rounded-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="text-xs">Exportar</span>
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel
            defaultSize={20}
            minSize={15}
            maxSize={25}
            className="bg-[#151515]"
          >
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={40} minSize={20}>
                <FileExplorer
                  files={files}
                  onFileSelect={handleFileSelect}
                  onFileCreate={handleFileCreate}
                  onFileDelete={handleFileDelete}
                />
              </ResizablePanel>
              <ResizableHandle className="bg-[#2a2a2a]" />
              <ResizablePanel defaultSize={60} minSize={30}>
                <Sidebar />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle className="bg-[#2a2a2a]" />

          <ResizablePanel defaultSize={55} minSize={30} className="bg-[#111]">
            <div className="h-full flex flex-col">
              <div className="h-8 bg-[#1e1e1e] border-b border-[#2a2a2a] flex items-center">
                {files
                  .filter((f) => f.active)
                  .map((f) => (
                    <div
                      key={f.id}
                      className="h-full px-4 flex items-center gap-2 bg-[#1e1e1e] border-r border-[#2a2a2a] text-xs text-blue-400 border-t-2 border-t-blue-500"
                    >
                      {f.name}{" "}
                      <span className="text-gray-500 ml-2 cursor-pointer hover:text-white">
                        ×
                      </span>
                    </div>
                  ))}
              </div>

              {viewMode === "visual" ? (
                <div className="flex-1 relative" ref={reactFlowWrapper}>
                  <ReactFlowProvider>
                    <ReactFlow
                      nodes={nodes}
                      edges={edges}
                      onNodesChange={onNodesChange}
                      onEdgesChange={onEdgesChange}
                      onConnect={onConnect}
                      onNodeDragStop={onNodeDragStop}
                      onInit={setReactFlowInstance}
                      onDrop={onDrop}
                      onDragOver={onDragOver}
                      onNodeClick={onNodeClick}
                      nodeTypes={nodeTypes}
                      fitView
                      className="bg-[#111]"
                      minZoom={0.1}
                    >
                      <Background color="#2a2a2a" gap={24} size={1} />
                      <Controls className="bg-[#2a2a2a] border-[#3e3e42] fill-gray-200" />
                    </ReactFlow>
                  </ReactFlowProvider>
                </div>
              ) : (
                <div className="flex-1 bg-[#1e1e1e] flex flex-col">
                  <div className="bg-[#252526] p-2 flex justify-end border-b border-[#3e3e42]">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={applyCodeToVisual}
                      className="h-7 text-xs gap-2 border-amber-600/50 text-amber-500 hover:bg-amber-900/20"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Aplicar Código a Visual (Experimental)
                    </Button>
                  </div>
                  <div className="flex-1">
                    <CodeEditor
                      code={generatedCode}
                      onChange={handleCodeChange}
                    />
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle className="bg-[#2a2a2a]" />

          <ResizablePanel
            defaultSize={25}
            minSize={20}
            maxSize={35}
            className="bg-[#1e1e1e]"
          >
            {viewMode === "visual" ? (
              <>
                <PropertiesPanel
                  selectedNode={selectedNode}
                  onChange={updateNodeData}
                  onDelete={deleteSelectedNode}
                />
                <CodeEditor
                  code={generatedCode}
                  onChange={() => {}}
                  readOnly={true}
                />
              </>
            ) : (
              <div className="p-6 text-gray-400 text-sm text-center mt-10 flex flex-col items-center">
                <FileCode className="w-12 h-12 mb-4 text-[#3e3e42]" />
                <h3 className="text-gray-200 font-medium mb-2">
                  Modo de Edición de Código
                </h3>
                <p className="text-xs text-gray-500 max-w-[200px] leading-relaxed">
                  Estás editando el código fuente directamente.
                </p>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <footer className="h-6 bg-[#007fd4] flex items-center px-2 justify-between shrink-0">
        <div className="flex items-center gap-4 text-[10px] text-white font-medium">
          <span>LISTO</span>
          <span>{activeFile.type.toUpperCase()} MODE</span>
        </div>
      </footer>
    </div>
  );
}
