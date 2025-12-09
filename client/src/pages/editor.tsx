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

    const code = convertVisualToLua(
      currentNodes,
      currentEdges,
      activeFile.headerCode
    );
    setGeneratedCode(code);

    setFiles((prev) =>
      prev.map((f) => {
        if (f.id === activeFile.id) {
          return {
            ...f,
            content: code,
          };
        }
        return f;
      })
    );
  };

  // --- PARSER (LUA -> VISUAL) ---
  const applyCodeToVisual = () => {
    setIsSyncing(true);
    const code = generatedCode;

    setTimeout(() => {
      try {
        const headerCode = extractHeaderCode(code);
        const {
          nodes: newNodes,
          edges: newEdges,
          error,
        } = convertLuaToVisual(code);

        if (error) {
          toast({
            title: "Error de Sintaxis",
            description: error,
            variant: "destructive",
          });
          return;
        }

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
              };
            }
            return f;
          })
        );
      } catch (e) {
        console.error("Error crítico al aplicar código:", e);
        toast({
          title: "Error Crítico",
          description: "Ocurrió un error inesperado al procesar el código.",
          variant: "destructive",
        });
      } finally {
        // ✅ SE EJECUTA SIEMPRE
        setIsSyncing(false);
      }
    }, 0);
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
      setEdges((eds) => {
        const updatedEdges = addEdge(params, eds);

        // ✅ Generar código con edges actualizados
        setTimeout(() => {
          if (!isSyncing) {
            const code = convertVisualToLua(
              nodes,
              updatedEdges,
              activeFile.headerCode
            );
            setGeneratedCode(code);

            setFiles((prev) =>
              prev.map((f) => {
                if (f.id === activeFile.id) {
                  return { ...f, edges: updatedEdges, content: code };
                }
                return f;
              })
            );
          }
        }, 50);

        return updatedEdges;
      });
    },
    [nodes, isSyncing, activeFile]
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

      setNodes((nds) => {
        const updatedNodes = nds.concat(newNode);

        // ✅ Generar código inmediatamente con nodos actualizados
        setTimeout(() => {
          if (!isSyncing) {
            const code = convertVisualToLua(
              updatedNodes,
              edges,
              activeFile.headerCode
            );
            setGeneratedCode(code);

            setFiles((prev) =>
              prev.map((f) => {
                if (f.id === activeFile.id) {
                  return { ...f, nodes: updatedNodes, edges, content: code };
                }
                return f;
              })
            );
          }
        }, 50);

        return updatedNodes;
      });
    },
    [reactFlowInstance, edges, isSyncing, activeFile]
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
                      Aplicar Código a Visual
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
