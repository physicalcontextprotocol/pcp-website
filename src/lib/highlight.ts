import type { Lang } from "@/content/types";

/* Grayscale tokenizer — comments, strings, keywords, numbers, calls.
   Deliberately subtle: white keywords, gray strings, dim comments. */
const KEYWORDS: Partial<Record<Lang, string[]>> = {
  python: [
    "from", "import", "def", "class", "return", "if", "elif", "else", "try",
    "except", "finally", "raise", "with", "as", "for", "while", "in", "not",
    "and", "or", "is", "None", "True", "False", "async", "await", "yield",
    "pass", "break", "continue", "assert", "lambda", "global", "del",
  ],
  typescript: [
    "import", "export", "from", "const", "let", "var", "function", "return",
    "if", "else", "try", "catch", "finally", "throw", "new", "class",
    "extends", "implements", "interface", "type", "enum", "async", "await",
    "yield", "of", "in", "for", "while", "do", "switch", "case", "break",
    "continue", "default", "typeof", "instanceof", "void", "null", "undefined",
    "true", "false", "this", "super", "as", "readonly", "declare", "public",
    "private", "protected", "static", "satisfies",
  ],
  rust: [
    "use", "mod", "pub", "fn", "let", "mut", "const", "static", "struct",
    "enum", "trait", "impl", "for", "in", "if", "else", "match", "loop",
    "while", "break", "continue", "return", "async", "await", "move", "ref",
    "dyn", "where", "as", "type", "unsafe", "crate", "self", "Self", "super",
    "true", "false", "Some", "None", "Ok", "Err",
  ],
  cpp: [
    "include", "define", "namespace", "using", "class", "struct", "enum",
    "public", "private", "protected", "virtual", "override", "template",
    "typename", "auto", "const", "constexpr", "static", "return", "if",
    "else", "try", "catch", "throw", "for", "while", "do", "switch", "case",
    "break", "continue", "new", "delete", "void", "bool", "int", "double",
    "float", "true", "false", "nullptr", "this",
  ],
  toml: ["true", "false"],
};

export interface Tok {
  text: string;
  cls: string | null;
}

export function tokenize(code: string, lang: Lang): Tok[] {
  if (lang === "text") return [{ text: code, cls: null }];
  const kws = new Set(KEYWORDS[lang] ?? []);
  const lineC = lang === "python" || lang === "bash" || lang === "toml" ? "#" : "//";
  const pattern = new RegExp(
    [
      /\/\*[\s\S]*?\*\//.source, // block comment
      `(?:${lineC === "#" ? "#" : "//"})[^\\n]*`, // line comment
      /"(?:\\.|[^"\\])*"/.source, // double string
      /'(?:\\.|[^'\\])*'/.source, // single string
      lang === "typescript" ? /`(?:\\.|[^`\\])*`/.source : null, // template
      /\b\d[\d_]*(?:\.[\d_]+)?(?:[eE][+-]?\d+)?\b/.source, // number
      /[A-Za-z_][A-Za-z0-9_]*/.source, // ident
    ]
      .filter(Boolean)
      .join("|"),
    "g"
  );

  const out: Tok[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(code))) {
    if (m.index > last) out.push({ text: code.slice(last, m.index), cls: null });
    const t = m[0];
    let cls: string | null = null;
    if (t.startsWith("/*") || t.startsWith(lineC)) cls = "tok-com";
    else if (t.startsWith('"') || t.startsWith("'") || t.startsWith("`")) cls = "tok-str";
    else if (/^\d/.test(t)) cls = "tok-num";
    else if (kws.has(t)) cls = "tok-kw";
    else if (lang === "json" && code[m.index + t.length] === ":") cls = "tok-attr";
    else if (code[m.index + t.length] === "(") cls = "tok-fn";
    out.push({ text: t, cls });
    last = m.index + t.length;
  }
  if (last < code.length) out.push({ text: code.slice(last), cls: null });
  return out;
}
