/**
 * 安全防护演示模块
 * 展示 XSS 防护功能的使用方法
 */

import {
  checkSecurity,
  sanitizeHtml,
  createSafeElement,
  createSafeSubtitleElement,
  renderSafeFurigana,
  isSafeAttribute,
  type SanitizeOptions,
} from "./security";

/**
 * 演示基本的安全检查功能
 */
export function demonstrateSecurityCheck() {
  console.log("=== 安全检查演示 ===");

  // 危险内容示例
  const dangerousContent =
    '<script>alert("XSS攻击")</script><div onclick="malicious()">点击我</div>';
  const safeContent = "<p>安全的文本内容</p>";

  // 检查危险内容
  const dangerousCheck = checkSecurity(dangerousContent);
  console.log("危险内容检查结果:", dangerousCheck);

  // 检查安全内容
  const safeCheck = checkSecurity(safeContent);
  console.log("安全内容检查结果:", safeCheck);

  return {
    dangerous: dangerousCheck,
    safe: safeCheck,
  };
}

/**
 * 演示 HTML 净化功能
 */
export function demonstrateSanitization() {
  console.log("=== HTML 净化演示 ===");

  const maliciousInput = `
    <div>
      <script>alert('XSS')</script>
      <img src="x" onerror="alert('图片错误')">
      <p>安全的内容 <strong>粗体文本</strong></p>
      <a href="javascript:alert('链接攻击')">恶意链接</a>
      <a href="https://example.com">安全链接</a>
    </div>
  `;

  console.log("原始输入:", maliciousInput);

  // 净化内容
  const sanitized = sanitizeHtml(maliciousInput);
  console.log("净化后:", sanitized);

  return {
    original: maliciousInput,
    sanitized,
  };
}

/**
 * 演示字幕元素的安全创建
 */
export function demonstrateSubtitleCreation() {
  console.log("=== 字幕元素安全创建演示 ===");

  // 模拟字幕数据
  const subtitleContent =
    '这是一条<span style="color:red;">红色</span>字幕<script>alert("XSS")</script>';
  const safeAttributes = {
    "data-start": "100",
    "data-end": "500",
    "data-id": "1",
    class: "subtitle",
  };

  // 创建安全字幕元素
  const safeElement = createSafeSubtitleElement(subtitleContent, safeAttributes);

  console.log("安全字幕元素:", safeElement);
  console.log("元素内容:", safeElement.textContent);
  console.log("元素HTML:", safeElement.innerHTML);

  return safeElement;
}

/**
 * 演示 Furigana 的安全渲染
 */
export function demonstrateFuriganaSecurity() {
  console.log("=== Furigana 安全渲染演示 ===");

  // 正常的 Furigana
  const normalFurigana = "日本語(にほんご)学習(がくしゅう)";
  const normalResult = renderSafeFurigana("日本語学習", normalFurigana);
  console.log("正常 Furigana 结果:", normalResult);

  // 包含危险内容的 Furigana
  const maliciousFurigana = '日本語(にほんご<script>alert("XSS")</script>)';
  const maliciousResult = renderSafeFurigana("日本語", maliciousFurigana);
  console.log("恶意 Furigana 结果:", maliciousResult);

  return {
    normal: normalResult,
    malicious: maliciousResult,
  };
}

/**
 * 演示属性安全检查
 */
export function demonstrateAttributeSafety() {
  console.log("=== 属性安全检查演示 ===");

  const testAttributes = [
    { name: "class", value: "safe-class", expected: true },
    { name: "onclick", value: "alert()", expected: false },
    { name: "href", value: "https://example.com", expected: true },
    { name: "href", value: "javascript:alert()", expected: false },
    { name: "data-id", value: "123", expected: true },
    { name: "style", value: "color:red", expected: false },
  ];

  testAttributes.forEach((attr) => {
    const result = isSafeAttribute(attr.name, attr.value);
    console.log(`${attr.name}="${attr.value}" -> 安全: ${result} (期望: ${attr.expected})`);
  });

  return testAttributes.map((attr) => ({
    ...attr,
    actual: isSafeAttribute(attr.name, attr.value),
  }));
}

/**
 * 运行所有演示
 */
export function runAllSecurityDemos() {
  console.log("开始安全防护演示...\n");

  try {
    demonstrateSecurityCheck();
    console.log("\n");

    demonstrateSanitization();
    console.log("\n");

    demonstrateSubtitleCreation();
    console.log("\n");

    demonstrateFuriganaSecurity();
    console.log("\n");

    demonstrateAttributeSafety();
    console.log("\n");

    console.log("所有演示完成！");
  } catch (error) {
    console.error("演示过程中出错:", error);
  }
}

// 如果在浏览器环境中，可以直接调用演示函数
if (typeof window !== "undefined") {
  // 添加到全局对象以便在浏览器控制台中调用
  (window as any).securityDemos = {
    runAll: runAllSecurityDemos,
    checkSecurity: demonstrateSecurityCheck,
    sanitizeHtml: demonstrateSanitization,
    createSubtitle: demonstrateSubtitleCreation,
    renderFurigana: demonstrateFuriganaSecurity,
    checkAttributes: demonstrateAttributeSafety,
  };
}
