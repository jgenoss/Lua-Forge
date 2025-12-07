import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Define Node Types Registry
const nodeTypes = {
  // Eventos y Funciones
  'event-start': CustomNode,
  'function-def': CustomNode, // <--- NUEVO TIPO PARA FUNCIONES
  'event-trigger': CustomNode,
  'event-net': CustomNode,
  'event-server': CustomNode,
  'register-net': CustomNode,
  'add-event-handler': CustomNode,
  'thread-create': CustomNode,
  'wait': CustomNode,
  'register-key-mapping': CustomNode,

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
  'qb-trigger-callback': CustomNode,

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
  'sql-insert': CustomNode,
  
  // Generico
  'native-control': CustomNode
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
      nodes: [],
      edges: []
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
    }
  }, [activeFile.id]);

  // Cargar proyecto guardado
  useEffect(() => {
    const saved = localStorage.getItem('luaforge_project');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFiles(parsed);
        const active = parsed.find((f: any) => f.active) || parsed[0];
        setNodes(active.nodes || []);
        setEdges(active.edges || []);
        setGeneratedCode(active.content || '-- Código cargado');
      } catch (e) {
        console.error("Error cargando guardado", e);
      }
    }
  }, []);

  const saveProject = () => {
    const updatedFiles = files.map(f => {
      if (f.id === activeFile.id) {
        return { 
            ...f, 
            nodes: nodes, 
            edges: edges,
            content: viewMode === 'code' ? generatedCode : f.content
        };
      }
      return f;
    });

    setFiles(updatedFiles);
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

  // --- GENERADOR DE CÓDIGO (VISUAL -> LUA) ---
  const generateLuaCode = (currentNodes: Node[], currentEdges: Edge[]) => {
    if (isSyncing) return;

    let code = activeFile.headerCode 
        ? activeFile.headerCode + '\n\n' 
        : `-- Generado por LuaForge\nlocal QBCore = exports['qb-core']:GetCoreObject()\n\n`;

    // Filtramos los nodos raíz (Inicios de flujo)
    const startNodes = currentNodes.filter(n => 
        typeof n.type === 'string' && ['event-start', 'register-net', 'register-key-mapping', 'qb-command', 'thread-create', 'function-def'].includes(n.type)
    ).sort((a, b) => a.position.y - b.position.y);

    const generateBlock = (parentId: string, indent: string): string => {
        let block = '';
        
        const connections = currentEdges
            .filter(e => e.source === parentId)
            .sort((a, b) => {
                const nodeA = currentNodes.find(n => n.id === a.target);
                const nodeB = currentNodes.find(n => n.id === b.target);
                return (nodeA?.position.x || 0) - (nodeB?.position.x || 0);
            });

        for (const edge of connections) {
            const node = currentNodes.find(n => n.id === edge.target);
            if (!node) continue;
            if (edge.sourceHandle === 'false') continue; // Ignoramos 'else' aquí

            switch (node.type) {
                case 'logic-if':
                    block += `${indent}if ${node.data.condition || 'true'} then\n`;
                    block += generateBlock(node.id, indent + '    ');
                    
                    const falseEdge = currentEdges.find(e => e.source === node.id && e.sourceHandle === 'false');
                    if (falseEdge) {
                        block += `${indent}else\n`;
                        const elseNode = currentNodes.find(n => n.id === falseEdge.target);
                        if (elseNode) {
                             if (elseNode.data.codeBlock) block += `${indent}    ${elseNode.data.codeBlock}\n`;
                             block += generateBlock(elseNode.id, indent + '    ');
                        }
                    }
                    block += `${indent}end\n`;
                    break;

                case 'native-control':
                case 'create-ped': 
                    if (node.data.codeBlock) {
                        block += `${indent}${node.data.codeBlock}\n`;
                    } else if (node.data.label && node.data.label.includes('Call:')) {
                         block += `${indent}${node.data.label.replace('Call: ', '')}\n`;
                    } else {
                         block += `${indent}-- ${node.data.label}\n`;
                    }
                    block += generateBlock(node.id, indent);
                    break;

                case 'qb-notify':
                    block += `${indent}QBCore.Functions.Notify('${node.data.message}', '${node.data.notifyType || 'success'}')\n`;
                    block += generateBlock(node.id, indent);
                    break;
                
                case 'qb-trigger-callback':
                     block += `${indent}QBCore.Functions.TriggerCallback('${node.data.eventName}', function(result)\n`;
                     block += `${indent}    -- Lógica del callback\n`;
                     block += `${indent}end)\n`;
                     block += generateBlock(node.id, indent);
                     break;

                case 'logic-print':
                    // Si tiene formato complejo, no poner comillas
                    if (node.data.message.includes('%') || node.data.message.includes('..')) {
                        block += `${indent}print(${node.data.message})\n`;
                    } else {
                        block += `${indent}print('${node.data.message}')\n`;
                    }
                    block += generateBlock(node.id, indent);
                    break;
                
                case 'wait':
                    block += `${indent}Wait(${node.data.duration || 0})\n`;
                    block += generateBlock(node.id, indent);
                    break;
            }
        }
        return block;
    };

    startNodes.forEach(node => {
        if (node.type === 'function-def') {
            code += `function ${node.data.eventName}()\n`; // Escribe function X()
            code += generateBlock(node.id, '    ');
            code += `end\n\n`;
        }
        else if (node.type === 'event-start') {
            code += `RegisterCommand('${node.data.eventName}', function(source, args)\n`;
            code += generateBlock(node.id, '    ');
            code += `end, false)\n\n`;
        }
        else if (node.type === 'register-net') {
            const name = node.data.eventName;
            const finalName = (name.includes("'") || name.includes('"') || name.includes("..")) ? name : `'${name}'`;
            code += `RegisterNetEvent(${finalName}, function()\n`;
            code += generateBlock(node.id, '    ');
            code += `end)\n\n`;
        }
        else if (node.type === 'register-key-mapping') {
            code += `RegisterKeyMapping('${node.data.commandName}', '${node.data.description}', 'keyboard', '${node.data.defaultKey}')\n`;
        }
    });

    setGeneratedCode(code);
    setFiles(prev => prev.map(f => f.id === activeFile.id ? { ...f, content: code } : f));
  };

  // --- PARSER (LUA -> VISUAL) ---
  // --- PARSER (LUA -> VISUAL) ---
  const applyCodeToVisual = () => {
    setIsSyncing(true);
    const code = generatedCode;
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    
    const actionKeywords = [
        'RegisterCommand', 'RegisterNetEvent', 'RegisterKeyMapping', 
        'QBCore.Commands.Add', 'CreateThread', 'AddEventHandler',
        'function ' 
    ];
    
    const lines = code.split('\n');
    let firstActionIndex = -1;

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (actionKeywords.some(kw => trimmed.startsWith(kw)) && !trimmed.startsWith('--')) {
            firstActionIndex = i;
            break;
        }
    }

    let headerCode = '';
    let bodyCodeLines: string[] = [];

    if (firstActionIndex !== -1) {
        headerCode = lines.slice(0, firstActionIndex).join('\n').trim();
        bodyCodeLines = lines.slice(firstActionIndex);
    } else {
        headerCode = code; 
    }

    let parentStack: { id: string; x: number; y: number }[] = [];
    let currentY = 100;
    let rootX = 100;

    const addNode = (type: string, label: string, data: any, x: number, y: number) => {
        const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        newNodes.push({ id, type, data: { label, ...data }, position: { x, y } });
        return id;
    };

    const linkNodes = (source: string, target: string, handle = 'flow-out') => {
        newEdges.push({
            id: `e-${source}-${target}`,
            source, target, 
            sourceHandle: handle, targetHandle: 'flow-in'
        });
    };

    for (let i = 0; i < bodyCodeLines.length; i++) {
        const rawLine = bodyCodeLines[i];
        const line = rawLine.trim();
        if (!line || line.startsWith('--')) continue; 

        // DETECTOR FUNCIONES
        const funcMatch = line.match(/^function\s+([a-zA-Z0-9_.:]+)\s*\(/);
        if (funcMatch) {
            const funcName = funcMatch[1];
            const nodeId = addNode('function-def', `Función: ${funcName}`, { eventName: funcName }, rootX, currentY);
            parentStack = [{ id: nodeId, x: rootX, y: currentY }];
            currentY += 250;
            continue;
        }

        // DETECTOR COMANDOS
        const cmdMatch = line.match(/(?:RegisterCommand|QBCore\.Commands\.Add)\s*\(\s*['"]([^'"]+)['"]/);
        if (cmdMatch) {
            const cmdId = addNode('event-start', `Comando: ${cmdMatch[1]}`, { eventName: cmdMatch[1] }, rootX, currentY);
            parentStack = [{ id: cmdId, x: rootX, y: currentY }]; 
            currentY += 250; 
            continue;
        }

        // DETECTOR NET EVENTS
        const netMatch = line.match(/RegisterNetEvent\s*\(\s*(.+?)\s*,/);
        if (netMatch) {
            const cleanName = netMatch[1].replace(/app\.resourceName\s*\.\.\s*/, '').replace(/['":]/g, '');
            const evtId = addNode('register-net', `Net: ${cleanName}`, { eventName: netMatch[1] }, rootX, currentY);
            parentStack = [{ id: evtId, x: rootX, y: currentY }];
            currentY += 250;
            continue;
        }

        // DETECTOR KEY MAPPING
        const keyMatch = line.match(/RegisterKeyMapping\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/);
        if (keyMatch) {
            addNode('register-key-mapping', `Tecla: ${keyMatch[4]}`, { 
                commandName: keyMatch[1], description: keyMatch[2], defaultKey: keyMatch[4] 
            }, rootX, currentY);
            currentY += 100;
            continue;
        }

        // LÓGICA HIJA
        if (parentStack.length > 0) {
            const parent = parentStack[parentStack.length - 1];
            const childX = parent.x + 350; 
            const childY = parent.y; 
            let nodeId: string | null = null;

            // IF STATEMENT
            const ifMatch = line.match(/^if\s+(.+)\s+then$/);
            if (ifMatch) {
                const condition = ifMatch[1];
                nodeId = addNode('logic-if', 'Condición IF', { condition }, childX, childY);
                linkNodes(parent.id, nodeId);
                parentStack.push({ id: nodeId, x: childX, y: childY });
                continue;
            }
            
            // END BLOCK
            if (line === 'end' || line.startsWith('end)')) {
                if (parentStack.length > 0) parentStack.pop();
                continue;
            }

            // WAIT
            // Detecta Wait(2000) o Wait( 2000 )
            if (line.match(/^Wait\s*\(\s*(\d+)\s*\)/)) {
                 const duration = line.match(/\d+/);
                 nodeId = addNode('wait', 'Esperar', { duration: duration ? duration[0] : 0 }, childX, childY);
            }
            // PRINT (Complex vs Simple)
            else if (line.startsWith('print')) {
                if (line.includes(':format') || line.includes('%') || line.includes('..')) {
                     nodeId = addNode('native-control', 'Print (Format)', { 
                         codeBlock: line,
                         label: 'Print (Format)' 
                     }, childX, childY);
                } else {
                    const pMatch = line.match(/\(([^)]+)\)/);
                    const msg = pMatch ? pMatch[1].replace(/['"]/g, '') : 'log';
                    nodeId = addNode('logic-print', 'Debug Print', { message: msg }, childX, childY);
                }
            }
            // QB NOTIFY
            else if (line.includes('Notify')) {
                const msgMatch = line.match(/['"]([^'"]+)['"]/);
                nodeId = addNode('qb-notify', 'Notificación', { 
                    message: msgMatch ? msgMatch[1] : 'Alerta',
                    notifyType: line.includes('error') ? 'error' : 'success'
                }, childX, childY);
            }
            // CALLBACKS
            else if (line.includes('TriggerCallback')) {
                const cbMatch = line.match(/['"]([^'"]+)['"]/);
                const cbName = cbMatch ? cbMatch[1] : 'Callback';
                nodeId = addNode('qb-trigger-callback', `Callback: ${cbName}`, { eventName: cbName }, childX, childY);
            }
            // GENERIC CODE
           else {
                 // Intentar obtener un nombre mejor para el nodo
                 let label = 'Script';
                 if (line.startsWith('local ')) label = 'Variable';
                 else if (line.includes('=')) label = 'Asignación';
                 else if (line.includes(':') || line.includes('.')) label = 'Llamada';
                 
                 // Mostrar parte del código en la etiqueta para identificarlo
                 const displayLabel = line.length > 25 ? line.substring(0, 22) + '...' : line;

                 nodeId = addNode('native-control', 'Lua Code', { 
                    label: displayLabel, // <--- AQUI ESTA LA CORRECCION DE NOMBRE
                    codeBlock: line 
                }, childX, childY);
            }

            if (nodeId) {
                const handle = parentStack[parentStack.length - 1].id.includes('logic-if') ? 'true' : 'flow-out';
                linkNodes(parent.id, nodeId, handle);
                parentStack[parentStack.length - 1] = { id: nodeId, x: childX, y: childY };
            }
        }
    }

    setNodes(newNodes);
    setEdges(newEdges);
    setFiles(prev => prev.map(f => {
        if (f.id === activeFile.id) {
            return { 
                ...f, 
                nodes: newNodes, 
                edges: newEdges, 
                content: code,
                headerCode: headerCode 
            };
        }
        return f;
    }));
    
    toast({ title: "Código Convertido", description: "La estructura visual ha sido actualizada." });
    setTimeout(() => setIsSyncing(false), 500);
  };

  const handleCodeChange = (value: string | undefined) => {
    const val = value || '';
    setGeneratedCode(val);
    
    setFiles(prev => prev.map(f => {
        if (f.id === activeFile.id) {
            return { ...f, content: val };
        }
        return f;
    }));
  };

  // --- MANEJO DE CAMBIOS SEGURO ---
  const onGraphChange = useCallback(() => {
    if (isSyncing) return;
    generateLuaCode(nodes, edges);
    
    setFiles(prev => prev.map(f => {
      if (f.id === activeFile.id) {
        return { ...f, nodes, edges };
      }
      return f;
    }));
  }, [nodes, edges, isSyncing, activeFile.id]);

  // Solo guardar al soltar un nodo
  const onNodeDragStop = useCallback(() => {
    onGraphChange();
  }, [onGraphChange]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
      setTimeout(onGraphChange, 50);
    },
    [setEdges, onGraphChange],
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const dataTransfer = event.dataTransfer;
      if (!dataTransfer) return; // Protección: event.dataTransfer puede ser null en algunos navegadores/escenarios

      const type = dataTransfer.getData('application/reactflow/type');
      const label = dataTransfer.getData('application/reactflow/label');
      if (typeof type === 'undefined' || !type) return;

      const position = reactFlowInstance
        ? reactFlowInstance.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          })
        : { x: event.clientX, y: event.clientY };

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label },
      };

      setNodes((nds) => nds.concat(newNode));
      setTimeout(onGraphChange, 50);
    },
    [reactFlowInstance, setNodes, onGraphChange],
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
    // Debounce manual o wait para update
    setTimeout(onGraphChange, 50);
  };

  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setSelectedNode(null);
    setTimeout(onGraphChange, 50);
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
                    <DropdownMenuItem onClick={() => handleMenuAction('Guardar')}>Guardar</DropdownMenuItem>
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

      <div className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
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

          <ResizablePanel defaultSize={55} minSize={30} className="bg-[#111]">
            <div className="h-full flex flex-col">
               <div className="h-8 bg-[#1e1e1e] border-b border-[#2a2a2a] flex items-center">
                  {files.filter(f => f.active).map(f => (
                    <div key={f.id} className="h-full px-4 flex items-center gap-2 bg-[#1e1e1e] border-r border-[#2a2a2a] text-xs text-blue-400 border-t-2 border-t-blue-500">
                      {f.name} <span className="text-gray-500 ml-2 cursor-pointer hover:text-white">×</span>
                    </div>
                  ))}
               </div>
               
               {viewMode === 'visual' ? (
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