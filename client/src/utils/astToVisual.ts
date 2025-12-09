// astToVisual.ts - Convierte AST a nodos ReactFlow
import { Node, Edge } from 'reactflow';
import { ASTNode } from './luaParser';

interface ConversionContext {
  nodes: Node[];
  edges: Edge[];
  nodeIdCounter: number;
  xPosition: number;
  yPosition: number;
  parentId: string | null;
  indentLevel: number;
}

class ASTToVisualConverter {
  private context: ConversionContext;
  private readonly HORIZONTAL_SPACING = 350;
  private readonly VERTICAL_SPACING = 120;
  private readonly INDENT_OFFSET = 100;

  constructor() {
    this.context = {
      nodes: [],
      edges: [],
      nodeIdCounter: 0,
      xPosition: 100,
      yPosition: 100,
      parentId: null,
      indentLevel: 0
    };
  }

  convert(ast: ASTNode): { nodes: Node[], edges: Edge[] } {
    this.context = {
      nodes: [],
      edges: [],
      nodeIdCounter: 0,
      xPosition: 100,
      yPosition: 100,
      parentId: null,
      indentLevel: 0
    };

    if (ast.type === 'Program' && ast.children) {
      this.convertProgram(ast.children);
    }

    return {
      nodes: this.context.nodes,
      edges: this.context.edges
    };
  }

  private generateNodeId(): string {
    return `node-${this.context.nodeIdCounter++}-${Date.now()}`;
  }

  private createNode(type: string, label: string, data: any, x?: number, y?: number): string {
    const id = this.generateNodeId();
    const position = {
      x: x ?? this.context.xPosition,
      y: y ?? this.context.yPosition
    };

    this.context.nodes.push({
      id,
      type,
      data: { label, ...data },
      position
    });

    return id;
  }

  private createEdge(sourceId: string, targetId: string, sourceHandle: string = 'flow-out', targetHandle: string = 'flow-in'): void {
    this.context.edges.push({
      id: `edge-${sourceId}-${targetId}-${Date.now()}`,
      source: sourceId,
      target: targetId,
      sourceHandle,
      targetHandle
    });
  }

  private advanceY(): void {
    this.context.yPosition += this.VERTICAL_SPACING;
  }

  private indent(): void {
    this.context.indentLevel++;
    this.context.xPosition += this.INDENT_OFFSET;
  }

  private outdent(): void {
    if (this.context.indentLevel > 0) {
      this.context.indentLevel--;
      this.context.xPosition -= this.INDENT_OFFSET;
    }
  }

  private convertProgram(statements: ASTNode[]): void {
    for (const statement of statements) {
      this.convertStatement(statement);
    }
  }

  private convertStatement(node: ASTNode): string | null {
    switch (node.type) {
      case 'LocalDeclaration':
        return this.convertLocalDeclaration(node);
      
      case 'FunctionDeclaration':
        return this.convertFunctionDeclaration(node);
      
      case 'IfStatement':
        return this.convertIfStatement(node);
      
      case 'WhileLoop':
        return this.convertWhileLoop(node);
      
      case 'ForLoop':
      case 'ForInLoop':
        return this.convertForLoop(node);
      
      case 'ReturnStatement':
        return this.convertReturnStatement(node);
      
      case 'ExpressionStatement':
        return this.convertExpressionStatement(node);
      
      default:
        console.warn(`Unhandled statement type: ${node.type}`);
        return null;
    }
  }

  private convertLocalDeclaration(node: ASTNode): string {
    const varName = node.value || 'variable';
    const initValue = node.children?.[0];
    
    let codeBlock = `local ${varName}`;
    if (initValue) {
      codeBlock += ` = ${this.expressionToString(initValue)}`;
    }

    const nodeId = this.createNode(
      'variable',
      `Variable: ${varName}`,
      { 
        varName,
        codeBlock 
      }
    );

    if (this.context.parentId) {
      this.createEdge(this.context.parentId, nodeId);
    }

    this.context.parentId = nodeId;
    this.advanceY();

    return nodeId;
  }

  private convertFunctionDeclaration(node: ASTNode): string {
    const funcName = node.value || 'anonymous';
    const params = node.metadata?.params || [];
    const body = node.children || [];

    // Detectar tipos especiales de funciones
    let nodeType = 'function-def';
    let label = `Function: ${funcName}`;

    // RegisterCommand
    if (funcName.includes('RegisterCommand')) {
      nodeType = 'event-start';
      const cmdName = this.extractStringFromExpression(body[0]);
      label = `Command: ${cmdName}`;
      
      const nodeId = this.createNode(nodeType, label, {
        commandName: cmdName,
        restricted: false
      });

      if (this.context.parentId) {
        this.createEdge(this.context.parentId, nodeId);
      }

      const prevParent = this.context.parentId;
      this.context.parentId = nodeId;
      this.advanceY();
      this.indent();

      // Procesar cuerpo del comando
      this.convertBlockStatements(body.slice(1));

      this.outdent();
      this.context.parentId = prevParent;

      return nodeId;
    }

    // RegisterNetEvent
    if (funcName.includes('RegisterNetEvent')) {
      nodeType = 'register-net';
      const eventName = this.extractStringFromExpression(body[0]);
      label = `Net Event: ${eventName}`;
      
      const nodeId = this.createNode(nodeType, label, {
        eventName
      });

      if (this.context.parentId) {
        this.createEdge(this.context.parentId, nodeId);
      }

      const prevParent = this.context.parentId;
      this.context.parentId = nodeId;
      this.advanceY();
      this.indent();

      this.convertBlockStatements(body.slice(1));

      this.outdent();
      this.context.parentId = prevParent;

      return nodeId;
    }

    // CreateThread
    if (funcName.includes('CreateThread')) {
      nodeType = 'thread-create';
      label = 'Create Thread';
      
      const nodeId = this.createNode(nodeType, label, {});

      if (this.context.parentId) {
        this.createEdge(this.context.parentId, nodeId);
      }

      const prevParent = this.context.parentId;
      this.context.parentId = nodeId;
      this.advanceY();
      this.indent();

      this.convertBlockStatements(body);

      this.outdent();
      this.context.parentId = prevParent;

      return nodeId;
    }

    // Función normal
    const nodeId = this.createNode(nodeType, label, {
      functionName: funcName,
      parameters: params.join(', ')
    });

    if (this.context.parentId) {
      this.createEdge(this.context.parentId, nodeId);
    }

    const prevParent = this.context.parentId;
    this.context.parentId = nodeId;
    this.advanceY();
    this.indent();

    this.convertBlockStatements(body);

    this.outdent();
    this.context.parentId = prevParent;

    return nodeId;
  }

  private convertIfStatement(node: ASTNode): string {
    const condition = this.expressionToString(node.value);
    const consequent = node.children || [];
    const alternate = node.metadata?.alternate || [];

    const nodeId = this.createNode(
      'logic-if',
      'If Condition',
      { condition }
    );

    if (this.context.parentId) {
      this.createEdge(this.context.parentId, nodeId);
    }

    const prevParent = this.context.parentId;
    const prevX = this.context.xPosition;
    const prevY = this.context.yPosition;

    // Rama verdadera
    this.context.parentId = nodeId;
    this.advanceY();
    this.indent();

    const firstTrueNode = consequent.length > 0 ? this.convertStatement(consequent[0]) : null;
    if (firstTrueNode) {
      this.createEdge(nodeId, firstTrueNode, 'true', 'flow-in');
      for (let i = 1; i < consequent.length; i++) {
        this.convertStatement(consequent[i]);
      }
    }

    this.outdent();

    // Rama falsa
    if (alternate.length > 0) {
      this.context.xPosition = prevX + this.HORIZONTAL_SPACING;
      this.context.yPosition = prevY + this.VERTICAL_SPACING;
      this.context.parentId = nodeId;
      this.indent();

      const firstFalseNode = this.convertStatement(alternate[0]);
      if (firstFalseNode) {
        this.createEdge(nodeId, firstFalseNode, 'false', 'flow-in');
        for (let i = 1; i < alternate.length; i++) {
          this.convertStatement(alternate[i]);
        }
      }

      this.outdent();
    }

    this.context.xPosition = prevX;
    this.context.parentId = prevParent;

    return nodeId;
  }

  private convertWhileLoop(node: ASTNode): string {
    const condition = this.expressionToString(node.value);
    const body = node.children || [];

    const nodeId = this.createNode(
      'logic-loop',
      'While Loop',
      { condition }
    );

    if (this.context.parentId) {
      this.createEdge(this.context.parentId, nodeId);
    }

    const prevParent = this.context.parentId;
    this.context.parentId = nodeId;
    this.advanceY();
    this.indent();

    this.convertBlockStatements(body);

    this.outdent();
    this.context.parentId = prevParent;

    return nodeId;
  }

  private convertForLoop(node: ASTNode): string {
    const iterator = node.value || 'i';
    const body = node.children || [];

    let loopConfig = '';
    if (node.type === 'ForLoop') {
      const start = node.metadata?.start ? this.expressionToString(node.metadata.start) : '1';
      const end = node.metadata?.end ? this.expressionToString(node.metadata.end) : '10';
      const step = node.metadata?.step ? this.expressionToString(node.metadata.step) : '1';
      loopConfig = `${iterator} = ${start}, ${end}, ${step}`;
    } else {
      const iterable = node.metadata?.iterable ? this.expressionToString(node.metadata.iterable) : 'table';
      loopConfig = `${iterator} in ${iterable}`;
    }

    const nodeId = this.createNode(
      'logic-loop',
      'For Loop',
      { condition: loopConfig }
    );

    if (this.context.parentId) {
      this.createEdge(this.context.parentId, nodeId);
    }

    const prevParent = this.context.parentId;
    this.context.parentId = nodeId;
    this.advanceY();
    this.indent();

    this.convertBlockStatements(body);

    this.outdent();
    this.context.parentId = prevParent;

    return nodeId;
  }

  private convertReturnStatement(node: ASTNode): string {
    const returnValues = node.children?.map(c => this.expressionToString(c)).join(', ') || '';
    
    const nodeId = this.createNode(
      'logic-return',
      'Return',
      { returnValue: returnValues }
    );

    if (this.context.parentId) {
      this.createEdge(this.context.parentId, nodeId);
    }

    this.context.parentId = nodeId;
    this.advanceY();

    return nodeId;
  }

  private convertExpressionStatement(node: ASTNode): string | null {
    if (!node.children || node.children.length === 0) return null;

    const expr = node.children[0];
    return this.convertExpression(expr);
  }

  private convertExpression(node: ASTNode): string | null {
    switch (node.type) {
      case 'FunctionCall':
        return this.convertFunctionCall(node);
      
      case 'MethodCall':
        return this.convertMethodCall(node);
      
      case 'Assignment':
        return this.convertAssignment(node);
      
      default:
        // Expresiones genéricas que no se convierten en nodos
        return null;
    }
  }

  private convertFunctionCall(node: ASTNode): string | null {
    const callee = node.metadata?.callee;
    const args: ASTNode[] = node.metadata?.args || [];

    if (!callee) return null;

    const funcName = this.expressionToString(callee);
    
    // Detectar funciones especiales
    if (funcName === 'print') {
      const message = args.length > 0 ? this.expressionToString(args[0]) : '';
      
      const nodeId = this.createNode(
        'logic-print',
        'Print',
        { message }
      );

      if (this.context.parentId) {
        this.createEdge(this.context.parentId, nodeId);
      }

      this.context.parentId = nodeId;
      this.advanceY();

      return nodeId;
    }

    if (funcName === 'Wait' || funcName === 'Citizen.Wait') {
      const duration = args.length > 0 ? this.expressionToString(args[0]) : '0';
      
      const nodeId = this.createNode(
        'wait',
        'Wait',
        { duration: parseInt(duration) || 0 }
      );

      if (this.context.parentId) {
        this.createEdge(this.context.parentId, nodeId);
      }

      this.context.parentId = nodeId;
      this.advanceY();

      return nodeId;
    }

    if (funcName.includes('TriggerEvent') || funcName.includes('TriggerServerEvent') || funcName.includes('TriggerClientEvent')) {
      const eventName = args.length > 0 ? this.expressionToString(args[0]) : '';
      const eventArgs = args.slice(1).map((a: ASTNode) => this.expressionToString(a)).join(', ');
      
      const nodeId = this.createNode(
        'event-trigger',
        `Trigger: ${eventName}`,
        { 
          eventName,
          arguments: eventArgs
        }
      );

      if (this.context.parentId) {
        this.createEdge(this.context.parentId, nodeId);
      }

      this.context.parentId = nodeId;
      this.advanceY();

      return nodeId;
    }

    // Llamada genérica
    const argsStr = args.map((a: ASTNode) => this.expressionToString(a)).join(', ');
    const codeBlock = `${funcName}(${argsStr})`;
    
    const nodeId = this.createNode(
      'custom-code',
      funcName,
      { codeBlock }
    );

    if (this.context.parentId) {
      this.createEdge(this.context.parentId, nodeId);
    }

    this.context.parentId = nodeId;
    this.advanceY();

    return nodeId;
  }

  private convertMethodCall(node: ASTNode): string | null {
    const object = node.metadata?.object;
    const method = node.value || '';
    const args: ASTNode[] = node.metadata?.args || [];

    if (!object) return null;

    const objectName = this.expressionToString(object);
    
    // QBCore.Functions.Notify
    if (objectName.includes('QBCore.Functions') && method === 'Notify') {
      const message = args.length > 0 ? this.expressionToString(args[0]) : '';
      const notifyType = args.length > 1 ? this.expressionToString(args[1]) : 'success';
      
      const nodeId = this.createNode(
        'qb-notify',
        'QBCore Notify',
        { 
          message,
          notifyType: notifyType.replace(/['"]/g, '')
        }
      );

      if (this.context.parentId) {
        this.createEdge(this.context.parentId, nodeId);
      }

      this.context.parentId = nodeId;
      this.advanceY();

      return nodeId;
    }

    // QBCore.Functions.TriggerCallback
    if (objectName.includes('QBCore.Functions') && method === 'TriggerCallback') {
      const callbackName = args.length > 0 ? this.expressionToString(args[0]) : '';
      
      const nodeId = this.createNode(
        'qb-trigger-callback',
        'Trigger Callback',
        { 
          callbackName,
          codeBlock: `${objectName}:${method}(${args.map(a => this.expressionToString(a)).join(', ')})`
        }
      );

      if (this.context.parentId) {
        this.createEdge(this.context.parentId, nodeId);
      }

      this.context.parentId = nodeId;
      this.advanceY();

      return nodeId;
    }

    // Llamada genérica
    const argsStr = args.map(a => this.expressionToString(a)).join(', ');
    const codeBlock = `${objectName}:${method}(${argsStr})`;
    
    const nodeId = this.createNode(
      'custom-code',
      `${objectName}:${method}`,
      { codeBlock }
    );

    if (this.context.parentId) {
      this.createEdge(this.context.parentId, nodeId);
    }

    this.context.parentId = nodeId;
    this.advanceY();

    return nodeId;
  }

  private convertAssignment(node: ASTNode): string {
    const left = this.expressionToString(node.metadata?.left);
    const right = this.expressionToString(node.metadata?.right);
    
    const codeBlock = `${left} = ${right}`;
    
    const nodeId = this.createNode(
      'variable',
      `Assignment: ${left}`,
      { 
        varName: left,
        codeBlock 
      }
    );

    if (this.context.parentId) {
      this.createEdge(this.context.parentId, nodeId);
    }

    this.context.parentId = nodeId;
    this.advanceY();

    return nodeId;
  }

  private convertBlockStatements(statements: ASTNode[]): void {
    for (const statement of statements) {
      this.convertStatement(statement);
    }
  }

  private expressionToString(node: ASTNode | undefined): string {
    if (!node) return '';

    switch (node.type) {
      case 'StringLiteral':
        return `"${node.value}"`;
      
      case 'NumberLiteral':
        return String(node.value);
      
      case 'BooleanLiteral':
        return node.value ? 'true' : 'false';
      
      case 'NilLiteral':
        return 'nil';
      
      case 'Identifier':
        return node.value || '';
      
      case 'BinaryExpression':
        const left = this.expressionToString(node.metadata?.left);
        const right = this.expressionToString(node.metadata?.right);
        return `${left} ${node.value} ${right}`;
      
      case 'UnaryExpression':
        const operand = node.children?.[0] ? this.expressionToString(node.children[0]) : '';
        return `${node.value}${operand}`;
      
      case 'MemberExpression':
        const obj = this.expressionToString(node.metadata?.object);
        return `${obj}.${node.value}`;
      
      case 'FunctionCall':
        const callee = this.expressionToString(node.metadata?.callee);
        const args = node.metadata?.args?.map((a: ASTNode) => this.expressionToString(a)).join(', ') || '';
        return `${callee}(${args})`;
      
      case 'MethodCall':
        const object = this.expressionToString(node.metadata?.object);
        const methodArgs = node.metadata?.args?.map((a: ASTNode) => this.expressionToString(a)).join(', ') || '';
        return `${object}:${node.value}(${methodArgs})`;
      
      case 'TableConstructor':
        const fields = node.children?.map(f => {
          if (f.metadata?.key) {
            const key = this.expressionToString(f.metadata.key);
            const value = this.expressionToString(f.metadata.value);
            return `[${key}] = ${value}`;
          } else {
            return this.expressionToString(f.metadata?.value);
          }
        }).join(', ') || '';
        return `{${fields}}`;
      
      default:
        return '';
    }
  }

  private extractStringFromExpression(node: ASTNode | undefined): string {
    if (!node) return '';
    if (node.type === 'StringLiteral') return node.value || '';
    return this.expressionToString(node).replace(/['"]/g, '');
  }
}

export default ASTToVisualConverter;