import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CodePreviewProps {
  code: string;
}

export function CodePreview({ code }: CodePreviewProps) {
  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-t border-[#2a2a2a]">
      <div className="h-9 px-3 border-b border-[#2a2a2a] flex items-center justify-between bg-[#252526]">
        <div className="flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-medium text-gray-300">Vista Previa (Lua)</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white">
          <Copy className="w-3.5 h-3.5" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <SyntaxHighlighter
          language="lua"
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: '12px',
            lineHeight: '1.5',
            fontFamily: "'JetBrains Mono', monospace",
          }}
          showLineNumbers={true}
          lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1em', color: '#6e7681', textAlign: 'right' }}
        >
          {code || '-- Arrastra nodos para generar código...'}
        </SyntaxHighlighter>
      </ScrollArea>
    </div>
  );
}