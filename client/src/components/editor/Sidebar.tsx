import { DragEvent, useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { 
  Box, 
  Zap, 
  Database, 
  Activity, 
  Terminal, 
  LayoutTemplate,
  Search,
  MapPin,
  Car,
  User,
  Settings,
  MousePointer2,
  List,
  PlayCircle,
  Eye,
  Type,
  Globe,
  Lock,
  RefreshCw,
  Layers,
  Code
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const categories = [
  {
    id: 'events',
    label: 'Eventos y Hilos',
    items: [
      { type: 'event-start', label: 'Register Command', icon: Terminal, color: 'text-emerald-400' },
      { type: 'event-trigger', label: 'Trigger Event', icon: Zap, color: 'text-emerald-400' },
      { type: 'event-net', label: 'Trigger Client Event', icon: Activity, color: 'text-emerald-400' },
      { type: 'event-server', label: 'Trigger Server Event', icon: Activity, color: 'text-emerald-400' },
      { type: 'register-net', label: 'Register Net Event', icon: Globe, color: 'text-emerald-400' },
      { type: 'add-event-handler', label: 'Add Event Handler', icon: Zap, color: 'text-emerald-400' },
      { type: 'thread-create', label: 'Create Thread', icon: PlayCircle, color: 'text-emerald-400' },
      { type: 'thread-terminate', label: 'Terminate Thread', icon: Power, color: 'text-red-400' },
      { type: 'wait', label: 'Wait', icon: Activity, color: 'text-emerald-400' },
      { type: 'nui-callback', label: 'Register NUI Callback', icon: LayoutTemplate, color: 'text-pink-400' },
      { type: 'send-nui', label: 'Send NUI Message', icon: LayoutTemplate, color: 'text-pink-400' },
      { type: 'set-nui-focus', label: 'Set NUI Focus', icon: Eye, color: 'text-pink-400' },
    ]
  },
  {
    id: 'entities',
    label: 'Entidades y Mundo',
    items: [
      { type: 'create-ped', label: 'Create Ped', icon: User, color: 'text-amber-400' },
      { type: 'create-object', label: 'Create Object', icon: Box, color: 'text-amber-400' },
      { type: 'delete-entity', label: 'Delete Entity', icon: Trash2, color: 'text-red-400' },
      { type: 'does-entity-exist', label: 'Does Entity Exist', icon: Activity, color: 'text-amber-400' },
      { type: 'get-entity-coords', label: 'Get Entity Coords', icon: MapPin, color: 'text-amber-400' },
      { type: 'set-entity-coords', label: 'Set Entity Coords', icon: MapPin, color: 'text-amber-400' },
      { type: 'get-entity-heading', label: 'Get Entity Heading', icon: MapPin, color: 'text-amber-400' },
      { type: 'set-entity-heading', label: 'Set Entity Heading', icon: MapPin, color: 'text-amber-400' },
      { type: 'freeze-entity', label: 'Freeze Entity Position', icon: Lock, color: 'text-amber-400' },
      { type: 'set-entity-alpha', label: 'Set Entity Alpha', icon: Eye, color: 'text-amber-400' },
      { type: 'set-entity-collision', label: 'Set Entity Collision', icon: Layers, color: 'text-amber-400' },
      { type: 'set-entity-invincible', label: 'Set Entity Invincible', icon: Shield, color: 'text-amber-400' },
      { type: 'set-mission-entity', label: 'Set As Mission Entity', icon: Star, color: 'text-amber-400' },
      { type: 'place-object-ground', label: 'Place Object On Ground', icon: ArrowDown, color: 'text-amber-400' },
      { type: 'player-ped-id', label: 'PlayerPedId', icon: User, color: 'text-amber-400' },
      { type: 'request-model', label: 'Request Model', icon: Box, color: 'text-amber-400' },
      { type: 'has-model-loaded', label: 'Has Model Loaded', icon: Activity, color: 'text-amber-400' },
      { type: 'set-model-no-needed', label: 'Set Model No Longer Needed', icon: Trash2, color: 'text-amber-400' },
      { type: 'is-model-valid', label: 'Is Model Valid', icon: Check, color: 'text-amber-400' },
      { type: 'get-hash-key', label: 'Get Hash Key', icon: Key, color: 'text-amber-400' },
    ]
  },
  {
    id: 'blips',
    label: 'Blips y Markers',
    items: [
      { type: 'add-blip-coord', label: 'Add Blip For Coord', icon: MapPin, color: 'text-yellow-400' },
      { type: 'remove-blip', label: 'Remove Blip', icon: Trash2, color: 'text-red-400' },
      { type: 'does-blip-exist', label: 'Does Blip Exist', icon: Activity, color: 'text-yellow-400' },
      { type: 'set-blip-sprite', label: 'Set Blip Sprite', icon: Image, color: 'text-yellow-400' },
      { type: 'set-blip-color', label: 'Set Blip Colour', icon: Palette, color: 'text-yellow-400' },
      { type: 'set-blip-scale', label: 'Set Blip Scale', icon: Maximize, color: 'text-yellow-400' },
      { type: 'set-blip-display', label: 'Set Blip Display', icon: Eye, color: 'text-yellow-400' },
      { type: 'set-blip-short-range', label: 'Set Blip Short Range', icon: MinusCircle, color: 'text-yellow-400' },
      { type: 'begin-text-blip', label: 'Begin Text Blip Name', icon: Type, color: 'text-yellow-400' },
      { type: 'add-text-component', label: 'Add Text Component', icon: Type, color: 'text-yellow-400' },
      { type: 'end-text-blip', label: 'End Text Blip Name', icon: Type, color: 'text-yellow-400' },
      { type: 'draw-marker', label: 'Draw Marker', icon: MapPin, color: 'text-yellow-400' },
    ]
  },
  {
    id: 'controls',
    label: 'Controles y Input',
    items: [
      { type: 'register-key-mapping', label: 'Register Key Mapping', icon: Keyboard, color: 'text-blue-400' }, // <--- AÑADIR ESTA LÍNEA
      { type: 'is-control-pressed', label: 'Is Control Pressed', icon: MousePointer2, color: 'text-blue-400' },
      { type: 'is-control-just-pressed', label: 'Is Control Just Pressed', icon: MousePointer2, color: 'text-blue-400' },
      { type: 'disable-control-action', label: 'Disable Control Action', icon: Ban, color: 'text-red-400' },
    ]
  },
  {
    id: 'camera',
    label: 'Cámara y Raycast',
    items: [
      { type: 'get-gameplay-cam-coord', label: 'Get Gameplay Cam Coord', icon: Video, color: 'text-cyan-400' },
      { type: 'get-gameplay-cam-rot', label: 'Get Gameplay Cam Rot', icon: RefreshCw, color: 'text-cyan-400' },
      { type: 'start-shape-test-ray', label: 'Start Shape Test Ray', icon: Crosshair, color: 'text-cyan-400' },
      { type: 'get-shape-test-result', label: 'Get Shape Test Result', icon: Activity, color: 'text-cyan-400' },
      { type: 'get-offset-coords', label: 'Get Offset Coords', icon: MapPin, color: 'text-cyan-400' },
    ]
  },
  {
    id: 'qbcore',
    label: 'QBCore Framework',
    items: [
      { type: 'qb-core-object', label: 'GetCoreObject', icon: Box, color: 'text-sky-400' },
      { type: 'qb-notify', label: 'QBCore Notify', icon: LayoutTemplate, color: 'text-sky-400' },
      { type: 'qb-command', label: 'QBCore Command Add', icon: Terminal, color: 'text-sky-400' },
      { type: 'qb-create-callback', label: 'Create Callback', icon: RefreshCw, color: 'text-sky-400' },
      { type: 'qb-trigger-callback', label: 'Trigger Callback', icon: RefreshCw, color: 'text-sky-400' },
    ]
  },
  {
    id: 'logic',
    label: 'Lógica, Matemáticas y Utilidades',
    items: [
      { type: 'logic-if', label: 'If Condition', icon: Activity, color: 'text-violet-400' },
      { type: 'logic-loop', label: 'While Loop', icon: RefreshCw, color: 'text-violet-400' },
      { type: 'logic-print', label: 'Print / Debug', icon: Terminal, color: 'text-gray-400' },
      { type: 'exports', label: 'Exports', icon: Box, color: 'text-gray-400' },
      { type: 'math-abs', label: 'Math Abs', icon: Calculator, color: 'text-violet-400' },
      { type: 'math-cos', label: 'Math Cos', icon: Calculator, color: 'text-violet-400' },
      { type: 'math-sin', label: 'Math Sin', icon: Calculator, color: 'text-violet-400' },
      { type: 'math-pi', label: 'Math Pi', icon: Calculator, color: 'text-violet-400' },
      { type: 'vector3', label: 'Vector3', icon: Move, color: 'text-violet-400' },
      { type: 'json-decode', label: 'JSON Decode', icon: Code, color: 'text-orange-400' },
      { type: 'json-encode', label: 'JSON Encode', icon: Code, color: 'text-orange-400' },
      { type: 'table-insert', label: 'Table Insert', icon: List, color: 'text-orange-400' },
      { type: 'table-sort', label: 'Table Sort', icon: List, color: 'text-orange-400' },
      { type: 'pairs', label: 'Pairs Loop', icon: RefreshCw, color: 'text-orange-400' },
      { type: 'tonumber', label: 'To Number', icon: Hash, color: 'text-gray-400' },
      { type: 'tostring', label: 'To String', icon: Type, color: 'text-gray-400' },
      { type: 'type', label: 'Check Type', icon: Activity, color: 'text-gray-400' },
      { type: 'is-ace-allowed', label: 'Is Player Ace Allowed', icon: Shield, color: 'text-red-400' },
    ]
  },
  {
    id: 'mysql',
    label: 'Base de Datos (OxMySQL)',
    items: [
      { type: 'sql-query', label: 'MySQL Query', icon: Database, color: 'text-yellow-400' },
      { type: 'sql-query-await', label: 'MySQL Query Await', icon: Database, color: 'text-yellow-400' },
      { type: 'sql-insert', label: 'MySQL Insert', icon: Database, color: 'text-yellow-400' },
      { type: 'sql-update', label: 'MySQL Update', icon: Database, color: 'text-yellow-400' },
      { type: 'sql-scalar-await', label: 'MySQL Scalar Await', icon: Database, color: 'text-yellow-400' },
    ]
  }
];

import { 
  Trash2, Power, Star, Shield, ArrowDown, Check, Key, Keyboard, Image, Palette, Maximize, MinusCircle, Ban, Video, Crosshair, Calculator, Move, Hash
} from 'lucide-react';

export function Sidebar() {
  const [search, setSearch] = useState('');

  const onDragStart = (event: DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow/type', nodeType);
    event.dataTransfer.setData('application/reactflow/label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  const filteredCategories = categories.map(cat => ({
    ...cat,
    items: cat.items.filter(item => 
      item.label.toLowerCase().includes(search.toLowerCase()) || 
      item.type.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(cat => cat.items.length > 0);

  return (
    <aside className="w-full bg-[#151515] border-r border-[#2a2a2a] flex flex-col h-full">
      <div className="p-3 border-b border-[#2a2a2a]">
        <h2 className="font-bold text-sm text-gray-200 mb-2 uppercase tracking-wide">Caja de Herramientas</h2>
        <div className="relative">
          <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-gray-500" />
          <Input 
            placeholder="Buscar función..." 
            className="h-8 pl-8 bg-[#252526] border-[#3e3e42] text-xs focus-visible:ring-1 focus-visible:ring-[#007fd4]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {filteredCategories.map((category) => (
            <div key={category.id}>
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-2 flex items-center gap-2">
                <span className="shrink-0">{category.label}</span>
                <span className="w-full h-px bg-[#2a2a2a]"></span>
              </h3>
              <div className="space-y-1">
                {category.items.map((item) => (
                  <div
                    key={item.type}
                    onDragStart={(event) => onDragStart(event, item.type, item.label)}
                    draggable
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-sm border border-transparent cursor-grab transition-all group",
                      "hover:bg-[#2a2a2a] hover:border-[#3e3e42]",
                      "active:cursor-grabbing"
                    )}
                  >
                    <div className={cn("p-1 rounded bg-[#1e1e1e]", item.color)}>
                       <item.icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-medium text-gray-300 group-hover:text-white">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}