import { formatDuration, formatFileSize, formatTimeForVtt } from "./utils";

describe("Utility Functions", () => {
  describe("formatDuration", () => {
    test("should format seconds to human readable format", () => {
      expect(formatDuration(30)).toBe("30s");
      expect(formatDuration(90)).toBe("1m 30s");
      expect(formatDuration(120)).toBe("2m");
      expect(formatDuration(125)).toBe("2m 5s");
    });

    test("should handle zero and negative values", () => {
      expect(formatDuration(0)).toBe("0s");
      expect(formatDuration(-1)).toBe("-1s");
    });

    test("should format single minute correctly", () => {
      expect(formatDuration(60)).toBe("1m");
      expect(formatDuration(61)).toBe("1m 1s");
    });
  });

  describe("formatFileSize", () => {
    test("should format bytes to human readable format", () => {
      expect(formatFileSize(512)).toBe("512 B");
      expect(formatFileSize(1024)).toBe("1 KB");
      expect(formatFileSize(1048576)).toBe("1 MB");
      expect(formatFileSize(1073741824)).toBe("1 GB");
    });

    test("should handle zero and negative values", () => {
      expect(formatFileSize(0)).toBe("0 B");
      expect(formatFileSize(-1)).toBe("-1 B");
    });

    test("should format with decimal places for large values", () => {
      expect(formatFileSize(1536)).toBe("1.5 KB");
      expect(formatFileSize(1572864)).toBe("1.5 MB");
      expect(formatFileSize(2048)).toBe("2 KB");
    });

    test("should handle small file sizes correctly", () => {
      expect(formatFileSize(1)).toBe("1 B");
      expect(formatFileSize(1023)).toBe("1023 B");
      expect(formatFileSize(1024)).toBe("1 KB");
    });
  });

  describe("formatTimeForVtt", () => {
    test("should format time to WebVTT format", () => {
      expect(formatTimeForVtt(0)).toBe("00:00:00.000");
      expect(formatTimeForVtt(30.5)).toBe("00:00:30.500");
      expect(formatTimeForVtt(90)).toBe("00:01:30.000");
      expect(formatTimeForVtt(3661.123)).toBe("01:01:01.123");
    });

    test("should handle edge cases", () => {
      expect(formatTimeForVtt(0.999)).toBe("00:00:00.999");
      expect(formatTimeForVtt(59.999)).toBe("00:00:59.999");
      expect(formatTimeForVtt(3599.999)).toBe("00:59:59.998");
      expect(formatTimeForVtt(3600)).toBe("01:00:00.000");
    });

    test("should format hours correctly", () => {
      expect(formatTimeForVtt(3600)).toBe("01:00:00.000");
      expect(formatTimeForVtt(3661)).toBe("01:01:01.000");
      expect(formatTimeForVtt(7200)).toBe("02:00:00.000");
    });
  });
});
