/**
 * Example API Route with Error Handling Middleware
 *
 * This demonstrates how to use the error handling middleware with Next.js API routes.
 * The route includes examples of different error types and scenarios.
 */

import { withErrorMiddleware } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Define request schema
const requestSchema = z.object({
  action: z.enum(["success", "network-error", "validation-error", "auth-error", "timeout"]),
  message: z.string().optional(),
});

/**
 * Main handler wrapped with error middleware
 */
async function handler(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { action, message } = requestSchema.parse(body);

    // Simulate different scenarios based on action
    switch (action) {
      case "success":
        return NextResponse.json({
          success: true,
          message: "Operation completed successfully",
          data: { timestamp: new Date().toISOString() },
        });

      case "network-error":
        // Simulate network error
        throw new Error("Network connection failed. Unable to reach the server.");

      case "validation-error":
        // Simulate validation error
        throw new Error("Invalid input data. Please check your request parameters.");

      case "auth-error":
        // Simulate authentication error
        const authError = new Error("Authentication failed. Invalid API key.");
        (authError as any).statusCode = 401;
        throw authError;

      case "timeout":
        // Simulate timeout error
        await new Promise(resolve => setTimeout(resolve, 35000)); // Exceeds 30s timeout
        return NextResponse.json({ message: "This should not be reached" });

      default:
        return NextResponse.json({
          success: false,
          error: "Unknown action",
        }, { status: 400 });
    }
  } catch (error) {
    // The error middleware will handle this automatically
    // But we can add additional context if needed
    console.log("Handler caught error:", error);
    throw error;
  }
}

/**
 * Export the wrapped handler with error middleware configuration
 */
export const GET = withErrorMiddleware(handler, {
  timeout: 30000,
  retryAttempts: 2,
  customTransformers: [
    {
      id: "example-transformer",
      name: "Example Transformer",
      description: "Example transformer for demonstration",
      priority: 1,
      conditions: {
        errorTypes: [],
        categories: [],
        severities: [],
        custom: (error: any, context: any) => {
          return context.request?.url?.includes("/example-with-middleware") || false;
        },
      },
      transform: async (error: any, analysis: any, context: any) => {
        // Add example context to the error
        error.exampleContext = {
          route: "/api/example-with-middleware",
          timestamp: new Date().toISOString(),
          handled: true,
        };

        return {
          error,
          analysis,
          userMessage: `Example route error: ${error.message}`,
          recovery: {
            id: "example-recovery",
            type: "manual" as const,
            title: "Example Recovery",
            description: "This is an example recovery suggestion",
            steps: [
              {
                id: "step1",
                title: "Check your input",
                description: "Verify that your request data is correct",
                type: "information" as const,
                required: true,
                automated: false,
                estimatedDuration: 1000,
              },
            ],
            successProbability: 0.8,
            estimatedTime: 2000,
            requiredUserAction: true,
            allowSkip: false,
            primaryAction: {
              id: "retry-action",
              label: "Retry",
              description: "Retry the request",
              type: "retry" as const,
              primary: true,
            },
          },
        };
      },
      tags: ["example", "demo"],
      version: "1.0.0",
    },
  ],
});

export const POST = GET; // Use the same handler for POST requests

/**
 * Example of how to use the middleware in a more complex scenario
 */
export async function complexHandlerExample(req: NextRequest) {
  // The middleware automatically provides:
  // - Error classification and analysis
  // - User-friendly error messages
  // - Recovery suggestions
  // - Performance monitoring
  // - Error analytics
  // - Mobile optimizations

  try {
    // Your complex logic here
    const data = await someComplexOperation();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    // The middleware will handle this automatically
    // No need for manual error handling here
    throw error;
  }
}

/**
 * Simulated complex operation that might fail
 */
async function someComplexOperation(): Promise<any> {
  // Simulate some work
  await new Promise(resolve => setTimeout(resolve, 100));

  // Simulate potential failure
  if (Math.random() < 0.3) {
    throw new Error("Complex operation failed");
  }

  return { result: "success" };
}
