"use client";

import clarity from "@microsoft/clarity";
import { useEffect } from "react";

interface ClarityProviderProps {
  projectId: string;
  children: React.ReactNode;
}

export function ClarityProvider({ projectId, children }: ClarityProviderProps) {
  useEffect(() => {
    // Only initialize Clarity in production or when explicitly enabled
    if (typeof window !== "undefined" && projectId) {
      try {
        clarity.init(projectId);
      } catch (error) {
        console.warn("Failed to initialize Microsoft Clarity:", error);
      }
    }
  }, [projectId]);

  return <>{children}</>;
}
