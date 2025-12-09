import React from 'react';
import { Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PropertiesPanelProps {
  selectedNode: any;
  onChange: (key: string, value: any) => void;
  onDelete: () => void;
}

export function PropertiesPanel({ selectedNode, onChange, onDelete }: PropertiesPanelProps) {
  if (!selectedNode) {
    return (
      <aside className="h-1/2 bg-[#1e1e1e] border-l border-[#2a2a2a] p-6 flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-[#2a2a2a] flex items-center justify-center mb-3">
          <Settings className="w-6 h-6 text-gray-500" />
        </div>
        <h3 className="text-sm font-medium text-gray-300">Propiedades</h3>
        <p className="text-xs text-gray-500 mt-1 max-w-[200px] text-center">
          Selecciona un nodo para configurar sus parámetros
        </p>
      </aside>
    );
  }

  const renderFields = () => {
    const type = selectedNode.type;

    // QBCore DrawText
    if (type === 'qb-drawtext-show') {
      return (
        <>
          <TextField label="Texto" field="text" placeholder="Presiona [E]" defaultValue="Texto" />
          <SelectField label="Posición" field="position" defaultValue="left" options={[
            { value: 'left', label: 'Izquierda' },
            { value: 'right', label: 'Derecha' },
            { value: 'top', label: 'Arriba' }
          ]} />
        </>
      );
    }

    if (type === 'qb-drawtext-3d') {
      return (
        <>
          <CoordinateFields />
          <TextField label="Texto" field="text" placeholder="Texto flotante" defaultValue="Texto 3D" />
        </>
      );
    }

    // FiveM Drawing - Texto
    if (type === 'begin-text-command' || type === 'add-text-component' || type === 'end-text-command') {
      if (type === 'add-text-component') {
        return <TextField label="Texto" field="text" placeholder="Contenido del texto" defaultValue="Texto" />;
      }
      if (type === 'end-text-command') {
        return (
          <>
            <NumberField label="Posición X (0.0-1.0)" field="x" defaultValue="0.5" step="0.01" />
            <NumberField label="Posición Y (0.0-1.0)" field="y" defaultValue="0.5" step="0.01" />
          </>
        );
      }
      return null;
    }

    if (type === 'set-text-font') {
      return (
        <SelectField label="Fuente" field="font" defaultValue="4" options={[
          { value: '0', label: '0 - Chateau' },
          { value: '1', label: '1 - House Script' },
          { value: '2', label: '2 - Monospace' },
          { value: '4', label: '4 - Chateau (Condensed)' },
          { value: '7', label: '7 - Pricedown' }
        ]} />
      );
    }

    if (type === 'set-text-scale') {
      return (
        <>
          <NumberField label="Escala X" field="scaleX" defaultValue="0.5" step="0.1" />
          <NumberField label="Escala Y" field="scaleY" defaultValue="0.5" step="0.1" />
        </>
      );
    }

    if (type === 'set-text-colour') {
      return <RGBAFields />;
    }

    if (type === 'draw-rect') {
      return (
        <>
          <NumberField label="X (0.0-1.0)" field="x" defaultValue="0.5" step="0.01" />
          <NumberField label="Y (0.0-1.0)" field="y" defaultValue="0.5" step="0.01" />
          <NumberField label="Ancho (0.0-1.0)" field="width" defaultValue="0.1" step="0.01" />
          <NumberField label="Alto (0.0-1.0)" field="height" defaultValue="0.1" step="0.01" />
          <RGBAFields />
        </>
      );
    }

    if (type === 'draw-sprite') {
      return (
        <>
          <TextField label="Diccionario" field="dict" placeholder="helicopterhud" defaultValue="helicopterhud" />
          <TextField label="Nombre" field="name" placeholder="hud_corner" defaultValue="hud_corner" />
          <NumberField label="X (0.0-1.0)" field="x" defaultValue="0.5" step="0.01" />
          <NumberField label="Y (0.0-1.0)" field="y" defaultValue="0.5" step="0.01" />
          <NumberField label="Ancho" field="width" defaultValue="0.1" step="0.01" />
          <NumberField label="Alto" field="height" defaultValue="0.1" step="0.01" />
        </>
      );
    }

    // Scaleforms
    if (type === 'request-scaleform') {
      return (
        <TextField label="Nombre Scaleform" field="name" placeholder="mp_big_message_freemode" defaultValue="mp_big_message_freemode" />
      );
    }

    if (type === 'begin-scaleform-method') {
      return (
        <TextField label="Método" field="method" placeholder="SHOW_SHARD_WASTED_MP_MESSAGE" defaultValue="SHOW_SHARD_WASTED_MP_MESSAGE" />
      );
    }

    // Screen Effects
    if (type === 'do-screen-fade-in' || type === 'do-screen-fade-out') {
      return (
        <NumberField label="Duración (ms)" field="duration" defaultValue="1000" step="100" />
      );
    }

    // Tasks
    if (type === 'task-go-to-entity') {
      return (
        <>
          <TextField label="Ped" field="ped" placeholder="PlayerPedId()" defaultValue="PlayerPedId()" />
          <TextField label="Entity" field="entity" placeholder="targetEntity" defaultValue="targetEntity" />
          <NumberField label="Distancia" field="distance" defaultValue="1.0" step="0.5" />
        </>
      );
    }

    if (type === 'task-go-to-coord') {
      return (
        <>
          <TextField label="Ped" field="ped" placeholder="PlayerPedId()" defaultValue="PlayerPedId()" />
          <CoordinateFields />
        </>
      );
    }

    if (type === 'task-wander-standard') {
      return (
        <TextField label="Ped" field="ped" placeholder="PlayerPedId()" defaultValue="PlayerPedId()" />
      );
    }

    if (type === 'task-hands-up') {
      return (
        <>
          <TextField label="Ped" field="ped" placeholder="PlayerPedId()" defaultValue="PlayerPedId()" />
          <NumberField label="Duración (ms, -1=infinito)" field="duration" defaultValue="-1" />
        </>
      );
    }

    if (type === 'clear-ped-tasks') {
      return (
        <TextField label="Ped" field="ped" placeholder="PlayerPedId()" defaultValue="PlayerPedId()" />
      );
    }

    // Vehículos
    if (type === 'create-vehicle') {
      return (
        <>
          <TextField label="Modelo" field="model" placeholder="adder" defaultValue="adder" />
          <CoordinateFields />
          <NumberField label="Heading" field="heading" defaultValue="0.0" step="1" />
          <SwitchField label="Networked" field="networked" defaultValue={true} />
        </>
      );
    }

    if (type === 'get-vehicle-ped-is-in') {
      return (
        <>
          <TextField label="Ped" field="ped" placeholder="PlayerPedId()" defaultValue="PlayerPedId()" />
          <SwitchField label="Último vehículo" field="lastVehicle" defaultValue={false} />
        </>
      );
    }

    if (type === 'set-vehicle-engine-on') {
      return (
        <>
          <TextField label="Vehicle" field="vehicle" placeholder="vehicle" defaultValue="vehicle" />
          <SwitchField label="Encendido" field="value" defaultValue={true} />
          <SwitchField label="Instantáneo" field="instantly" defaultValue={true} />
        </>
      );
    }

    if (type === 'set-vehicle-doors-locked') {
      return (
        <>
          <TextField label="Vehicle" field="vehicle" placeholder="vehicle" defaultValue="vehicle" />
          <SelectField label="Estado" field="lockStatus" defaultValue="1" options={[
            { value: '1', label: '1 - Desbloqueado' },
            { value: '2', label: '2 - Bloqueado' },
            { value: '3', label: '3 - Bloqueado sin acceso' },
            { value: '4', label: '4 - Atrapar adentro' }
          ]} />
        </>
      );
    }

    if (type === 'qb-spawn-vehicle' || type === 'esx-spawn-vehicle') {
      return (
        <TextField label="Modelo" field="model" placeholder="adder" defaultValue="adder" />
      );
    }

    if (type === 'qb-delete-vehicle' || type === 'esx-delete-vehicle') {
      return (
        <TextField label="Vehicle Handle" field="vehicle" placeholder="vehicle" defaultValue="vehicle" />
      );
    }

    // Player & Ped
    if (type === 'set-entity-coords') {
      return (
        <>
          <TextField label="Entity" field="entity" placeholder="PlayerPedId()" defaultValue="PlayerPedId()" />
          <CoordinateFields />
        </>
      );
    }

    if (type === 'freeze-entity') {
      return (
        <>
          <TextField label="Entity" field="entity" placeholder="entity" defaultValue="entity" />
          <SwitchField label="Congelar" field="toggle" defaultValue={true} />
        </>
      );
    }

    if (type === 'set-entity-invincible') {
      return (
        <>
          <TextField label="Entity" field="entity" placeholder="entity" defaultValue="entity" />
          <SwitchField label="Invencible" field="toggle" defaultValue={true} />
        </>
      );
    }

    if (type === 'create-ped') {
      return (
        <>
          <NumberField label="Ped Type (4=Civilian)" field="pedType" defaultValue="4" />
          <TextField label="Model Hash" field="modelHash" placeholder="a_m_y_skater_01" defaultValue="a_m_y_skater_01" />
          <CoordinateFields />
          <NumberField label="Heading" field="heading" defaultValue="0.0" step="1" />
          <SwitchField label="Networked" field="networked" defaultValue={true} />
        </>
      );
    }

    // Armas
    if (type === 'give-weapon-to-ped') {
      return (
        <>
          <TextField label="Ped" field="ped" placeholder="PlayerPedId()" defaultValue="PlayerPedId()" />
          <TextField label="Weapon Hash" field="weaponHash" placeholder="WEAPON_PISTOL" defaultValue="WEAPON_PISTOL" />
          <NumberField label="Munición" field="ammo" defaultValue="250" />
        </>
      );
    }

    if (type === 'weapon-clip-size' || type === 'weapon-ammo') {
      return (
        <>
          <TextField label="Ped" field="ped" placeholder="PlayerPedId()" defaultValue="PlayerPedId()" />
          <TextField label="Weapon Hash" field="weaponHash" placeholder="WEAPON_PISTOL" defaultValue="WEAPON_PISTOL" />
        </>
      );
    }

    if (type === 'weapon-infinite-ammo') {
      return (
        <>
          <TextField label="Ped" field="ped" placeholder="PlayerPedId()" defaultValue="PlayerPedId()" />
          <TextField label="Weapon Hash" field="weaponHash" placeholder="WEAPON_PISTOL" defaultValue="WEAPON_PISTOL" />
          <SwitchField label="Activar" field="toggle" defaultValue={true} />
        </>
      );
    }

    // Notificaciones
    if (type === 'qb-notify') {
      return (
        <>
          <TextAreaField label="Mensaje" field="message" placeholder="Notificación" defaultValue="Notificación" />
          <SelectField label="Tipo" field="notifyType" defaultValue="success" options={[
            { value: 'success', label: 'Success' },
            { value: 'error', label: 'Error' },
            { value: 'primary', label: 'Info' },
            { value: 'warning', label: 'Warning' }
          ]} />
          <NumberField label="Duración (ms)" field="length" defaultValue="5000" step="500" />
        </>
      );
    }

    if (type === 'esx-notify') {
      return (
        <>
          <TextAreaField label="Mensaje" field="message" placeholder="Notificación" defaultValue="Notificación" />
          <SelectField label="Tipo" field="notifyType" defaultValue="success" options={[
            { value: 'success', label: 'Success' },
            { value: 'error', label: 'Error' },
            { value: 'info', label: 'Info' },
            { value: 'warning', label: 'Warning' }
          ]} />
        </>
      );
    }

    // Eventos y Comandos
    if (type === 'event-start') {
      return (
        <>
          <TextField label="Nombre del Comando" field="commandName" placeholder="mycommand" defaultValue="mycommand" />
          <SwitchField label="Restringido (Admin)" field="restricted" defaultValue={false} />
        </>
      );
    }

    if (type === 'register-net') {
      return (
        <TextField label="Nombre del Evento" field="eventName" placeholder="myevent" defaultValue="myevent" />
      );
    }

    if (type === 'register-key-mapping') {
      return (
        <>
          <TextField label="Comando" field="commandName" placeholder="openMenu" defaultValue="openMenu" />
          <TextField label="Descripción" field="description" placeholder="Abrir menú" defaultValue="Abrir menú" />
          <TextField label="Tecla" field="key" placeholder="E" defaultValue="E" />
        </>
      );
    }

    if (type === 'qb-command') {
      return (
        <>
          <TextField label="Nombre del Comando" field="commandName" placeholder="mycommand" defaultValue="mycommand" />
          <TextField label="Ayuda" field="help" placeholder="Descripción del comando" defaultValue="Descripción del comando" />
          <SwitchField label="Restringido (Admin)" field="restricted" defaultValue={false} />
        </>
      );
    }

    if (type === 'event-trigger') {
      return (
        <>
          <TextField label="Nombre del Evento" field="eventName" placeholder="myevent" defaultValue="myevent" />
          <SelectField label="Tipo" field="eventType" defaultValue="client" options={[
            { value: 'client', label: 'TriggerEvent (Cliente)' },
            { value: 'server', label: 'TriggerServerEvent' },
            { value: 'clientFromServer', label: 'TriggerClientEvent (desde Server)' }
          ]} />
          <TextAreaField label="Argumentos (separados por coma)" field="arguments" placeholder="arg1, arg2" defaultValue="" />
        </>
      );
    }

    if (type === 'function-def') {
      return (
        <>
          <TextField label="Nombre de Función" field="functionName" placeholder="myFunction" defaultValue="myFunction" />
          <TextField label="Parámetros" field="parameters" placeholder="param1, param2" defaultValue="" />
        </>
      );
    }

    // Lógica
    if (type === 'logic-if') {
      return (
        <TextField label="Condición" field="condition" placeholder="x > 5" defaultValue="true" />
      );
    }

    if (type === 'logic-loop') {
      return (
        <TextField label="Condición While" field="condition" placeholder="true" defaultValue="true" />
      );
    }

    if (type === 'logic-for') {
      return (
        <>
          <TextField label="Variable" field="loopVar" placeholder="i" defaultValue="i" />
          <NumberField label="Inicio" field="startVal" defaultValue="1" />
          <NumberField label="Fin" field="endVal" defaultValue="10" />
          <NumberField label="Paso" field="step" defaultValue="1" />
        </>
      );
    }

    if (type === 'logic-print') {
      return (
        <TextAreaField label="Mensaje" field="message" placeholder="Debug message" defaultValue="Debug" />
      );
    }

    if (type === 'wait') {
      return (
        <NumberField label="Duración (ms)" field="duration" defaultValue="1000" step="100" />
      );
    }

    if (type === 'logic-return') {
      return (
        <TextField label="Valor de Retorno" field="returnValue" placeholder="result" defaultValue="" />
      );
    }

    // Variables
    if (type === 'variable') {
      return (
        <>
          <TextField label="Nombre Variable" field="varName" placeholder="myVar" defaultValue="myVar" />
          <TextField label="Valor" field="varValue" placeholder="nil" defaultValue="nil" />
        </>
      );
    }

    // Callbacks
    if (type === 'qb-create-callback' || type === 'esx-create-callback') {
      return (
        <TextField label="Nombre Callback" field="callbackName" placeholder="myCallback" defaultValue="myCallback" />
      );
    }

    if (type === 'qb-trigger-callback' || type === 'esx-trigger-callback') {
      return (
        <TextField label="Nombre Callback" field="callbackName" placeholder="myCallback" defaultValue="myCallback" />
      );
    }

    // Progressbar
    if (type === 'qb-progressbar') {
      return (
        <>
          <TextField label="Nombre Único" field="name" placeholder="doing_something" defaultValue="doing_something" />
          <TextField label="Etiqueta" field="label" placeholder="Haciendo algo..." defaultValue="Haciendo algo..." />
          <NumberField label="Duración (ms)" field="duration" defaultValue="5000" step="500" />
        </>
      );
    }

    // Blips y Markers
    if (type === 'add-blip-coord') {
      return (
        <>
          <CoordinateFields />
        </>
      );
    }

    if (type === 'set-blip-sprite') {
      return (
        <>
          <TextField label="Blip" field="blip" placeholder="blip" defaultValue="blip" />
          <NumberField label="Sprite ID" field="sprite" defaultValue="1" />
        </>
      );
    }

    if (type === 'draw-marker') {
      return (
        <>
          <NumberField label="Tipo Marker" field="markerType" defaultValue="1" />
          <CoordinateFields />
          <NumberField label="Escala X" field="scaleX" defaultValue="1.0" step="0.1" />
          <NumberField label="Escala Y" field="scaleY" defaultValue="1.0" step="0.1" />
          <NumberField label="Escala Z" field="scaleZ" defaultValue="1.0" step="0.1" />
          <RGBAFields />
        </>
      );
    }

    // Raycast/Collision
    if (type === 'start-shape-test-ray') {
      return (
        <>
          <Label className="text-xs text-gray-400 font-semibold">Coordenadas Inicio</Label>
          <NumberField label="X1" field="x1" defaultValue="0.0" step="0.1" />
          <NumberField label="Y1" field="y1" defaultValue="0.0" step="0.1" />
          <NumberField label="Z1" field="z1" defaultValue="0.0" step="0.1" />
          <Label className="text-xs text-gray-400 font-semibold mt-2">Coordenadas Fin</Label>
          <NumberField label="X2" field="x2" defaultValue="0.0" step="0.1" />
          <NumberField label="Y2" field="y2" defaultValue="0.0" step="0.1" />
          <NumberField label="Z2" field="z2" defaultValue="0.0" step="0.1" />
        </>
      );
    }

    if (type === 'get-shape-test-result') {
      return (
        <TextField label="Ray Handle" field="handle" placeholder="rayHandle" defaultValue="rayHandle" />
      );
    }

    // ESX Functions
    if (type === 'esx-game-closest-player' || type === 'esx-game-closest-vehicle') {
      return null; // No requieren parámetros
    }

    if (type === 'esx-game-teleport') {
      return <CoordinateFields />;
    }

    // Custom Code
    if (type === 'custom-code') {
      return (
        <TextAreaField 
          label="Código Lua" 
          field="codeBlock" 
          placeholder="-- Tu código aquí" 
          defaultValue="" 
          rows={10}
        />
      );
    }

    // Default
    return <TextAreaField label="Código Custom" field="codeBlock" placeholder="-- Código Lua" defaultValue="" />;
  };

  // Helper Components
  const TextField = ({ label, field, placeholder, defaultValue }: any) => (
    <div className="space-y-1">
      <Label className="text-xs text-gray-300">{label}</Label>
      <Input 
        value={selectedNode.data[field] ?? defaultValue}
        onChange={(e) => onChange(field, e.target.value)}
        placeholder={placeholder}
        className="bg-[#252526] border-[#3e3e42] h-8 text-xs font-mono"
      />
    </div>
  );

  const TextAreaField = ({ label, field, placeholder, defaultValue, rows = 3 }: any) => (
    <div className="space-y-1">
      <Label className="text-xs text-gray-300">{label}</Label>
      <Textarea 
        value={selectedNode.data[field] ?? defaultValue}
        onChange={(e) => onChange(field, e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="bg-[#252526] border-[#3e3e42] text-xs font-mono resize-none"
      />
    </div>
  );

  const NumberField = ({ label, field, defaultValue, step = "1" }: any) => (
    <div className="space-y-1">
      <Label className="text-xs text-gray-300">{label}</Label>
      <Input 
        type="number"
        value={selectedNode.data[field] ?? defaultValue}
        onChange={(e) => onChange(field, e.target.value)}
        step={step}
        className="bg-[#252526] border-[#3e3e42] h-8 text-xs font-mono"
      />
    </div>
  );

  const SwitchField = ({ label, field, defaultValue }: any) => (
    <div className="flex items-center justify-between py-2">
      <Label className="text-xs text-gray-300">{label}</Label>
      <Switch 
        checked={selectedNode.data[field] ?? defaultValue}
        onCheckedChange={(checked) => onChange(field, checked)}
      />
    </div>
  );

  const SelectField = ({ label, field, defaultValue, options }: any) => (
    <div className="space-y-1">
      <Label className="text-xs text-gray-300">{label}</Label>
      <Select 
        value={selectedNode.data[field] ?? defaultValue}
        onValueChange={(value) => onChange(field, value)}
      >
        <SelectTrigger className="bg-[#252526] border-[#3e3e42] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#252526] border-[#3e3e42]">
          {options.map((opt: any) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const CoordinateFields = () => (
    <>
      <NumberField label="X" field="x" defaultValue="0.0" step="0.1" />
      <NumberField label="Y" field="y" defaultValue="0.0" step="0.1" />
      <NumberField label="Z" field="z" defaultValue="0.0" step="0.1" />
    </>
  );

  const RGBAFields = () => (
    <div className="grid grid-cols-4 gap-2">
      <NumberField label="R" field="r" defaultValue="255" />
      <NumberField label="G" field="g" defaultValue="255" />
      <NumberField label="B" field="b" defaultValue="255" />
      <NumberField label="A" field="a" defaultValue="255" />
    </div>
  );

  return (
    <aside className="h-1/2 bg-[#1e1e1e] border-l border-[#2a2a2a] flex flex-col">
      <div className="h-9 px-3 border-b border-[#2a2a2a] flex items-center justify-between bg-[#252526]">
        <h2 className="font-bold text-xs text-gray-300 uppercase tracking-wide">Propiedades</h2>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onDelete} 
          className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-900/20"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Node Type Badge */}
        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-gray-500 font-bold">Tipo de Nodo</Label>
          <div className="text-xs font-mono bg-[#2a2a2a] p-2 rounded text-blue-400 border border-[#3e3e42]">
            {selectedNode.type}
          </div>
        </div>

        {/* Label */}
        <div className="space-y-1">
          <Label className="text-xs text-gray-300">Etiqueta Visual</Label>
          <Input 
            value={selectedNode.data.label || ''}
            onChange={(e) => onChange('label', e.target.value)}
            className="bg-[#252526] border-[#3e3e42] h-8 text-xs"
          />
        </div>

        <Separator className="bg-[#2a2a2a]" />

        {/* Dynamic Fields */}
        <div className="space-y-3">
          <Label className="text-[10px] uppercase text-gray-500 font-bold">Parámetros</Label>
          {renderFields()}
        </div>
      </div>
    </aside>
  );
}