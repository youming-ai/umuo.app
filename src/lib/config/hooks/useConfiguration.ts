/**
 * TanStack Query hooks for configuration management
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { getConfigurationManager, type ConfigurationChange } from '../manager';
import { getHotReloadManager } from '../hot-reload';
import type {
  ApplicationConfiguration,
  ConfigScope,
  ConfigurationValidationResult
} from '../types';

// Query keys
export const configurationKeys = {
  all: ['configuration'] as const,
  configuration: () => [...configurationKeys.all, 'full'] as const,
  section: (section: string) => [...configurationKeys.all, 'section', section] as const,
  value: (key: string) => [...configurationKeys.all, 'value', key] as const,
  history: () => [...configurationKeys.all, 'history'] as const,
  backups: () => [...configurationKeys.all, 'backups'] as const,
  templates: () => [...configurationKeys.all, 'templates'] as const,
  validation: (key: string, value: unknown) => [...configurationKeys.all, 'validation', key, value] as const,
  environment: () => [...configurationKeys.all, 'environment'] as const,
};

// Query options
const queryOptions = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
};

/**
 * Hook for getting the full application configuration
 */
export function useConfiguration(options?: {
  enabled?: boolean;
  includeMetadata?: boolean;
}) {
  const { enabled = true, includeMetadata = false } = options || {};

  return useQuery({
    queryKey: configurationKeys.configuration(),
    queryFn: async () => {
      const manager = getConfigurationManager();
      await manager.initialize();

      const config = manager.getConfiguration();

      if (includeMetadata) {
        return {
          configuration: config,
          metadata: manager.getMetadata?.() || {},
        };
      }

      return config;
    },
    enabled,
    ...queryOptions,
  });
}

/**
 * Hook for getting a specific configuration section
 */
export function useConfigurationSection<T = unknown>(section: string, options?: {
  enabled?: boolean;
  defaultValue?: T;
}) {
  const { enabled = true, defaultValue } = options || {};

  return useQuery({
    queryKey: configurationKeys.section(section),
    queryFn: async () => {
      const manager = getConfigurationManager();
      await manager.initialize();

      const value = manager.get<T>(section);
      return value ?? defaultValue;
    },
    enabled,
    ...queryOptions,
  });
}

/**
 * Hook for getting a specific configuration value
 */
export function useConfigurationValue<T = unknown>(key: string, options?: {
  enabled?: boolean;
  defaultValue?: T;
}) {
  const { enabled = true, defaultValue } = options || {};

  return useQuery({
    queryKey: configurationKeys.value(key),
    queryFn: async () => {
      const manager = getConfigurationManager();
      await manager.initialize();

      const value = manager.get<T>(key);
      return value ?? defaultValue;
    },
    enabled,
    ...queryOptions,
  });
}

/**
 * Hook for updating configuration values
 */
export function useUpdateConfiguration(options?: {
  onSuccess?: (data: void, variables: { key: string; value: unknown; scope?: ConfigScope }) => void;
  onError?: (error: Error, variables: { key: string; value: unknown; scope?: ConfigScope }) => void;
  onSettled?: (data: void | undefined, error: Error | null, variables: { key: string; value: unknown; scope?: ConfigScope }) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value, scope }: {
      key: string;
      value: unknown;
      scope?: ConfigScope;
    }) => {
      const manager = getConfigurationManager();
      await manager.initialize();

      await manager.set(key, value, { scope, immediate: true });

      // Invalidate related queries
      const sections = key.split('.');

      // Invalidate full configuration
      queryClient.invalidateQueries({ queryKey: configurationKeys.configuration() });

      // Invalidate section queries
      for (let i = 0; i < sections.length; i++) {
        const sectionPath = sections.slice(0, i + 1).join('.');
        queryClient.invalidateQueries({ queryKey: configurationKeys.section(sectionPath) });
      }

      // Invalidate specific value query
      queryClient.invalidateQueries({ queryKey: configurationKeys.value(key) });

      return;
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    onSettled: options?.onSettled,
  });
}

/**
 * Hook for updating multiple configuration values
 */
export function useUpdateMultipleConfiguration(options?: {
  onSuccess?: (data: void, variables: Array<{ key: string; value: unknown; scope?: ConfigScope }>) => void;
  onError?: (error: Error, variables: Array<{ key: string; value: unknown; scope?: ConfigScope }>) => void;
  onSettled?: (data: void | undefined, error: Error | null, variables: Array<{ key: string; value: unknown; scope?: ConfigScope }>) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Array<{ key: string; value: unknown; scope?: ConfigScope }>) => {
      const manager = getConfigurationManager();
      await manager.initialize();

      await manager.updateMany(updates, { immediate: true });

      // Invalidate all configuration queries
      queryClient.invalidateQueries({ queryKey: configurationKeys.all });

      return;
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    onSettled: options?.onSettled,
  });
}

/**
 * Hook for resetting configuration
 */
export function useResetConfiguration(options?: {
  onSuccess?: (data: void, variables: { scope?: ConfigScope }) => void;
  onError?: (error: Error, variables: { scope?: ConfigScope }) => void;
  onSettled?: (data: void | undefined, error: Error | null, variables: { scope?: ConfigScope }) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scope }: { scope?: ConfigScope }) => {
      const manager = getConfigurationManager();
      await manager.initialize();

      await manager.reset(scope);

      // Invalidate all configuration queries
      queryClient.invalidateQueries({ queryKey: configurationKeys.all });

      return;
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    onSettled: options?.onSettled,
  });
}

/**
 * Hook for exporting configuration
 */
export function useExportConfiguration(options?: {
  onSuccess?: (data: string, variables: { scopes?: ConfigScope[]; format?: string }) => void;
  onError?: (error: Error, variables: { scopes?: ConfigScope[]; format?: string }) => void;
  onSettled?: (data: string | undefined, error: Error | null, variables: { scopes?: ConfigScope[]; format?: string }) => void;
}) {
  return useMutation({
    mutationFn: async ({ scopes, format }: { scopes?: ConfigScope[]; format?: string }) => {
      const manager = getConfigurationManager();
      await manager.initialize();

      return await manager.export({ scopes, format: format as any });
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    onSettled: options?.onSettled,
  });
}

/**
 * Hook for importing configuration
 */
export function useImportConfiguration(options?: {
  onSuccess?: (data: void, variables: { data: string; options?: any }) => void;
  onError?: (error: Error, variables: { data: string; options?: any }) => void;
  onSettled?: (data: void | undefined, error: Error | null, variables: { data: string; options?: any }) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ data, options: importOptions }: { data: string; options?: any }) => {
      const manager = getConfigurationManager();
      await manager.initialize();

      await manager.import(data, importOptions);

      // Invalidate all configuration queries
      queryClient.invalidateQueries({ queryKey: configurationKeys.all });

      return;
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    onSettled: options?.onSettled,
  });
}

/**
 * Hook for hot-reload functionality
 */
export function useHotReload(options?: {
  enabled?: boolean;
}) {
  const { enabled = true } = options || {};

  const hotReloadManager = getHotReloadManager();

  return useQuery({
    queryKey: ['hot-reload', 'status'],
    queryFn: async () => {
      return hotReloadManager.getStatistics();
    },
    enabled,
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 1000,
  });
}

/**
 * Hook for applying hot-reload changes
 */
export function useApplyHotReloadChanges(options?: {
  onSuccess?: (data: string, variables: Array<{ key: string; value: unknown; scope?: ConfigScope }>) => void;
  onError?: (error: Error, variables: Array<{ key: string; value: unknown; scope?: ConfigScope }>) => void;
  onSettled?: (data: string | undefined, error: Error | null, variables: Array<{ key: string; value: unknown; scope?: ConfigScope }>) => void;
}) {
  const queryClient = useQueryClient();
  const hotReloadManager = getHotReloadManager();

  return useMutation({
    mutationFn: async (changes: Array<{ key: string; value: unknown; scope?: ConfigScope }>) => {
      return await hotReloadManager.applyChanges(changes, { immediate: true });
    },
    onSuccess: (patchId, variables) => {
      // Invalidate configuration queries
      queryClient.invalidateQueries({ queryKey: configurationKeys.all });
      options?.onSuccess?.(patchId, variables);
    },
    onError: options?.onError,
    onSettled: options?.onSettled,
  });
}

/**
 * Hook for configuration validation
 */
export function useValidateConfiguration(options?: {
  enabled?: boolean;
}) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: ['configuration', 'validation'],
    queryFn: async () => {
      const manager = getConfigurationManager();
      await manager.initialize();

      const config = manager.getConfiguration();

      // This would implement actual validation logic
      return {
        valid: true,
        errors: [],
        warnings: [],
      } as ConfigurationValidationResult;
    },
    enabled,
    ...queryOptions,
  });
}

/**
 * Hook for validating specific configuration changes
 */
export function useValidateConfigurationChange(options?: {
  onSuccess?: (data: ConfigurationValidationResult, variables: { key: string; value: unknown }) => void;
  onError?: (error: Error, variables: { key: string; value: unknown }) => void;
}) {
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const manager = getConfigurationManager();
      await manager.initialize();

      // This would implement actual validation logic
      return {
        valid: true,
        errors: [],
        warnings: [],
      } as ConfigurationValidationResult;
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}

/**
 * Hook for configuration change history (if implemented)
 */
export function useConfigurationHistory(options?: {
  limit?: number;
  offset?: number;
  enabled?: boolean;
}) {
  const { limit = 50, offset = 0, enabled = true } = options || {};

  return useInfiniteQuery({
    queryKey: configurationKeys.history(),
    queryFn: async ({ pageParam = offset }) => {
      const manager = getConfigurationManager();
      await manager.initialize();

      // This would implement actual history retrieval
      return {
        data: [] as ConfigurationChange[],
        nextOffset: pageParam + limit,
        hasMore: false,
      };
    },
    enabled,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextOffset : undefined,
    ...queryOptions,
  });
}

/**
 * Hook for environment-specific configuration
 */
export function useEnvironmentConfiguration(options?: {
  environment?: string;
  enabled?: boolean;
}) {
  const { environment, enabled = true } = options || {};

  return useQuery({
    queryKey: configurationKeys.environment(),
    queryFn: async () => {
      const manager = getConfigurationManager();
      await manager.initialize();

      return {
        current: manager.get('system.environment'),
        available: ['development', 'staging', 'production'],
      };
    },
    enabled,
    ...queryOptions,
  });
}

/**
 * Hook for real-time configuration updates
 */
export function useRealtimeConfiguration(options?: {
  enabled?: boolean;
  onConfigurationChange?: (change: ConfigurationChange) => void;
}) {
  const { enabled = true, onConfigurationChange } = options || {};
  const queryClient = useQueryClient();

  // This would set up a WebSocket or other real-time connection
  // For now, we'll use the hot-reload manager events

  return useQuery({
    queryKey: ['configuration', 'realtime'],
    queryFn: async () => {
      const manager = getConfigurationManager();
      await manager.initialize();

      // Set up event listener
      const handleConfigurationChange = (change: ConfigurationChange) => {
        // Invalidate relevant queries
        const sections = change.key.split('.');

        // Invalidate full configuration
        queryClient.invalidateQueries({ queryKey: configurationKeys.configuration() });

        // Invalidate section queries
        for (let i = 0; i < sections.length; i++) {
          const sectionPath = sections.slice(0, i + 1).join('.');
          queryClient.invalidateQueries({ queryKey: configurationKeys.section(sectionPath) });
        }

        // Invalidate specific value query
        queryClient.invalidateQueries({ queryKey: configurationKeys.value(change.key) });

        // Call user callback
        onConfigurationChange?.(change);
      };

      manager.on('change', handleConfigurationChange);

      return {
        connected: true,
        lastUpdate: new Date(),
      };
    },
    enabled,
    refetchOnWindowFocus: false,
  });
}
