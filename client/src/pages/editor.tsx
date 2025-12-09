import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  convertLuaToVisual,
  convertVisualToLua,
  extractHeaderCode,
} from "../utils/editorIntegration";
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

// Node Types Registry
const nodeTypes = {
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
  "create-ped": CustomNode,
  "create-object": CustomNode,
  "delete-entity": CustomNode,
  "set-entity-coords": CustomNode,
  "get-entity-coords": CustomNode,
  "freeze-entity": CustomNode,
  "set-entity-invincible": CustomNode,
  "add-blip-coord": CustomNode,
  "set-blip-sprite": CustomNode,
  "draw-marker": CustomNode,
  "qb-core-object": CustomNode,
  "qb-notify": CustomNode,
  "qb-command": CustomNode,
  "esx-notify": CustomNode,
  "qb-trigger-callback": CustomNode,
  "logic-if": CustomNode,
  "logic-loop": CustomNode,
  "logic-print": CustomNode,
  "logic-math": CustomNode,
  "math-abs": CustomNode,
  "math-random": CustomNode,
  "is-control-pressed": CustomNode,
  "is-control-just-pressed": CustomNode,
  "disable-control-action": CustomNode,
  "sql-query": CustomNode,
  "sql-insert": CustomNode,
  "native-control": CustomNode,
  variable: CustomNode,
  "custom-code": CustomNode,
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
  generatedCode?: string;
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
      content: "-- Código Lua generado aparecerá aquí",
      generatedCode: "-- Código Lua generado aparecerá aquí",
    },
    {
      id: "2",
      name: "server.lua",
      type: "server",
      active: false,
      nodes: [],
      edges: [],
      content: "-- Código Lua generado aparecerá aquí",
      generatedCode: "-- Código Lua generado aparecerá aquí",
    },
  ]);

  const activeFile = files.find((f) => f.active) || files[0];
  const prevFileIdRef = useRef(activeFile.id);

  const [nodes, setNodes, onNodesChange] = useNodesState(activeFile.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(activeFile.edges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string>(
    activeFile.generatedCode || "-- Código Lua generado aparecerá aquí"
  );
  const [viewMode, setViewMode] = useState<"visual" | "code">("visual");
  const [isSyncing, setIsSyncing] = useState(false);

  const { toast } = useToast();

  // ✅ CARGAR ESTADO SOLO AL CAMBIAR DE ARCHIVO
  useEffect(() => {
    if (prevFileIdRef.current !== activeFile.id) {
      console.log("📂 Cambiando archivo:", activeFile.name);

      setNodes(activeFile.nodes || []);
      setEdges(activeFile.edges || []);
      setGeneratedCode(
        activeFile.generatedCode || activeFile.content || "-- Código generado"
      );
      setSelectedNode(null);

      prevFileIdRef.current = activeFile.id;
    }
  }, [activeFile.id, setNodes, setEdges]);

  // ✅ CARGAR PROYECTO GUARDADO (SOLO UNA VEZ AL MONTAR)
  useEffect(() => {
    const saved = localStorage.getItem("luaforge_project");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log("📦 Cargando proyecto guardado");
        setFiles(parsed);
      } catch (e) {
        console.error("❌ Error cargando guardado:", e);
      }
    }
  }, []); // Sin dependencias - solo ejecutar al montar

  // ✅ GUARDAR PROYECTO
  const saveProject = useCallback(() => {
    // Actualizar archivo activo con estado actual
    const updatedFiles = files.map((f) => {
      if (f.id === activeFile.id) {
        return {
          ...f,
          nodes: nodes,
          edges: edges,
          content: generatedCode,
          generatedCode: generatedCode,
          headerCode: activeFile.headerCode,
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
  }, [
    files,
    activeFile.id,
    nodes,
    edges,
    generatedCode,
    activeFile.headerCode,
    toast,
  ]);

  // ✅ GENERAR CÓDIGO LUA DESDE VISUAL (SIN BUCLES)
  const generateLuaCode = useCallback(
    (currentNodes: Node[], currentEdges: Edge[]) => {
      if (isSyncing) {
        console.log("⏭️ Saltando generación - syncing en progreso");
        return;
      }

      console.log("🔄 Generando código Lua desde visual");

      const code = convertVisualToLua(
        currentNodes,
        currentEdges,
        activeFile.headerCode
      );

      setGeneratedCode(code);

      // Actualizar archivo en files
      setFiles((prev) =>
        prev.map((f) => {
          if (f.id === activeFile.id) {
            return {
              ...f,
              content: code,
              generatedCode: code,
              nodes: currentNodes,
              edges: currentEdges,
            };
          }
          return f;
        })
      );
    },
    [isSyncing, activeFile.id, activeFile.headerCode]
  );

  // ✅ APLICAR CÓDIGO A VISUAL (PARSER)
  const applyCodeToVisual = useCallback(() => {
    console.log("📝 Aplicando código a visual");
    console.log("📄 Código a parsear:", generatedCode.substring(0, 200));

    setIsSyncing(true);
    const code = generatedCode;

    const timeoutId = setTimeout(() => {
      console.error("⏱️ Parser timeout - abortando");
      setIsSyncing(false);
      toast({
        title: "Timeout",
        description:
          "El parser tardó demasiado. Revisa la sintaxis del código.",
        variant: "destructive",
      });
    }, 5000);

    setTimeout(() => {
      try {
        const headerCode = extractHeaderCode(code);
        console.log("📋 Header extraído:", headerCode);

        const {
          nodes: newNodes,
          edges: newEdges,
          error,
        } = convertLuaToVisual(code);

        console.log("🔍 Resultado parser:", {
          nodesCount: newNodes.length,
          edgesCount: newEdges.length,
          error,
        });

        clearTimeout(timeoutId);

        if (error) {
          toast({
            title: "Error de Sintaxis",
            description: error,
            variant: "destructive",
          });
          setIsSyncing(false);
          return;
        }

        if (newNodes.length === 0) {
          console.warn("⚠️ Parser no generó nodos");
          toast({
            title: "Sin nodos",
            description:
              "El código no generó nodos visuales. Verifica la sintaxis.",
            variant: "destructive",
          });
        }

        console.log("✅ Aplicando nodos y edges");
        setNodes(newNodes);
        setEdges(newEdges);

        setFiles((prev) =>
          prev.map((f) => {
            if (f.id === activeFile.id) {
              return {
                ...f,
                nodes: newNodes,
                edges: newEdges,
                headerCode,
                content: code,
                generatedCode: code,
              };
            }
            return f;
          })
        );

        toast({
          title: "Código Sincronizado",
          description: `${newNodes.length} nodos y ${newEdges.length} conexiones aplicadas.`,
          className: "bg-green-600 text-white border-none",
        });
      } catch (e) {
        clearTimeout(timeoutId);
        console.error("❌ Error crítico al aplicar código:", e);
        toast({
          title: "Error Crítico",
          description: e instanceof Error ? e.message : "Error desconocido",
          variant: "destructive",
        });
      } finally {
        setIsSyncing(false);
      }
    }, 100);
  }, [generatedCode, activeFile.id, setNodes, setEdges, toast]);

  // ✅ MANEJAR CAMBIOS EN EL EDITOR DE CÓDIGO
  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      const val = value || "";
      setGeneratedCode(val);

      setFiles((prev) =>
        prev.map((f) => {
          if (f.id === activeFile.id) {
            return { ...f, content: val, generatedCode: val };
          }
          return f;
        })
      );
    },
    [activeFile.id]
  );

  // ✅ REGENERAR CÓDIGO AL SOLTAR NODO (NO EN CADA MOVIMIENTO)
  const onNodeDragStop = useCallback(() => {
    if (!isSyncing) {
      console.log("🎯 Nodo soltado - regenerando código");
      generateLuaCode(nodes, edges);
    }
  }, [nodes, edges, isSyncing, generateLuaCode]);

  // ✅ CONECTAR NODOS
  const onConnect = useCallback(
    (params: Connection) => {
      console.log("🔗 Conectando nodos");

      setEdges((eds) => {
        const updatedEdges = addEdge(params, eds);

        // Regenerar código con edges actualizados
        setTimeout(() => {
          if (!isSyncing) {
            generateLuaCode(nodes, updatedEdges);
          }
        }, 50);

        return updatedEdges;
      });
    },
    [nodes, isSyncing, generateLuaCode]
  );

  // ✅ DRAG OVER
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // ✅ DROP NODO
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow/type");
      const label = event.dataTransfer.getData("application/reactflow/label");

      if (!type) return;

      const position = reactFlowInstance?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // ✅ Añadir datos iniciales según tipo de nodo
      const getInitialData = (nodeType: string) => {
        const defaults: Record<string, any> = {
          "register-net": { eventName: "eventName" },
          "qb-notify": { message: "Notification", notifyType: "success" },
          "thread-create": { loopType: "none" },
          wait: { ms: "0" },
          "logic-if": { condition: "true" },
          "logic-loop": { loopType: "while", condition: "true" },
          variable: { varName: "myVar", value: "nil" },
          "function-def": { funcName: "myFunction", params: "" },
          "create-ped": {
            model: "a_m_m_business_01",
            x: "0.0",
            y: "0.0",
            z: "0.0",
            heading: "0.0",
          },
          "event-trigger": { eventName: "eventName", args: "" },
          "custom-code": { codeBlock: "-- Custom code" },
        };
        return defaults[nodeType] || {};
      };

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label, ...getInitialData(type) }, // ✅ Datos iniciales
      };

      setNodes((nds) => {
        const updatedNodes = nds.concat(newNode);

        setTimeout(() => {
          if (!isSyncing) {
            generateLuaCode(updatedNodes, edges);
          }
        }, 50);

        return updatedNodes;
      });
    },
    [reactFlowInstance, edges, isSyncing, generateLuaCode, setNodes]
  );

  // ✅ SELECCIONAR NODO
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    console.log("👆 Nodo seleccionado:", node.type);
    setSelectedNode(node);
  }, []);

  const updateTimerRef = useRef<number | null>(null);

  const updateNodeData = useCallback(
    (key: string, value: any) => {
      if (!selectedNode) return;

      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === selectedNode.id) {
            const updatedNode = {
              ...node,
              data: { ...node.data, [key]: value },
            };
            setSelectedNode(updatedNode);
            return updatedNode;
          }
          return node;
        })
      );

      if (updateTimerRef.current !== null) {
        clearTimeout(updateTimerRef.current);
      }

      updateTimerRef.current = window.setTimeout(() => {
        // ✅ window.setTimeout
        if (!isSyncing) {
          generateLuaCode(nodes, edges);
        }
      }, 500);
    },
    [selectedNode, setNodes, nodes, edges, isSyncing, generateLuaCode]
  );

  // ✅ ELIMINAR NODO
  const deleteSelectedNode = useCallback(() => {
    if (!selectedNode) return;

    console.log("🗑️ Eliminando nodo:", selectedNode.id);

    setNodes((nds) => {
      const updatedNodes = nds.filter((node) => node.id !== selectedNode.id);

      setTimeout(() => {
        if (!isSyncing) {
          generateLuaCode(updatedNodes, edges);
        }
      }, 50);

      return updatedNodes;
    });

    setEdges((eds) =>
      eds.filter(
        (edge) =>
          edge.source !== selectedNode.id && edge.target !== selectedNode.id
      )
    );

    setSelectedNode(null);
  }, [selectedNode, edges, isSyncing, generateLuaCode, setNodes, setEdges]);

  // ✅ ELIMINAR EDGE
  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      console.log("🗑️ Eliminando edges");

      setTimeout(() => {
        if (!isSyncing) {
          generateLuaCode(nodes, edges);
        }
      }, 50);
    },
    [nodes, edges, isSyncing, generateLuaCode]
  );

  // ✅ CAMBIAR ARCHIVO
  const switchFile = useCallback(
    (fileId: string) => {
      console.log("🔄 Cambiando a archivo:", fileId);

      // Guardar estado actual antes de cambiar
      setFiles((prev) =>
        prev.map((f) => {
          if (f.id === activeFile.id) {
            return {
              ...f,
              nodes,
              edges,
              content: generatedCode,
              generatedCode,
            };
          }
          if (f.id === fileId) {
            return { ...f, active: true };
          }
          return { ...f, active: false };
        })
      );
    },
    [activeFile.id, nodes, edges, generatedCode]
  );

  // ✅ MENU ACTIONS
  const handleMenuAction = useCallback(
    (action: string) => {
      if (action === "Guardar") {
        saveProject();
      } else if (action === "Nuevo Proyecto") {
        if (confirm("¿Crear nuevo proyecto? Se perderá el progreso actual.")) {
          setFiles([
            {
              id: "1",
              name: "client.lua",
              type: "client",
              active: true,
              nodes: [],
              edges: [],
              content: "-- Código nuevo",
              generatedCode: "-- Código nuevo",
            },
            {
              id: "2",
              name: "server.lua",
              type: "server",
              active: false,
              nodes: [],
              edges: [],
              content: "-- Código nuevo",
              generatedCode: "-- Código nuevo",
            },
          ]);
          setNodes([]);
          setEdges([]);
          setGeneratedCode("-- Código nuevo");
          localStorage.removeItem("luaforge_project");
        }
      }
    },
    [saveProject, setNodes, setEdges]
  );

  // ✅ EXPORTAR LUA
  const exportLua = useCallback(() => {
    const blob = new Blob([generatedCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeFile.name;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Exportado",
      description: `${activeFile.name} descargado correctamente.`,
      className: "bg-green-600 text-white border-none",
    });
  }, [generatedCode, activeFile.name, toast]);

  return (
    <div className="flex flex-col h-screen w-full bg-[#1e1e1e] overflow-hidden text-gray-200 font-sans selection:bg-[#007fd4] selection:text-white">
      {/* HEADER */}
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

        {/* CONTROLES */}
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
            onClick={applyCodeToVisual}
            className="h-6 text-xs gap-1 text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
            title="Sincronizar código con visual"
          >
            <RefreshCw className="w-3 h-3" />
            Sync
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={saveProject}
            className="h-6 text-xs gap-1 text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
            title="Guardar proyecto"
          >
            <Save className="w-3 h-3" />
            Guardar
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={exportLua}
            className="h-6 text-xs gap-1 text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
            title="Exportar archivo Lua"
          >
            <Download className="w-3 h-3" />
            Exportar
          </Button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* SIDEBAR */}
          <ResizablePanel defaultSize={15} minSize={10} maxSize={20}>
            <Sidebar />
          </ResizablePanel>

          <ResizableHandle className="w-px bg-[#2a2a2a]" />

          {/* FILE EXPLORER */}
          <ResizablePanel defaultSize={10} minSize={8} maxSize={15}>
            <FileExplorer
              files={files}
              // @ts-ignore: onFileClick may not be declared in FileExplorerProps but we need to pass the handler
              onFileClick={switchFile}
              activeFileId={activeFile.id}
            />
          </ResizablePanel>

          <ResizableHandle className="w-px bg-[#2a2a2a]" />

          {/* CANVAS / CODE EDITOR */}
          <ResizablePanel defaultSize={50} minSize={30}>
            {viewMode === "visual" ? (
              <div
                ref={reactFlowWrapper}
                style={{ width: "100%", height: "100%" }}
              >
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onEdgesDelete={onEdgesDelete}
                  onConnect={onConnect}
                  onInit={setReactFlowInstance}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onNodeClick={onNodeClick}
                  onNodeDragStop={onNodeDragStop}
                  nodeTypes={nodeTypes}
                  fitView
                  className="bg-[#1e1e1e]"
                >
                  <Background color="#3e3e42" gap={20} size={1} />
                  <Controls className="bg-[#252526] border-[#3e3e42]" />
                </ReactFlow>
              </div>
            ) : (
              <CodeEditor
                code={generatedCode}
                onChange={handleCodeChange}
                readOnly={false}
              />
            )}
          </ResizablePanel>

          <ResizableHandle className="w-px bg-[#2a2a2a]" />

          {/* PROPERTIES / CODE PREVIEW */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
            {selectedNode && viewMode === "visual" ? (
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
                  {viewMode === "code"
                    ? "Modo de Edición de Código"
                    : "Selecciona un nodo"}
                </h3>
                <p className="text-xs text-gray-500 max-w-[200px] leading-relaxed">
                  {viewMode === "code"
                    ? "Estás editando el código fuente directamente."
                    : "Haz clic en un nodo para ver sus propiedades."}
                </p>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* FOOTER */}
      <footer className="h-6 bg-[#007fd4] flex items-center px-2 justify-between shrink-0">
        <div className="flex items-center gap-4 text-[10px] text-white font-medium">
          <span>LISTO</span>
          <span>{activeFile.type.toUpperCase()} MODE</span>
          <span>
            {nodes.length} NODOS | {edges.length} CONEXIONES
          </span>
        </div>
      </footer>
    </div>
  );
}
