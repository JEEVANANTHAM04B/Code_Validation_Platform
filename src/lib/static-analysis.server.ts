import sqlParserPkg from "node-sql-parser";

const { Parser } = sqlParserPkg as unknown as { Parser: new () => { parse: (sql: string, opt?: unknown) => unknown } };

import type { CodeIssue, Language } from "./validation-types";

const UNSAFE_PYTHON_PATTERNS = [
  { pattern: /\beval\s*\(/i, title: "Unsafe eval() call", category: "Security" },
  { pattern: /\bexec\s*\(/i, title: "Unsafe exec() call", category: "Security" },
  { pattern: /\bos\.system\s*\(/i, title: "Unsafe os.system() call", category: "Security" },
  { pattern: /\bsubprocess\.\w+\s*\(/i, title: "Subprocess usage", category: "Security" },
  { pattern: /\b__import__\s*\(/i, title: "Dynamic import", category: "Security" },
  { pattern: /\bimport\s+os\b/i, title: "os module imported", category: "Security" },
  { pattern: /\bimport\s+subprocess\b/i, title: "subprocess module imported", category: "Security" },
];

const PYTHON_BEST_PRACTICE_PATTERNS = [
  { pattern: /\bprint\s+\(/, title: "Old-style print syntax", category: "Syntax" },
  { pattern: /;\s*\n/, title: "Semicolon used as statement separator", category: "Style" },
];

const SQL_BEST_PRACTICE_PATTERNS = [
  { pattern: /SELECT\s+\*/i, title: "SELECT * used", category: "Best Practices" },
  { pattern: /DROP\s+TABLE/i, title: "Destructive DROP TABLE", category: "Security" },
  { pattern: /DELETE\s+FROM\s+\w+\s*;?\s*$/i, title: "Unqualified DELETE", category: "Security" },
];

function getLineNumber(code: string, index: number): number {
  return code.slice(0, index).split("\n").length;
}

function findPatternIssues(code: string, patterns: Array<{ pattern: RegExp; title: string; category: string }>): CodeIssue[] {
  const issues: CodeIssue[] = [];
  for (const { pattern, title, category } of patterns) {
    pattern.lastIndex = 0;
    const matches = code.matchAll(new RegExp(pattern, "gmi"));
    for (const match of matches) {
      if (match.index == null) continue;
      issues.push({
        severity: category === "Security" ? "critical" : "warning",
        category,
        line: getLineNumber(code, match.index),
        title,
        detail: `Found "${match[0].trim()}" in the code.`,
        fix: `Review and replace with a safer alternative.`,
      });
    }
  }
  return issues;
}

function analyzePythonSyntax(code: string): CodeIssue[] {
  const issues: CodeIssue[] = [];

  // Basic indentation check
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const stripped = line.replace(/\n/g, "");
    if (stripped.length > 0 && !stripped.startsWith(" ") && !stripped.startsWith("\t") && !stripped.startsWith("#")) {
      // Lines at root level don't need indentation, but mixed tabs/spaces do
      if (line.includes("\t") && line.includes("  ")) {
        issues.push({
          severity: "warning",
          category: "Style",
          line: i + 1,
          title: "Mixed indentation",
          detail: "Line mixes tabs and spaces.",
          fix: "Use spaces consistently (PEP 8 recommends 4 spaces).",
        });
      }
    }
  }

  // Check for unbalanced parentheses, brackets, braces (simple heuristic)
  const pairs: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
  const stack: string[] = [];
  for (let i = 0; i < code.length; i++) {
    const char = code[i] ?? "";
    if (pairs[char]) {
      stack.push(char);
    } else if (Object.values(pairs).includes(char)) {
      const last = stack.pop();
      if (!last || pairs[last] !== char) {
        issues.push({
          severity: "critical",
          category: "Syntax",
          line: getLineNumber(code, i),
          title: "Unbalanced bracket",
          detail: `Unexpected closing '${char}'.`,
          fix: "Check matching parentheses, brackets and braces.",
        });
      }
    }
  }
  if (stack.length > 0) {
    const open = stack[stack.length - 1] ?? "";
    const idx = code.lastIndexOf(open);
    issues.push({
      severity: "critical",
      category: "Syntax",
      line: getLineNumber(code, idx),
      title: "Unclosed bracket",
      detail: `Opening '${open}' was never closed.`,
      fix: "Add the matching closing bracket.",
    });
  }

  // Naming convention check (simple)
  const functionDef = /def\s+([A-Za-z_]\w*)\s*\(/g;
  for (const match of code.matchAll(functionDef)) {
    const name = match[1];
    if (name && /[A-Z]/.test(name)) {
      issues.push({
        severity: "warning",
        category: "Style",
        line: getLineNumber(code, match.index ?? 0),
        title: "Non-PEP8 function name",
        detail: `Function "${name}" uses camelCase/PascalCase instead of snake_case.`,
        fix: "Rename to lowercase_with_underscores.",
      });
    }
  }

  return issues;
}

function analyzeSQLSyntax(code: string): CodeIssue[] {
  const issues: CodeIssue[] = [];
  const parser = new Parser();

  try {
    parser.parse(code, { database: "SQLite" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const match = message.match(/line\s+(\d+)/i);
    const line = match?.[1] ? parseInt(match[1], 10) : null;
    issues.push({
      severity: "critical",
      category: "Syntax",
      line,
      title: "SQL syntax error",
      detail: message.slice(0, 300),
      fix: "Correct the SQL syntax according to SQLite dialect.",
    });
  }

  return issues;
}

export interface StaticAnalysisResult {
  issues: CodeIssue[];
  language: Language;
  hasSyntaxError: boolean;
  hasSecurityIssue: boolean;
}

export function runStaticAnalysis(code: string, language: Language): StaticAnalysisResult {
  let issues: CodeIssue[] = [];

  if (language === "python") {
    issues = [...findPatternIssues(code, UNSAFE_PYTHON_PATTERNS), ...findPatternIssues(code, PYTHON_BEST_PRACTICE_PATTERNS), ...analyzePythonSyntax(code)];
  } else {
    issues = [...findPatternIssues(code, SQL_BEST_PRACTICE_PATTERNS), ...analyzeSQLSyntax(code)];
  }

  // Deduplicate by line + title
  const seen = new Set<string>();
  issues = issues.filter((issue) => {
    const key = `${issue.line}:${issue.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const hasSyntaxError = issues.some((i) => i.category === "Syntax" && i.severity === "critical");
  const hasSecurityIssue = issues.some((i) => i.category === "Security");

  return { issues, language, hasSyntaxError, hasSecurityIssue };
}
