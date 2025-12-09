import React, { useState } from 'react';
import { 
  Play, Zap, Box, User, MapPin, Cloud, Bell, Terminal, Code, 
  Activity, RefreshCw, Calculator, List, Move, Car, 
  ShoppingBag, Menu, Wifi, Database, Clock, MessageSquare,
  Shield, DollarSign, Home, Briefcase, Wrench, Package,
  Target, Eye, Volume2, MousePointer, Gamepad2, Radio,
  FileText, Image, Video, Hash, Type, ToggleLeft,
  Clipboard, Search, Filter, Shuffle, ArrowUpDown
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

interface SidebarItem {
  type: string;
  label: string;
  icon: any;
  color: string;
}

interface SidebarCategory {
  id: string;
  label: string;
  items: SidebarItem[];
}

const categories: SidebarCategory[] = [
  {
    id: 'events',
    label: 'Eventos y Comandos',
    items: [
      { type: 'event-start', label: 'Comando (RegisterCommand)', icon: Terminal, color: 'text-blue-400' },
      { type: 'register-net', label: 'Evento de Red', icon: Wifi, color: 'text-blue-400' },
      { type: 'register-key-mapping', label: 'Mapeo de Tecla', icon: Gamepad2, color: 'text-blue-400' },
      { type: 'qb-command', label: 'QBCore Command', icon: Terminal, color: 'text-sky-400' },
      { type: 'event-trigger', label: 'Trigger Event', icon: Zap, color: 'text-yellow-400' },
      { type: 'thread-create', label: 'Create Thread', icon: RefreshCw, color: 'text-purple-400' },
      { type: 'function-def', label: 'Definir Función', icon: Code, color: 'text-green-400' },
      { type: 'add-event-handler', label: 'Add Event Handler', icon: Radio, color: 'text-blue-400' },
    ]
  },
  {
    id: 'flow-control',
    label: 'Control de Flujo',
    items: [
      { type: 'logic-if', label: 'If Condition', icon: Activity, color: 'text-violet-400' },
      { type: 'logic-else', label: 'Else', icon: Activity, color: 'text-violet-400' },
      { type: 'logic-loop', label: 'While Loop', icon: RefreshCw, color: 'text-violet-400' },
      { type: 'logic-for', label: 'For Loop', icon: RefreshCw, color: 'text-violet-400' },
      { type: 'logic-for-pairs', label: 'For Pairs', icon: List, color: 'text-violet-400' },
      { type: 'logic-break', label: 'Break', icon: Target, color: 'text-red-400' },
      { type: 'logic-return', label: 'Return', icon: ArrowUpDown, color: 'text-orange-400' },
      { type: 'wait', label: 'Wait / Delay', icon: Clock, color: 'text-yellow-400' },
    ]
  },
  {
    id: 'player',
    label: 'Jugador & Entidades',
    items: [
      { type: 'get-player-ped', label: 'Get Player Ped', icon: User, color: 'text-cyan-400' },
      { type: 'get-player-coords', label: 'Get Player Coords', icon: MapPin, color: 'text-cyan-400' },
      { type: 'set-entity-coords', label: 'Set Entity Coords', icon: MapPin, color: 'text-cyan-400' },
      { type: 'get-entity-coords', label: 'Get Entity Coords', icon: MapPin, color: 'text-cyan-400' },
      { type: 'get-entity-heading', label: 'Get Entity Heading', icon: Target, color: 'text-cyan-400' },
      { type: 'set-entity-heading', label: 'Set Entity Heading', icon: Target, color: 'text-cyan-400' },
      { type: 'freeze-entity', label: 'Freeze Entity', icon: Box, color: 'text-cyan-400' },
      { type: 'set-entity-invincible', label: 'Set Invincible', icon: Shield, color: 'text-cyan-400' },
      { type: 'set-entity-health', label: 'Set Entity Health', icon: Activity, color: 'text-red-400' },
      { type: 'get-entity-health', label: 'Get Entity Health', icon: Activity, color: 'text-red-400' },
      { type: 'delete-entity', label: 'Delete Entity', icon: Box, color: 'text-red-400' },
      { type: 'does-entity-exist', label: 'Does Entity Exist', icon: Search, color: 'text-cyan-400' },
      { type: 'is-entity-dead', label: 'Is Entity Dead', icon: Activity, color: 'text-red-400' },
    ]
  },
  {
    id: 'vehicles',
    label: 'Vehículos',
    items: [
      { type: 'create-vehicle', label: 'Create Vehicle', icon: Car, color: 'text-blue-400' },
      { type: 'get-vehicle-ped-is-in', label: 'Get Vehicle Ped Is In', icon: Car, color: 'text-blue-400' },
      { type: 'set-vehicle-engine-on', label: 'Set Engine On', icon: Zap, color: 'text-orange-400' },
      { type: 'set-vehicle-doors-locked', label: 'Set Doors Locked', icon: Shield, color: 'text-yellow-400' },
      { type: 'get-vehicle-number-plate', label: 'Get Plate Text', icon: Hash, color: 'text-blue-400' },
      { type: 'set-vehicle-number-plate', label: 'Set Plate Text', icon: Hash, color: 'text-blue-400' },
      { type: 'set-vehicle-fuel-level', label: 'Set Fuel Level', icon: Zap, color: 'text-orange-400' },
      { type: 'get-vehicle-fuel-level', label: 'Get Fuel Level', icon: Zap, color: 'text-orange-400' },
      { type: 'set-vehicle-custom-primary', label: 'Set Primary Color', icon: Package, color: 'text-purple-400' },
      { type: 'set-vehicle-custom-secondary', label: 'Set Secondary Color', icon: Package, color: 'text-purple-400' },
      { type: 'is-vehicle-seat-free', label: 'Is Seat Free', icon: Car, color: 'text-blue-400' },
      { type: 'task-warp-ped-into-vehicle', label: 'Warp Into Vehicle', icon: User, color: 'text-cyan-400' },
    ]
  },
  {
    id: 'peds',
    label: 'Peds & NPCs',
    items: [
      { type: 'create-ped', label: 'Create Ped', icon: User, color: 'text-green-400' },
      { type: 'task-goto-entity', label: 'Task Go To Entity', icon: Move, color: 'text-green-400' },
      { type: 'task-wander-standard', label: 'Task Wander', icon: Shuffle, color: 'text-green-400' },
      { type: 'set-ped-as-mission-ped', label: 'Set As Mission Ped', icon: Target, color: 'text-green-400' },
      { type: 'set-blocking-of-non-temp', label: 'Set Blocking Non Temp', icon: Shield, color: 'text-green-400' },
      { type: 'set-ped-combat-attributes', label: 'Set Combat Attributes', icon: Target, color: 'text-red-400' },
      { type: 'give-weapon-to-ped', label: 'Give Weapon', icon: Target, color: 'text-red-400' },
      { type: 'set-ped-relationship', label: 'Set Relationship', icon: User, color: 'text-green-400' },
    ]
  },
  {
    id: 'blips-markers',
    label: 'Blips & Markers',
    items: [
      { type: 'add-blip-coord', label: 'Add Blip For Coord', icon: MapPin, color: 'text-pink-400' },
      { type: 'add-blip-entity', label: 'Add Blip For Entity', icon: MapPin, color: 'text-pink-400' },
      { type: 'set-blip-sprite', label: 'Set Blip Sprite', icon: Image, color: 'text-pink-400' },
      { type: 'set-blip-colour', label: 'Set Blip Colour', icon: Package, color: 'text-pink-400' },
      { type: 'set-blip-scale', label: 'Set Blip Scale', icon: Target, color: 'text-pink-400' },
      { type: 'begin-text-command', label: 'Begin Text Command', icon: Type, color: 'text-pink-400' },
      { type: 'set-blip-route', label: 'Set Blip Route', icon: MapPin, color: 'text-pink-400' },
      { type: 'draw-marker', label: 'Draw Marker', icon: Target, color: 'text-orange-400' },
      { type: 'draw-text-3d', label: 'Draw 3D Text', icon: Type, color: 'text-orange-400' },
    ]
  },
  {
    id: 'qbcore',
    label: 'QBCore Framework',
    items: [
      { type: 'qb-core-object', label: 'GetCoreObject', icon: Box, color: 'text-sky-400' },
      { type: 'qb-notify', label: 'QBCore Notify', icon: Bell, color: 'text-sky-400' },
      { type: 'qb-get-player-data', label: 'Get Player Data', icon: User, color: 'text-sky-400' },
      { type: 'qb-add-money', label: 'Add Money', icon: DollarSign, color: 'text-green-400' },
      { type: 'qb-remove-money', label: 'Remove Money', icon: DollarSign, color: 'text-red-400' },
      { type: 'qb-get-money', label: 'Get Money', icon: DollarSign, color: 'text-sky-400' },
      { type: 'qb-add-item', label: 'Add Item', icon: ShoppingBag, color: 'text-green-400' },
      { type: 'qb-remove-item', label: 'Remove Item', icon: ShoppingBag, color: 'text-red-400' },
      { type: 'qb-has-item', label: 'Has Item', icon: Search, color: 'text-sky-400' },
      { type: 'qb-get-item-by-slot', label: 'Get Item By Slot', icon: ShoppingBag, color: 'text-sky-400' },
      { type: 'qb-create-callback', label: 'Create Callback', icon: RefreshCw, color: 'text-sky-400' },
      { type: 'qb-trigger-callback', label: 'Trigger Callback', icon: RefreshCw, color: 'text-sky-400' },
      { type: 'qb-create-use', label: 'Create Useable Item', icon: Wrench, color: 'text-sky-400' },
      { type: 'qb-set-job', label: 'Set Job', icon: Briefcase, color: 'text-sky-400' },
      { type: 'qb-get-job', label: 'Get Job', icon: Briefcase, color: 'text-sky-400' },
    ]
  },
  {
    id: 'esx',
    label: 'ESX Framework',
    items: [
      { type: 'esx-get-shared-object', label: 'Get Shared Object', icon: Box, color: 'text-emerald-400' },
      { type: 'esx-notify', label: 'ESX Notify', icon: Bell, color: 'text-emerald-400' },
      { type: 'esx-get-player-data', label: 'Get Player Data', icon: User, color: 'text-emerald-400' },
      { type: 'esx-add-account-money', label: 'Add Account Money', icon: DollarSign, color: 'text-green-400' },
      { type: 'esx-remove-account-money', label: 'Remove Account Money', icon: DollarSign, color: 'text-red-400' },
      { type: 'esx-get-account', label: 'Get Account', icon: DollarSign, color: 'text-emerald-400' },
      { type: 'esx-add-inventory-item', label: 'Add Inventory Item', icon: ShoppingBag, color: 'text-green-400' },
      { type: 'esx-remove-inventory-item', label: 'Remove Inventory Item', icon: ShoppingBag, color: 'text-red-400' },
      { type: 'esx-get-inventory-item', label: 'Get Inventory Item', icon: ShoppingBag, color: 'text-emerald-400' },
      { type: 'esx-set-job', label: 'Set Job', icon: Briefcase, color: 'text-emerald-400' },
      { type: 'esx-get-job', label: 'Get Job', icon: Briefcase, color: 'text-emerald-400' },
    ]
  },
  {
    id: 'ui-menus',
    label: 'UI & Menús',
    items: [
      { type: 'send-nui-message', label: 'Send NUI Message', icon: MessageSquare, color: 'text-indigo-400' },
      { type: 'register-nui-callback', label: 'Register NUI Callback', icon: Radio, color: 'text-indigo-400' },
      { type: 'set-nui-focus', label: 'Set NUI Focus', icon: MousePointer, color: 'text-indigo-400' },
      { type: 'display-radar', label: 'Display Radar', icon: MapPin, color: 'text-indigo-400' },
      { type: 'display-hud', label: 'Display HUD', icon: Eye, color: 'text-indigo-400' },
      { type: 'begin-text-draw', label: 'Begin Text Draw', icon: Type, color: 'text-indigo-400' },
      { type: 'set-text-scale', label: 'Set Text Scale', icon: Target, color: 'text-indigo-400' },
      { type: 'set-text-colour', label: 'Set Text Colour', icon: Package, color: 'text-indigo-400' },
      { type: 'draw-rect', label: 'Draw Rect', icon: Box, color: 'text-indigo-400' },
    ]
  },
  {
    id: 'input',
    label: 'Input & Controles',
    items: [
      { type: 'is-control-pressed', label: 'Is Control Pressed', icon: Gamepad2, color: 'text-yellow-400' },
      { type: 'is-control-just-pressed', label: 'Is Control Just Pressed', icon: Gamepad2, color: 'text-yellow-400' },
      { type: 'is-control-just-released', label: 'Is Control Just Released', icon: Gamepad2, color: 'text-yellow-400' },
      { type: 'disable-control-action', label: 'Disable Control', icon: ToggleLeft, color: 'text-red-400' },
      { type: 'enable-control-action', label: 'Enable Control', icon: ToggleLeft, color: 'text-green-400' },
      { type: 'get-disabled-controls', label: 'Get Disabled Controls', icon: List, color: 'text-yellow-400' },
    ]
  },
  {
    id: 'world',
    label: 'Mundo & Ambiente',
    items: [
      { type: 'set-weather', label: 'Set Weather Type', icon: Cloud, color: 'text-cyan-400' },
      { type: 'set-time', label: 'Set Clock Time', icon: Clock, color: 'text-cyan-400' },
      { type: 'create-object', label: 'Create Object', icon: Box, color: 'text-green-400' },
      { type: 'place-object', label: 'Place Object On Ground', icon: Box, color: 'text-green-400' },
      { type: 'get-closest-object', label: 'Get Closest Object', icon: Target, color: 'text-cyan-400' },
      { type: 'raycast', label: 'Start Shape Test Ray', icon: Target, color: 'text-cyan-400' },
      { type: 'get-shape-test-result', label: 'Get Shape Test Result', icon: Activity, color: 'text-cyan-400' },
      { type: 'get-offset-coords', label: 'Get Offset From Coords', icon: MapPin, color: 'text-cyan-400' },
      { type: 'get-ground-z', label: 'Get Ground Z For Coord', icon: MapPin, color: 'text-cyan-400' },
    ]
  },
  {
    id: 'audio',
    label: 'Audio & Sonido',
    items: [
      { type: 'play-sound-frontend', label: 'Play Sound Frontend', icon: Volume2, color: 'text-purple-400' },
      { type: 'play-sound-from-entity', label: 'Play Sound From Entity', icon: Volume2, color: 'text-purple-400' },
      { type: 'play-sound-from-coord', label: 'Play Sound From Coord', icon: Volume2, color: 'text-purple-400' },
      { type: 'stop-sound', label: 'Stop Sound', icon: Volume2, color: 'text-red-400' },
    ]
  },
  {
    id: 'network',
    label: 'Red & Sincronización',
    items: [
      { type: 'network-request-control', label: 'Request Control', icon: Wifi, color: 'text-blue-400' },
      { type: 'network-has-control', label: 'Has Control Of Entity', icon: Shield, color: 'text-blue-400' },
      { type: 'set-network-id-exists', label: 'Network Id Exists', icon: Hash, color: 'text-blue-400' },
      { type: 'get-player-server-id', label: 'Get Player Server Id', icon: User, color: 'text-blue-400' },
      { type: 'get-player-from-server-id', label: 'Get Player From Id', icon: User, color: 'text-blue-400' },
    ]
  },
  {
    id: 'database',
    label: 'Base de Datos',
    items: [
      { type: 'sql-execute', label: 'MySQL Execute', icon: Database, color: 'text-orange-400' },
      { type: 'sql-fetch', label: 'MySQL Fetch', icon: Database, color: 'text-orange-400' },
      { type: 'sql-insert', label: 'MySQL Insert', icon: Database, color: 'text-green-400' },
      { type: 'sql-update', label: 'MySQL Update', icon: Database, color: 'text-blue-400' },
      { type: 'sql-scalar', label: 'MySQL Scalar', icon: Database, color: 'text-orange-400' },
    ]
  },
  {
    id: 'logic-math',
    label: 'Lógica, Matemáticas y Operadores',
    items: [
      { type: 'variable', label: 'Variable Local', icon: Box, color: 'text-gray-400' },
      { type: 'logic-print', label: 'Print / Debug', icon: Terminal, color: 'text-gray-400' },
      { type: 'logic-compare', label: 'Comparación ==, ~=', icon: Activity, color: 'text-violet-400' },
      { type: 'logic-and', label: 'AND Lógico', icon: Activity, color: 'text-violet-400' },
      { type: 'logic-or', label: 'OR Lógico', icon: Activity, color: 'text-violet-400' },
      { type: 'logic-not', label: 'NOT Lógico', icon: Activity, color: 'text-violet-400' },
      { type: 'math-random', label: 'Math Random', icon: Shuffle, color: 'text-violet-400' },
      { type: 'math-floor', label: 'Math Floor', icon: Calculator, color: 'text-violet-400' },
      { type: 'math-ceil', label: 'Math Ceil', icon: Calculator, color: 'text-violet-400' },
      { type: 'math-abs', label: 'Math Abs', icon: Calculator, color: 'text-violet-400' },
      { type: 'math-sqrt', label: 'Math Sqrt', icon: Calculator, color: 'text-violet-400' },
      { type: 'math-cos', label: 'Math Cos', icon: Calculator, color: 'text-violet-400' },
      { type: 'math-sin', label: 'Math Sin', icon: Calculator, color: 'text-violet-400' },
      { type: 'math-pi', label: 'Math Pi', icon: Calculator, color: 'text-violet-400' },
      { type: 'vector3', label: 'Vector3', icon: Move, color: 'text-violet-400' },
      { type: 'vector4', label: 'Vector4', icon: Move, color: 'text-violet-400' },
    ]
  },
  {
    id: 'tables',
    label: 'Tablas & JSON',
    items: [
      { type: 'table-insert', label: 'Table Insert', icon: List, color: 'text-orange-400' },
      { type: 'table-remove', label: 'Table Remove', icon: List, color: 'text-red-400' },
      { type: 'table-sort', label: 'Table Sort', icon: ArrowUpDown, color: 'text-orange-400' },
      { type: 'table-concat', label: 'Table Concat', icon: List, color: 'text-orange-400' },
      { type: 'json-encode', label: 'JSON Encode', icon: Code, color: 'text-orange-400' },
      { type: 'json-decode', label: 'JSON Decode', icon: Code, color: 'text-orange-400' },
      { type: 'pairs-loop', label: 'Pairs Loop', icon: RefreshCw, color: 'text-violet-400' },
      { type: 'ipairs-loop', label: 'IPairs Loop', icon: RefreshCw, color: 'text-violet-400' },
    ]
  },
  {
    id: 'strings',
    label: 'Strings & Texto',
    items: [
      { type: 'string-format', label: 'String Format', icon: Type, color: 'text-teal-400' },
      { type: 'string-sub', label: 'String Sub', icon: Type, color: 'text-teal-400' },
      { type: 'string-lower', label: 'String Lower', icon: Type, color: 'text-teal-400' },
      { type: 'string-upper', label: 'String Upper', icon: Type, color: 'text-teal-400' },
      { type: 'string-find', label: 'String Find', icon: Search, color: 'text-teal-400' },
      { type: 'string-gsub', label: 'String Gsub', icon: Type, color: 'text-teal-400' },
      { type: 'tostring', label: 'To String', icon: Type, color: 'text-teal-400' },
      { type: 'tonumber', label: 'To Number', icon: Hash, color: 'text-teal-400' },
    ]
  },
  {
    id: 'qb-drawtext',
    label: 'QBCore DrawText',
    items: [
      { type: 'qb-drawtext-show', label: 'DrawText (Mostrar)', icon: Type, color: 'text-sky-400' },
      { type: 'qb-drawtext-change', label: 'ChangeText', icon: Type, color: 'text-sky-400' },
      { type: 'qb-drawtext-hide', label: 'HideText', icon: Eye, color: 'text-sky-400' },
      { type: 'qb-drawtext-key-pressed', label: 'KeyPressed', icon: Gamepad2, color: 'text-sky-400' },
      { type: 'qb-drawtext-3d', label: 'DrawText3D (Flotante)', icon: Package, color: 'text-sky-400' },
    ]
  },
  {
    id: 'fivem-text',
    label: 'FiveM Drawing: Texto 2D',
    items: [
      { type: 'begin-text-command', label: 'BeginTextCommand', icon: Type, color: 'text-amber-400' },
      { type: 'add-text-component', label: 'AddTextComponent', icon: Type, color: 'text-amber-400' },
      { type: 'end-text-command', label: 'EndTextCommand', icon: Type, color: 'text-amber-400' },
      { type: 'set-text-font', label: 'SetTextFont', icon: Type, color: 'text-amber-400' },
      { type: 'set-text-scale', label: 'SetTextScale', icon: Target, color: 'text-amber-400' },
      { type: 'set-text-colour', label: 'SetTextColour', icon: Package, color: 'text-amber-400' },
      { type: 'set-text-centre', label: 'SetTextCentre', icon: Target, color: 'text-amber-400' },
      { type: 'set-text-wrap', label: 'SetTextWrap', icon: Type, color: 'text-amber-400' },
      { type: 'set-text-dropshadow', label: 'SetTextDropshadow', icon: Type, color: 'text-amber-400' },
      { type: 'set-text-outline', label: 'SetTextOutline', icon: Type, color: 'text-amber-400' },
    ]
  },
  {
    id: 'fivem-shapes',
    label: 'FiveM Drawing: Formas',
    items: [
      { type: 'draw-rect', label: 'DrawRect', icon: Box, color: 'text-rose-400' },
      { type: 'draw-line', label: 'DrawLine 3D', icon: Move, color: 'text-rose-400' },
      { type: 'draw-poly', label: 'DrawPoly (Triángulo)', icon: Package, color: 'text-rose-400' },
      { type: 'draw-box', label: 'DrawBox 3D', icon: Box, color: 'text-rose-400' },
      { type: 'draw-sprite', label: 'DrawSprite', icon: Image, color: 'text-rose-400' },
      { type: 'request-texture-dict', label: 'RequestTextureDict', icon: Image, color: 'text-rose-400' },
    ]
  },
  {
    id: 'scaleforms',
    label: 'Scaleforms',
    items: [
      { type: 'request-scaleform', label: 'RequestScaleformMovie', icon: Video, color: 'text-fuchsia-400' },
      { type: 'draw-scaleform-fullscreen', label: 'Draw Fullscreen', icon: Video, color: 'text-fuchsia-400' },
      { type: 'draw-scaleform', label: 'Draw Scaleform', icon: Video, color: 'text-fuchsia-400' },
      { type: 'begin-scaleform-method', label: 'BeginScaleformMethod', icon: Code, color: 'text-fuchsia-400' },
      { type: 'push-scaleform-param', label: 'Push Parameter', icon: Hash, color: 'text-fuchsia-400' },
      { type: 'end-scaleform-method', label: 'EndScaleformMethod', icon: Code, color: 'text-fuchsia-400' },
    ]
  },
  {
    id: 'screen-effects',
    label: 'Efectos de Pantalla',
    items: [
      { type: 'do-screen-fade-in', label: 'Screen Fade In', icon: Eye, color: 'text-indigo-400' },
      { type: 'do-screen-fade-out', label: 'Screen Fade Out', icon: Eye, color: 'text-indigo-400' },
      { type: 'is-screen-faded-in', label: 'Is Screen Faded In', icon: Eye, color: 'text-indigo-400' },
      { type: 'set-draw-origin', label: 'SetDrawOrigin 3D', icon: Target, color: 'text-indigo-400' },
      { type: 'clear-draw-origin', label: 'ClearDrawOrigin', icon: Target, color: 'text-indigo-400' },
      { type: 'get-screen-coord-from-world', label: 'WorldCoord → Screen', icon: MapPin, color: 'text-indigo-400' },
    ]
  },
  {
    id: 'tasks',
    label: 'Tasks & AI',
    items: [
      { type: 'task-go-to-entity', label: 'Task Go To Entity', icon: Move, color: 'text-lime-400' },
      { type: 'task-go-to-coord', label: 'Task Go To Coord', icon: MapPin, color: 'text-lime-400' },
      { type: 'task-wander-standard', label: 'Task Wander', icon: Shuffle, color: 'text-lime-400' },
      { type: 'task-enter-vehicle', label: 'Task Enter Vehicle', icon: Car, color: 'text-lime-400' },
      { type: 'task-leave-vehicle', label: 'Task Leave Vehicle', icon: Car, color: 'text-lime-400' },
      { type: 'task-hands-up', label: 'Task Hands Up', icon: User, color: 'text-lime-400' },
      { type: 'clear-ped-tasks', label: 'Clear Ped Tasks', icon: Activity, color: 'text-red-400' },
    ]
  },
  {
    id: 'esx-game',
    label: 'ESX.Game Utilidades',
    items: [
      { type: 'esx-game-closest-player', label: 'Get Closest Player', icon: User, color: 'text-emerald-400' },
      { type: 'esx-game-closest-vehicle', label: 'Get Closest Vehicle', icon: Car, color: 'text-emerald-400' },
      { type: 'esx-game-players-in-area', label: 'Get Players In Area', icon: User, color: 'text-emerald-400' },
      { type: 'esx-game-teleport', label: 'Teleport', icon: MapPin, color: 'text-emerald-400' },
      { type: 'esx-game-ped-mugshot', label: 'Get Ped Mugshot', icon: Image, color: 'text-emerald-400' },
    ]
  },
  {
    id: 'esx-streaming',
    label: 'ESX.Streaming',
    items: [
      { type: 'esx-request-model', label: 'Request Model', icon: Box, color: 'text-emerald-400' },
      { type: 'esx-request-anim-dict', label: 'Request Anim Dict', icon: Activity, color: 'text-emerald-400' },
      { type: 'esx-request-texture', label: 'Request Texture', icon: Image, color: 'text-emerald-400' },
    ]
  },
  {
    id: 'qb-extended',
    label: 'QBCore Extendidas',
    items: [
      { type: 'qb-spawn-vehicle', label: 'Spawn Vehicle', icon: Car, color: 'text-sky-400' },
      { type: 'qb-delete-vehicle', label: 'Delete Vehicle', icon: Car, color: 'text-red-400' },
      { type: 'qb-get-coords', label: 'GetCoords (Vector4)', icon: MapPin, color: 'text-sky-400' },
      { type: 'qb-closest-player', label: 'Get Closest Player', icon: User, color: 'text-sky-400' },
      { type: 'qb-players-from-coords', label: 'Get Players From Coords', icon: User, color: 'text-sky-400' },
      { type: 'qb-vehicle-properties', label: 'Get Vehicle Properties', icon: Wrench, color: 'text-sky-400' },
      { type: 'qb-set-vehicle-props', label: 'Set Vehicle Properties', icon: Wrench, color: 'text-sky-400' },
      { type: 'qb-progressbar', label: 'Progressbar', icon: Clock, color: 'text-sky-400' },
    ]
  },
  {
    id: 'weapon-advanced',
    label: 'Armas Avanzado',
    items: [
      { type: 'weapon-clip-size', label: 'Get Weapon Clip Size', icon: Target, color: 'text-red-400' },
      { type: 'weapon-ammo', label: 'Get Ammo In Weapon', icon: Target, color: 'text-red-400' },
      { type: 'weapon-set-ammo', label: 'Set Ped Ammo', icon: Target, color: 'text-red-400' },
      { type: 'weapon-infinite-ammo', label: 'Set Infinite Ammo', icon: Target, color: 'text-orange-400' },
      { type: 'weapon-add-component', label: 'Add Weapon Component', icon: Wrench, color: 'text-red-400' },
      { type: 'weapon-damage-modifier', label: 'Set Weapon Damage', icon: Target, color: 'text-red-400' },
    ]
  },
  {
    id: 'collision-raycast',
    label: 'Colisión & Raycast',
    items: [
      { type: 'start-shape-test-ray', label: 'Start Shape Test Ray', icon: Activity, color: 'text-cyan-400' },
      { type: 'get-shape-test-result', label: 'Get Shape Test Result', icon: Activity, color: 'text-cyan-400' },
      { type: 'request-collision', label: 'Request Collision', icon: Box, color: 'text-cyan-400' },
      { type: 'has-collision-loaded', label: 'Has Collision Loaded', icon: Box, color: 'text-cyan-400' },
    ]
  },
  {
    id: 'ipl-interiors',
    label: 'IPL & Interiores',
    items: [
      { type: 'request-ipl', label: 'Request IPL', icon: Home, color: 'text-purple-400' },
      { type: 'remove-ipl', label: 'Remove IPL', icon: Home, color: 'text-purple-400' },
      { type: 'is-ipl-active', label: 'Is IPL Active', icon: Home, color: 'text-purple-400' },
    ]
  },
  {
    id: 'custom',
    label: 'Código Personalizado',
    items: [
      { type: 'custom-code', label: 'Bloque de Código Libre', icon: FileText, color: 'text-slate-400' },
      { type: 'exports', label: 'Exports', icon: Box, color: 'text-slate-400' },
      { type: 'comment', label: 'Comentario', icon: MessageSquare, color: 'text-slate-400' },
    ]
  }
];

export function Sidebar() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['events', 'flow-control'])
  );

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const filteredCategories = categories.map(category => ({
    ...category,
    items: category.items.filter(item =>
      item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] border-r border-[#2a2a2a]">
      <div className="p-3 border-b border-[#2a2a2a]">
        <h2 className="text-sm font-semibold text-gray-200 mb-2">Herramientas</h2>
        <Input
          type="text"
          placeholder="Buscar nodo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8 bg-[#252526] border-[#3e3e42] text-gray-300 text-xs"
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredCategories.map((category) => (
            <div key={category.id} className="mb-2">
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 hover:bg-[#2a2a2a] rounded transition-colors"
              >
                <span>{category.label}</span>
                <span className="text-xs">
                  {expandedCategories.has(category.id) ? '▼' : '▶'}
                </span>
              </button>

              {expandedCategories.has(category.id) && (
                <div className="mt-1 space-y-0.5">
                  {category.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.type}
                        className="flex items-center gap-2 px-2 py-1.5 cursor-move hover:bg-[#2a2a2a] rounded transition-colors group"
                        draggable
                        onDragStart={(e) => onDragStart(e, item.type)}
                      >
                        <Icon className={`w-4 h-4 ${item.color} shrink-0`} />
                        <span className="text-xs text-gray-300 group-hover:text-white truncate">
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}