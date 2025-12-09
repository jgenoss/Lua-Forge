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

      // QBCore DrawText
      case 'qb-drawtext-show':
        this.generateQBDrawTextShow(node);
        break;
      
      case 'qb-drawtext-hide':
        this.generateQBDrawTextHide(node);
        break;
      
      case 'qb-drawtext-3d':
        this.generateQBDrawText3D(node);
        break;

      // FiveM Drawing
      case 'begin-text-command':
      case 'add-text-component':
      case 'end-text-command':
      case 'set-text-font':
      case 'set-text-scale':
      case 'set-text-colour':
      case 'draw-rect':
      case 'draw-sprite':
        this.generateFiveMDrawing(node);
        break;

      // Scaleforms
      case 'request-scaleform':
      case 'draw-scaleform-fullscreen':
      case 'begin-scaleform-method':
        this.generateScaleform(node);
        break;

      // Screen Effects
      case 'do-screen-fade-in':
      case 'do-screen-fade-out':
        this.generateScreenFade(node);
        break;

      // Tasks
      case 'task-go-to-entity':
      case 'task-go-to-coord':
      case 'task-wander-standard':
      case 'task-hands-up':
      case 'clear-ped-tasks':
        this.generateTask(node);
        break;

      // ESX Functions
      case 'esx-notify':
        this.generateESXNotify(node);
        break;
      
      case 'esx-game-closest-player':
      case 'esx-game-teleport':
        this.generateESXGame(node);
        break;

      // QBCore Extended
      case 'qb-spawn-vehicle':
      case 'qb-delete-vehicle':
      case 'qb-progressbar':
        this.generateQBExtended(node);
        break;

      // Weapons
      case 'weapon-clip-size':
      case 'weapon-ammo':
      case 'weapon-infinite-ammo':
        this.generateWeapon(node);
        break;

      // Collision
      case 'start-shape-test-ray':
      case 'get-shape-test-result':
        this.generateCollision(node);
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

  // QBCore DrawText
  private generateQBDrawTextShow(node: Node): void {
    const text = this.getData(node, 'text', 'Texto');
    const position = this.getData(node, 'position', 'left');
    this.write(`exports['qb-core']:DrawText('${this.escapeSingleQuote(text)}', '${position}')`);
    this.generateChildren(node.id);
  }

  private generateQBDrawTextHide(node: Node): void {
    this.write(`exports['qb-core']:HideText()`);
    this.generateChildren(node.id);
  }

  private generateQBDrawText3D(node: Node): void {
    const x = this.getData(node, 'x', '0.0');
    const y = this.getData(node, 'y', '0.0');
    const z = this.getData(node, 'z', '0.0');
    const text = this.getData(node, 'text', 'Texto 3D');
    this.write(`QBCore.Functions.DrawText3D(${x}, ${y}, ${z}, '${this.escapeSingleQuote(text)}')`);
    this.generateChildren(node.id);
  }

  // FiveM Drawing
  private generateFiveMDrawing(node: Node): void {
    const nodeType = node.type;
    
    switch(nodeType) {
      case 'begin-text-command':
        this.write(`BeginTextCommandDisplayText('STRING')`);
        break;
      case 'add-text-component':
        const text = this.getData(node, 'text', 'Texto');
        this.write(`AddTextComponentSubstringPlayerName('${this.escapeSingleQuote(text)}')`);
        break;
      case 'end-text-command':
        const x = this.getData(node, 'x', '0.5');
        const y = this.getData(node, 'y', '0.5');
        this.write(`EndTextCommandDisplayText(${x}, ${y})`);
        break;
      case 'set-text-font':
        const font = this.getData(node, 'font', '4');
        this.write(`SetTextFont(${font})`);
        break;
      case 'set-text-scale':
        const scaleX = this.getData(node, 'scaleX', '0.5');
        const scaleY = this.getData(node, 'scaleY', '0.5');
        this.write(`SetTextScale(${scaleX}, ${scaleY})`);
        break;
      case 'set-text-colour':
        const r = this.getData(node, 'r', '255');
        const g = this.getData(node, 'g', '255');
        const b = this.getData(node, 'b', '255');
        const a = this.getData(node, 'a', '255');
        this.write(`SetTextColour(${r}, ${g}, ${b}, ${a})`);
        break;
      case 'draw-rect':
        const rx = this.getData(node, 'x', '0.5');
        const ry = this.getData(node, 'y', '0.5');
        const width = this.getData(node, 'width', '0.1');
        const height = this.getData(node, 'height', '0.1');
        const rr = this.getData(node, 'r', '255');
        const rg = this.getData(node, 'g', '255');
        const rb = this.getData(node, 'b', '255');
        const ra = this.getData(node, 'a', '255');
        this.write(`DrawRect(${rx}, ${ry}, ${width}, ${height}, ${rr}, ${rg}, ${rb}, ${ra})`);
        break;
      case 'draw-sprite':
        const dict = this.getData(node, 'dict', 'helicopterhud');
        const name = this.getData(node, 'name', 'hud_corner');
        const sx = this.getData(node, 'x', '0.5');
        const sy = this.getData(node, 'y', '0.5');
        const sw = this.getData(node, 'width', '0.1');
        const sh = this.getData(node, 'height', '0.1');
        this.write(`DrawSprite('${dict}', '${name}', ${sx}, ${sy}, ${sw}, ${sh}, 0.0, 255, 255, 255, 255)`);
        break;
    }
    
    this.generateChildren(node.id);
  }

  // Scaleforms
  private generateScaleform(node: Node): void {
    const nodeType = node.type;
    
    switch(nodeType) {
      case 'request-scaleform':
        const name = this.getData(node, 'name', 'mp_big_message_freemode');
        this.write(`local scaleform = RequestScaleformMovie('${name}')`);
        this.write(`while not HasScaleformMovieLoaded(scaleform) do Wait(0) end`);
        break;
      case 'draw-scaleform-fullscreen':
        this.write(`DrawScaleformMovieFullscreen(scaleform, 255, 255, 255, 255, 0)`);
        break;
      case 'begin-scaleform-method':
        const method = this.getData(node, 'method', 'SHOW_SHARD_WASTED_MP_MESSAGE');
        this.write(`BeginScaleformMovieMethod(scaleform, '${method}')`);
        break;
    }
    
    this.generateChildren(node.id);
  }

  // Screen Effects
  private generateScreenFade(node: Node): void {
    const duration = this.getData(node, 'duration', '1000');
    
    if (node.type === 'do-screen-fade-in') {
      this.write(`DoScreenFadeIn(${duration})`);
    } else {
      this.write(`DoScreenFadeOut(${duration})`);
    }
    
    this.generateChildren(node.id);
  }

  // Tasks
  private generateTask(node: Node): void {
    const nodeType = node.type;
    const ped = this.getData(node, 'ped', 'PlayerPedId()');
    
    switch(nodeType) {
      case 'task-go-to-entity':
        const entity = this.getData(node, 'entity', 'targetEntity');
        const distance = this.getData(node, 'distance', '1.0');
        this.write(`TaskGoToEntity(${ped}, ${entity}, -1, ${distance}, 2.0, 0, 0)`);
        break;
      case 'task-go-to-coord':
        const x = this.getData(node, 'x', '0.0');
        const y = this.getData(node, 'y', '0.0');
        const z = this.getData(node, 'z', '0.0');
        this.write(`TaskGoToCoordAnyMeans(${ped}, ${x}, ${y}, ${z}, 1.0, 0, 0, 786603, 0xbf800000)`);
        break;
      case 'task-wander-standard':
        this.write(`TaskWanderStandard(${ped}, 10.0, 10)`);
        break;
      case 'task-hands-up':
        const duration = this.getData(node, 'duration', '-1');
        this.write(`TaskHandsUp(${ped}, ${duration}, 0, -1, false)`);
        break;
      case 'clear-ped-tasks':
        this.write(`ClearPedTasks(${ped})`);
        break;
    }
    
    this.generateChildren(node.id);
  }

  // ESX Functions
  private generateESXNotify(node: Node): void {
    const message = this.getData(node, 'message', 'Notificación');
    const type = this.getData(node, 'notifyType', 'success');
    const length = this.getData(node, 'length', '5000');
    
    this.write(`ESX.ShowNotification('${this.escapeSingleQuote(message)}', '${type}', ${length})`);
    this.generateChildren(node.id);
  }

  private generateESXGame(node: Node): void {
    const nodeType = node.type;
    
    switch(nodeType) {
      case 'esx-game-closest-player':
        this.write(`local closestPlayer, closestDistance = ESX.Game.GetClosestPlayer()`);
        break;
      case 'esx-game-teleport':
        const x = this.getData(node, 'x', '0.0');
        const y = this.getData(node, 'y', '0.0');
        const z = this.getData(node, 'z', '0.0');
        this.write(`ESX.Game.Teleport(PlayerPedId(), vector3(${x}, ${y}, ${z}))`);
        break;
    }
    
    this.generateChildren(node.id);
  }

  // QBCore Extended
  private generateQBExtended(node: Node): void {
    const nodeType = node.type;
    
    switch(nodeType) {
      case 'qb-spawn-vehicle':
        const model = this.getData(node, 'model', 'adder');
        this.write(`QBCore.Functions.SpawnVehicle('${model}', function(veh)`);
        this.indent();
        this.write(`SetVehicleNumberPlateText(veh, 'QB'..tostring(math.random(1000, 9999)))`);
        this.write(`SetEntityHeading(veh, coords.w)`);
        this.write(`exports['LegacyFuel']:SetFuel(veh, 100.0)`);
        this.write(`TaskWarpPedIntoVehicle(PlayerPedId(), veh, -1)`);
        this.write(`TriggerEvent('vehiclekeys:client:SetOwner', QBCore.Functions.GetPlate(veh))`);
        this.write(`SetVehicleEngineOn(veh, true, true)`);
        this.outdent();
        this.write(`end)`);
        break;
      case 'qb-delete-vehicle':
        const vehicle = this.getData(node, 'vehicle', 'vehicle');
        this.write(`QBCore.Functions.DeleteVehicle(${vehicle})`);
        break;
      case 'qb-progressbar':
        const name = this.getData(node, 'name', 'doing_something');
        const label = this.getData(node, 'label', 'Haciendo algo...');
        const duration = this.getData(node, 'duration', '5000');
        this.write(`QBCore.Functions.Progressbar('${name}', '${this.escapeSingleQuote(label)}', ${duration}, false, true, {`);
        this.indent();
        this.write(`disableMovement = true,`);
        this.write(`disableCarMovement = true,`);
        this.write(`disableMouse = false,`);
        this.write(`disableCombat = true`);
        this.outdent();
        this.write(`}, {}, {}, {}, function()`);
        this.indent();
        this.write(`-- Completado`);
        this.outdent();
        this.write(`end, function()`);
        this.indent();
        this.write(`-- Cancelado`);
        this.outdent();
        this.write(`end)`);
        break;
    }
    
    this.generateChildren(node.id);
  }

  // Weapons
  private generateWeapon(node: Node): void {
    const nodeType = node.type;
    const ped = this.getData(node, 'ped', 'PlayerPedId()');
    
    switch(nodeType) {
      case 'weapon-clip-size':
        const weapon = this.getData(node, 'weapon', 'WEAPON_PISTOL');
        this.write(`local clipSize = GetWeaponClipSize(GetHashKey('${weapon}'))`);
        break;
      case 'weapon-ammo':
        const weaponHash = this.getData(node, 'weaponHash', 'WEAPON_PISTOL');
        this.write(`local ammo = GetAmmoInPedWeapon(${ped}, GetHashKey('${weaponHash}'))`);
        break;
      case 'weapon-infinite-ammo':
        const toggle = this.getData(node, 'toggle', 'true');
        const weaponType = this.getData(node, 'weaponHash', 'WEAPON_PISTOL');
        this.write(`SetPedInfiniteAmmo(${ped}, ${toggle}, GetHashKey('${weaponType}'))`);
        break;
    }
    
    this.generateChildren(node.id);
  }

  // Collision
  private generateCollision(node: Node): void {
    const nodeType = node.type;
    
    if (nodeType === 'start-shape-test-ray') {
      const x1 = this.getData(node, 'x1', '0.0');
      const y1 = this.getData(node, 'y1', '0.0');
      const z1 = this.getData(node, 'z1', '0.0');
      const x2 = this.getData(node, 'x2', '0.0');
      const y2 = this.getData(node, 'y2', '0.0');
      const z2 = this.getData(node, 'z2', '0.0');
      this.write(`local rayHandle = StartShapeTestRay(${x1}, ${y1}, ${z1}, ${x2}, ${y2}, ${z2}, -1, PlayerPedId(), 0)`);
    } else if (nodeType === 'get-shape-test-result') {
      const handle = this.getData(node, 'handle', 'rayHandle');
      this.write(`local retval, hit, coords, surfaceNormal, entity = GetShapeTestResult(${handle})`);
    }
    
    this.generateChildren(node.id);
  }

  // Helper para generar hijos
  private generateChildren(nodeId: string): void {
    const children = this.findChildren(nodeId);
    for (const child of children) {
      this.generateNodeTree(child);
    }
  }
}

export default VisualToLuaGenerator;