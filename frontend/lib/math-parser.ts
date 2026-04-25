/**
 * Simple math expression evaluator for client-side function plotting.
 * Handles common mathematical functions and operations.
 */

const MATH_FUNCTIONS: Record<string, (x: number) => number> = {
  sin: Math.sin,
  sen: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  tg: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  exp: Math.exp,
  log: Math.log,
  ln: Math.log,
  log10: Math.log10,
  sqrt: Math.sqrt,
  raiz: Math.sqrt,
  cbrt: (x: number) => (x < 0 ? -Math.pow(-x, 1 / 3) : Math.pow(x, 1 / 3)),
  abs: Math.abs,
  ceil: Math.ceil,
  floor: Math.floor,
  round: Math.round,
  sign: Math.sign,
};

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  PI: Math.PI,
  e: Math.E,
  E: Math.E,
};

/**
 * Tokenize a math expression string.
 */
function tokenize(expr: string): string[] {
  const tokens: string[] = [];
  let i = 0;

  while (i < expr.length) {
    const char = expr[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Numbers (including decimals)
    if (/[0-9.]/.test(char)) {
      let num = "";
      while (i < expr.length && /[0-9.eE+-]/.test(expr[i])) {
        // Handle scientific notation
        if ((expr[i] === "e" || expr[i] === "E") && num.length > 0) {
          num += expr[i];
          i++;
          if (i < expr.length && (expr[i] === "+" || expr[i] === "-")) {
            num += expr[i];
            i++;
          }
          continue;
        }
        num += expr[i];
        i++;
      }
      tokens.push(num);
      continue;
    }

    // Identifiers (functions, variables, constants)
    if (/[a-zA-Z_]/.test(char)) {
      let id = "";
      while (i < expr.length && /[a-zA-Z_0-9]/.test(expr[i])) {
        id += expr[i];
        i++;
      }
      tokens.push(id);
      continue;
    }

    // Operators and parentheses
    if ("+-*/^()".includes(char)) {
      tokens.push(char);
      i++;
      continue;
    }

    // ** for exponentiation
    if (char === "*" && expr[i + 1] === "*") {
      tokens.push("^");
      i += 2;
      continue;
    }

    i++;
  }

  return tokens;
}

/**
 * Parse and evaluate tokens using recursive descent parsing.
 */
class Parser {
  private tokens: string[];
  private pos: number;
  private x: number;

  constructor(tokens: string[], x: number) {
    this.tokens = tokens;
    this.pos = 0;
    this.x = x;
  }

  private current(): string | undefined {
    return this.tokens[this.pos];
  }

  private consume(): string | undefined {
    return this.tokens[this.pos++];
  }

  private peek(): string | undefined {
    return this.tokens[this.pos + 1];
  }

  parse(): number {
    const result = this.parseExpression();
    if (this.pos < this.tokens.length) {
      throw new Error(`Unexpected token: ${this.current()}`);
    }
    return result;
  }

  private parseExpression(): number {
    return this.parseAddSub();
  }

  private parseAddSub(): number {
    let left = this.parseMulDiv();

    while (this.current() === "+" || this.current() === "-") {
      const op = this.consume()!;
      const right = this.parseMulDiv();
      left = op === "+" ? left + right : left - right;
    }

    return left;
  }

  private parseMulDiv(): number {
    let left = this.parsePower();

    while (this.current() === "*" || this.current() === "/") {
      const op = this.consume()!;
      const right = this.parsePower();
      left = op === "*" ? left * right : left / right;
    }

    return left;
  }

  private parsePower(): number {
    let left = this.parseUnary();

    if (this.current() === "^") {
      this.consume();
      const right = this.parsePower(); // Right associative
      left = Math.pow(left, right);
    }

    return left;
  }

  private parseUnary(): number {
    if (this.current() === "-") {
      this.consume();
      return -this.parseUnary();
    }
    if (this.current() === "+") {
      this.consume();
      return this.parseUnary();
    }
    return this.parsePrimary();
  }

  private parsePrimary(): number {
    const token = this.current();

    if (!token) {
      throw new Error("Unexpected end of expression");
    }

    // Parentheses
    if (token === "(") {
      this.consume();
      const result = this.parseExpression();
      if (this.current() !== ")") {
        throw new Error("Missing closing parenthesis");
      }
      this.consume();
      return result;
    }

    // Numbers
    if (/^[0-9.]/.test(token)) {
      this.consume();
      return parseFloat(token);
    }

    // Variable x
    if (token === "x" || token === "X") {
      this.consume();
      return this.x;
    }

    // Constants
    if (token in CONSTANTS) {
      this.consume();
      return CONSTANTS[token];
    }

    // Functions
    if (token in MATH_FUNCTIONS) {
      this.consume();
      if (this.current() !== "(") {
        throw new Error(`Expected ( after function ${token}`);
      }
      this.consume();
      const arg = this.parseExpression();
      if (this.current() !== ")") {
        throw new Error("Missing closing parenthesis after function argument");
      }
      this.consume();
      return MATH_FUNCTIONS[token](arg);
    }

    throw new Error(`Unknown token: ${token}`);
  }
}

/**
 * Evaluate a math expression string at a given x value.
 */
export function evaluate(expr: string, x: number): number {
  try {
    // Preprocess: handle implicit multiplication (e.g., 2x -> 2*x)
    let processed = expr
      .replace(/(\d)([a-zA-Z])/g, "$1*$2") // 2x -> 2*x
      .replace(/([a-zA-Z])(\d)/g, "$1*$2") // x2 -> x*2
      .replace(/\)([a-zA-Z0-9])/g, ")*$1") // )x -> )*x
      // Only insert multiplication before '(' for numbers/known constants/variable,
      // avoiding function calls like sin(...), exp(...), log(...).
      .replace(/(\d)\(/g, "$1*(")
      .replace(/\b(x|X|pi|PI|e|E)\(/g, "$1*(")
      .replace(/\)\(/g, ")*("); // )( -> )*(

    const tokens = tokenize(processed);
    const parser = new Parser(tokens, x);
    return parser.parse();
  } catch (error) {
    return NaN;
  }
}

/**
 * Validate that a function string is parseable.
 */
export function validateFunction(expr: string): {
  valid: boolean;
  error?: string;
} {
  try {
    evaluate(expr, 0);
    evaluate(expr, 1);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Invalid expression",
    };
  }
}
