import { checkSecurity, sanitizeHtml, isSafeAttribute } from "./security";

describe("Security Module Basic Tests", () => {
  describe("checkSecurity", () => {
    it("应该检测到危险标签", () => {
      const result = checkSecurity('<script>alert("xss")</script>');
      expect(result.isSafe).toBe(false);
      expect(result.score).toBeLessThan(80);
    });

    it("应该通过安全内容", () => {
      const result = checkSecurity("<div>Normal text</div>");
      expect(result.isSafe).toBe(true);
      expect(result.score).toBe(100);
    });

    it("应该处理空内容", () => {
      const result = checkSecurity("");
      expect(result.isSafe).toBe(true);
      expect(result.score).toBe(100);
    });
  });

  describe("sanitizeHtml", () => {
    it("应该移除危险标签", () => {
      const input = '<script>alert("xss")</script><p>Safe content</p>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain("<script>");
      expect(result).toContain("Safe content");
    });

    it("应该保留安全的标签", () => {
      const input = "<p>Paragraph <strong>strong text</strong></p>";
      const result = sanitizeHtml(input);
      expect(result).toContain("<p>");
      expect(result).toContain("<strong>");
      expect(result).toContain("Paragraph");
    });

    it("应该处理空输入", () => {
      const result = sanitizeHtml("");
      expect(result).toBe("");
    });
  });

  describe("isSafeAttribute", () => {
    it("应该检测危险属性", () => {
      expect(isSafeAttribute("onclick", "alert()")).toBe(false);
      expect(isSafeAttribute("href", "javascript:alert()")).toBe(false);
    });

    it("应该允许安全属性", () => {
      expect(isSafeAttribute("class", "safe-class")).toBe(true);
      expect(isSafeAttribute("data-id", "123")).toBe(true);
    });
  });
});
