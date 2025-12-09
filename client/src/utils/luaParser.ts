// luaParser.ts - Parser AST robusto para código Lua
import { Node, Edge } from 'reactflow';

// Tipos de tokens
enum TokenType {
  KEYWORD = 'KEYWORD',
  IDENTIFIER = 'IDENTIFIER',
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  OPERATOR = 'OPERATOR',
  PUNCTUATION = 'PUNCTUATION',
  COMMENT = 'COMMENT',
  WHITESPACE = 'WHITESPACE',
  EOF = 'EOF'
}

interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

// AST Node Types
interface ASTNode {
  type: string;
  value?: any;
  children?: ASTNode[];
  metadata?: Record<string, any>;
  line?: number;
}

class LuaLexer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;

  private keywords = new Set([
    'local', 'function', 'end', 'if', 'then', 'else', 'elseif',
    'while', 'do', 'for', 'repeat', 'until', 'return', 'break',
    'in', 'and', 'or', 'not', 'true', 'false', 'nil'
  ]);

  constructor(input: string) {
    this.input = input;
  }

  private peek(offset: number = 0): string {
    return this.input[this.position + offset] || '';
  }

  private advance(): string {
    const char = this.input[this.position++];
    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return char;
  }

  private skipWhitespace(): void {
    while (/\s/.test(this.peek())) {
      this.advance();
    }
  }

  private readString(quote: string): Token {
    const start = { line: this.line, column: this.column };
    let value = '';
    this.advance(); // skip opening quote

    while (this.peek() && this.peek() !== quote) {
      if (this.peek() === '\\') {
        this.advance();
        value += this.advance();
      } else {
        value += this.advance();
      }
    }

    if (this.peek() === quote) {
      this.advance(); // skip closing quote
    }

    return {
      type: TokenType.STRING,
      value,
      line: start.line,
      column: start.column
    };
  }

  private readNumber(): Token {
    const start = { line: this.line, column: this.column };
    let value = '';

    while (/[0-9.]/.test(this.peek())) {
      value += this.advance();
    }

    return {
      type: TokenType.NUMBER,
      value,
      line: start.line,
      column: start.column
    };
  }

  private readIdentifier(): Token {
    const start = { line: this.line, column: this.column };
    let value = '';

    while (/[a-zA-Z0-9_]/.test(this.peek())) {
      value += this.advance();
    }

    return {
      type: this.keywords.has(value) ? TokenType.KEYWORD : TokenType.IDENTIFIER,
      value,
      line: start.line,
      column: start.column
    };
  }

  private readComment(): Token {
    const start = { line: this.line, column: this.column };
    let value = '';

    // Skip --
    this.advance();
    this.advance();

    // Check for multiline comment --[[
    if (this.peek() === '[' && this.peek(1) === '[') {
      this.advance();
      this.advance();
      while (this.peek() && !(this.peek() === ']' && this.peek(1) === ']')) {
        value += this.advance();
      }
      if (this.peek() === ']') {
        this.advance();
        this.advance();
      }
    } else {
      // Single line comment
      while (this.peek() && this.peek() !== '\n') {
        value += this.advance();
      }
    }

    return {
      type: TokenType.COMMENT,
      value,
      line: start.line,
      column: start.column
    };
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.position < this.input.length) {
      this.skipWhitespace();

      if (this.position >= this.input.length) break;

      const char = this.peek();

      // Comments
      if (char === '-' && this.peek(1) === '-') {
        tokens.push(this.readComment());
        continue;
      }

      // Strings
      if (char === '"' || char === "'") {
        tokens.push(this.readString(char));
        continue;
      }

      // Numbers
      if (/[0-9]/.test(char)) {
        tokens.push(this.readNumber());
        continue;
      }

      // Identifiers and keywords
      if (/[a-zA-Z_]/.test(char)) {
        tokens.push(this.readIdentifier());
        continue;
      }

      // Operators and punctuation
      const operators = ['==', '~=', '<=', '>=', '..', '+=', '-=', '*=', '/='];
      let matched = false;

      for (const op of operators) {
        if (this.input.substr(this.position, op.length) === op) {
          tokens.push({
            type: TokenType.OPERATOR,
            value: op,
            line: this.line,
            column: this.column
          });
          for (let i = 0; i < op.length; i++) this.advance();
          matched = true;
          break;
        }
      }

      if (matched) continue;

      // Single character tokens
      if ('(){}[],;:+-*/%=<>'.includes(char)) {
        tokens.push({
          type: /[(){}[\],;:]/.test(char) ? TokenType.PUNCTUATION : TokenType.OPERATOR,
          value: char,
          line: this.line,
          column: this.column
        });
        this.advance();
        continue;
      }

      // Unknown character
      this.advance();
    }

    tokens.push({
      type: TokenType.EOF,
      value: '',
      line: this.line,
      column: this.column
    });

    return tokens;
  }
}

class LuaParser {
  private tokens: Token[];
  private position: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens.filter(t => t.type !== TokenType.COMMENT);
  }

  private peek(offset: number = 0): Token {
    return this.tokens[this.position + offset] || this.tokens[this.tokens.length - 1];
  }

  private advance(): Token {
    return this.tokens[this.position++];
  }

  private expect(value: string): Token {
    const token = this.advance();
    if (token.value !== value) {
      throw new Error(`Expected '${value}' but got '${token.value}' at line ${token.line}`);
    }
    return token;
  }

  private match(...values: string[]): boolean {
    return values.includes(this.peek().value);
  }

  parse(): ASTNode {
    const statements: ASTNode[] = [];

    while (this.peek().type !== TokenType.EOF) {
      try {
        const stmt = this.parseStatement();
        if (stmt) statements.push(stmt);
      } catch (e) {
        console.error('Parse error:', e);
        // Skip to next statement
        while (!this.match(';', 'end', 'local', 'function') && this.peek().type !== TokenType.EOF) {
          this.advance();
        }
      }
    }

    return {
      type: 'Program',
      children: statements
    };
  }

  private parseStatement(): ASTNode | null {
    const token = this.peek();

    // Local variable
    if (token.value === 'local') {
      return this.parseLocalStatement();
    }

    // Function definition
    if (token.value === 'function') {
      return this.parseFunctionDeclaration();
    }

    // If statement
    if (token.value === 'if') {
      return this.parseIfStatement();
    }

    // While loop
    if (token.value === 'while') {
      return this.parseWhileLoop();
    }

    // For loop
    if (token.value === 'for') {
      return this.parseForLoop();
    }

    // Return statement
    if (token.value === 'return') {
      return this.parseReturnStatement();
    }

    // Expression statement (function calls, assignments)
    return this.parseExpressionStatement();
  }

  private parseLocalStatement(): ASTNode {
    this.advance(); // skip 'local'
    const name = this.advance();

    let value: ASTNode | undefined;

    if (this.peek().value === '=') {
      this.advance(); // skip '='
      value = this.parseExpression();
    }

    return {
      type: 'LocalDeclaration',
      value: name.value,
      children: value ? [value] : [],
      line: name.line
    };
  }

  private parseFunctionDeclaration(): ASTNode {
    const startToken = this.advance(); // 'function'
    
    let name = '';
    let isMethod = false;

    // Parse function name (can be table.method or module:method)
    while (this.peek().type === TokenType.IDENTIFIER) {
      name += this.advance().value;
      if (this.match('.', ':')) {
        const sep = this.advance().value;
        name += sep;
        isMethod = sep === ':';
      } else {
        break;
      }
    }

    // Parse parameters
    this.expect('(');
    const params: string[] = [];

    while (!this.match(')')) {
      if (this.peek().type === TokenType.IDENTIFIER) {
        params.push(this.advance().value);
        if (this.match(',')) this.advance();
      } else {
        break;
      }
    }

    this.expect(')');

    // Parse body
    const body: ASTNode[] = [];
    while (!this.match('end') && this.peek().type !== TokenType.EOF) {
      const stmt = this.parseStatement();
      if (stmt) body.push(stmt);
    }

    if (this.match('end')) this.advance();

    return {
      type: 'FunctionDeclaration',
      value: name,
      metadata: { params, isMethod },
      children: body,
      line: startToken.line
    };
  }

  private parseIfStatement(): ASTNode {
    const startToken = this.advance(); // 'if'
    const condition = this.parseExpression();
    
    if (this.match('then')) this.advance();

    const consequent: ASTNode[] = [];
    while (!this.match('else', 'elseif', 'end') && this.peek().type !== TokenType.EOF) {
      const stmt = this.parseStatement();
      if (stmt) consequent.push(stmt);
    }

    let alternate: ASTNode[] = [];
    if (this.match('else')) {
      this.advance();
      while (!this.match('end') && this.peek().type !== TokenType.EOF) {
        const stmt = this.parseStatement();
        if (stmt) alternate.push(stmt);
      }
    }

    if (this.match('end')) this.advance();

    return {
      type: 'IfStatement',
      value: condition,
      children: consequent,
      metadata: { alternate },
      line: startToken.line
    };
  }

  private parseWhileLoop(): ASTNode {
    const startToken = this.advance(); // 'while'
    const condition = this.parseExpression();
    
    if (this.match('do')) this.advance();

    const body: ASTNode[] = [];
    while (!this.match('end') && this.peek().type !== TokenType.EOF) {
      const stmt = this.parseStatement();
      if (stmt) body.push(stmt);
    }

    if (this.match('end')) this.advance();

    return {
      type: 'WhileLoop',
      value: condition,
      children: body,
      line: startToken.line
    };
  }

  private parseForLoop(): ASTNode {
    const startToken = this.advance(); // 'for'
    const iterator = this.advance().value;

    // Numeric for: for i = 1, 10 do
    if (this.match('=')) {
      this.advance();
      const start = this.parseExpression();
      this.expect(',');
      const end = this.parseExpression();
      
      let step: ASTNode | undefined;
      if (this.match(',')) {
        this.advance();
        step = this.parseExpression();
      }

      if (this.match('do')) this.advance();

      const body: ASTNode[] = [];
      while (!this.match('end') && this.peek().type !== TokenType.EOF) {
        const stmt = this.parseStatement();
        if (stmt) body.push(stmt);
      }

      if (this.match('end')) this.advance();

      return {
        type: 'ForLoop',
        value: iterator,
        metadata: { start, end, step },
        children: body,
        line: startToken.line
      };
    }

    // Generic for: for k, v in pairs(t) do
    const variables = [iterator];
    while (this.match(',')) {
      this.advance();
      variables.push(this.advance().value);
    }

    if (this.match('in')) this.advance();

    const iterable = this.parseExpression();

    if (this.match('do')) this.advance();

    const body: ASTNode[] = [];
    while (!this.match('end') && this.peek().type !== TokenType.EOF) {
      const stmt = this.parseStatement();
      if (stmt) body.push(stmt);
    }

    if (this.match('end')) this.advance();

    return {
      type: 'ForInLoop',
      value: variables.join(', '),
      metadata: { iterable },
      children: body,
      line: startToken.line
    };
  }

  private parseReturnStatement(): ASTNode {
    const startToken = this.advance(); // 'return'
    const values: ASTNode[] = [];

    if (!this.match('end') && this.peek().type !== TokenType.EOF) {
      values.push(this.parseExpression());
      while (this.match(',')) {
        this.advance();
        values.push(this.parseExpression());
      }
    }

    return {
      type: 'ReturnStatement',
      children: values,
      line: startToken.line
    };
  }

  private parseExpressionStatement(): ASTNode | null {
    const expr = this.parseExpression();
    return {
      type: 'ExpressionStatement',
      children: [expr],
      line: expr.line
    };
  }

  private parseExpression(): ASTNode {
    return this.parseAssignment();
  }

  private parseAssignment(): ASTNode {
    let left = this.parseLogicalOr();

    if (this.match('=')) {
      this.advance();
      const right = this.parseExpression();
      return {
        type: 'Assignment',
        metadata: { left, right },
        line: left.line
      };
    }

    return left;
  }

  private parseLogicalOr(): ASTNode {
    let left = this.parseLogicalAnd();

    while (this.match('or')) {
      const op = this.advance().value;
      const right = this.parseLogicalAnd();
      left = {
        type: 'BinaryExpression',
        value: op,
        metadata: { left, right },
        line: left.line
      };
    }

    return left;
  }

  private parseLogicalAnd(): ASTNode {
    let left = this.parseComparison();

    while (this.match('and')) {
      const op = this.advance().value;
      const right = this.parseComparison();
      left = {
        type: 'BinaryExpression',
        value: op,
        metadata: { left, right },
        line: left.line
      };
    }

    return left;
  }

  private parseComparison(): ASTNode {
    let left = this.parseAdditive();

    while (this.match('==', '~=', '<', '>', '<=', '>=')) {
      const op = this.advance().value;
      const right = this.parseAdditive();
      left = {
        type: 'BinaryExpression',
        value: op,
        metadata: { left, right },
        line: left.line
      };
    }

    return left;
  }

  private parseAdditive(): ASTNode {
    let left = this.parseMultiplicative();

    while (this.match('+', '-')) {
      const op = this.advance().value;
      const right = this.parseMultiplicative();
      left = {
        type: 'BinaryExpression',
        value: op,
        metadata: { left, right },
        line: left.line
      };
    }

    return left;
  }

  private parseMultiplicative(): ASTNode {
    let left = this.parseUnary();

    while (this.match('*', '/', '%')) {
      const op = this.advance().value;
      const right = this.parseUnary();
      left = {
        type: 'BinaryExpression',
        value: op,
        metadata: { left, right },
        line: left.line
      };
    }

    return left;
  }

  private parseUnary(): ASTNode {
    if (this.match('not', '-', '#')) {
      const op = this.advance().value;
      const operand = this.parseUnary();
      return {
        type: 'UnaryExpression',
        value: op,
        children: [operand],
        line: operand.line
      };
    }

    return this.parsePostfix();
  }

  private parsePostfix(): ASTNode {
    let expr = this.parsePrimary();

    while (true) {
      // Function call
      if (this.match('(')) {
        const args = this.parseArguments();
        expr = {
          type: 'FunctionCall',
          metadata: { callee: expr, args },
          line: expr.line
        };
      }
      // Method call
      else if (this.match(':')) {
        this.advance();
        const method = this.advance().value;
        const args = this.match('(') ? this.parseArguments() : [];
        expr = {
          type: 'MethodCall',
          value: method,
          metadata: { object: expr, args },
          line: expr.line
        };
      }
      // Property access
      else if (this.match('.')) {
        this.advance();
        const property = this.advance().value;
        expr = {
          type: 'MemberExpression',
          value: property,
          metadata: { object: expr },
          line: expr.line
        };
      }
      // Index access
      else if (this.match('[')) {
        this.advance();
        const index = this.parseExpression();
        this.expect(']');
        expr = {
          type: 'IndexExpression',
          metadata: { object: expr, index },
          line: expr.line
        };
      } else {
        break;
      }
    }

    return expr;
  }

  private parseArguments(): ASTNode[] {
    this.expect('(');
    const args: ASTNode[] = [];

    while (!this.match(')') && this.peek().type !== TokenType.EOF) {
      args.push(this.parseExpression());
      if (this.match(',')) this.advance();
    }

    this.expect(')');
    return args;
  }

  private parsePrimary(): ASTNode {
    const token = this.peek();

    // Literals
    if (token.type === TokenType.STRING) {
      this.advance();
      return {
        type: 'StringLiteral',
        value: token.value,
        line: token.line
      };
    }

    if (token.type === TokenType.NUMBER) {
      this.advance();
      return {
        type: 'NumberLiteral',
        value: token.value,
        line: token.line
      };
    }

    if (token.value === 'true' || token.value === 'false') {
      this.advance();
      return {
        type: 'BooleanLiteral',
        value: token.value === 'true',
        line: token.line
      };
    }

    if (token.value === 'nil') {
      this.advance();
      return {
        type: 'NilLiteral',
        value: null,
        line: token.line
      };
    }

    // Identifiers
    if (token.type === TokenType.IDENTIFIER) {
      this.advance();
      return {
        type: 'Identifier',
        value: token.value,
        line: token.line
      };
    }

    // Grouped expression
    if (token.value === '(') {
      this.advance();
      const expr = this.parseExpression();
      this.expect(')');
      return expr;
    }

    // Table constructor
    if (token.value === '{') {
      return this.parseTableConstructor();
    }

    // Anonymous function
    if (token.value === 'function') {
      return this.parseAnonymousFunction();
    }

    throw new Error(`Unexpected token: ${token.value} at line ${token.line}`);
  }

  private parseTableConstructor(): ASTNode {
    const startToken = this.advance(); // '{'
    const fields: ASTNode[] = [];

    while (!this.match('}') && this.peek().type !== TokenType.EOF) {
      // Key-value pair: [key] = value or key = value
      if (this.match('[')) {
        this.advance();
        const key = this.parseExpression();
        this.expect(']');
        this.expect('=');
        const value = this.parseExpression();
        fields.push({
          type: 'TableField',
          metadata: { key, value }
        });
      } else if (this.peek().type === TokenType.IDENTIFIER && this.peek(1).value === '=') {
        const key = this.advance().value;
        this.advance(); // '='
        const value = this.parseExpression();
        fields.push({
          type: 'TableField',
          metadata: {
            key: { type: 'StringLiteral', value: key },
            value
          }
        });
      } else {
        // Array-style: just value
        const value = this.parseExpression();
        fields.push({
          type: 'TableField',
          metadata: { value }
        });
      }

      if (this.match(',', ';')) this.advance();
    }

    this.expect('}');

    return {
      type: 'TableConstructor',
      children: fields,
      line: startToken.line
    };
  }

  private parseAnonymousFunction(): ASTNode {
    const startToken = this.advance(); // 'function'
    
    this.expect('(');
    const params: string[] = [];

    while (!this.match(')')) {
      if (this.peek().type === TokenType.IDENTIFIER) {
        params.push(this.advance().value);
        if (this.match(',')) this.advance();
      } else {
        break;
      }
    }

    this.expect(')');

    const body: ASTNode[] = [];
    while (!this.match('end') && this.peek().type !== TokenType.EOF) {
      const stmt = this.parseStatement();
      if (stmt) body.push(stmt);
    }

    if (this.match('end')) this.advance();

    return {
      type: 'AnonymousFunction',
      metadata: { params },
      children: body,
      line: startToken.line
    };
  }
}

export { LuaLexer, LuaParser, ASTNode, Token, TokenType };