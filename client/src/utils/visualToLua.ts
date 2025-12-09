// visualToLua.ts - Genera código Lua robusto desde nodos visuales
import { Node, Edge } from 'reactflow';

interface GeneratorContext {
  code: string;
  indentLevel: number;
  visited: Set<string>;
  edges: Edge[];
  nodes: Node[];
}

class VisualToLuaGenerator {
  private context!: GeneratorContext;
  private readonly INDENT = '    '; // 4 espacios

  generate(nodes: Node[], edges: Edge[], headerCode?: string): string {
    this.context = {
      code: '',
      indentLevel: 0,
      visited: new Set(),
      edges,
      nodes
    };

    // Header
    if (headerCode && headerCode.trim()) {
      this.context.code = headerCode.trim() + '\n\n';
    } else {
      this.context.code = "-- Generado por LuaVisual\nlocal QBCore = exports['qb-core']:GetCoreObject()\n\n";
    }

    // Encontrar nodos raíz (sin padres)
    const rootNodes = this.findRootNodes();

    // Generar código para cada árbol
    for (const rootNode of rootNodes) {
      this.generateNodeTree(rootNode);
      this.context.code += '\n';
    }

    return this.context.code.trim();
  }

  private findRootNodes(): Node[] {
    const childIds = new Set(this.context.edges.map(e => e.target));
    return this.context.nodes
      .filter(node => !childIds.has(node.id))
      .sort((a, b) => (a.position?.y || 0) - (b.position?.y || 0));
  }

  private findChildren(parentId: string): Node[] {
    const childEdges = this.context.edges
      .filter(e => e.source === parentId)
      .sort((a, b) => {
        const nodeA = this.context.nodes.find(n => n.id === a.target);
        const nodeB = this.context.nodes.find(n => n.id === b.target);
        return (nodeA?.position?.x || 0) - (nodeB?.position?.x || 0);
      });

    return childEdges
      .map(e => this.context.nodes.find(n => n.id === e.target))
      .filter((n): n is Node => n !== undefined);
  }

  private findChildrenByHandle(parentId: string, handle: string): Node[] {
    const childEdges = this.context.edges
      .filter(e => e.source === parentId && e.sourceHandle === handle);

    return childEdges
      .map(e => this.context.nodes.find(n => n.id === e.target))
      .filter((n): n is Node => n !== undefined);
  }

  private indent(): void {
    this.context.indentLevel++;
  }

  private outdent(): void {
    if (this.context.indentLevel > 0) {
      this.context.indentLevel--;
    }
  }

  private write(text: string): void {
    const indent = this.INDENT.repeat(this.context.indentLevel);
    this.context.code += indent + text + '\n';
  }

  private writeRaw(text: string): void {
    this.context.code += text;
  }

  private getData(node: Node, key: string, fallback: any = ''): any {
    return node.data?.[key] ?? fallback;
  }

  private escapeSingleQuote(str: string): string {
    return String(str || '').replace(/'/g, "\\'");
  }

  private generateNodeTree(node: Node): void {
    if (this.context.visited.has(node.id)) return;
    this.context.visited.add(node.id);

    const nodeType = node.type;

    switch (nodeType) {
      case 'event-start':
        this.generateCommand(node);
        break;

      case 'register-net':
        this.generateNetEvent(node);
        break;

      case 'register-key-mapping':
        this.generateKeyMapping(node);
        break;

      case 'qb-command':
        this.generateQBCommand(node);
        break;

      case 'thread-create':
        this.generateThread(node);
        break;

      case 'function-def':
        this.generateFunctionDef(node);
        break;

      case 'logic-if':
        this.generateIfStatement(node);
        break;

      case 'logic-loop':
        this.generateWhileLoop(node);
        break;

      case 'logic-for':
        this.generateForLoop(node);
        break;

      case 'logic-print':
        this.generatePrint(node);
        break;

      case 'qb-notify':
        this.generateQBNotify(node);
        break;

      case 'event-trigger':
        this.generateEventTrigger(node);
        break;

      case 'wait':
        this.generateWait(node);
        break;

      case 'variable':
        this.generateVariable(node);
        break;

      case 'qb-trigger-callback':
        this.generateQBTriggerCallback(node);
        break;

      case 'qb-create-callback':
        this.generateQBCreateCallback(node);
        break;

      case 'custom-code':
        this.generateCustomCode(node);
        break;

      case 'logic-return':
        this.generateReturn(node);
        break;

      default:
        console.warn(`Unhandled node type: ${nodeType}`);
        this.generateGenericNode(node);
    }
  }

  private generateCommand(node: Node): void {
    const commandName = this.getData(node, 'commandName', 'mycommand');
    const restricted = this.getData(node, 'restricted', false);

    this.write(`RegisterCommand('${this.escapeSingleQuote(commandName)}', function(source, args)`);
    this.indent();

    // Generar hijos
    const children = this.findChildren(node.id);
    for (const child of children) {
      this.generateNodeTree(child);
    }

    this.outdent();
    this.write(`end, ${restricted})`);
  }

  private generateNetEvent(node: Node): void {
    const eventName = this.getData(node, 'eventName', 'myevent');

    this.write(`RegisterNetEvent('${this.escapeSingleQuote(eventName)}', function()`);
    this.indent();

    const children = this.findChildren(node.id);
    for (const child of children) {
      this.generateNodeTree(child);
    }

    this.outdent();
    this.write('end)');
  }

  private generateKeyMapping(node: Node): void {
    const commandName = this.getData(node, 'commandName', 'mykey');
    const description = this.getData(node, 'description', 'Key mapping');
    const key = this.getData(node, 'key', 'F5');

    this.write(`RegisterKeyMapping('${this.escapeSingleQuote(commandName)}', '${this.escapeSingleQuote(description)}', 'keyboard', '${key}')`);
  }

  private generateQBCommand(node: Node): void {
    const commandName = this.getData(node, 'commandName', 'mycommand');
    const help = this.getData(node, 'help', 'Command help');
    const restricted = this.getData(node, 'restricted', false);

    this.write(`QBCore.Commands.Add('${this.escapeSingleQuote(commandName)}', '${this.escapeSingleQuote(help)}', {}, ${restricted}, function(source, args)`);
    this.indent();

    const children = this.findChildren(node.id);
    for (const child of children) {
      this.generateNodeTree(child);
    }

    this.outdent();
    this.write('end)');
  }

  private generateThread(node: Node): void {
    this.write('CreateThread(function()');
    this.indent();

    const children = this.findChildren(node.id);
    for (const child of children) {
      this.generateNodeTree(child);
    }

    this.outdent();
    this.write('end)');
  }

  private generateFunctionDef(node: Node): void {
    const funcName = this.getData(node, 'functionName', 'myFunction');
    const params = this.getData(node, 'parameters', '');

    this.write(`function ${funcName}(${params})`);
    this.indent();

    const children = this.findChildren(node.id);
    for (const child of children) {
      this.generateNodeTree(child);
    }

    this.outdent();
    this.write('end');
  }

  private generateIfStatement(node: Node): void {
    const condition = this.getData(node, 'condition', 'true');

    this.write(`if ${condition} then`);
    this.indent();

    // Rama verdadera
    const trueChildren = this.findChildrenByHandle(node.id, 'true');
    if (trueChildren.length === 0) {
      // Si no hay nodos con handle 'true', buscar los primeros hijos
      const allChildren = this.findChildren(node.id);
      for (const child of allChildren) {
        this.generateNodeTree(child);
      }
    } else {
      for (const child of trueChildren) {
        this.generateNodeTree(child);
      }
    }

    this.outdent();

    // Rama falsa
    const falseChildren = this.findChildrenByHandle(node.id, 'false');
    if (falseChildren.length > 0) {
      this.write('else');
      this.indent();

      for (const child of falseChildren) {
        this.generateNodeTree(child);
      }

      this.outdent();
    }

    this.write('end');
  }

  private generateWhileLoop(node: Node): void {
    const condition = this.getData(node, 'condition', 'true');

    this.write(`while ${condition} do`);
    this.indent();

    const children = this.findChildren(node.id);
    for (const child of children) {
      this.generateNodeTree(child);
    }

    this.outdent();
    this.write('end');
  }

  private generateForLoop(node: Node): void {
    const loopVar = this.getData(node, 'loopVar', 'i');
    const startVal = this.getData(node, 'startVal', '1');
    const endVal = this.getData(node, 'endVal', '10');
    const step = this.getData(node, 'step', '1');

    this.write(`for ${loopVar} = ${startVal}, ${endVal}, ${step} do`);
    this.indent();

    const children = this.findChildren(node.id);
    for (const child of children) {
      this.generateNodeTree(child);
    }

    this.outdent();
    this.write('end');
  }

  private generatePrint(node: Node): void {
    const message = this.getData(node, 'message', '');
    this.write(`print('${this.escapeSingleQuote(message)}')`);

    const children = this.findChildren(node.id);
    for (const child of children) {
      this.generateNodeTree(child);
    }
  }

  private generateQBNotify(node: Node): void {
    const message = this.getData(node, 'message', 'Notification');
    const notifyType = this.getData(node, 'notifyType', 'success');

    this.write(`QBCore.Functions.Notify('${this.escapeSingleQuote(message)}', '${notifyType}')`);

    const children = this.findChildren(node.id);
    for (const child of children) {
      this.generateNodeTree(child);
    }
  }

  private generateEventTrigger(node: Node): void {
    const eventName = this.getData(node, 'eventName', 'myevent');
    const args = this.getData(node, 'arguments', '');
    const eventType = this.getData(node, 'eventType', 'client');

    let triggerFunc = 'TriggerEvent';
    if (eventType === 'server') {
      triggerFunc = 'TriggerServerEvent';
    } else if (eventType === 'client') {
      triggerFunc = 'TriggerClientEvent';
    }

    if (args && args.trim()) {
      this.write(`${triggerFunc}('${this.escapeSingleQuote(eventName)}', ${args})`);
    } else {
      this.write(`${triggerFunc}('${this.escapeSingleQuote(eventName)}')`);
    }

    const children = this.findChildren(node.id);
    for (const child of children) {
      this.generateNodeTree(child);
    }
  }

  private generateWait(node: Node): void {
    const duration = this.getData(node, 'duration', 0);
    this.write(`Wait(${duration})`);

    const children = this.findChildren(node.id);
    for (const child of children) {
      this.generateNodeTree(child);
    }
  }

  private generateVariable(node: Node): void {
    const codeBlock = this.getData(node, 'codeBlock', '');
    if (codeBlock) {
      this.write(codeBlock);
    } else {
      const varName = this.getData(node, 'varName', 'myVar');
      const varValue = this.getData(node, 'varValue', 'nil');
      this.write(`local ${varName} = ${varValue}`);
    }

    const children = this.findChildren(node.id);
    for (const child of children) {
      this.generateNodeTree(child);
    }
  }

  private generateQBTriggerCallback(node: Node): void {
    const callbackName = this.getData(node, 'callbackName', 'mycallback');
    const codeBlock = this.getData(node, 'codeBlock', '');

    if (codeBlock) {
      this.write(codeBlock);
    } else {
      this.write(`QBCore.Functions.TriggerCallback('${this.escapeSingleQuote(callbackName)}', function(result)`);
      this.indent();

      const children = this.findChildren(node.id);
      for (const child of children) {
        this.generateNodeTree(child);
      }

      this.outdent();
      this.write('end)');
    }
  }

  private generateQBCreateCallback(node: Node): void {
    const callbackName = this.getData(node, 'callbackName', 'mycallback');

    this.write(`QBCore.Functions.CreateCallback('${this.escapeSingleQuote(callbackName)}', function(source, cb)`);
    this.indent();

    const children = this.findChildren(node.id);
    for (const child of children) {
      this.generateNodeTree(child);
    }

    this.outdent();
    this.write('end)');
  }

  private generateCustomCode(node: Node): void {
    const codeBlock = this.getData(node, 'codeBlock', '');
    if (codeBlock) {
      // Split multiline code
      const lines = codeBlock.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          this.write(line);
        }
      }
    }

    const children = this.findChildren(node.id);
    for (const child of children) {
      this.generateNodeTree(child);
    }
  }

  private generateReturn(node: Node): void {
    const returnValue = this.getData(node, 'returnValue', '');
    if (returnValue) {
      this.write(`return ${returnValue}`);
    } else {
      this.write('return');
    }

    // No procesar hijos después de return
  }

  private generateGenericNode(node: Node): void {
    const codeBlock = this.getData(node, 'codeBlock', '');
    if (codeBlock) {
      this.write(codeBlock);
    }

    const children = this.findChildren(node.id);
    for (const child of children) {
      this.generateNodeTree(child);
    }
  }
}

export default VisualToLuaGenerator;