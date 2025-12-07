import { Settings, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface PropertiesPanelProps {
  selectedNode: any;
  onChange: (key: string, value: any) => void;
  onDelete: () => void;
}

export function PropertiesPanel({ selectedNode, onChange, onDelete }: PropertiesPanelProps) {
  if (!selectedNode) {
    return (
      <aside className="h-1/2 bg-[#1e1e1e] border-l border-[#2a2a2a] p-6 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-[#2a2a2a] flex items-center justify-center mb-3">
          <Settings className="w-6 h-6 text-gray-500" />
        </div>
        <h3 className="text-sm font-medium text-gray-300">Propiedades</h3>
        <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
          Selecciona un nodo para configurar sus parámetros.
        </p>
      </aside>
    );
  }

  return (
    <aside className="h-1/2 bg-[#1e1e1e] border-l border-[#2a2a2a] flex flex-col animate-in slide-in-from-right duration-200">
      <div className="h-9 px-3 border-b border-[#2a2a2a] flex items-center justify-between bg-[#252526]">
        <h2 className="font-bold text-xs text-gray-300 uppercase tracking-wide">Detalles</h2>
        <Button variant="ghost" size="icon" onClick={onDelete} className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-900/20">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="p-4 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-gray-500 font-bold">Tipo de Nodo</Label>
            <div className="text-xs font-mono bg-[#2a2a2a] p-1.5 rounded text-blue-400 border border-[#3e3e42]">
              {selectedNode.type}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="label" className="text-xs text-gray-300">Etiqueta Personalizada</Label>
            <Input 
              id="label" 
              value={selectedNode.data.label} 
              onChange={(e) => onChange('label', e.target.value)}
              className="bg-[#252526] border-[#3e3e42] h-8 text-xs focus-visible:ring-[#007fd4]"
            />
          </div>
        </div>

        <Separator className="bg-[#2a2a2a]" />

        {/* Dynamic Fields based on Type */}
        <div className="space-y-4">
          <Label className="text-[10px] uppercase text-gray-500 font-bold">Parámetros</Label>
          
          {(selectedNode.type.includes('event') || selectedNode.type === 'event-start') && (
             <div className="space-y-1">
               <Label htmlFor="eventName" className="text-xs text-gray-300">Nombre del Evento</Label>
               <Input 
                 id="eventName" 
                 placeholder="ej. qb-core:client:test" 
                 value={selectedNode.data.eventName || ''}
                 onChange={(e) => onChange('eventName', e.target.value)}
                 className="bg-[#252526] border-[#3e3e42] font-mono text-xs h-8 text-green-400"
               />
             </div>
          )}
          {(selectedNode.type === 'event-start' || selectedNode.type === 'register-net') && (
             <div className="space-y-1">
               <Label className="text-xs text-gray-300">Lógica Interna (Lua)</Label>
               <Textarea 
                 value={selectedNode.data.codeBlock || ''}
                 onChange={(e) => onChange('codeBlock', e.target.value)}
                 className="bg-[#252526] border-[#3e3e42] font-mono text-xs min-h-[150px] text-gray-300"
                 spellCheck={false}
               />
             </div>
          )}
          {selectedNode.type.includes('notify') && (
             <>
               <div className="space-y-1">
                 <Label htmlFor="message" className="text-xs text-gray-300">Mensaje</Label>
                 <Textarea 
                   id="message" 
                   placeholder="Texto de la notificación..." 
                   value={selectedNode.data.message || ''}
                   onChange={(e) => onChange('message', e.target.value)}
                   className="bg-[#252526] border-[#3e3e42] min-h-[60px] text-xs resize-none"
                 />
               </div>
               <div className="space-y-1">
                 <Label htmlFor="type" className="text-xs text-gray-300">Tipo</Label>
                 <select 
                   className="w-full h-8 rounded-sm border border-[#3e3e42] bg-[#252526] px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-[#007fd4]"
                   value={selectedNode.data.notifyType || 'success'}
                   onChange={(e) => onChange('notifyType', e.target.value)}
                 >
                   <option value="success">Success</option>
                   <option value="error">Error</option>
                   <option value="primary">Info</option>
                 </select>
               </div>
             </>
          )}

          {selectedNode.type.includes('native') && (
             <div className="space-y-1">
               <Label htmlFor="args" className="text-xs text-gray-300">Argumentos (JSON array)</Label>
               <Input 
                 id="args" 
                 placeholder="[1, 2, 3]" 
                 className="bg-[#252526] border-[#3e3e42] font-mono text-xs h-8"
               />
             </div>
          )}

          {selectedNode.type.includes('logic-if') && (
             <div className="space-y-1">
               <Label htmlFor="condition" className="text-xs text-gray-300">Condición (Lua)</Label>
               <Input 
                 id="condition" 
                 placeholder="x > 5" 
                 className="bg-[#252526] border-[#3e3e42] font-mono text-xs h-8 text-violet-400"
               />
             </div>
          )}

          {selectedNode.type === 'register-key-mapping' && (
             <>
               <div className="space-y-1">
                 <Label className="text-xs text-gray-300">Nombre Comando</Label>
                 <Input 
                   value={selectedNode.data.commandName || ''}
                   onChange={(e) => onChange('commandName', e.target.value)}
                   className="..."
                 />
               </div>
               <div className="space-y-1">
                 <Label className="text-xs text-gray-300">Tecla Default</Label>
                 <Input 
                   value={selectedNode.data.defaultKey || 'E'}
                   onChange={(e) => onChange('defaultKey', e.target.value)}
                   className="..."
                 />
               </div>
               <div className="space-y-1">
                 <Label className="text-xs text-gray-300">Descripción</Label>
                 <Input 
                   value={selectedNode.data.description || ''}
                   onChange={(e) => onChange('description', e.target.value)}
                   className="..."
                 />
               </div>
             </>
          )}
        </div>
      </div>
    </aside>
  );
}