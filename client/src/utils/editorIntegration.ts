// editorIntegration.ts - Integra el nuevo sistema en editor.tsx
import { Node, Edge } from 'reactflow';
import { LuaLexer, LuaParser } from './luaParser';
import ASTToVisualConverter from './astToVisual';
import VisualToLuaGenerator from './visualToLua';

/**
 * Convierte código Lua a nodos visuales usando el parser AST
 * Reemplaza la función applyCodeToVisual() en editor.tsx
 */
// editorIntegration.ts
export function convertLuaToVisual(luaCode: string): { nodes: Node[]; edges: Edge[]; error?: string } {
  try {
    const lexer = new LuaLexer(luaCode);
    const tokens = lexer.tokenize();
    const parser = new LuaParser(tokens);
    const ast = parser.parse();
    const converter = new ASTToVisualConverter();
    const { nodes, edges } = converter.convert(ast);
    return { nodes, edges };
  } catch (error) {
    // ✅ Retorna error en lugar de lanzarlo
    return {
      nodes: [],
      edges: [],
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Genera código Lua desde nodos visuales
 * Reemplaza la función generateLuaCode() en editor.tsx
 */
export function convertVisualToLua(
  nodes: Node[],
  edges: Edge[],
  headerCode?: string
): string {
  try {
    const generator = new VisualToLuaGenerator();
    return generator.generate(nodes, edges, headerCode);
  } catch (error) {
    console.error('Error al generar código Lua:', error);
    return '-- Error al generar código\n-- ' + (error instanceof Error ? error.message : 'Error desconocido');
  }
}

/**
 * Valida que el código Lua tenga sintaxis correcta
 */
export function validateLuaSyntax(luaCode: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    const lexer = new LuaLexer(luaCode);
    const tokens = lexer.tokenize();

    const parser = new LuaParser(tokens);
    parser.parse();

    return { valid: true, errors: [] };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Error de sintaxis');
    return { valid: false, errors };
  }
}

/**
 * Extrae el código del header (antes de las funciones principales)
 */
export function extractHeaderCode(luaCode: string): string {
  const lines = luaCode.split('\n');
  const headerLines: string[] = [];

  const actionKeywords = [
    'RegisterCommand',
    'RegisterNetEvent',
    'RegisterKeyMapping',
    'QBCore.Commands.Add',
    'CreateThread',
    'AddEventHandler',
    'QBCore.Functions.CreateCallback',
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Si encuentra una acción principal, detener
    if (actionKeywords.some(kw => trimmed.includes(kw)) && !trimmed.startsWith('--')) {
      break;
    }

    headerLines.push(line);
  }

  return headerLines.join('\n').trim();
}

/**
 * Hook de ejemplo para usar en el componente editor
 */
export function useCodeSync() {
  const syncCodeToVisual = (code: string, currentFile: any, setNodes: any, setEdges: any, setFiles: any) => {
    const headerCode = extractHeaderCode(code);
    const { nodes, edges, error } = convertLuaToVisual(code);

    if (error) {
      console.error('Error en sincronización:', error);
      return;
    }

    setNodes(nodes);
    setEdges(edges);

    // Actualizar archivo con header extraído
    setFiles((prev: any[]) =>
      prev.map(f => {
        if (f.id === currentFile.id) {
          return {
            ...f,
            nodes,
            edges,
            headerCode,
            content: code
          };
        }
        return f;
      })
    );
  };

  const syncVisualToCode = (nodes: Node[], edges: Edge[], headerCode: string) => {
    return convertVisualToLua(nodes, edges, headerCode);
  };

  return {
    syncCodeToVisual,
    syncVisualToCode
  };
}

// Ejemplo de uso en editor.tsx:
/*
import { convertLuaToVisual, convertVisualToLua, extractHeaderCode } from './editorIntegration';

// En lugar de applyCodeToVisual():
const applyCodeToVisual = () => {
  setIsSyncing(true);
  const code = generatedCode;
  const headerCode = extractHeaderCode(code);
  const { nodes: newNodes, edges: newEdges, error } = convertLuaToVisual(code);

  if (error) {
    toast({
      title: "Error de Sintaxis",
      description: error,
      variant: "destructive",
    });
    setIsSyncing(false);
    return;
  }

  setNodes(newNodes);
  setEdges(newEdges);
  
  setFiles((prev) =>
    prev.map((f) => {
      if (f.id === activeFile.id) {
        return {
          ...f,
          nodes: newNodes,
          edges: newEdges,
          headerCode,
          content: code,
        };
      }
      return f;
    })
  );

  setIsSyncing(false);
};

// En lugar de generateLuaCode():
const generateLuaCode = (currentNodes: Node[], currentEdges: Edge[]) => {
  if (isSyncing) return;

  const code = convertVisualToLua(currentNodes, currentEdges, activeFile.headerCode);
  setGeneratedCode(code);
  
  setFiles((prev) =>
    prev.map((f) => {
      if (f.id === activeFile.id) {
        return {
          ...f,
          content: code,
        };
      }
      return f;
    })
  );
};
*/