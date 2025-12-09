// visualToLua.ts - Generador completo y robusto de código Lua desde nodos visuales
import { Node, Edge } from "reactflow";

interface GeneratorContext {
  code: string;
  indentLevel: number;
  visited: Set<string>;
  edges: Edge[];
  nodes: Node[];
}

class VisualToLuaGenerator {
  private context!: GeneratorContext;
  private readonly INDENT = "    "; // 4 espacios

  generate(nodes: Node[], edges: Edge[], headerCode?: string): string {
    this.context = {
      code: "",
      indentLevel: 0,
      visited: new Set(),
      edges,
      nodes,
    };

    // Header
    if (headerCode && headerCode.trim()) {
      this.context.code = headerCode.trim() + "\n\n";
    } else {
      this.context.code =
        "-- Generado por LuaVisual\nlocal QBCore = exports['qb-core']:GetCoreObject()\n\n";
    }

    // Encontrar nodos raíz (sin padres)
    const rootNodes = this.findRootNodes();

    // Generar código para cada árbol
    for (const rootNode of rootNodes) {
      this.generateNodeTree(rootNode);
      this.context.code += "\n";
    }

    return this.context.code.trim();
  }

  private findRootNodes(): Node[] {
    const childIds = new Set(this.context.edges.map((e) => e.target));
    return this.context.nodes
      .filter((node) => !childIds.has(node.id))
      .sort((a, b) => (a.position?.y || 0) - (b.position?.y || 0));
  }

  private findChildren(parentId: string): Node[] {
    const childEdges = this.context.edges
      .filter((e) => e.source === parentId)
      .sort((a, b) => {
        const nodeA = this.context.nodes.find((n) => n.id === a.target);
        const nodeB = this.context.nodes.find((n) => n.id === b.target);
        return (nodeA?.position?.x || 0) - (nodeB?.position?.x || 0);
      });

    return childEdges
      .map((e) => this.context.nodes.find((n) => n.id === e.target))
      .filter((n): n is Node => n !== undefined);
  }

  private findChildrenByHandle(parentId: string, handle: string): Node[] {
    const childEdges = this.context.edges.filter(
      (e) => e.source === parentId && e.sourceHandle === handle
    );

    return childEdges
      .map((e) => this.context.nodes.find((n) => n.id === e.target))
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
    this.context.code += indent + text + "\n";
  }

  private writeRaw(text: string): void {
    this.context.code += text;
  }

  private getData(node: Node, key: string, fallback: any = ""): any {
    return node.data?.[key] ?? fallback;
  }

  private generateNodeTree(node: Node): void {
    if (this.context.visited.has(node.id)) return;
    this.context.visited.add(node.id);

    const hasOriginalCode = node.data?.originalCode && !node.data?.modified;

    if (hasOriginalCode && node.type === "custom-code") {
      this.write(node.data.originalCode);
      this.generateChildren(node.id);
      return;
    }

    const type = node.type || "";

    // Eventos y Registros
    if (type === "register-net") {
      const eventName = this.getData(node, "eventName", "eventName");
      this.write(`RegisterNetEvent('${eventName}')`);
      this.write(`AddEventHandler('${eventName}', function()`);
      this.indent();
      this.generateChildren(node.id);
      this.outdent();
      this.write(`end)`);
      return;
    }

    if (type === "add-event-handler") {
      const eventName = this.getData(node, "eventName", "eventName");
      this.write(`AddEventHandler('${eventName}', function()`);
      this.indent();
      this.generateChildren(node.id);
      this.outdent();
      this.write(`end)`);
      return;
    }

    if (type === "event-trigger") {
      const eventName = this.getData(node, "eventName", "eventName");
      const args = this.getData(node, "args", "");
      this.write(`TriggerEvent('${eventName}'${args ? ", " + args : ""})`);
      this.generateChildren(node.id);
      return;
    }

    if (type === "event-server") {
      const eventName = this.getData(node, "eventName", "eventName");
      const args = this.getData(node, "args", "");
      this.write(
        `TriggerServerEvent('${eventName}'${args ? ", " + args : ""})`
      );
      this.generateChildren(node.id);
      return;
    }

    if (type === "register-key-mapping") {
      const command = this.getData(node, "command", "command");
      const description = this.getData(node, "description", "Description");
      const key = this.getData(node, "key", "F1");
      this.write(
        `RegisterKeyMapping('${command}', '${description}', 'keyboard', '${key}')`
      );
      this.generateChildren(node.id);
      return;
    }

    // Thread
    if (type === "thread-create") {
      this.write(`CreateThread(function()`);
      this.indent();
      const loopType = this.getData(node, "loopType", "none");

      if (loopType === "while") {
        this.write(`while true do`);
        this.indent();
        this.generateChildren(node.id);
        this.outdent();
        this.write(`end`);
      } else {
        this.generateChildren(node.id);
      }

      this.outdent();
      this.write(`end)`);
      return;
    }

    if (type === "wait") {
      const ms = this.getData(node, "ms", "0");
      this.write(`Wait(${ms})`);
      this.generateChildren(node.id);
      return;
    }

    // Funciones
    if (type === "function-def") {
      const funcName = this.getData(node, "funcName", "myFunction");
      const params = this.getData(node, "params", "");
      this.write(`function ${funcName}(${params})`);
      this.indent();
      this.generateChildren(node.id);
      this.outdent();
      this.write(`end`);
      return;
    }

    // Lógica
    if (type === "logic-if") {
      const condition = this.getData(node, "condition", "true");
      this.write(`if ${condition} then`);
      this.indent();

      const trueChildren = this.findChildrenByHandle(node.id, "true");
      for (const child of trueChildren) {
        this.generateNodeTree(child);
      }

      this.outdent();

      const falseChildren = this.findChildrenByHandle(node.id, "false");
      if (falseChildren.length > 0) {
        this.write(`else`);
        this.indent();
        for (const child of falseChildren) {
          this.generateNodeTree(child);
        }
        this.outdent();
      }

      this.write(`end`);
      return;
    }

    if (type === "logic-loop") {
      const loopType = this.getData(node, "loopType", "while");

      if (loopType === "while") {
        const condition = this.getData(node, "condition", "true");
        this.write(`while ${condition} do`);
        this.indent();
        this.generateChildren(node.id);
        this.outdent();
        this.write(`end`);
      } else if (loopType === "for") {
        const start = this.getData(node, "start", "1");
        const end = this.getData(node, "end", "10");
        const step = this.getData(node, "step", "1");
        this.write(`for i = ${start}, ${end}, ${step} do`);
        this.indent();
        this.generateChildren(node.id);
        this.outdent();
        this.write(`end`);
      }
      return;
    }

    if (type === "logic-print") {
      const message = this.getData(node, "message", "Hello");
      this.write(`print('${message}')`);
      this.generateChildren(node.id);
      return;
    }

    // Variables
    if (type === "variable") {
      const varName = this.getData(node, "varName", "myVar");
      const value = this.getData(node, "value", "nil");
      this.write(`local ${varName} = ${value}`);
      this.generateChildren(node.id);
      return;
    }

    // QBCore
    if (type === "qb-notify") {
      const message = this.getData(node, "message", "Notification");
      const notifyType = this.getData(node, "notifyType", "success");
      this.write(`QBCore.Functions.Notify('${message}', '${notifyType}')`);
      this.generateChildren(node.id);
      return;
    }

    if (type === "qb-command") {
      const command = this.getData(node, "command", "command");
      const help = this.getData(node, "help", "Command help");
      this.write(
        `QBCore.Commands.Add('${command}', '${help}', {}, false, function(source, args)`
      );
      this.indent();
      this.generateChildren(node.id);
      this.outdent();
      this.write(`end)`);
      return;
    }

    if (type === "qb-trigger-callback") {
      const callbackName = this.getData(node, "callbackName", "callbackName");
      this.write(
        `QBCore.Functions.TriggerCallback('${callbackName}', function(result)`
      );
      this.indent();
      this.generateChildren(node.id);
      this.outdent();
      this.write(`end)`);
      return;
    }

    // ESX
    if (type === "esx-notify") {
      const message = this.getData(node, "message", "Notification");
      const notifyType = this.getData(node, "notifyType", "success");
      this.write(`ESX.ShowNotification('${message}', '${notifyType}')`);
      this.generateChildren(node.id);
      return;
    }

    // Entidades
    if (type === "create-ped") {
      const model = this.getData(node, "model", "a_m_m_business_01");
      const x = this.getData(node, "x", "0.0");
      const y = this.getData(node, "y", "0.0");
      const z = this.getData(node, "z", "0.0");
      const heading = this.getData(node, "heading", "0.0");
      this.write(
        `local ped = CreatePed(4, GetHashKey('${model}'), ${x}, ${y}, ${z}, ${heading}, false, false)`
      );
      this.generateChildren(node.id);
      return;
    }

    if (type === "create-object") {
      const model = this.getData(node, "model", "prop_bench_01a");
      const x = this.getData(node, "x", "0.0");
      const y = this.getData(node, "y", "0.0");
      const z = this.getData(node, "z", "0.0");
      this.write(
        `local object = CreateObject(GetHashKey('${model}'), ${x}, ${y}, ${z}, true, false, false)`
      );
      this.generateChildren(node.id);
      return;
    }

    if (type === "delete-entity") {
      const entity = this.getData(node, "entity", "entity");
      this.write(`DeleteEntity(${entity})`);
      this.generateChildren(node.id);
      return;
    }

    if (type === "set-entity-coords") {
      const entity = this.getData(node, "entity", "entity");
      const x = this.getData(node, "x", "0.0");
      const y = this.getData(node, "y", "0.0");
      const z = this.getData(node, "z", "0.0");
      this.write(
        `SetEntityCoords(${entity}, ${x}, ${y}, ${z}, false, false, false, false)`
      );
      this.generateChildren(node.id);
      return;
    }

    if (type === "get-entity-coords") {
      const entity = this.getData(node, "entity", "PlayerPedId()");
      this.write(`local coords = GetEntityCoords(${entity})`);
      this.generateChildren(node.id);
      return;
    }

    if (type === "freeze-entity") {
      const entity = this.getData(node, "entity", "entity");
      const toggle = this.getData(node, "toggle", "true");
      this.write(`FreezeEntityPosition(${entity}, ${toggle})`);
      this.generateChildren(node.id);
      return;
    }

    // Blips y Markers
    if (type === "add-blip-coord") {
      const x = this.getData(node, "x", "0.0");
      const y = this.getData(node, "y", "0.0");
      const z = this.getData(node, "z", "0.0");
      this.write(`local blip = AddBlipForCoord(${x}, ${y}, ${z})`);
      this.generateChildren(node.id);
      return;
    }

    if (type === "set-blip-sprite") {
      const blip = this.getData(node, "blip", "blip");
      const sprite = this.getData(node, "sprite", "1");
      this.write(`SetBlipSprite(${blip}, ${sprite})`);
      this.generateChildren(node.id);
      return;
    }

    if (type === "draw-marker") {
      const markerType = this.getData(node, "markerType", "1");
      const x = this.getData(node, "x", "0.0");
      const y = this.getData(node, "y", "0.0");
      const z = this.getData(node, "z", "0.0");
      const scaleX = this.getData(node, "scaleX", "1.0");
      const scaleY = this.getData(node, "scaleY", "1.0");
      const scaleZ = this.getData(node, "scaleZ", "1.0");
      const r = this.getData(node, "r", "255");
      const g = this.getData(node, "g", "255");
      const b = this.getData(node, "b", "255");
      const a = this.getData(node, "a", "255");
      this.write(
        `DrawMarker(${markerType}, ${x}, ${y}, ${z}, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, ${scaleX}, ${scaleY}, ${scaleZ}, ${r}, ${g}, ${b}, ${a}, false, true, 2, false, nil, nil, false)`
      );
      this.generateChildren(node.id);
      return;
    }

    // Input Controls
    if (type === "is-control-pressed") {
      const control = this.getData(node, "control", "38");
      this.write(`if IsControlPressed(0, ${control}) then`);
      this.indent();

      const trueChildren = this.findChildrenByHandle(node.id, "true");
      for (const child of trueChildren) {
        this.generateNodeTree(child);
      }

      this.outdent();
      this.write(`end`);
      return;
    }

    if (type === "is-control-just-pressed") {
      const control = this.getData(node, "control", "38");
      this.write(`if IsControlJustPressed(0, ${control}) then`);
      this.indent();

      const trueChildren = this.findChildrenByHandle(node.id, "true");
      for (const child of trueChildren) {
        this.generateNodeTree(child);
      }

      this.outdent();
      this.write(`end`);
      return;
    }

    if (type === "disable-control-action") {
      const control = this.getData(node, "control", "38");
      this.write(`DisableControlAction(0, ${control}, true)`);
      this.generateChildren(node.id);
      return;
    }

    // SQL
    if (type === "sql-query") {
      const query = this.getData(node, "query", "SELECT * FROM users");
      this.write(`exports['oxmysql']:execute('${query}', {}, function(result)`);
      this.indent();
      this.generateChildren(node.id);
      this.outdent();
      this.write(`end)`);
      return;
    }

    if (type === "sql-insert") {
      const table = this.getData(node, "table", "users");
      const data = this.getData(node, "data", "{}");
      this.write(
        `exports['oxmysql']:insert('INSERT INTO ${table} VALUES (?)', {${data}})`
      );
      this.generateChildren(node.id);
      return;
    }

    // Matemáticas
    if (type === "math-random") {
      const min = this.getData(node, "min", "1");
      const max = this.getData(node, "max", "100");
      this.write(`local randomNum = math.random(${min}, ${max})`);
      this.generateChildren(node.id);
      return;
    }

    if (type === "math-abs") {
      const value = this.getData(node, "value", "0");
      this.write(`local absValue = math.abs(${value})`);
      this.generateChildren(node.id);
      return;
    }

    // Custom Code
    if (type === "custom-code") {
      const codeBlock = this.getData(node, "codeBlock", "");
      if (codeBlock.trim()) {
        this.write(codeBlock);
      }
      this.generateChildren(node.id);
      return;
    }

    // Native/Generic
    if (type === "native-control") {
      const nativeName = this.getData(node, "nativeName", "NativeName");
      const params = this.getData(node, "params", "");
      this.write(`${nativeName}(${params})`);
      this.generateChildren(node.id);
      return;
    }

    // Default - Custom code block
    const codeBlock = this.getData(node, "codeBlock", "");
    if (codeBlock.trim()) {
      this.write(codeBlock);
    }
    this.generateChildren(node.id);
  }

  private generateChildren(parentId: string): void {
    const children = this.findChildren(parentId);
    for (const child of children) {
      this.generateNodeTree(child);
    }
  }
}

export default VisualToLuaGenerator;
