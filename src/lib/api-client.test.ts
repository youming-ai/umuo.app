import { fetchWithErrorHandling, handleWithRetry } from "./error-handler";
import {
  apiRequest,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  ApiResponse,
  ApiRequestConfig,
  ApiClient,
  createApiClient,
} from "./api-client";

// Mock error-handler
jest.mock("./error-handler", () => ({
  fetchWithErrorHandling: jest.fn(),
  handleWithRetry: jest.fn(),
  handleError: jest.fn(),
}));

describe("API Client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("apiRequest", () => {
    test("should make successful GET request", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        data: { message: "Success" },
        statusCode: 200,
      };

      (fetchWithErrorHandling as jest.Mock).mockResolvedValue(mockResponse);

      const config: ApiRequestConfig = {
        method: "GET",
        url: "https://api.example.com/data",
      };

      const result = await apiRequest(config.url!, config);
      expect(result).toEqual(mockResponse);
      expect(fetchWithErrorHandling).toHaveBeenCalledWith(config.url, {
        method: "GET",
        headers: {},
      });
    });

    test("should make POST request with body", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        data: { id: 1 },
        statusCode: 201,
      };

      (fetchWithErrorHandling as jest.Mock).mockResolvedValue(mockResponse);

      const config: ApiRequestConfig = {
        method: "POST",
        url: "https://api.example.com/data",
        body: { name: "Test" },
        headers: { "Content-Type": "application/json" },
      };

      const result = await apiRequest(config.url!, config);
      expect(result).toEqual(mockResponse);
      expect(fetchWithErrorHandling).toHaveBeenCalledWith(config.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test" }),
      });
    });

    test("should handle API errors", async () => {
      const mockError = new Error("Network error");
      (fetchWithErrorHandling as jest.Mock).mockRejectedValue(mockError);

      const config: ApiRequestConfig = {
        method: "GET",
        url: "https://api.example.com/data",
      };

      const result = await apiRequest(config.url!, config);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("UNKNOWN_ERROR");
      expect(result.statusCode).toBe(500);
    });
  });

  describe("apiGet", () => {
    test("should make GET request with shorthand method", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        data: { message: "Success" },
        statusCode: 200,
      };

      (fetchWithErrorHandling as jest.Mock).mockResolvedValue(mockResponse);

      const result = await apiGet("https://api.example.com/data");
      expect(result).toEqual(mockResponse);
      expect(fetchWithErrorHandling).toHaveBeenCalledWith("https://api.example.com/data", {
        method: "GET",
        headers: {},
      });
    });
  });

  describe("apiPost", () => {
    test("should make POST request with shorthand method", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        data: { id: 1 },
        statusCode: 201,
      };

      (fetchWithErrorHandling as jest.Mock).mockResolvedValue(mockResponse);

      const result = await apiPost("https://api.example.com/data", { name: "Test" });
      expect(result).toEqual(mockResponse);
      expect(fetchWithErrorHandling).toHaveBeenCalledWith("https://api.example.com/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test" }),
      });
    });
  });

  describe("apiPut", () => {
    test("should make PUT request with shorthand method", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        data: { id: 1, name: "Updated" },
        statusCode: 200,
      };

      (fetchWithErrorHandling as jest.Mock).mockResolvedValue(mockResponse);

      const result = await apiPut("https://api.example.com/data/1", { name: "Updated" });
      expect(result).toEqual(mockResponse);
      expect(fetchWithErrorHandling).toHaveBeenCalledWith("https://api.example.com/data/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      });
    });
  });

  describe("apiDelete", () => {
    test("should make DELETE request with shorthand method", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        data: null,
        statusCode: 204,
      };

      (fetchWithErrorHandling as jest.Mock).mockResolvedValue(mockResponse);

      const result = await apiDelete("https://api.example.com/data/1");
      expect(result).toEqual(mockResponse);
      expect(fetchWithErrorHandling).toHaveBeenCalledWith("https://api.example.com/data/1", {
        method: "DELETE",
        headers: {},
      });
    });
  });

  describe("createApiClient", () => {
    test("should create API client with base URL", () => {
      const client = createApiClient("https://api.example.com");
      expect(client).toBeDefined();
      expect(client.get).toBeDefined();
      expect(client.post).toBeDefined();
      expect(client.put).toBeDefined();
      expect(client.delete).toBeDefined();
    });

    test("should create API client with default headers", () => {
      const client = createApiClient("https://api.example.com", {
        defaultHeaders: {
          Authorization: "Bearer token",
        },
      });
      expect(client).toBeDefined();
    });
  });

  describe("ApiClient", () => {
    let client: ApiClient;

    beforeEach(() => {
      client = createApiClient("https://api.example.com");
    });

    test("should make GET request with full URL", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        data: { message: "Success" },
        statusCode: 200,
      };

      (fetchWithErrorHandling as jest.Mock).mockResolvedValue(mockResponse);

      const result = await client.get("/data");
      expect(result).toEqual(mockResponse);
      expect(fetchWithErrorHandling).toHaveBeenCalledWith("https://api.example.com/data", {
        method: "GET",
        headers: {},
      });
    });

    test("should make POST request with full URL", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        data: { id: 1 },
        statusCode: 201,
      };

      (fetchWithErrorHandling as jest.Mock).mockResolvedValue(mockResponse);

      const result = await client.post("/data", { name: "Test" });
      expect(result).toEqual(mockResponse);
      expect(fetchWithErrorHandling).toHaveBeenCalledWith("https://api.example.com/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test" }),
      });
    });

    test("should make PUT request with full URL", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        data: { id: 1, name: "Updated" },
        statusCode: 200,
      };

      (fetchWithErrorHandling as jest.Mock).mockResolvedValue(mockResponse);

      const result = await client.put("/data/1", { name: "Updated" });
      expect(result).toEqual(mockResponse);
      expect(fetchWithErrorHandling).toHaveBeenCalledWith("https://api.example.com/data/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      });
    });

    test("should make DELETE request with full URL", async () => {
      const mockResponse: ApiResponse = {
        success: true,
        data: null,
        statusCode: 204,
      };

      (fetchWithErrorHandling as jest.Mock).mockResolvedValue(mockResponse);

      const result = await client.delete("/data/1");
      expect(result).toEqual(mockResponse);
      expect(fetchWithErrorHandling).toHaveBeenCalledWith("https://api.example.com/data/1", {
        method: "DELETE",
        headers: {},
      });
    });

    test("should include default headers in requests", async () => {
      const clientWithHeaders = createApiClient("https://api.example.com", {
        defaultHeaders: {
          Authorization: "Bearer token",
        },
      });

      const mockResponse: ApiResponse = {
        success: true,
        data: { message: "Success" },
        statusCode: 200,
      };

      (fetchWithErrorHandling as jest.Mock).mockResolvedValue(mockResponse);

      const result = await clientWithHeaders.get("/data");
      expect(result).toEqual(mockResponse);
      expect(fetchWithErrorHandling).toHaveBeenCalledWith("https://api.example.com/data", {
        method: "GET",
        headers: { Authorization: "Bearer token" },
      });
    });
  });
});
