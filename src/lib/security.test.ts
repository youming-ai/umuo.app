import {
  checkSecurity,
  sanitizeHtml,
  sanitizeText,
  isSafeAttribute,
  encodeHtmlEntities,
  renderSafeFurigana,
  type SecurityCheckResult,
  type SanitizeOptions,
} from "./security";

// Mock DOM methods for Jest environment
beforeEach(() => {
  // Mock document.createElement
  global.document = {
    createElement: jest.fn((tagName) => ({
      tagName: tagName.toUpperCase(),
      textContent: "",
      innerHTML: "",
      getAttribute: jest.fn(),
      setAttribute: jest.fn(),
      hasAttribute: jest.fn(),
    })),
  } as any;
});

describe("Security Module", () => {
  describe("encodeHtmlEntities", () => {
    it("应该正确编码 HTML 实体", () => {
      expect(encodeHtmlEntities('<script>alert("xss")</script>')).toBe(
        "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;",
      );

      expect(encodeHtmlEntities("Hello & World")).toBe("Hello &amp; World");

      expect(encodeHtmlEntities("Normal text")).toBe("Normal text");
    });
  });

  describe("checkSecurity", () => {
    it("应该检测到危险标签", () => {
      const result = checkSecurity('<script>alert("xss")</script>');

      expect(result.isSafe).toBe(false);
      expect(result.score).toBeLessThan(80);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe("dangerous_tag");
      expect(result.issues[0].severity).toBe("critical");
    });

    it("应该检测到危险属性", () => {
      const result = checkSecurity("<div onclick=\"alert('xss')\">Click me</div>");

      expect(result.isSafe).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe("dangerous_attribute");
      expect(result.issues[0].severity).toBe("high");
    });

    it("应该检测到 CSS 注入", () => {
      const result = checkSecurity("<div style=\"expression(alert('xss'))\">Text</div>");

      expect(result.isSafe).toBe(false);
      expect(result.issues.some((issue) => issue.type === "css_injection")).toBe(true);
    });

    it("应该检测到脚本注入", () => {
      const result = checkSecurity('<img src="x" onerror="alert(\'xss\')">');

      expect(result.isSafe).toBe(false);
      expect(result.issues.some((issue) => issue.type === "script_injection")).toBe(true);
    });

    it("应该通过安全内容", () => {
      const result = checkSecurity("<div>Normal text</div>");

      expect(result.isSafe).toBe(true);
      expect(result.score).toBe(100);
      expect(result.issues).toHaveLength(0);
    });

    it("应该处理空内容", () => {
      const result = checkSecurity("");

      expect(result.isSafe).toBe(true);
      expect(result.score).toBe(100);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe("sanitizeHtml", () => {
    it("应该移除危险标签", () => {
      const input = '<script>alert("xss")</script><p>Safe content</p>';
      const result = sanitizeHtml(input);

      expect(result).not.toContain("<script>");
      expect(result).toContain("Safe content");
    });

    it("应该移除危险属性", () => {
      const input = '<div onclick="alert(\'xss\')" class="safe">Content</div>';
      const result = sanitizeHtml(input);

      expect(result).not.toContain("onclick");
      expect(result).toContain('class="safe"');
    });

    it("应该保留允许的标签", () => {
      const input = "<p>Paragraph <strong>strong text</strong></p>";
      const result = sanitizeHtml(input);

      expect(result).toContain("<p>");
      expect(result).toContain("<strong>");
      expect(result).toContain("Paragraph");
      expect(result).toContain("strong text");
    });

    it("应该处理空输入", () => {
      const result = sanitizeHtml("");
      expect(result).toBe("");
    });

    it("应该使用自定义配置", () => {
      const options: SanitizeOptions = {
        allowedTags: ["p"],
        allowedAttributes: { p: ["class"] },
      };

      const input = '<p class="test">Text</p><div>Not allowed</div>';
      const result = sanitizeHtml(input, options);

      expect(result).toContain('<p class="test">');
      expect(result).not.toContain("<div>");
    });
  });

  describe("sanitizeText", () => {
    it("应该移除所有 HTML 标签", () => {
      const input = "<p>Text <strong>with</strong> tags</p>";
      const result = sanitizeText(input);

      expect(result).toBe("Text with tags");
    });

    it("应该编码 HTML 实体", () => {
      const input = "Hello & World < >";
      const result = sanitizeText(input);

      expect(result).toBe("Hello &amp; World &lt; &gt;");
    });
  });

  describe("isSafeAttribute", () => {
    it("应该检测危险属性", () => {
      expect(isSafeAttribute("onclick", "alert()")).toBe(false);
      expect(isSafeAttribute("onerror", "malicious()")).toBe(false);
      expect(isSafeAttribute("href", "javascript:alert()")).toBe(false);
    });

    it("应该允许安全属性", () => {
      expect(isSafeAttribute("class", "safe-class")).toBe(true);
      expect(isSafeAttribute("data-id", "123")).toBe(true);
      expect(isSafeAttribute("href", "https://example.com")).toBe(true);
    });
  });

  describe("renderSafeFurigana", () => {
    it("应该安全地渲染 Furigana", () => {
      const result = renderSafeFurigana("日本語", "日本語(にほんご)");

      expect(result).toContain("<ruby>");
      expect(result).toContain("<rt>");
      expect(result).toContain("にほんご");
      expect(result).not.toContain("<script>");
    });

    it("应该处理空 Furigana", () => {
      const result = renderSafeFurigana("日本語", "");

      expect(result).toBe("日本語");
    });

    it("应该处理无效 Furigana", () => {
      const result = renderSafeFurigana("日本語", "invalid{format}");

      expect(result).toBe("日本語");
    });

    it("应该编码特殊字符", () => {
      const result = renderSafeFurigana("<script>", "<script>(dangerous)");

      expect(result).toContain("&lt;script&gt;");
      expect(result).not.toContain("<script>");
    });
  });

  describe("复杂场景", () => {
    it("应该处理混合攻击", () => {
      const input = `
        <div>
          <script>alert('xss')</script>
          <img src="x" onerror="alert('img')">
          <style>body { background: expression(alert('css')) }</style>
          <p>Safe content</p>
        </div>
      `;

      const securityCheck = checkSecurity(input);
      expect(securityCheck.isSafe).toBe(false);
      expect(securityCheck.issues.length).toBeGreaterThan(1);

      const sanitized = sanitizeHtml(input);
      expect(sanitized).not.toContain("<script>");
      expect(sanitized).not.toContain("onerror");
      expect(sanitized).not.toContain("expression");
      expect(sanitized).toContain("Safe content");
    });

    it("应该处理嵌套的复杂结构", () => {
      const input = `
        <div class="container">
          <ruby>日本<rt>にほん</rt></ruby>
          <span data-info="test">Text</span>
          <iframe src="malicious.html"></iframe>
        </div>
      `;

      const securityCheck = checkSecurity(input);
      expect(securityCheck.isSafe).toBe(false);

      const sanitized = sanitizeHtml(input, {
        allowedTags: ["div", "span", "ruby", "rt"],
        allowedAttributes: {
          div: ["class"],
          span: ["data-info"],
          ruby: [],
          rt: [],
        },
      });

      expect(sanitized).toContain("<ruby>");
      expect(sanitized).toContain("<rt>");
      expect(sanitized).toContain("にほん");
      expect(sanitized).not.toContain("<iframe>");
    });

    it("应该处理 Unicode 和特殊字符", () => {
      const input = '日本語 & "Quotes" and <tags>';
      const result = sanitizeHtml(input);

      expect(result).toContain("日本語");
      expect(result).toContain("&amp;");
      expect(result).toContain("&quot;");
      expect(result).toContain("&lt;tags&gt;");
    });
  });

  describe("性能测试", () => {
    it("应该能够处理中等大小的内容", () => {
      const largeContent = "<div>".repeat(100) + "Content" + "</div>".repeat(100);

      const start = performance.now();
      const result = sanitizeHtml(largeContent);
      const end = performance.now();

      expect(result).not.toContain("<div>");
      expect(end - start).toBeLessThan(50); // 应该在 50ms 内完成
    });

    it("应该缓存频繁使用的正则表达式", () => {
      const input = "<div>Test</div>";

      // 多次调用同一个输入
      const results = Array(10)
        .fill(0)
        .map(() => sanitizeHtml(input));

      expect(results.every((r) => r === "Test")).toBe(true);
    });
  });
});
