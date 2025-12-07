import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { 
  Box, Zap, Database, Activity, Terminal, LayoutTemplate, 
  MapPin, Car, User, Eye, MousePointer2, Settings, Type, PlayCircle,
  Globe, Lock, RefreshCw, Layers, Code, Hash, Calculator, Move, Trash2, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Simplified icons map - fallback to Activity
const getIcon = (type: string) => {
  if (type.includes('event')) return Zap;
  if (type.includes('thread')) return PlayCircle;
  if (type.includes('native') || type.includes('entity') || type.includes('ped')) return User;
  if (type.includes('blip') || type.includes('marker') || type.includes('coord')) return MapPin;
  if (type.includes('qb')) return Box;
  if (type.includes('sql')) return Database;
  if (type.includes('logic')) return Activity;
  if (type.includes('math')) return Calculator;
  return Activity;
};

const colors = {
  'event': 'border-emerald-500/30 bg-emerald-950/40 text-emerald-400',
  'thread': 'border-emerald-500/30 bg-emerald-950/40 text-emerald-400',
  'native': 'border-amber-500/30 bg-amber-950/40 text-amber-400',
  'entity': 'border-amber-500/30 bg-amber-950/40 text-amber-400',
  'qb': 'border-sky-500/30 bg-sky-950/40 text-sky-400',
  'esx': 'border-red-500/30 bg-red-950/40 text-red-400',
  'logic': 'border-violet-500/30 bg-violet-950/40 text-violet-400',
  'math': 'border-violet-500/30 bg-violet-950/40 text-violet-400',
  'sql': 'border-yellow-500/30 bg-yellow-950/40 text-yellow-400',
  'default': 'border-slate-500/30 bg-slate-900/40 text-slate-400',
};

const CustomNode = ({ data, type, selected }: NodeProps) => {
  const category = type?.split('-')[0] || 'default';
  // Simple mapping for colors based on prefix
  let colorClass = colors.default;
  if (type?.includes('event') || type?.includes('thread')) colorClass = colors.event;
  else if (type?.includes('native') || type?.includes('entity') || type?.includes('ped') || type?.includes('blip')) colorClass = colors.native;
  else if (type?.includes('qb')) colorClass = colors.qb;
  else if (type?.includes('sql')) colorClass = colors.sql;
  else if (type?.includes('logic') || type?.includes('math')) colorClass = colors.logic;

  const Icon = getIcon(type || '');
  const isConditional = type === 'logic-if' || type === 'does-entity-exist' || type === 'is-control-pressed' || type === 'is-ace-allowed';

  return (
    <div className={cn(
      "min-w-[180px] rounded-lg border backdrop-blur-md transition-all duration-200 shadow-lg",
      colorClass,
      selected ? "ring-1 ring-white border-white/50" : ""
    )}>
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-3 !h-3 !bg-muted-foreground !border-background" 
      />
      
      <div className="p-3 flex items-center gap-3">
        <div className={cn("p-2 rounded-md bg-background/30 backdrop-blur-sm")}>
           <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-0.5">
            {type?.split('-')[0]}
          </div>
          <div className="font-mono text-sm font-semibold text-foreground/90">
            {data.label}
          </div>
        </div>
      </div>

      <div className="flex justify-between px-3 pb-2 min-h-[10px]">
         {isConditional ? (
           <>
             <div className="relative">
                <span className="text-[10px] text-emerald-400/80 absolute -bottom-5 left-0 font-mono">True</span>
                <Handle 
                  type="source" 
                  position={Position.Bottom} 
                  id="true"
                  className="!left-2 !bg-emerald-500" 
                />
             </div>
             <div className="relative">
                <span className="text-[10px] text-red-400/80 absolute -bottom-5 right-0 font-mono">False</span>
                <Handle 
                  type="source" 
                  position={Position.Bottom} 
                  id="false"
                  className="!left-auto !right-2 !bg-red-500" 
                />
             </div>
           </>
         ) : (
           <Handle 
             type="source" 
             position={Position.Bottom} 
             className="!w-3 !h-3 !bg-muted-foreground !border-background" 
           />
         )}
      </div>
    </div>
  );
};

export default memo(CustomNode);