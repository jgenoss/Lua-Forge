import { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  Connection,
  Edge,
  Node,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Sidebar } from '@/components/editor/Sidebar';
import { PropertiesPanel } from '@/components/editor/PropertiesPanel';
import { FileExplorer } from '@/components/editor/FileExplorer';
import { CodeEditor } from '@/components/editor/CodeEditor';
import CustomNode from '@/components/editor/CustomNode';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  Save, 
  Code2,
  Play,
  Layout,
  FileCode,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Define Node Types Registry
const nodeTypes = {
  // Eventos
  'event-start': CustomNode,
  'event-trigger': CustomNode,
  'event-net': CustomNode,
  'event-server': CustomNode,
  'register-net': CustomNode,
  'add-event-handler': CustomNode,
  'thread-create': CustomNode,
  'wait': CustomNode,
  'register-key-mapping': CustomNode, // El que añadimos antes

  // Entidades
  'create-ped': CustomNode,
  'create-object': CustomNode,
  'delete-entity': CustomNode,
  'set-entity-coords': CustomNode,
  'get-entity-coords': CustomNode,
  'freeze-entity': CustomNode,
  'set-entity-invincible': CustomNode,
  
  // Blips y Markers
  'add-blip-coord': CustomNode,
  'set-blip-sprite': CustomNode,
  'draw-marker': CustomNode,

  // QBCore / ESX
  'qb-core-object': CustomNode,
  'qb-notify': CustomNode,
  'qb-command': CustomNode,
  'esx-notify': CustomNode,

  // Lógica y Matemáticas
  'logic-if': CustomNode,
  'logic-loop': CustomNode,
  'logic-print': CustomNode,
  'logic-math': CustomNode,
  'math-abs': CustomNode,
  'math-random': CustomNode,
  
  // Input
  'is-control-pressed': CustomNode,
  'is-control-just-pressed': CustomNode,
  'disable-control-action': CustomNode,

  // SQL
  'sql-query': CustomNode,
  'sql-insert': CustomNode
};

interface File {
  id: string;
  name: string;
  type: 'client' | 'server';
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
      id: '1', 
      name: 'client.lua', 
      type: 'client', 
      active: true,
      nodes: [
        { id: '1', type: 'event-start', data: { label: 'Register Command' }, position: { x: 100, y: 100 } },
        { id: '2', type: 'qb-notify', data: { label: 'Notify Player' }, position: { x: 400, y: 100 } }
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2', sourceHandle: 'flow-out', targetHandle: 'flow-in' }
      ]
    },
    { 
      id: '2', 
      name: 'server.lua', 
      type: 'server', 
      active: false,
      nodes: [],
      edges: []
    }
  ]);

  const saveProject = () => {
    // 1. Guardar el estado actual del archivo activo antes de nada
    const updatedFiles = files.map(f => {
      if (f.id === activeFile.id) {
        return { 
            ...f, 
            nodes: nodes, 
            edges: edges,
            content: viewMode === 'code' ? generatedCode : f.content // Guardar lo que estés viendo
        };
      }
      return f;
    });

    setFiles(updatedFiles);

    // 2. Guardar en LocalStorage (Persistencia básica)
    try {
      localStorage.setItem('luaforge_project', JSON.stringify(updatedFiles));
      toast({
        title: "Proyecto Guardado",
        description: "Tus cambios se han guardado localmente.",
        className: "bg-green-600 text-white border-none"
      });
    } catch (e) {
      toast({
        title: "Error al guardar",
        description: "No se pudo escribir en el almacenamiento local.",
        variant: "destructive"
      });
    }
  };
  const activeFile = files.find(f => f.active) || files[0];

  const [nodes, setNodes, onNodesChange] = useNodesState(activeFile.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(activeFile.edges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string>('-- Código Lua generado aparecerá aquí');
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const { toast } = useToast();

  // Sync state when switching files
  useEffect(() => {
    setNodes(activeFile.nodes);
    setEdges(activeFile.edges);
    if (activeFile.content) {
        setGeneratedCode(activeFile.content);
    } else {
        generateLuaCode(activeFile.nodes, activeFile.edges);
    }
  }, [activeFile.id]);

  // Save current state to file object when nodes/edges change
  useEffect(() => {
    if (!isSyncing) {
        setFiles(prev => prev.map(f => {
          if (f.id === activeFile.id) {
            return { ...f, nodes, edges };
          }
          return f;
        }));
        generateLuaCode(nodes, edges);
    }
  }, [nodes, edges]);
  // ✅ CARGAR PROYECTO AL INICIO (Opcional, añadir en un useEffect nuevo)
  useEffect(() => {
    const saved = localStorage.getItem('luaforge_project');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFiles(parsed);
        // Cargar el archivo activo
        const active = parsed.find((f: any) => f.active) || parsed[0];
        setNodes(active.nodes || []);
        setEdges(active.edges || []);
        setGeneratedCode(active.content || '-- Código cargado');
      } catch (e) {
        console.error("Error cargando guardado", e);
      }
    }
  }, []);

  const generateLuaCode = (currentNodes: Node[], currentEdges: Edge[]) => {
    // 1. RECUPERAR EL ENCABEZADO (Si existe en el archivo activo, úsalo. Si no, usa default)
    let code = activeFile.headerCode 
        ? activeFile.headerCode + '\n\n' 
        : `-- Generado por LuaForge\nlocal QBCore = exports['qb-core']:GetCoreObject()\n\n`;
    
    // 2. ORDENAR NODOS POR POSICIÓN Y (De arriba a abajo)
    const sortedNodes = [...currentNodes].sort((a, b) => a.position.y - b.position.y);

    sortedNodes.forEach(node => {
        // --- COMANDOS ---
        if (node.type === 'event-start' || node.type === 'qb-command') {
            const cmdName = node.data.eventName || 'comando';
            const args = node.data.args || 'source, args';
            
            // Si tiene código custom guardado, úsalo. Si no, genera estructura vacía.
            const body = node.data.codeBlock 
                ? node.data.codeBlock 
                : `    print('Comando ${cmdName} ejecutado')`;

            code += `RegisterCommand('${cmdName}', function(${args})\n`;
            code += `    ${body}\n`; // Inyectamos el cuerpo preservado
            code += `end, false)\n\n`;
        }
        
        // --- EVENTOS DE RED ---
        else if (node.type === 'register-net') {
            const rawName = node.data.eventName;
            // Detectar si es string literal o variable
            const finalName = (rawName && (rawName.includes("'") || rawName.includes('"') || rawName.includes(".."))) 
                ? rawName 
                : `'${rawName || 'net:event'}'`;
                
            const args = node.data.args || '';
            const body = node.data.codeBlock || `    print('Evento recibido')`;

            code += `RegisterNetEvent(${finalName}, function(${args})\n`;
            code += `    ${body}\n`;
            code += `end)\n\n`;
        }

        // --- KEY MAPPINGS ---
        else if (node.type === 'register-key-mapping') {
            const { commandName, description, defaultKey } = node.data;
            code += `RegisterKeyMapping('${commandName}', '${description}', 'keyboard', '${defaultKey}')\n\n`;
        }
    });

    setGeneratedCode(code);
    
    // Guardar cambio
    if (!isSyncing) {
        setFiles(prev => prev.map(f => f.id === activeFile.id ? { ...f, content: code } : f));
    }
  };

  const handleCodeChange = (value: string | undefined) => {
    const val = value || '';
    setGeneratedCode(val);
    
    // Actualizar el archivo activo con el código manual
    setFiles(prev => prev.map(f => {
        if (f.id === activeFile.id) {
            return { ...f, content: val };
        }
        return f;
    }));
  };
  // Función auxiliar para iniciar la recursión limpia
  const findAndGenerateChildren = (node: Node, nodes: Node[], edges: Edge[], indent: string) => {
      let content = '';
      const connectedEdges = edges.filter(e => e.source === node.id);
      connectedEdges.forEach(edge => {
          const targetNode = nodes.find(n => n.id === edge.target);
          if (targetNode) {
              content += generateNodeLogic(targetNode, nodes, edges, indent);
          }
      });
      return content;
  };

  // ... dentro de EditorPage ...

  const generateNodeLogic = (node: Node, allNodes: Node[], allEdges: Edge[], indent: string): string => {
      let snippet = '';
      
      // 1. GENERAR CÓDIGO SEGÚN EL TIPO DE NODO
      switch (node.type) {
          case 'qb-notify':
              snippet = `${indent}QBCore.Functions.Notify('${node.data.message || 'Alerta'}', '${node.data.notifyType || 'success'}')\n`;
              break;
          case 'logic-print':
              snippet = `${indent}print('${node.data.message || 'Debug message'}')\n`;
              break;
          case 'wait':
              snippet = `${indent}Wait(${node.data.duration || 0})\n`;
              break;
          case 'create-ped':
              // Ejemplo: CreatePed(type, hash, x, y, z, h, isNetwork, bScriptHost)
              snippet = `${indent}local ped = CreatePed(4, ${node.data.model || 'GetHashKey("mp_m_freemode_01")'}, 0.0, 0.0, 0.0, 0.0, true, true)\n`;
              break;
          case 'set-entity-coords':
              snippet = `${indent}SetEntityCoords(${node.data.entity || 'PlayerPedId()'}, ${node.data.x || 0}, ${node.data.y || 0}, ${node.data.z || 0}, false, false, false, false)\n`;
              break;
          case 'qb-command':
              // Este suele ser un evento de inicio, pero si se usa inline:
              snippet = `${indent}-- Comando registrado arriba\n`; 
              break;
          case 'logic-if':
              snippet = `${indent}if ${node.data.condition || 'true'} then\n`;
              break;
          default:
              snippet = `${indent}-- TODO: Implementar lógica para ${node.type} (${node.data.label})\n`;
      }

      // 2. MANEJAR CONEXIONES (FLUJO)
      
      // CASO ESPECIAL: Nodos condicionales (IF/ELSE)
      if (node.type === 'logic-if') {
          // Camino VERDADERO (Source handle: 'true')
          const trueEdges = allEdges.filter(e => e.source === node.id && e.sourceHandle === 'true');
          trueEdges.forEach(edge => {
             const target = allNodes.find(n => n.id === edge.target);
             if (target) snippet += generateNodeLogic(target, allNodes, allEdges, indent + '    ');
          });

          // Camino FALSO (Source handle: 'false')
          const falseEdges = allEdges.filter(e => e.source === node.id && e.sourceHandle === 'false');
          if (falseEdges.length > 0) {
              snippet += `${indent}else\n`;
              falseEdges.forEach(edge => {
                 const target = allNodes.find(n => n.id === edge.target);
                 if (target) snippet += generateNodeLogic(target, allNodes, allEdges, indent + '    ');
              });
          }
          
          snippet += `${indent}end\n`;
      } 
      // CASO NORMAL: Flujo lineal
      else {
          const nextEdges = allEdges.filter(e => e.source === node.id);
          nextEdges.forEach(edge => {
              const nextNode = allNodes.find(n => n.id === edge.target);
              if (nextNode) {
                  snippet += generateNodeLogic(nextNode, allNodes, allEdges, indent);
              }
          });
      }

      return snippet;
  };

  // --- SIMPLE PARSER (Code -> Visual) ---
  const applyCodeToVisual = () => {
    setIsSyncing(true);
    const code = generatedCode;
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    let yPos = 100;

    // 1. EXTRAER ENCABEZADO (Header Preservation)
    // Buscamos dónde empieza el primer evento/comando registrado para separar la lógica global
    const firstBlockIndex = code.search(/(?:RegisterCommand|RegisterNetEvent|RegisterKeyMapping|QBCore\.Commands\.Add)/);
    
    let headerCode = '';
    if (firstBlockIndex !== -1) {
        headerCode = code.substring(0, firstBlockIndex).trim();
    } else {
        headerCode = '-- No se detectaron eventos, todo es código global\n' + code;
    }

    // Helper para nodos
    const createNode = (type: string, label: string, data: any, x: number, y: number) => {
        const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        newNodes.push({ id, type, data: { label, ...data }, position: { x, y } });
        return id;
    };

    // 2. ANALIZAR COMANDOS Y GUARDAR SU CUERPO EXACTO
    const cmdBlockRegex = /(?:RegisterCommand|QBCore\.Commands\.Add)\s*\(\s*['"]([^'"]+)['"]\s*,\s*function\s*\(([^)]*)\)([\s\S]*?)end\s*,\s*(?:false|true)\s*\)/g;
    let match;
    
    while ((match = cmdBlockRegex.exec(code)) !== null) {
        const cmdName = match[1];
        const args = match[2]; // source, args
        const bodyContent = match[3].trim(); // El código dentro de la función

        // Creamos el nodo guardando el "codeBlock" original
        createNode('event-start', `Comando: ${cmdName}`, { 
            eventName: cmdName,
            args: args,
            codeBlock: bodyContent // <--- ESTO ES LA CLAVE
        }, 100, yPos);
        
        yPos += 250;
    }

    // 3. ANALIZAR EVENTOS DE RED Y SU CUERPO
    const netEventRegex = /RegisterNetEvent\s*\(\s*([^,]+)\s*,\s*function\s*\(([^)]*)\)([\s\S]*?)end\s*\)/g;
    while ((match = netEventRegex.exec(code)) !== null) {
        let evtName = match[1].replace(/['"]/g, '').trim();
        // Si el nombre es dinámico (ej: app.resourceName .. ':event'), lo guardamos tal cual
        const rawName = match[1].trim(); 
        const args = match[2];
        const bodyContent = match[3].trim();

        createNode('register-net', `Net: ${evtName.substring(0, 20)}...`, { 
            eventName: rawName, // Guardamos el nombre crudo (con variables)
            args: args,
            codeBlock: bodyContent 
        }, 100, yPos);

        yPos += 250;
    }

    // 4. KEY MAPPINGS
    const keyRegex = /RegisterKeyMapping\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = keyRegex.exec(code)) !== null) {
        createNode('register-key-mapping', `Tecla: ${match[4]}`, { 
            commandName: match[1], 
            description: match[2],
            defaultKey: match[4]
        }, 100, yPos);
        yPos += 150;
    }

    // ACTUALIZAR ESTADO
    setNodes(newNodes);
    setEdges(newEdges); // En esta versión simplificada no creamos edges hijos para no romper el bloque de código
    
    // Guardamos el Header en el archivo
    setFiles(prev => prev.map(f => {
        if (f.id === activeFile.id) {
            return { 
                ...f, 
                nodes: newNodes, 
                edges: newEdges, 
                content: code,
                headerCode: headerCode // <--- GUARDAMOS EL HEADER
            };
        }
        return f;
    }));

    toast({ title: "Código Importado", description: "Se ha preservado tu lógica custom." });
    setViewMode('visual');
    setTimeout(() => setIsSyncing(false), 500);
  };

  const handleFileSelect = (id: string) => {
    setFiles(prev => prev.map(f => ({ ...f, active: f.id === id })));
    setSelectedNode(null);
  };

  const handleFileCreate = (type: 'client' | 'server') => {
    const newFile: File = {
      id: Date.now().toString(),
      name: `new_${type}.lua`,
      type,
      active: true,
      nodes: [],
      edges: []
    };
    setFiles(prev => prev.map(f => ({ ...f, active: false } as File)).concat(newFile));
  };
  
  const handleFileDelete = (id: string) => {
     setFiles(prev => {
        const remaining = prev.filter(f => f.id !== id);
        if (remaining.length > 0) remaining[0].active = true;
        return remaining;
     });
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow/type');
      const label = event.dataTransfer.getData('application/reactflow/label');

      if (typeof type === 'undefined' || !type) return;

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
    },
    [reactFlowInstance, setNodes],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const updateNodeData = (key: string, value: any) => {
    if (!selectedNode) return;
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
  };

  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setSelectedNode(null);
  };

  const handleMenuAction = (action: string) => {
      toast({
          title: action,
          description: "Función simulada para demostración.",
      });
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#1e1e1e] overflow-hidden text-gray-200 font-sans selection:bg-[#007fd4] selection:text-white">
      {/* Top Bar (Unreal Style) */}
      <header className="h-10 border-b border-[#2a2a2a] bg-[#1e1e1e] flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
             <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
               <Code2 className="w-3.5 h-3.5 text-white" />
             </div>
             <span className="font-bold text-sm text-gray-200 tracking-wide">LuaVisual Editor</span>
          </div>
          <div className="h-4 w-px bg-[#3e3e42]" />
          <div className="flex items-center gap-1">
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-gray-400 hover:text-white hover:bg-[#2a2a2a]">Archivo</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#252526] border-[#3e3e42] text-gray-300">
                    <DropdownMenuItem onClick={() => handleMenuAction('Nuevo Proyecto')}>Nuevo Proyecto</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuAction('Abrir Proyecto')}>Abrir...</DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[#3e3e42]" />
                    <DropdownMenuItem onClick={() => handleMenuAction('Guardar')}>Guardar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuAction('Exportar')}>Exportar como ZIP</DropdownMenuItem>
                </DropdownMenuContent>
             </DropdownMenu>

             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-gray-400 hover:text-white hover:bg-[#2a2a2a]">Editar</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#252526] border-[#3e3e42] text-gray-300">
                    <DropdownMenuItem onClick={() => handleMenuAction('Deshacer')}>Deshacer</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuAction('Rehacer')}>Rehacer</DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[#3e3e42]" />
                    <DropdownMenuItem onClick={() => handleMenuAction('Cortar')}>Cortar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuAction('Copiar')}>Copiar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuAction('Pegar')}>Pegar</DropdownMenuItem>
                </DropdownMenuContent>
             </DropdownMenu>

             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-gray-400 hover:text-white hover:bg-[#2a2a2a]">Ventana</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#252526] border-[#3e3e42] text-gray-300">
                    <DropdownMenuItem onClick={() => setViewMode('visual')}>Vista Visual</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setViewMode('code')}>Vista Código</DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[#3e3e42]" />
                    <DropdownMenuItem onClick={() => handleMenuAction('Resetear Layout')}>Restaurar Paneles</DropdownMenuItem>
                </DropdownMenuContent>
             </DropdownMenu>

             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-gray-400 hover:text-white hover:bg-[#2a2a2a]">Ayuda</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#252526] border-[#3e3e42] text-gray-300">
                    <DropdownMenuItem onClick={() => handleMenuAction('Documentación')}>Documentación</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuAction('Acerca de')}>Acerca de LuaVisual</DropdownMenuItem>
                </DropdownMenuContent>
             </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <div className="bg-[#2a2a2a] p-1 rounded flex gap-1 border border-[#3e3e42] mr-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setViewMode('visual')}
                className={`h-6 w-7 px-0 ${viewMode === 'visual' ? 'bg-[#007fd4] text-white hover:bg-[#007fd4]/90' : 'text-gray-400 hover:text-white'}`}
                title="Modo Visual"
              >
                <Layout className="w-3.5 h-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setViewMode('code')}
                className={`h-6 w-7 px-0 ${viewMode === 'code' ? 'bg-[#007fd4] text-white hover:bg-[#007fd4]/90' : 'text-gray-400 hover:text-white'}`}
                title="Modo Código"
              >
                <FileCode className="w-3.5 h-3.5" />
              </Button>
           </div>
           
           <Button variant="ghost" size="sm" className="h-7 gap-2 bg-[#007fd4] hover:bg-[#007fd4]/90 text-white rounded-sm" onClick={saveProject}>
             <Save className="w-3.5 h-3.5" />
             <span className="text-xs">Guardar</span>
           </Button>
           <Button variant="ghost" size="sm" className="h-7 gap-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white border border-[#3e3e42] rounded-sm">
             <Download className="w-3.5 h-3.5" />
             <span className="text-xs">Exportar</span>
           </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          
          {/* Left Sidebar (File Explorer & Toolbox) */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={25} className="bg-[#151515]">
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

          {/* Center Canvas */}
          <ResizablePanel defaultSize={55} minSize={30} className="bg-[#111]">
            <div className="h-full flex flex-col">
               {/* Tab Bar */}
               <div className="h-8 bg-[#1e1e1e] border-b border-[#2a2a2a] flex items-center">
                  {files.filter(f => f.active).map(f => (
                    <div key={f.id} className="h-full px-4 flex items-center gap-2 bg-[#1e1e1e] border-r border-[#2a2a2a] text-xs text-blue-400 border-t-2 border-t-blue-500">
                      {f.name} <span className="text-gray-500 ml-2 cursor-pointer hover:text-white">×</span>
                    </div>
                  ))}
               </div>
               
               {/* Content based on View Mode */}
               {viewMode === 'visual' ? (
                 <div className="flex-1 relative" ref={reactFlowWrapper}>
                    <ReactFlowProvider>
                      <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
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
                        
                        <Panel position="top-center" className="bg-[#1e1e1e] border border-[#3e3e42] px-3 py-1 rounded-sm shadow-xl flex items-center gap-3">
                           <Button size="icon" variant="ghost" className="h-6 w-6 text-green-500 hover:text-green-400 hover:bg-green-900/20">
                              <Play className="w-4 h-4" />
                           </Button>
                           <div className="h-4 w-px bg-[#3e3e42]" />
                           <span className="text-xs text-gray-400">Compilación en tiempo real: <span className="text-green-500">Activa</span></span>
                        </Panel>
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

          {/* Right Panel (Details & Preview) */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={35} className="bg-[#1e1e1e]">
             {viewMode === 'visual' ? (
               <>
                 <PropertiesPanel 
                    selectedNode={selectedNode} 
                    onChange={updateNodeData} 
                    onDelete={deleteSelectedNode}
                 />
                 <CodeEditor code={generatedCode} onChange={() => {}} readOnly={true} />
               </>
             ) : (
                <div className="p-6 text-gray-400 text-sm text-center mt-10 flex flex-col items-center">
                   <FileCode className="w-12 h-12 mb-4 text-[#3e3e42]" />
                   <h3 className="text-gray-200 font-medium mb-2">Modo de Edición de Código</h3>
                   <p className="text-xs text-gray-500 max-w-[200px] leading-relaxed">
                     Estás editando el código fuente directamente.
                   </p>
                   <div className="mt-6 p-3 bg-amber-900/10 border border-amber-900/30 rounded text-amber-500 text-xs text-left w-full">
                      <strong>Nota:</strong> Los cambios realizados aquí pueden no reflejarse perfectamente en el modo visual al regresar, ya que el parser es experimental.
                   </div>
                </div>
             )}
          </ResizablePanel>

        </ResizablePanelGroup>
      </div>
      
      {/* Footer Status Bar */}
      <footer className="h-6 bg-[#007fd4] flex items-center px-2 justify-between shrink-0">
         <div className="flex items-center gap-4 text-[10px] text-white font-medium">
            <span>LISTO</span>
            <span>{activeFile.type.toUpperCase()} MODE</span>
         </div>
         <div className="flex items-center gap-4 text-[10px] text-white">
            <span>Ln 1, Col 1</span>
            <span>UTF-8</span>
            <span>Lua</span>
         </div>
      </footer>
    </div>
  );
}