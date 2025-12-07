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
    if (isSyncing) return; // Evitar bucles infinitos durante el parseo

    // 1. HEADER: Usamos el que guardamos o uno por defecto si es nuevo
    let code = activeFile.headerCode 
        ? activeFile.headerCode + '\n\n' 
        : `-- Generado por LuaForge\nlocal QBCore = exports['qb-core']:GetCoreObject()\n\n`;

    // Filtramos los nodos raíz (Inicios de flujo)
    const startNodes = currentNodes.filter(n => 
        typeof n.type === 'string' && ['event-start', 'register-net', 'register-key-mapping', 'qb-command', 'thread-create'].includes(n.type)
    ).sort((a, b) => a.position.y - b.position.y);

    // Función recursiva para generar bloques de lógica
    const generateBlock = (parentId: string, indent: string): string => {
        let block = '';
        
        // Buscar hijos conectados a 'flow-out' (flujo normal) o 'true' (IF verdadero)
        // Ordenamos por X para seguir la secuencia visual izquierda -> derecha
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

            // Si es un 'else' (handle false), lo gestionamos dentro del IF, no aquí
            if (edge.sourceHandle === 'false') continue;

            switch (node.type) {
                case 'logic-if':
                    block += `${indent}if ${node.data.condition || 'true'} then\n`;
                    // Recursión: Generar lo que hay dentro del IF (camino True)
                    block += generateBlock(node.id, indent + '    ');
                    
                    // Buscar si tiene un camino False (Else)
                    const falseEdge = currentEdges.find(e => e.source === node.id && e.sourceHandle === 'false');
                    if (falseEdge) {
                        block += `${indent}else\n`;
                        // Generar el bloque Else (Truco: generamos a partir del primer nodo del else)
                        // Para hacerlo bien, deberíamos tratar el nodo target como el inicio de un bloque
                        // En este generador simple, asumimos que el nodo target ES el bloque
                        const elseNode = currentNodes.find(n => n.id === falseEdge.target);
                        if (elseNode) {
                             // Generamos ese nodo y sus hijos
                             // Nota: Esto es una simplificación, idealmente elseNode es el inicio de una cadena
                             // Pero necesitamos generar el código de ese nodo primero
                             // Aquí duplicamos lógica por brevedad, lo ideal es una función `generateNodeCode`
                             if (elseNode.data.codeBlock) block += `${indent}    ${elseNode.data.codeBlock}\n`;
                             else block += `${indent}    -- Lógica Else (TODO)\n`;
                        }
                    }
                    block += `${indent}end\n`;
                    break;

                case 'native-control':
                case 'create-ped': // Y cualquier otro nodo de acción
                    // Si tiene un bloque de código exacto guardado, úsalo.
                    if (node.data.codeBlock) {
                        block += `${indent}${node.data.codeBlock}\n`;
                    } else if (node.data.label && node.data.label.includes('Call:')) {
                         // Reconstrucción si no hay codeBlock
                         block += `${indent}${node.data.label.replace('Call: ', '')}\n`;
                    } else {
                         // Fallback seguro
                         block += `${indent}-- ${node.data.label}\n`;
                    }
                    // IMPORTANTE: Seguir la cadena (Recursión lineal)
                    // Como native-control no es un contenedor, sus hijos son "siguientes pasos"
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
                    block += `${indent}print('${node.data.message}')\n`;
                    block += generateBlock(node.id, indent);
                    break;
            }
        }
        return block;
    };

    // Generar código para cada raíz
    startNodes.forEach(node => {
        if (node.type === 'event-start') {
            code += `RegisterCommand('${node.data.eventName}', function(source, args)\n`;
            code += generateBlock(node.id, '    ');
            code += `end, false)\n\n`;
        }
        else if (node.type === 'register-net') {
            // Manejar nombres variables
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
    
    // Actualizar persistencia solo si no estamos sincronizando desde el parser
    setFiles(prev => prev.map(f => f.id === activeFile.id ? { ...f, content: code } : f));
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
    
    // --- 1. SEPARACIÓN INTELIGENTE DE ENCABEZADO ---
    // Detectamos dónde empieza la "Acción" (Comandos, Eventos, Hilos)
    // Todo lo anterior (Clases, Funciones Helper, Variables) se guarda como Header.
    const actionKeywords = [
        'RegisterCommand', 'RegisterNetEvent', 'RegisterKeyMapping', 
        'QBCore.Commands.Add', 'CreateThread', 'AddEventHandler'
    ];
    
    const lines = code.split('\n');
    let firstActionIndex = -1;

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (actionKeywords.some(kw => trimmed.startsWith(kw))) {
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
        headerCode = code; // Todo es header si no hay eventos
    }

    // --- 2. MAQUINA DE ESTADOS PARA PARSEO ---
    let parentStack: { id: string; x: number; y: number }[] = [];
    let currentY = 100;
    let rootX = 100;

    // Helper para crear nodos
    const addNode = (type: string, label: string, data: any, x: number, y: number) => {
        const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        newNodes.push({ id, type, data: { label, ...data }, position: { x, y } });
        return id;
    };

    // Helper para conectar
    const linkNodes = (source: string, target: string, handle = 'flow-out') => {
        newEdges.push({
            id: `e-${source}-${target}`,
            source, target, 
            sourceHandle: handle, targetHandle: 'flow-in'
        });
    };

    // Analizamos el cuerpo línea por línea
    for (let i = 0; i < bodyCodeLines.length; i++) {
        const line = bodyCodeLines[i].trim();
        if (!line || line.startsWith('--')) continue; // Ignorar vacíos y comentarios simples

        // --- DETECTAR BLOQUES PRINCIPALES (Roots) ---
        
        // COMANDOS
        const cmdMatch = line.match(/(?:RegisterCommand|QBCore\.Commands\.Add)\s*\(\s*['"]([^'"]+)['"]/);
        if (cmdMatch) {
            const cmdId = addNode('event-start', `Comando: ${cmdMatch[1]}`, { eventName: cmdMatch[1] }, rootX, currentY);
            parentStack = [{ id: cmdId, x: rootX, y: currentY }]; // Inicia nuevo stack
            currentY += 150; // Espacio vertical para el siguiente bloque root
            continue;
        }

        // EVENTOS DE RED
        const netMatch = line.match(/RegisterNetEvent\s*\(\s*(.+?)\s*,/);
        if (netMatch) {
            // Limpiar nombre (quitar concatenaciones complejas visualmente)
            const cleanName = netMatch[1].replace(/app\.resourceName\s*\.\.\s*/, '').replace(/['":]/g, '');
            const evtId = addNode('register-net', `Net: ${cleanName}`, { eventName: netMatch[1] }, rootX, currentY);
            parentStack = [{ id: evtId, x: rootX, y: currentY }];
            currentY += 150;
            continue;
        }

        // KEY MAPPINGS (Son nodos sueltos, sin hijos usualmente)
        const keyMatch = line.match(/RegisterKeyMapping\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/);
        if (keyMatch) {
            addNode('register-key-mapping', `Tecla: ${keyMatch[4]}`, { 
                commandName: keyMatch[1], description: keyMatch[2], defaultKey: keyMatch[4] 
            }, rootX, currentY);
            currentY += 100;
            continue;
        }

        // --- DETECTAR LÓGICA INTERNA (Hijos) ---
        if (parentStack.length > 0) {
            const parent = parentStack[parentStack.length - 1];
            // Calculamos posición relativa al padre (escalonada a la derecha)
            const childX = parent.x + 350; 
            const childY = parent.y; // Misma altura base, el layout automático podría mejorar esto

            let nodeId: string | null = null;

            // 1. CONDICIONALES (IF)
            if (line.startsWith('if ')) {
                const condition = line.replace('if ', '').replace(' then', '');
                nodeId = addNode('logic-if', 'Condición IF', { condition }, childX, childY);
                linkNodes(parent.id, nodeId);
                
                // El IF se convierte en el nuevo padre temporal para lo que haya dentro
                parentStack.push({ id: nodeId, x: childX, y: childY });
                continue;
            }
            // FIN DE BLOQUE (end)
            else if (line === 'end' || line.startsWith('end)')) {
                if (parentStack.length > 1) {
                    parentStack.pop(); // Salimos del bloque actual (ej. salimos del IF)
                }
                continue;
            }
            // ELSE
            else if (line.startsWith('else')) {
                // En una implementación visual simple, 'else' es difícil de representar linealmente sin un grafo complejo.
                // Por ahora, lo tratamos como parte del flujo del IF padre actual.
                continue;
            }

            // 2. LLAMADAS A TU CLASE (OOP)
            // Detecta: app:Metodo() o self:Metodo()
            else if (line.match(/\b(app|self):([a-zA-Z0-9_]+)\s*\(/)) {
                const callMatch = line.match(/\b(app|self):([a-zA-Z0-9_]+)/);
                const funcName = callMatch ? callMatch[2] : 'Método';
                const objectName = callMatch ? callMatch[1] : 'app';
                
                nodeId = addNode('native-control', `Call: ${objectName}:${funcName}`, { 
                    label: `${objectName}:${funcName}`,
                    codeBlock: line // Guardamos la línea exacta para no perder argumentos
                }, childX, childY);
            }

            // 3. CALLBACKS DE QBCORE
            else if (line.includes('TriggerCallback')) {
                const cbMatch = line.match(/['"]([^'"]+)['"]/);
                const cbName = cbMatch ? cbMatch[1] : 'Callback';
                nodeId = addNode('qb-trigger-callback', `Callback: ${cbName}`, { eventName: cbName }, childX, childY);
            }

            // 4. NOTIFICACIONES
            else if (line.includes('Notify')) {
                const msgMatch = line.match(/['"]([^'"]+)['"]/);
                nodeId = addNode('qb-notify', 'Notificación', { 
                    message: msgMatch ? msgMatch[1] : 'Alerta',
                    notifyType: line.includes('error') ? 'error' : 'success'
                }, childX, childY);
            }

            // 5. PRINTS (DEBUG)
            else if (line.startsWith('print')) {
                const pMatch = line.match(/\(([^)]+)\)/);
                nodeId = addNode('logic-print', 'Debug Print', { 
                    message: pMatch ? pMatch[1].replace(/['"]/g, '') : 'log'
                }, childX, childY);
            }

            // 6. CÓDIGO GENÉRICO (Cualquier otra cosa)
            else {
                // Si no reconocemos la línea, creamos un nodo genérico de código para NO PERDERLA.
                nodeId = addNode('native-control', 'Lua Code', { 
                    label: 'Script',
                    codeBlock: line 
                }, childX, childY);
            }

            // Conectar el nuevo nodo y actualizar la posición del padre para el siguiente hijo
            if (nodeId) {
                // Si el padre es un IF, decidimos si conectamos a True o False (por defecto True)
                const handle = parentStack[parentStack.length - 1].id.includes('logic-if') ? 'true' : 'flow-out';
                linkNodes(parent.id, nodeId, handle);
                
                // Actualizamos el puntero del stack para encadenar (flujo lineal)
                // OJO: Si estamos DENTRO de un IF, no reemplazamos el padre, sino que seguimos añadiendo al IF.
                // Pero para visualización lineal (tipo Unreal Blueprints), solemos encadenar nodos.
                // Aquí usamos una lógica híbrida: encadenamos visualmente.
                
                // Reemplazamos el último elemento del stack con este nuevo nodo, 
                // A MENOS que sea un contenedor (como IF) que ya manejamos arriba.
                parentStack[parentStack.length - 1] = { id: nodeId, x: childX, y: childY };
            }
        }
    }

    // Guardar todo
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

    if (newNodes.length > 0) {
        toast({ title: "Código Profesional Cargado", description: "Estructura lógica completa detectada." });
        setViewMode('visual');
    } else {
        toast({ title: "Lienzo Limpio", description: "No se detectaron eventos principales." });
    }
    
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