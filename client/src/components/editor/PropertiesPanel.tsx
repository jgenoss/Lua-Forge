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
            <Label htmlFor="label" className="text-xs text-gray-300">Etiqueta Visual</Label>
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
          
          {/* EVENTOS Y COMANDOS */}
          {(selectedNode.type.includes('event') || selectedNode.type === 'event-start' || selectedNode.type === 'function-def' || selectedNode.type === 'register-net') && (
             <div className="space-y-1">
               <Label htmlFor="eventName" className="text-xs text-gray-300">Nombre (Evento/Función)</Label>
               <Input 
                 id="eventName" 
                 placeholder="Nombre..." 
                 value={selectedNode.data.eventName || ''}
                 onChange={(e) => onChange('eventName', e.target.value)}
                 className="bg-[#252526] border-[#3e3e42] font-mono text-xs h-8 text-green-400"
               />
             </div>
          )}

          {/* NOTIFICACIONES */}
          {selectedNode.type.includes('notify') && (
             <>
               <div className="space-y-1">
                 <Label htmlFor="message" className="text-xs text-gray-300">Mensaje</Label>
                 <Textarea 
                   id="message" 
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

          {/* CONDICIONALES (IF) */}
          {selectedNode.type === 'logic-if' && (
             <div className="space-y-1">
               <Label htmlFor="condition" className="text-xs text-gray-300">Condición (Lua)</Label>
               <Input 
                 id="condition" 
                 placeholder="x > 5" 
                 value={selectedNode.data.condition || ''}
                 onChange={(e) => onChange('condition', e.target.value)}
                 className="bg-[#252526] border-[#3e3e42] font-mono text-xs h-8 text-violet-400"
               />
             </div>
          )}

          {/* WAIT */}
          {selectedNode.type === 'wait' && (
             <div className="space-y-1">
               <Label htmlFor="duration" className="text-xs text-gray-300">Duración (ms)</Label>
               <Input 
                 id="duration" 
                 type="number"
                 placeholder="1000" 
                 value={selectedNode.data.duration || 0}
                 onChange={(e) => onChange('duration', e.target.value)}
                 className="bg-[#252526] border-[#3e3e42] font-mono text-xs h-8 text-blue-400"
               />
             </div>
          )}

          {/* PRINTS */}
          {selectedNode.type === 'logic-print' && (
             <div className="space-y-1">
               <Label htmlFor="message" className="text-xs text-gray-300">Mensaje de Consola</Label>
               <Input 
                 id="message" 
                 placeholder="Debug..." 
                 value={selectedNode.data.message || ''}
                 onChange={(e) => onChange('message', e.target.value)}
                 className="bg-[#252526] border-[#3e3e42] font-mono text-xs h-8 text-yellow-400"
               />
             </div>
          )}

          {/* CÓDIGO NATIVO / SCRIPT */}
          {selectedNode.type === 'native-control' && (
             <div className="space-y-1">
               <Label className="text-xs text-gray-300">Código Lua (Línea)</Label>
               <Textarea 
                 value={selectedNode.data.codeBlock || ''}
                 onChange={(e) => onChange('codeBlock', e.target.value)}
                 className="bg-[#252526] border-[#3e3e42] font-mono text-xs min-h-[80px] text-gray-300"
                 spellCheck={false}
               />
             </div>
          )}

          {/* KEY MAPPING */}
          {selectedNode.type === 'register-key-mapping' && (
             <>
               <div className="space-y-1">
                 <Label className="text-xs text-gray-300">Comando</Label>
                 <Input 
                   value={selectedNode.data.commandName || ''}
                   onChange={(e) => onChange('commandName', e.target.value)}
                   className="bg-[#252526] border-[#3e3e42] h-8 text-xs"
                 />
               </div>
               <div className="space-y-1">
                 <Label className="text-xs text-gray-300">Tecla</Label>
                 <Input 
                   value={selectedNode.data.defaultKey || 'E'}
                   onChange={(e) => onChange('defaultKey', e.target.value)}
                   className="bg-[#252526] border-[#3e3e42] h-8 text-xs"
                 />
               </div>
               <div className="space-y-1">
                 <Label className="text-xs text-gray-300">Descripción</Label>
                 <Input 
                   value={selectedNode.data.description || ''}
                   onChange={(e) => onChange('description', e.target.value)}
                   className="bg-[#252526] border-[#3e3e42] h-8 text-xs"
                 />
               </div>
             </>
          )}
        </div>
      </div>
    </aside>
  );
}