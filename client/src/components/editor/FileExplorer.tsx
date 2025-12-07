import { Folder, FileCode, Plus, Trash2, FileJson } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface File {
  id: string;
  name: string;
  type: 'client' | 'server' | 'shared' | 'config';
  active?: boolean;
}

interface FileExplorerProps {
  files: File[];
  onFileSelect: (id: string) => void;
  onFileCreate: (type: 'client' | 'server') => void;
  onFileDelete: (id: string) => void;
}

export function FileExplorer({ files, onFileSelect, onFileCreate, onFileDelete }: FileExplorerProps) {
  return (
    <div className="flex flex-col h-full bg-[#151515] border-r border-[#2a2a2a]">
      <div className="p-3 border-b border-[#2a2a2a] flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Explorador de Proyecto</h3>
        <div className="flex gap-1">
           <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white" onClick={() => onFileCreate('client')}>
             <Plus className="w-4 h-4" />
           </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-gray-300">
            <Folder className="w-4 h-4 fill-sky-500/20 text-sky-500" />
            <span>resource</span>
          </div>
          
          <div className="pl-6 space-y-0.5">
            {files.map((file) => (
              <div
                key={file.id}
                onClick={() => onFileSelect(file.id)}
                className={cn(
                  "group flex items-center justify-between px-2 py-1.5 rounded-sm text-sm cursor-pointer transition-colors",
                  file.active 
                    ? "bg-[#007fd4] text-white" 
                    : "text-gray-400 hover:bg-[#2a2a2a] hover:text-gray-200"
                )}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileCode className={cn(
                    "w-4 h-4 shrink-0",
                    file.type === 'client' ? "text-orange-400" : 
                    file.type === 'server' ? "text-blue-400" : "text-yellow-400"
                  )} />
                  <span className="truncate">{file.name}</span>
                </div>
                {files.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-white hover:bg-white/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFileDelete(file.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          <div className="pl-6 pt-2">
             <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-500 italic">
                <FileJson className="w-4 h-4" />
                <span>fxmanifest.lua</span>
             </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}