/**
 * 安全防护模块
 * 提供 HTML 净化、XSS 防护和内容安全检查功能
 */

/**
 * 净化配置选项
 */
export interface SanitizeOptions {
  /**
   * 允许的 HTML 标签
   */
  allowedTags?: string[];

  /**
   * 允许的属性
   */
  allowedAttributes?: Record<string, string[]>;

  /**
   * 是否允许 CSS 样式
   */
  allowStyles?: boolean;

  /**
   * 是否允许数据 URL
   */
  allowDataUrls?: boolean;

  /**
   * 是否移除注释
   */
  removeComments?: boolean;
}

/**
 * 安全检查结果
 */
export interface SecurityCheckResult {
  /**
   * 是否安全
   */
  isSafe: boolean;

  /**
   * 发现的问题
   */
  issues: SecurityIssue[];

  /**
   * 净化后的内容
   */
  sanitizedContent?: string;

  /**
   * 安全评分 (0-100)
   */
  score: number;
}

/**
 * 安全问题类型
 */
export interface SecurityIssue {
  /**
   * 问题类型
   */
  type:
    | "xss"
    | "css_injection"
    | "script_injection"
    | "dangerous_tag"
    | "dangerous_attribute"
    | "malformed_html";

  /**
   * 严重程度
   */
  severity: "low" | "medium" | "high" | "critical";

  /**
   * 问题描述
   */
  description: string;

  /**
   * 问题位置（如果有）
   */
  position?: {
    line: number;
    column: number;
  };
}

/**
 * 默认允许的 HTML 标签（安全的语义化标签）
 */
const DEFAULT_ALLOWED_TAGS = [
  "div",
  "span",
  "p",
  "br",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "s",
  "del",
  "ins",
  "ul",
  "ol",
  "li",
  "dl",
  "dt",
  "dd",
  "blockquote",
  "code",
  "pre",
  "kbd",
  "samp",
  "a",
  "img",
  "picture",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
  "col",
  "colgroup",
  "ruby",
  "rt",
  "rp",
  "rb", // 日语假名标注支持
  "small",
  "sub",
  "sup",
];

/**
 * 默认允许的属性
 */
const DEFAULT_ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ["href", "title", "target"],
  img: ["src", "alt", "title", "width", "height", "loading"],
  picture: ["srcset", "sizes"],
  div: ["class", "id", "data-*"],
  span: ["class", "id", "data-*"],
  p: ["class", "id", "data-*"],
  h1: ["class", "id", "data-*"],
  h2: ["class", "id", "data-*"],
  h3: ["class", "id", "data-*"],
  h4: ["class", "id", "data-*"],
  h5: ["class", "id", "data-*"],
  h6: ["class", "id", "data-*"],
  strong: ["class", "id", "data-*"],
  em: ["class", "id", "data-*"],
  b: ["class", "id", "data-*"],
  i: ["class", "id", "data-*"],
  u: ["class", "id", "data-*"],
  s: ["class", "id", "data-*"],
  del: ["class", "id", "data-*"],
  ins: ["class", "id", "data-*"],
  ul: ["class", "id", "data-*"],
  ol: ["class", "id", "data-*"],
  li: ["class", "id", "data-*"],
  dl: ["class", "id", "data-*"],
  dt: ["class", "id", "data-*"],
  dd: ["class", "id", "data-*"],
  blockquote: ["class", "id", "data-*"],
  code: ["class", "id", "data-*"],
  pre: ["class", "id", "data-*"],
  kbd: ["class", "id", "data-*"],
  samp: ["class", "id", "data-*"],
  table: ["class", "id", "data-*"],
  thead: ["class", "id", "data-*"],
  tbody: ["class", "id", "data-*"],
  tfoot: ["class", "id", "data-*"],
  tr: ["class", "id", "data-*"],
  th: ["class", "id", "data-*"],
  td: ["class", "id", "data-*"],
  caption: ["class", "id", "data-*"],
  col: ["class", "id", "data-*"],
  colgroup: ["class", "id", "data-*"],
  ruby: ["class", "id", "data-*"],
  rt: ["class", "id", "data-*"],
  rp: ["class", "id", "data-*"],
  rb: ["class", "id", "data-*"],
  small: ["class", "id", "data-*"],
  sub: ["class", "id", "data-*"],
  sup: ["class", "id", "data-*"],
  br: ["class", "id", "data-*"],
  hr: ["class", "id", "data-*"],
  "*": ["class", "id", "data-*"],
};

/**
 * 危险标签（不允许的标签）
 */
const DANGEROUS_TAGS = [
  "script",
  "iframe",
  "frame",
  "frameset",
  "object",
  "embed",
  "applet",
  "link",
  "style",
  "meta",
  "base",
  "form",
  "input",
  "button",
  "select",
  "textarea",
  "option",
  "optgroup",
  "label",
  "fieldset",
  "legend",
  "datalist",
  "keygen",
  "output",
  "progress",
  "meter",
  "details",
  "summary",
  "dialog",
  "menu",
  "menuitem",
  "canvas",
  "svg",
  "math",
  "noscript",
  "template",
  "slot",
  "audio",
  "video",
  "source",
  "track",
];

/**
 * 危险属性（不允许的属性）
 */
const DANGEROUS_ATTRIBUTES = [
  "onload",
  "onerror",
  "onclick",
  "ondblclick",
  "onmousedown",
  "onmouseup",
  "onmouseover",
  "onmouseout",
  "onmousemove",
  "onkeydown",
  "onkeyup",
  "onkeypress",
  "onfocus",
  "onblur",
  "onchange",
  "onsubmit",
  "onreset",
  "onselect",
  "onunload",
  "onabort",
  "oncanplay",
  "oncanplaythrough",
  "oncuechange",
  "ondurationchange",
  "onemptied",
  "onended",
  "onerror",
  "onloadeddata",
  "onloadedmetadata",
  "onloadstart",
  "onpause",
  "onplay",
  "onplaying",
  "onprogress",
  "onratechange",
  "onseeked",
  "onseeking",
  "onstalled",
  "onsuspend",
  "ontimeupdate",
  "onvolumechange",
  "onwaiting",
  "onwheel",
  "oncut",
  "oncopy",
  "onpaste",
  "ondrag",
  "ondragend",
  "ondragenter",
  "ondragleave",
  "ondragover",
  "ondragstart",
  "ondrop",
  "onscroll",
  "onresize",
  "oncontextmenu",
  "oninput",
  "oninvalid",
  "onsearch",
  "onshow",
  "ontoggle",
  "javascript:",
  "data:",
  "vbscript:",
  "livescript:",
  "eval",
  "expression",
  "script",
  "import",
  "from",
];

/**
 * CSS 注入模式
 */
const CSS_INJECTION_PATTERNS = [
  /expression\s*\(/i,
  /javascript\s*:/i,
  /eval\s*\(/i,
  /@import\s/i,
  /url\s*\(\s*['"]?(?:data|javascript|vbscript):/i,
  /-moz-binding\s*:/i,
  /behavior\s*:\s*url\s*\(/i,
  /content\s*:\s*['"]?(?:data|javascript|vbscript):/i,
];

/**
 * HTML 实体编码
 */
const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;",
};

/**
 * 检查内容安全性
 */
export function checkSecurity(content: string, options: SanitizeOptions = {}): SecurityCheckResult {
  const issues: SecurityIssue[] = [];
  let score = 100;

  // 基本检查
  if (!content || typeof content !== "string") {
    return {
      isSafe: true,
      issues: [],
      score: 100,
    };
  }

  // 检查危险标签
  const dangerousTagMatches = findDangerousTags(content);
  dangerousTagMatches.forEach((match) => {
    issues.push({
      type: "dangerous_tag",
      severity: "critical",
      description: `发现危险标签: <${match.tag}>`,
      position: match.position,
    });
    score -= 20;
  });

  // 检查危险属性
  const dangerousAttrMatches = findDangerousAttributes(content);
  dangerousAttrMatches.forEach((match) => {
    issues.push({
      type: "dangerous_attribute",
      severity: "high",
      description: `发现危险属性: ${match.attr}="${match.value}"`,
      position: match.position,
    });
    score -= 15;
  });

  // 检查 CSS 注入
  if (!options.allowStyles) {
    const cssInjectionMatches = findCssInjection(content);
    cssInjectionMatches.forEach((match) => {
      issues.push({
        type: "css_injection",
        severity: "high",
        description: `发现可能的 CSS 注入: ${match.pattern}`,
        position: match.position,
      });
      score -= 10;
    });
  }

  // 检查 script 注入
  const scriptInjectionMatches = findScriptInjection(content);
  scriptInjectionMatches.forEach((match) => {
    issues.push({
      type: "script_injection",
      severity: "critical",
      description: `发现脚本注入: ${match.snippet}`,
      position: match.position,
    });
    score -= 25;
  });

  // 检查 HTML 格式
  const malformedHtmlIssues = findMalformedHtml(content);
  malformedHtmlIssues.forEach((issue) => {
    issues.push({
      type: "malformed_html",
      severity: "low",
      description: issue.description,
      position: issue.position,
    });
    score -= 5;
  });

  // 计算最终安全性
  const isSafe =
    score >= 80 &&
    !issues.some((issue) => issue.severity === "critical" || issue.severity === "high");

  return {
    isSafe,
    issues,
    score: Math.max(0, score),
  };
}

/**
 * 净化 HTML 内容
 */
export function sanitizeHtml(content: string, options: SanitizeOptions = {}): string {
  if (!content || typeof content !== "string") {
    return content || "";
  }

  const allowedTags = options.allowedTags || DEFAULT_ALLOWED_TAGS;
  const allowedAttributes = { ...DEFAULT_ALLOWED_ATTRIBUTES, ...options.allowedAttributes };
  const removeComments = options.removeComments !== false;

  // 基本净化：移除危险内容
  let sanitized = content;

  // 移除危险标签
  DANGEROUS_TAGS.forEach((tag) => {
    const regex = new RegExp(`<${tag}\\b[^>]*>.*?<\\/${tag}>`, "gis");
    sanitized = sanitized.replace(regex, "");

    // 也处理自闭合标签
    const selfClosingRegex = new RegExp(`<${tag}\\b[^>]*\\/>`, "gi");
    sanitized = sanitized.replace(selfClosingRegex, "");
  });

  // 移除注释
  if (removeComments) {
    sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, "");
  }

  // 移除危险属性
  DANGEROUS_ATTRIBUTES.forEach((attr) => {
    const regex = new RegExp(`${attr}\\s*=\\s*["'][^"']*["']`, "gi");
    sanitized = sanitized.replace(regex, "");
  });

  // 净化允许的标签：找到所有允许的标签，净化它们的属性，保留它们
  const allowedTagsRegex = new RegExp(`<(${allowedTags.join("|")})(\\b[^>]*)>`, "gi");
  const closingTagsRegex = new RegExp(`<\\/(${allowedTags.join("|")})>`, "gi");

  // 临时保存净化的标签内容
  const allowedTagMatches: Array<{ match: string; sanitized: string; start: number; end: number }> =
    [];
  const closingTagMatches: Array<{ match: string; start: number; end: number }> = [];

  // 处理开始标签
  sanitized = sanitized.replace(allowedTagsRegex, (match, tag, attributes, offset) => {
    const sanitizedAttributes = sanitizeAttributes(tag, attributes, allowedAttributes);
    const sanitizedMatch = `<${tag}${sanitizedAttributes}>`;
    allowedTagMatches.push({
      match,
      sanitized: sanitizedMatch,
      start: offset,
      end: offset + match.length,
    });
    return `__ALLOWED_TAG_${allowedTagMatches.length - 1}__`;
  });

  // 处理结束标签
  sanitized = sanitized.replace(closingTagsRegex, (match, tag, offset) => {
    closingTagMatches.push({
      match,
      start: offset,
      end: offset + match.length,
    });
    return `__CLOSING_TAG_${closingTagMatches.length - 1}__`;
  });

  // 移除任何剩余的 HTML 标签
  sanitized = sanitized.replace(/<[^>]+>/g, "");

  // 恢复允许的标签
  allowedTagMatches.forEach((tagMatch, index) => {
    sanitized = sanitized.replace(`__ALLOWED_TAG_${index}__`, tagMatch.sanitized);
  });

  closingTagMatches.forEach((tagMatch, index) => {
    sanitized = sanitized.replace(`__CLOSING_TAG_${index}__`, tagMatch.match);
  });

  return sanitized;
}

/**
 * 净化文本内容（纯文本模式）
 */
export function sanitizeText(content: string): string {
  if (!content || typeof content !== "string") {
    return content || "";
  }

  // 移除所有 HTML 标签
  let sanitized = content.replace(/<[^>]+>/g, "");

  // 解码 HTML 实体以获得纯文本
  sanitized = decodeHtmlEntities(sanitized);

  // 重新编码 HTML 实体以确保安全
  sanitized = encodeHtmlEntities(sanitized);

  return sanitized;
}

/**
 * 安全地设置元素内容
 */
export function setElementContent(
  element: HTMLElement,
  content: string,
  options: SanitizeOptions = {},
): void {
  // 首先进行安全检查
  const securityCheck = checkSecurity(content, options);

  if (!securityCheck.isSafe) {
    console.warn("Security issues detected:", securityCheck.issues);
    // 使用净化后的内容
    content = sanitizeHtml(content, options);
  }

  // 使用 textContent 而不是 innerHTML
  element.textContent = content;
}

/**
 * 安全地创建元素
 */
export function createSafeElement(
  tagName: string,
  content: string,
  attributes: Record<string, string> = {},
  options: SanitizeOptions = {},
): HTMLElement {
  const element = document.createElement(tagName);

  // 设置安全的属性
  Object.entries(attributes).forEach(([key, value]) => {
    if (isSafeAttribute(key, value)) {
      element.setAttribute(key, value);
    }
  });

  // 设置安全的内容
  setElementContent(element, content, options);

  return element;
}

/**
 * 检查属性是否安全
 */
export function isSafeAttribute(name: string, value: string): boolean {
  // 检查危险属性
  if (DANGEROUS_ATTRIBUTES.some((attr) => name.toLowerCase().includes(attr))) {
    return false;
  }

  // 检查危险值
  if (DANGEROUS_ATTRIBUTES.some((attr) => value.toLowerCase().includes(attr))) {
    return false;
  }

  // 检查数据 URL
  if (value.startsWith("data:") && name !== "src") {
    return false;
  }

  return true;
}

/**
 * 查找危险标签
 */
function findDangerousTags(
  content: string,
): Array<{ tag: string; position?: { line: number; column: number } }> {
  const results: Array<{ tag: string; position?: { line: number; column: number } }> = [];

  DANGEROUS_TAGS.forEach((tag) => {
    const regex = new RegExp(`<${tag}\\b[^>]*>`, "gi");
    let match;

    while ((match = regex.exec(content)) !== null) {
      results.push({
        tag,
        position: getLineColumn(content, match.index),
      });
    }
  });

  return results;
}

/**
 * 查找危险属性
 */
function findDangerousAttributes(
  content: string,
): Array<{ attr: string; value: string; position?: { line: number; column: number } }> {
  const results: Array<{
    attr: string;
    value: string;
    position?: { line: number; column: number };
  }> = [];

  DANGEROUS_ATTRIBUTES.forEach((attr) => {
    const regex = new RegExp(`${attr}\\s*=\\s*["']([^"']*?)["']`, "gi");
    let match;

    while ((match = regex.exec(content)) !== null) {
      results.push({
        attr,
        value: match[1],
        position: getLineColumn(content, match.index),
      });
    }
  });

  return results;
}

/**
 * 查找 CSS 注入
 */
function findCssInjection(
  content: string,
): Array<{ pattern: string; position?: { line: number; column: number } }> {
  const results: Array<{ pattern: string; position?: { line: number; column: number } }> = [];

  CSS_INJECTION_PATTERNS.forEach((pattern) => {
    let match;

    while ((match = pattern.exec(content)) !== null) {
      results.push({
        pattern: match[0],
        position: getLineColumn(content, match.index),
      });
    }
  });

  return results;
}

/**
 * 查找脚本注入
 */
function findScriptInjection(
  content: string,
): Array<{ snippet: string; position?: { line: number; column: number } }> {
  const results: Array<{ snippet: string; position?: { line: number; column: number } }> = [];

  // 查找 script 标签
  const scriptRegex = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(content)) !== null) {
    results.push({
      snippet: match[0],
      position: getLineColumn(content, match.index),
    });
  }

  // 查找 JavaScript 协议
  const jsProtocolRegex = /javascript:[^"'\s]*/gi;
  while ((match = jsProtocolRegex.exec(content)) !== null) {
    results.push({
      snippet: match[0],
      position: getLineColumn(content, match.index),
    });
  }

  return results;
}

/**
 * 查找格式错误的 HTML
 */
function findMalformedHtml(
  content: string,
): Array<{ description: string; position?: { line: number; column: number } }> {
  const results: Array<{ description: string; position?: { line: number; column: number } }> = [];

  // 查找未闭合的标签
  const openTags = content.match(/<([a-z][a-z0-9]*)\b[^>]*>/gi) || [];
  const closeTags = content.match(/<\/([a-z][a-z0-9]*)>/gi) || [];

  if (openTags.length !== closeTags.length) {
    results.push({
      description: "HTML 标签不匹配",
      position: getLineColumn(content, content.length),
    });
  }

  return results;
}

/**
 * 净化属性
 */
function sanitizeAttributes(
  tagName: string,
  attributes: string,
  allowedAttributes: Record<string, string[]>,
): string {
  if (!attributes) return "";

  const attrs = attributes.trim();
  if (!attrs) return "";

  const result: string[] = [];
  const attrRegex = /([^\s=]+)\s*=\s*["']([^"']*?)["']/g;
  let match;

  while ((match = attrRegex.exec(attrs)) !== null) {
    const [fullMatch, attrName, attrValue] = match;

    // 检查是否允许此属性
    const allowedForTag = allowedAttributes[tagName] || allowedAttributes["*"] || [];
    const allowedForAll = allowedAttributes["*"] || [];

    if (
      allowedForTag.includes(attrName) ||
      allowedForAll.includes(attrName) ||
      attrName.startsWith("data-")
    ) {
      // 额外检查属性值的安全性
      if (isSafeAttribute(attrName, attrValue)) {
        result.push(`${attrName}="${encodeHtmlEntities(attrValue)}"`);
      }
    }
  }

  return result.length > 0 ? " " + result.join(" ") : "";
}

/**
 * 编码 HTML 实体
 */
export function encodeHtmlEntities(text: string): string {
  return text.replace(/[&<>"'/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * 解码 HTML 实体
 */
function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

/**
 * 获取行列位置
 */
function getLineColumn(content: string, index: number): { line: number; column: number } {
  const lines = content.substring(0, index).split("\n");
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;

  return { line, column };
}

/**
 * 创建安全的字幕元素（专门用于字幕）
 */
export function createSafeSubtitleElement(
  content: string,
  attributes: Record<string, string> = {},
): HTMLElement {
  // 字幕特定的安全配置
  const subtitleOptions: SanitizeOptions = {
    allowedTags: ["div", "span", "small", "ruby", "rt", "rp", "rb", "br"],
    allowedAttributes: {
      div: ["class", "data-start", "data-end", "data-id"],
      span: ["class"],
      small: ["class"],
      ruby: ["class"],
      rt: ["class"],
      rp: ["class"],
      rb: ["class"],
      br: ["class"],
    },
    allowStyles: false,
    allowDataUrls: false,
    removeComments: true,
  };

  return createSafeElement("div", content, attributes, subtitleOptions);
}

/**
 * 安全的 Furigana 渲染
 */
export function renderSafeFurigana(text: string, furigana: string): string {
  if (!furigana || !furigana.trim()) {
    return encodeHtmlEntities(text);
  }

  try {
    // 基本的 Furigana 格式解析（简化版本）
    const furiganaRegex = /([^\s()]+)\(([^)]+)\)/g;
    let result = text;

    // 替换 Furigana 括号格式为安全的 HTML
    result = result.replace(furiganaRegex, (match, word, reading) => {
      return `<ruby>${encodeHtmlEntities(word)}<rt>${encodeHtmlEntities(reading)}</rt></ruby>`;
    });

    // 确保最终结果是安全的
    return sanitizeHtml(result, {
      allowedTags: ["ruby", "rt"],
      allowedAttributes: {
        ruby: [],
        rt: [],
      },
    });
  } catch (error) {
    console.warn("Furigana rendering failed:", error);
    return encodeHtmlEntities(text);
  }
}
