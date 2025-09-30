/**
 * Furigana 模块单元测试
 */

import {
  parseFurigana,
  parseFuriganaAuto,
  detectFuriganaFormat,
  validateFurigana,
  type FuriganaFormat,
} from "./furigana";

describe("Furigana Module", () => {
  describe("parseFurigana - JSON Format", () => {
    test("should parse simple JSON format", () => {
      const furigana = '{"日本語":"にほんご","学習":"がくしゅう"}';
      const originalText = "日本語学習";
      const result = parseFurigana(furigana, originalText, "json");

      expect(result.hasFurigana).toBe(true);
      expect(result.html).toContain("<ruby>日本語<rt>にほんご</rt></ruby>");
      expect(result.html).toContain("<ruby>学習<rt>がくしゅう</rt></ruby>");
    });

    test("should handle partial matches in JSON format", () => {
      const furigana = '{"日本語":"にほんご"}';
      const originalText = "日本語学習";
      const result = parseFurigana(furigana, originalText, "json");

      expect(result.hasFurigana).toBe(true);
      expect(result.html).toContain("<ruby>日本語<rt>にほんご</rt></ruby>");
      expect(result.html).toContain("学習"); // 剩余文本应保留
    });

    test("should handle empty JSON", () => {
      const furigana = "{}";
      const originalText = "日本語学習";
      const result = parseFurigana(furigana, originalText, "json");

      expect(result.hasFurigana).toBe(false);
      expect(result.html).toBe("日本語学習");
    });

    test("should handle invalid JSON gracefully", () => {
      const furigana = "invalid json";
      const originalText = "日本語学習";
      const result = parseFurigana(furigana, originalText, "json");

      expect(result.hasFurigana).toBe(false);
      expect(result.html).toBe("日本語学習");
    });
  });

  describe("parseFurigana - Ruby Format", () => {
    test("should parse ruby tag format", () => {
      const furigana = "<ruby>日本語<rt>にほんご</rt></ruby><ruby>学習<rt>がくしゅう</rt></ruby>";
      const result = parseFurigana(furigana, "", "ruby");

      expect(result.hasFurigana).toBe(true);
      expect(result.html).toContain("<ruby>日本語<rt>にほんご</rt></ruby>");
      expect(result.html).toContain("<ruby>学習<rt>がくしゅう</rt></ruby>");
    });

    test("should handle mixed content in ruby format", () => {
      const furigana = "こんにちは、<ruby>日本語<rt>にほんご</rt></ruby>を学びます。";
      const result = parseFurigana(furigana, "", "ruby");

      expect(result.hasFurigana).toBe(true);
      expect(result.html).toContain("こんにちは、");
      expect(result.html).toContain("<ruby>日本語<rt>にほんご</rt></ruby>");
      expect(result.html).toContain("を学びます。");
    });
  });

  describe("parseFurigana - Brackets Format", () => {
    test("should parse brackets format", () => {
      const furigana = "日本語(にほんご)学習(がくしゅう)";
      const originalText = "日本語学習";
      const result = parseFurigana(furigana, originalText, "brackets");

      expect(result.hasFurigana).toBe(true);
      expect(result.html).toContain("<ruby>日本語<rt>にほんご</rt></ruby>");
      expect(result.html).toContain("<ruby>学習<rt>がくしゅう</rt></ruby>");
    });

    test("should handle unmatched brackets gracefully", () => {
      const furigana = "日本語(にほんご学習";
      const originalText = "日本語学習";
      const result = parseFurigana(furigana, originalText, "brackets");

      expect(result.hasFurigana).toBe(false);
      expect(result.html).toBe("日本語学習");
    });
  });

  describe("parseFurigana - Spaced Format", () => {
    test("should parse spaced format", () => {
      const furigana = "日本語 にほんご 学習 がくしゅう";
      const result = parseFurigana(furigana, "", "spaced");

      expect(result.hasFurigana).toBe(true);
      expect(result.html).toContain("<ruby>日本語<rt>にほんご</rt></ruby>");
      expect(result.html).toContain("<ruby>学習<rt>がくしゅう</rt></ruby>");
    });

    test("should handle incomplete pairs in spaced format", () => {
      const furigana = "日本語 にほんご 学習";
      const result = parseFurigana(furigana, "", "spaced");

      expect(result.hasFurigana).toBe(true);
      expect(result.html).toContain("<ruby>日本語<rt>にほんご</rt></ruby>");
      expect(result.html).toContain("学習"); // 无配对假名的文本
    });
  });

  describe("parseFurigana - MeCab Format", () => {
    test("should parse MeCab format", () => {
      const furigana = `日本語\t名詞,一般,*,*,*,*,日本語,ニホンゴ,ニホンゴ
学習\t名詞,サ変接続,*,*,*,*,学習,ガクシュウ,ガクシュウ
EOS`;
      const result = parseFurigana(furigana, "", "mecab");

      expect(result.hasFurigana).toBe(true);
      expect(result.html).toContain("<ruby>日本語<rt>ニホンゴ</rt></ruby>");
      expect(result.html).toContain("<ruby>学習<rt>ガクシュウ</rt></ruby>");
    });

    test("should handle MeCab format without readings", () => {
      const furigana = `こんにちは\t感動詞,*,*,*,*,*,こんにちは,コンニチハ,コンニチハ
EOS`;
      const result = parseFurigana(furigana, "", "mecab");

      expect(result.hasFurigana).toBe(true);
      expect(result.html).toContain("<ruby>こんにちは<rt>コンニチハ</rt></ruby>");
    });
  });

  describe("parseFurigana - Kuromoji Format", () => {
    test("should parse Kuromoji format", () => {
      const furigana = JSON.stringify([
        { surface_form: "日本語", reading: "ニホンゴ" },
        { surface_form: "学習", reading: "ガクシュウ" },
      ]);
      const result = parseFurigana(furigana, "", "kuromoji");

      expect(result.hasFurigana).toBe(true);
      expect(result.html).toContain("<ruby>日本語<rt>ニホンゴ</rt></ruby>");
      expect(result.html).toContain("<ruby>学習<rt>ガクシュウ</rt></ruby>");
    });

    test("should handle invalid Kuromoji JSON", () => {
      const furigana = "invalid json";
      const result = parseFurigana(furigana, "", "kuromoji");

      expect(result.hasFurigana).toBe(false);
      expect(result.html).toBe("");
    });
  });

  describe("detectFuriganaFormat", () => {
    test("should detect JSON format", () => {
      const format = detectFuriganaFormat('{"日本語":"にほんご"}');
      expect(format).toBe("json");
    });

    test("should detect Ruby format", () => {
      const format = detectFuriganaFormat("<ruby>日本語<rt>にほんご</rt></ruby>");
      expect(format).toBe("ruby");
    });

    test("should detect brackets format", () => {
      const format = detectFuriganaFormat("日本語(にほんご)");
      expect(format).toBe("brackets");
    });

    test("should detect spaced format", () => {
      const format = detectFuriganaFormat("日本語 にほんご 学習 がくしゅう");
      expect(format).toBe("spaced");
    });

    test("should detect MeCab format", () => {
      const format = detectFuriganaFormat("日本語\t名詞,一般,*,*,*,*,日本語,ニホンゴ,ニホンゴ");
      expect(format).toBe("mecab");
    });

    test("should detect Kuromoji format", () => {
      const format = detectFuriganaFormat('[{"surface_form":"日本語","reading":"ニホンゴ"}]');
      expect(format).toBe("kuromoji");
    });

    test("should default to json for unknown format", () => {
      const format = detectFuriganaFormat("unknown format");
      expect(format).toBe("json");
    });
  });

  describe("parseFuriganaAuto", () => {
    test("should auto-detect and parse JSON format", () => {
      const furigana = '{"日本語":"にほんご"}';
      const originalText = "日本語";
      const result = parseFuriganaAuto(furigana, originalText);

      expect(result.hasFurigana).toBe(true);
      expect(result.html).toContain("<ruby>日本語<rt>にほんご</rt></ruby>");
    });

    test("should auto-detect and parse Ruby format", () => {
      const furigana = "<ruby>日本語<rt>にほんご</rt></ruby>";
      const originalText = "日本語";
      const result = parseFuriganaAuto(furigana, originalText);

      expect(result.hasFurigana).toBe(true);
      expect(result.html).toContain("<ruby>日本語<rt>にほんご</rt></ruby>");
    });
  });

  describe("validateFurigana", () => {
    test("should return true for valid furigana", () => {
      const furigana = '{"日本語":"にほんご"}';
      const originalText = "日本語";
      const isValid = validateFurigana(furigana, originalText);

      expect(isValid).toBe(true);
    });

    test("should return false for invalid furigana", () => {
      const furigana = "invalid format";
      const originalText = "日本語";
      const isValid = validateFurigana(furigana, originalText);

      expect(isValid).toBe(false);
    });

    test("should return false for empty furigana", () => {
      const furigana = "";
      const originalText = "日本語";
      const isValid = validateFurigana(furigana, originalText);

      expect(isValid).toBe(false);
    });
  });

  describe("Error Handling", () => {
    test("should handle HTML escaping", () => {
      const furigana = '{"<script>alert(1)</script>":"にほんご"}';
      const originalText = "<script>alert(1)</script>";
      const result = parseFurigana(furigana, originalText, "json");

      expect(result.html).not.toContain("<script>");
      expect(result.html).toContain("&lt;script&gt;");
    });

    test("should handle empty input gracefully", () => {
      const result = parseFurigana("", "", "json");

      expect(result.hasFurigana).toBe(false);
      expect(result.html).toBe("");
    });

    test("should handle null/undefined input", () => {
      const result1 = parseFurigana("", "日本語", "json");
      const result2 = parseFurigana('{"日本語":"にほんご"}', "", "json");

      expect(result1.hasFurigana).toBe(false);
      expect(result2.html).toBe("");
    });
  });

  describe("Edge Cases", () => {
    test("should handle same reading as text", () => {
      const furigana = '{"日本語":"日本語"}';
      const originalText = "日本語";
      const result = parseFurigana(furigana, originalText, "json");

      expect(result.hasFurigana).toBe(false); // 相同的假名不应该显示
      expect(result.html).toBe("日本語");
    });

    test("should handle complex mixed content", () => {
      const furigana = '{"日本語":"にほんご","学習":"がくしゅう"}';
      const originalText = "これは日本語学習です";
      const result = parseFurigana(furigana, originalText, "json");

      expect(result.hasFurigana).toBe(true);
      expect(result.html).toContain("これは");
      expect(result.html).toContain("<ruby>日本語<rt>にほんご</rt></ruby>");
      expect(result.html).toContain("<ruby>学習<rt>がくしゅう</rt></ruby>");
      expect(result.html).toContain("です");
    });

    test("should handle unicode characters", () => {
      const furigana = '{"😊":"emoji"}';
      const originalText = "😊";
      const result = parseFurigana(furigana, originalText, "json");

      expect(result.hasFurigana).toBe(true);
      expect(result.html).toContain("<ruby>😊<rt>emoji</rt></ruby>");
    });
  });
});
