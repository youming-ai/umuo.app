/**
 * Example API Route with Error Handling Middleware Integration
 *
 * This example demonstrates how to integrate the comprehensive error handling
 * middleware system with Next.js API routes.
 */

import { NextRequest, NextResponse } from "next/server";
import { withErrorMiddleware, createEnhancedQueryOptions } from "@/lib/errors";
import Groq from "groq-sdk";

// Example API route with error handling
const handler = withErrorMiddleware(async (req: NextRequest) => {
  // Extract request data
  const { searchParams } = new URL(req.url);
  const simulateError = searchParams.get("simulate");
  const delay = parseInt(searchParams.get("delay") || "0");

  // Simulate delay if requested
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Simulate different types of errors
  switch (simulateError) {
    case "network":
      throw new Error("Network connection failed");

    case "auth":
      const authError = new Error("API authentication failed") as any;
      authError.statusCode = 401;
      throw authError;

    case "validation":
      const validationError = new Error("Invalid input data") as any;
      validationError.statusCode = 400;
      validationError.details = {
        field: "email",
        message: "Invalid email format",
      };
      throw validationError;

    case "timeout":
      await new Promise(resolve => setTimeout(resolve, 35000)); // Exceed timeout
      break;

    case "file-too-large":
      const fileError = new Error("File size exceeds maximum limit") as any;
      fileError.statusCode = 413;
      throw fileError;

    case "transcription-error":
      // Simulate a transcription service error
      throw new Error("Transcription service temporarily unavailable");
  }

  // Normal successful response
  return NextResponse.json({
    success: true,
    message: "Request completed successfully",
    timestamp: new Date().toISOString(),
    data: {
      method: req.method,
      url: req.url,
      userAgent: req.headers.get("user-agent"),
    },
  });
}, {
  timeout: 30000,
  retryAttempts: 3,
});

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };

// Example with custom error transformer
const customHandler = withErrorMiddleware(async (req: NextRequest) => {
  // Your API logic here
  return NextResponse.json({ message: "Success" });
}, {
  timeout: 15000,
  retryAttempts: 2,
  customTransformers: [
    {
      id: "custom-sanitizer",
      name: "Custom Error Sanitizer",
      description: "Custom error message sanitization",
      priority: 1,
      conditions: {
        severities: ["high", "critical"],
      },
      transform: async (error, analysis, context) => {
        // Custom error transformation logic
        return {
          error: {
            ...error,
            message: "A custom error occurred",
            customHandled: true,
          },
          analysis,
          userMessage: "This error has been custom handled",
        };
      },
      tags: ["custom"],
      version: "1.0.0",
    },
  ],
});

// Export the custom handler as an alternative
export { customHandler as GET_CUSTOM };
