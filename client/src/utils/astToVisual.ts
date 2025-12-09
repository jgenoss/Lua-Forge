// astToVisual.ts - Conversor completo de AST a nodos ReactFlow
import { Node, Edge } from "reactflow";
import { ASTNode } from "./luaParser";

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
      indentLevel: 0,
    };
  }

  convert(ast: ASTNode): { nodes: Node[]; edges: Edge[] } {
    this.context = {
      nodes: [],
      edges: [],
      nodeIdCounter: 0,
      xPosition: 100,
      yPosition: 100,
      parentId: null,
      indentLevel: 0,
    };

    if (ast.type === "Program" && ast.children) {
      this.convertProgram(ast.children);
    }

    return {
      nodes: this.context.nodes,
      edges: this.context.edges,
    };
  }

  private generateNodeId(): string {
    return `node-${this.context.nodeIdCounter++}-${Date.now()}`;
  }

  private createNode(
    type: string,
    label: string,
    data: any,
    x?: number,
    y?: number
  ): string {
    const id = this.generateNodeId();
    const position = {
      x: x ?? this.context.xPosition,
      y: y ?? this.context.yPosition,
    };

    this.context.nodes.push({
      id,
      type,
      position,
      data: {
        label,
        ...data,
      },
    });

    return id;
  }

  private createEdge(
    sourceId: string,
    targetId: string,
    sourceHandle?: string
  ): void {
    this.context.edges.push({
      id: `edge-${sourceId}-${targetId}-${Date.now()}`,
      source: sourceId,
      target: targetId,
      sourceHandle,
      type: "smoothstep",
    });
  }

  private advanceY(): void {
    this.context.yPosition += this.VERTICAL_SPACING;
  }

  private advanceX(offset: number = this.HORIZONTAL_SPACING): void {
    this.context.xPosition += offset;
  }

  private resetX(): void {
    this.context.xPosition =
      100 + this.context.indentLevel * this.INDENT_OFFSET;
  }

  private convertProgram(statements: ASTNode[]): void {
    for (const statement of statements) {
      this.convertStatement(statement);
    }
  }

  private convertStatement(node: ASTNode): string | null {
    switch (node.type) {
      case "LocalDeclaration":
        return this.convertLocalDeclaration(node);

      case "FunctionDeclaration":
        return this.convertFunctionDeclaration(node);

      case "FunctionCall":
        return this.convertFunctionCall(node);

      case "MethodCall":
        return this.convertMethodCall(node);

      case "IfStatement":
        return this.convertIfStatement(node);

      case "WhileLoop":
        return this.convertWhileLoop(node);

      case "ForLoop":
      case "GenericForLoop":
        return this.convertForLoop(node);

      case "Assignment":
        return this.convertAssignment(node);

      case "ExpressionStatement":
        if (node.children && node.children.length > 0) {
          return this.convertStatement(node.children[0]);
        }
        return null;

      case "ReturnStatement":
        return this.convertReturnStatement(node);

      default:
        return null;
    }
  }

  private convertLocalDeclaration(node: ASTNode): string {
    const varName = node.value || "variable";
    const value =
      node.children && node.children.length > 0
        ? this.expressionToString(node.children[0])
        : "nil";

    const codeBlock = `local ${varName} = ${value}`;

    const nodeId = this.createNode("variable", `Variable: ${varName}`, {
      varName,
      value,
      codeBlock,
      originalCode: codeBlock, // ✅ AÑADIR ESTO
    });

    if (this.context.parentId) {
      this.createEdge(this.context.parentId, nodeId);
    }

    this.context.parentId = nodeId;
    this.advanceY();

    return nodeId;
  }

  private convertFunctionDeclaration(node: ASTNode): string {
    const funcName = node.value || "function";
    const params = node.metadata?.params?.join(", ") || "";

    const nodeId = this.createNode("function-def", funcName, {
      funcName,
      params,
      originalCode: `function ${funcName}(${params})`, // ✅ AÑADIR
    });

    if (this.context.parentId) {
      this.createEdge(this.context.parentId, nodeId);
    }

    const prevParent = this.context.parentId;
    this.context.parentId = nodeId;
    this.advanceY();
    this.context.indentLevel++;

    if (node.children) {
      this.convertBlockStatements(node.children);
    }

    this.context.indentLevel--;
    this.context.parentId = prevParent;

    return nodeId;
  }

  private convertFunctionCall(node: ASTNode): string {
    const callee = this.expressionToString(node.metadata?.callee);
    const args =
      node.metadata?.args?.map((a: ASTNode) => this.expressionToString(a)) ||
      [];

    // RegisterNetEvent
    if (callee.includes("RegisterNetEvent")) {
      const eventName = args[0]?.replace(/['"]/g, "") || "eventName";

      const nodeId = this.createNode("register-net", "Register Net Event", {
        eventName,
      });

      if (this.context.parentId) {
        this.createEdge(this.context.parentId, nodeId);
      }

      this.context.parentId = nodeId;
      this.advanceY();

      return nodeId;
    }

    // AddEventHandler
    if (callee.includes("AddEventHandler")) {
      const eventName = args[0]?.replace(/['"]/g, "") || "eventName";

      const nodeId = this.createNode("add-event-handler", "Event Handler", {
        eventName,
      });

      if (this.context.parentId) {
        this.createEdge(this.context.parentId, nodeId);
      }

      this.context.parentId = nodeId;
      this.advanceY();

      // Si tiene función anónima, procesar su contenido
      if (args.length > 1 && args[1] instanceof Object) {
        const funcNode = node.metadata?.args?.[1];
        if (funcNode?.type === "AnonymousFunction" && funcNode.children) {
          this.convertBlockStatements(funcNode.children);
        }
      }

      return nodeId;
    }

    // TriggerEvent
    if (callee.includes("TriggerEvent")) {
      const eventName = args[0]?.replace(/['"]/g, "") || "eventName";
      const restArgs = args.slice(1).join(", ");

      const nodeId = this.createNode("event-trigger", "Trigger Event", {
        eventName,
        args: restArgs,
      });

      if (this.context.parentId) {
        this.createEdge(this.context.parentId, nodeId);
      }

      this.context.parentId = nodeId;
      this.advanceY();

      return nodeId;
    }

    // TriggerServerEvent
    if (callee.includes("TriggerServerEvent")) {
      const eventName = args[0]?.replace(/['"]/g, "") || "eventName";
      const restArgs = args.slice(1).join(", ");

      const nodeId = this.createNode("event-server", "Trigger Server Event", {
        eventName,
        args: restArgs,
      });

      if (this.context.parentId) {
        this.createEdge(this.context.parentId, nodeId);
      }

      this.context.parentId = nodeId;
      this.advanceY();

      return nodeId;
    }

    // CreateThread
    if (callee.includes("CreateThread")) {
      const nodeId = this.createNode("thread-create", "Create Thread", {
        loopType: "none",
      });

      if (this.context.parentId) {
        this.createEdge(this.context.parentId, nodeId);
      }

      const prevParent = this.context.parentId;
      this.context.parentId = nodeId;
      this.advanceY();

      // Procesar contenido del thread
      if (args[0] instanceof Object) {
        const funcNode = node.metadata?.args?.[0];
        if (funcNode?.type === "AnonymousFunction" && funcNode.children) {
          this.convertBlockStatements(funcNode.children);
        }
      }

      this.context.parentId = prevParent;

      return nodeId;
    }

    // Wait
    if (callee.includes("Wait")) {
      const ms = args[0] || "0";

      const nodeId = this.createNode("wait", "Wait", { ms });

      if (this.context.parentId) {
        this.createEdge(this.context.parentId, nodeId);
      }

      this.context.parentId = nodeId;
      this.advanceY();

      return nodeId;
    }

    // Print
    if (callee.includes("print")) {
      const message = args[0]?.replace(/['"]/g, "") || "Hello";

      const nodeId = this.createNode("logic-print", "Print", { message });

      if (this.context.parentId) {
        this.createEdge(this.context.parentId, nodeId);
      }

      this.context.parentId = nodeId;
      this.advanceY();

      return nodeId;
    }

    // Generic function call
    const argsStr = args.join(", ");
    const codeBlock = `${callee}(${argsStr})`;

    const nodeId = this.createNode("custom-code", callee, { codeBlock });

    if (this.context.parentId) {
      this.createEdge(this.context.parentId, nodeId);
    }

    this.context.parentId = nodeId;
    this.advanceY();

    return nodeId;
  }

  private convertMethodCall(node: ASTNode): string {
    const objectName = this.expressionToString(node.metadata?.object);
    const method = node.value || "method";
    const args =
      node.metadata?.args?.map((a: ASTNode) => this.expressionToString(a)) ||
      [];

    // QBCore.Functions.Notify
    if (objectName.includes("QBCore.Functions") && method === "Notify") {
      const message = args.length > 0 ? this.expressionToString(args[0]) : "";
      const notifyType =
        args.length > 1 ? this.expressionToString(args[1]) : "success";

      const nodeId = this.createNode("qb-notify", "QBCore Notify", {
        message: message.replace(/['"]/g, ""),
        notifyType: notifyType.replace(/['"]/g, ""),
      });

      if (this.context.parentId) {
        this.createEdge(this.context.parentId, nodeId);
      }

      this.context.parentId = nodeId;
      this.advanceY();

      return nodeId;
    }

    // QBCore.Functions.TriggerCallback
    if (
      objectName.includes("QBCore.Functions") &&
      method === "TriggerCallback"
    ) {
      const callbackName =
        args.length > 0 ? this.expressionToString(args[0]) : "";

      const nodeId = this.createNode(
        "qb-trigger-callback",
        "Trigger Callback",
        {
          callbackName: callbackName.replace(/['"]/g, ""),
          codeBlock: `${objectName}:${method}(${args
            .map((a: ASTNode) => this.expressionToString(a))
            .join(", ")})`,
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
    const argsStr = args
      .map((a: ASTNode) => this.expressionToString(a))
      .join(", ");
    const codeBlock = `${objectName}:${method}(${argsStr})`;

    const nodeId = this.createNode("custom-code", `${objectName}:${method}`, {
      codeBlock,
    });

    if (this.context.parentId) {
      this.createEdge(this.context.parentId, nodeId);
    }

    this.context.parentId = nodeId;
    this.advanceY();

    return nodeId;
  }

  private convertIfStatement(node: ASTNode): string {
    const condition = node.value ? this.expressionToString(node.value) : "true";

    const nodeId = this.createNode("logic-if", "If Statement", { condition });

    if (this.context.parentId) {
      this.createEdge(this.context.parentId, nodeId);
    }

    const prevParent = this.context.parentId;
    this.advanceY();

    // True branch
    if (node.children && node.children.length > 0) {
      this.context.parentId = nodeId;
      for (const stmt of node.children) {
        this.convertStatement(stmt);
        if (this.context.parentId !== nodeId) {
          this.createEdge(nodeId, this.context.parentId, "true");
        }
      }
    }

    // False branch (else)
    if (node.metadata?.alternate && node.metadata.alternate.length > 0) {
      this.context.parentId = nodeId;
      for (const stmt of node.metadata.alternate) {
        this.convertStatement(stmt);
        if (this.context.parentId !== nodeId) {
          this.createEdge(nodeId, this.context.parentId, "false");
        }
      }
    }

    this.context.parentId = prevParent;

    return nodeId;
  }

  private convertWhileLoop(node: ASTNode): string {
    const condition = node.value ? this.expressionToString(node.value) : "true";

    const nodeId = this.createNode("logic-loop", "While Loop", {
      loopType: "while",
      condition,
    });

    if (this.context.parentId) {
      this.createEdge(this.context.parentId, nodeId);
    }

    const prevParent = this.context.parentId;
    this.context.parentId = nodeId;
    this.advanceY();

    if (node.children) {
      this.convertBlockStatements(node.children);
    }

    this.context.parentId = prevParent;

    return nodeId;
  }

  private convertForLoop(node: ASTNode): string {
    const isNumeric = node.type === "ForLoop";

    if (isNumeric) {
      const start = node.metadata?.start
        ? this.expressionToString(node.metadata.start)
        : "1";
      const end = node.metadata?.end
        ? this.expressionToString(node.metadata.end)
        : "10";
      const step = node.metadata?.step
        ? this.expressionToString(node.metadata.step)
        : "1";

      const nodeId = this.createNode("logic-loop", "For Loop", {
        loopType: "for",
        start,
        end,
        step,
      });

      if (this.context.parentId) {
        this.createEdge(this.context.parentId, nodeId);
      }

      const prevParent = this.context.parentId;
      this.context.parentId = nodeId;
      this.advanceY();

      if (node.children) {
        this.convertBlockStatements(node.children);
      }

      this.context.parentId = prevParent;

      return nodeId;
    }

    // Generic for loop
    const codeBlock = `for ${node.value} in ${this.expressionToString(
      node.metadata?.iterable
    )} do`;

    const nodeId = this.createNode("custom-code", "Generic For Loop", {
      codeBlock,
    });

    if (this.context.parentId) {
      this.createEdge(this.context.parentId, nodeId);
    }

    const prevParent = this.context.parentId;
    this.context.parentId = nodeId;
    this.advanceY();

    if (node.children) {
      this.convertBlockStatements(node.children);
    }

    this.context.parentId = prevParent;

    return nodeId;
  }

  private convertReturnStatement(node: ASTNode): string {
    const values =
      node.children?.map((v) => this.expressionToString(v)).join(", ") || "";
    const codeBlock = `return ${values}`;

    const nodeId = this.createNode("custom-code", "Return", { codeBlock });

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

    const nodeId = this.createNode("variable", `Assignment: ${left}`, {
      varName: left,
      value: right,
      codeBlock,
    });

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
    if (!node) return "";

    switch (node.type) {
      case "StringLiteral":
        return `"${node.value}"`;

      case "NumberLiteral":
        return String(node.value);

      case "BooleanLiteral":
        return node.value ? "true" : "false";

      case "NilLiteral":
        return "nil";

      case "Identifier":
        return node.value || "";

      case "BinaryExpression":
        const left = this.expressionToString(node.metadata?.left);
        const right = this.expressionToString(node.metadata?.right);
        return `${left} ${node.value} ${right}`;

      case "UnaryExpression":
        const operand = node.children?.[0]
          ? this.expressionToString(node.children[0])
          : "";
        return `${node.value}${operand}`;

      case "MemberExpression":
        const obj = this.expressionToString(node.metadata?.object);
        return `${obj}.${node.value}`;

      case "FunctionCall":
        const callee = this.expressionToString(node.metadata?.callee);
        const args =
          node.metadata?.args
            ?.map((a: ASTNode) => this.expressionToString(a))
            .join(", ") || "";
        return `${callee}(${args})`;

      case "MethodCall":
        const object = this.expressionToString(node.metadata?.object);
        const methodArgs =
          node.metadata?.args
            ?.map((a: ASTNode) => this.expressionToString(a))
            .join(", ") || "";
        return `${object}:${node.value}(${methodArgs})`;

      case "TableConstructor":
        const fields =
          node.children
            ?.map((f) => {
              if (f.metadata?.key) {
                const key = this.expressionToString(f.metadata.key);
                const value = this.expressionToString(f.metadata.value);
                return `[${key}] = ${value}`;
              } else {
                return this.expressionToString(f.metadata?.value);
              }
            })
            .join(", ") || "";
        return `{${fields}}`;

      default:
        return "";
    }
  }
}

export default ASTToVisualConverter;
