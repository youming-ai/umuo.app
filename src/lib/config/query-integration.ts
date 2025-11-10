/**
 * TanStack Query Integration for Configuration Management
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  QueryKey,
  UseQueryOptions,
  UseMutationOptions
} from '@tanstack/react-query';
import type {
  ApplicationConfiguration,
  ConfigScope,
  ConfigurationMetadata
} from './types';
import { getConfigurationManager } from './manager';
import { getHotReloadManager } from './hot-reload';
import {
  transcriptionConfigManager,
  mobileConfigManager,
  performanceConfigManager,
  memoryConfigManager,
  accessibilityConfigManager
} from './modules';

// Query keys
export const configurationKeys = {
  all: ['configuration'] as const,
  main: () => [...configurationKeys.all, 'main'] as const,
  section: (section: keyof ApplicationConfiguration) => [...configurationKeys.all, section] as const,
  key: (key: string) => [...configurationKeys.all, 'key', key] as const,
  metadata: () => [...configurationKeys.all, 'metadata'] as const,
  environment: () => [...configurationKeys.all, 'environment'] as const,
  hotReload: () => [...configurationKeys.all, 'hotReload'] as const,

  // Module-specific keys
  transcription: () => [...configurationKeys.all, 'transcription'] as const,
  mobile: () => [...configurationKeys.all, 'mobile'] as const,
  performance: () => [...configurationKeys.all, 'performance'] as const,
  memory: () => [...configurationKeys.all, 'memory'] as const,
  accessibility: () => [...configurationKeys.all, 'accessibility'] as const,

  // Admin keys
  admin: {
    all: ['configuration', 'admin'] as const,
    backups: () => [...configurationKeys.admin.all, 'backups'] as const,
    templates: () => [...configurationKeys.admin.all, 'templates'] as const,
    auditLogs: () => [...configurationKeys.admin.all, 'auditLogs'] as const,
    systemStatus: () => [...configurationKeys.admin.all, 'systemStatus'] as const,
  }
} as const;

// Default query options
const defaultQueryOptions = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
} satisfies Partial<UseQueryOptions>;

/**
 * Hook to get complete configuration
 */
export function useConfiguration(options?: Partial<UseQueryOptions<ApplicationConfiguration>>) {
  return useQuery({
    queryKey: configurationKeys.main(),
    queryFn: async () => {
      const configManager = getConfigurationManager();
      await configManager.initialize();
      return configManager.getConfiguration();
    },
    ...defaultQueryOptions,
    ...options
  });
}

/**
 * Hook to get specific configuration section
 */
export function useConfigurationSection<T extends keyof ApplicationConfiguration>(
  section: T,
  options?: Partial<UseQueryOptions<ApplicationConfiguration[T]>>
) {
  return useQuery({
    queryKey: configurationKeys.section(section),
    queryFn: async () => {
      const configManager = getConfigurationManager();
      await configManager.initialize();
      return configManager.get<ApplicationConfiguration[T]>(section);
    },
    ...defaultQueryOptions,
    ...options
  });
}

/**
 * Hook to get specific configuration value
 */
export function useConfigurationValue<T = unknown>(
  key: string,
  options?: Partial<UseQueryOptions<T>>
) {
  return useQuery({
    queryKey: configurationKeys.key(key),
    queryFn: async () => {
      const configManager = getConfigurationManager();
      await configManager.initialize();
      return configManager.get<T>(key);
    },
    ...defaultQueryOptions,
    ...options
  });
}

/**
 * Hook to get configuration metadata
 */
export function useConfigurationMetadata(options?: Partial<UseQueryOptions<ConfigurationMetadata>>) {
  return useQuery({
    queryKey: configurationKeys.metadata(),
    queryFn: async () => {
      const configManager = getConfigurationManager();
      await configManager.initialize();
      return {
        version: '1.0.0',
        environment: configManager.get('system.environment') || 'development',
        lastModified: new Date(),
        checksum: 'checksum',
        migrationHistory: []
      } as ConfigurationMetadata;
    },
    ...defaultQueryOptions,
    ...options
  });
}

/**
 * Hook to get environment information
 */
export function useConfigurationEnvironment(options?: Partial<UseQueryOptions<string>>) {
  return useQuery({
    queryKey: configurationKeys.environment(),
    queryFn: async () => {
      const configManager = getConfigurationManager();
      await configManager.initialize();
      return configManager.get('system.environment') || 'development';
    },
    ...defaultQueryOptions,
    ...options
  });
}

/**
 * Mutation hook to update configuration
 */
export function useUpdateConfiguration(
  options?: Partial<UseMutationOptions<void, Error, {
    key: string;
    value: unknown;
    scope?: ConfigScope;
    immediate?: boolean;
  }>>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value, scope = 'user', immediate = false }) => {
      const configManager = getConfigurationManager();
      await configManager.initialize();
      await configManager.set(key, value, { scope, immediate });
    },
    onSuccess: (_, { key }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: configurationKeys.main() });

      // Invalidate specific section query
      const section = key.split('.')[0] as keyof ApplicationConfiguration;
      queryClient.invalidateQueries({ queryKey: configurationKeys.section(section) });
      queryClient.invalidateQueries({ queryKey: configurationKeys.key(key) });
    },
    ...options
  });
}

/**
 * Mutation hook to update multiple configuration values
 */
export function useUpdateMultipleConfiguration(
  options?: Partial<UseMutationOptions<void, Error, Array<{
    key: string;
    value: unknown;
    scope?: ConfigScope;
  }>>>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates) => {
      const configManager = getConfigurationManager();
      await configManager.initialize();
      await configManager.updateMany(updates);
    },
    onSuccess: () => {
      // Invalidate all configuration queries
      queryClient.invalidateQueries({ queryKey: configurationKeys.all });
    },
    ...options
  });
}

/**
 * Mutation hook to reset configuration
 */
export function useResetConfiguration(
  options?: Partial<UseMutationOptions<void, Error, { scope?: ConfigScope }>>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scope = 'user' }) => {
      const configManager = getConfigurationManager();
      await configManager.initialize();
      await configManager.reset(scope);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: configurationKeys.all });
    },
    ...options
  });
}

/**
 * Mutation hook to export configuration
 */
export function useExportConfiguration(
  options?: Partial<UseMutationOptions<string, Error, {
    scopes?: ConfigScope[];
    includeMetadata?: boolean;
  }>>
) {
  return useMutation({
    mutationFn: async ({ scopes, includeMetadata }) => {
      const configManager = getConfigurationManager();
      await configManager.initialize();
      return configManager.export({ scopes, includeMetadata });
    },
    ...options
  });
}

/**
 * Mutation hook to import configuration
 */
export function useImportConfiguration(
  options?: Partial<UseMutationOptions<void, Error, {
    data: string;
    overwrite?: boolean;
    validateOnly?: boolean;
  }>>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ data, overwrite, validateOnly }) => {
      const configManager = getConfigurationManager();
      await configManager.initialize();
      await configManager.import(data, { overwrite, validateOnly });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: configurationKeys.all });
    },
    ...options
  });
}

/**
 * Hook to get hot-reload status
 */
export function useHotReloadStatus(options?: Partial<UseQueryOptions<{
  enabled: boolean;
  pendingChanges: number;
  appliedPatches: number;
  lastChange: Date | null;
  options: any;
}>>) {
  return useQuery({
    queryKey: configurationKeys.hotReload(),
    queryFn: async () => {
      const hotReloadManager = getHotReloadManager();
      return hotReloadManager.getStatistics();
    },
    refetchInterval: 5000, // Poll every 5 seconds for hot-reload status
    ...defaultQueryOptions,
    ...options
  });
}

/**
 * Mutation hook to apply hot-reload changes
 */
export function useApplyHotReloadChanges(
  options?: Partial<UseMutationOptions<string, Error, Array<{
    key: string;
    value: unknown;
    scope?: ConfigScope;
  }>>>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (changes) => {
      const hotReloadManager = getHotReloadManager();
      return hotReloadManager.applyChanges(changes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: configurationKeys.all });
      queryClient.invalidateQueries({ queryKey: configurationKeys.hotReload() });
    },
    ...options
  });
}

// Module-specific hooks

/**
 * Hook for transcription configuration
 */
export function useTranscriptionConfiguration(options?: Partial<UseQueryOptions<any>>) {
  return useQuery({
    queryKey: configurationKeys.transcription(),
    queryFn: async () => {
      await transcriptionConfigManager.getConfiguration();
    },
    ...defaultQueryOptions,
    ...options
  });
}

/**
 * Mutation hook for transcription configuration updates
 */
export function useUpdateTranscriptionConfiguration(
  options?: Partial<UseMutationOptions<void, Error, Partial<any>>>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates) => {
      await transcriptionConfigManager.updateConfiguration(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: configurationKeys.transcription() });
      queryClient.invalidateQueries({ queryKey: configurationKeys.section('transcription') });
    },
    ...options
  });
}

/**
 * Hook for mobile configuration
 */
export function useMobileConfiguration(options?: Partial<UseQueryOptions<any>>) {
  return useQuery({
    queryKey: configurationKeys.mobile(),
    queryFn: async () => {
      return mobileConfigManager.getConfiguration();
    },
    ...defaultQueryOptions,
    ...options
  });
}

/**
 * Mutation hook for mobile configuration updates
 */
export function useUpdateMobileConfiguration(
  options?: Partial<UseMutationOptions<void, Error, Partial<any>>>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates) => {
      await mobileConfigManager.updateConfiguration(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: configurationKeys.mobile() });
      queryClient.invalidateQueries({ queryKey: configurationKeys.section('mobile') });
    },
    ...options
  });
}

/**
 * Hook for performance configuration
 */
export function usePerformanceConfiguration(options?: Partial<UseQueryOptions<any>>) {
  return useQuery({
    queryKey: configurationKeys.performance(),
    queryFn: async () => {
      return performanceConfigManager.getConfiguration();
    },
    ...defaultQueryOptions,
    ...options
  });
}

/**
 * Mutation hook for performance configuration updates
 */
export function useUpdatePerformanceConfiguration(
  options?: Partial<UseMutationOptions<void, Error, Partial<any>>>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates) => {
      await performanceConfigManager.updateConfiguration(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: configurationKeys.performance() });
      queryClient.invalidateQueries({ queryKey: configurationKeys.section('performance') });
    },
    ...options
  });
}

/**
 * Hook for memory configuration
 */
export function useMemoryConfiguration(options?: Partial<UseQueryOptions<any>>) {
  return useQuery({
    queryKey: configurationKeys.memory(),
    queryFn: async () => {
      return memoryConfigManager.getConfiguration();
    },
    ...defaultQueryOptions,
    ...options
  });
}

/**
 * Mutation hook for memory configuration updates
 */
export function useUpdateMemoryConfiguration(
  options?: Partial<UseMutationOptions<void, Error, Partial<any>>>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates) => {
      await memoryConfigManager.updateConfiguration(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: configurationKeys.memory() });
      queryClient.invalidateQueries({ queryKey: configurationKeys.section('memory') });
    },
    ...options
  });
}

/**
 * Hook for accessibility configuration
 */
export function useAccessibilityConfiguration(options?: Partial<UseQueryOptions<any>>) {
  return useQuery({
    queryKey: configurationKeys.accessibility(),
    queryFn: async () => {
      return accessibilityConfigManager.getConfiguration();
    },
    ...defaultQueryOptions,
    ...options
  });
}

/**
 * Mutation hook for accessibility configuration updates
 */
export function useUpdateAccessibilityConfiguration(
  options?: Partial<UseMutationOptions<void, Error, Partial<any>>>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates) => {
      await accessibilityConfigManager.updateConfiguration(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: configurationKeys.accessibility() });
      queryClient.invalidateQueries({ queryKey: configurationKeys.section('accessibility') });
    },
    ...options
  });
}

/**
 * Hook for real-time configuration updates
 */
export function useRealtimeConfiguration() {
  const queryClient = useQueryClient();

  // Set up real-time listener
  React.useEffect(() => {
    const configManager = getConfigurationManager();

    const handleConfigurationChange = () => {
      queryClient.invalidateQueries({ queryKey: configurationKeys.all });
    };

    configManager.on('change', handleConfigurationChange);

    return () => {
      configManager.off('change', handleConfigurationChange);
    };
  }, [queryClient]);
}

/**
 * Hook for configuration change subscription
 */
export function useConfigurationSubscription(
  callback: (change: { key: string; oldValue: unknown; newValue: unknown }) => void
) {
  React.useEffect(() => {
    const configManager = getConfigurationManager();

    const handleChange = (change: any) => {
      callback({
        key: change.key,
        oldValue: change.oldValue,
        newValue: change.newValue
      });
    };

    configManager.on('change', handleChange);

    return () => {
      configManager.off('change', handleChange);
    };
  }, [callback]);
}

/**
 * Hook for optimistic configuration updates
 */
export function useOptimisticConfigurationUpdate<T = unknown>(
  key: string,
  options?: Partial<UseMutationOptions<void, Error, { value: T; scope?: ConfigScope }>>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ value, scope = 'user' }) => {
      const configManager = getConfigurationManager();
      await configManager.initialize();
      await configManager.set(key, value, { scope, immediate: true });
    },
    onMutate: async ({ value }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: configurationKeys.key(key) });

      // Snapshot the previous value
      const previousValue = queryClient.getQueryData<T>(configurationKeys.key(key));

      // Optimistically update to the new value
      queryClient.setQueryData<T>(configurationKeys.key(key), value);

      // Return a context object with the snapshotted value
      return { previousValue };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousValue) {
        queryClient.setQueryData(configurationKeys.key(key), context.previousValue);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: configurationKeys.key(key) });
    },
    ...options
  });
}

/**
 * Custom hook for configuration prefetching
 */
export function usePrefetchConfiguration() {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    // Prefetch main configuration
    queryClient.prefetchQuery({
      queryKey: configurationKeys.main(),
      queryFn: async () => {
        const configManager = getConfigurationManager();
        await configManager.initialize();
        return configManager.getConfiguration();
      },
      ...defaultQueryOptions
    });

    // Prefetch environment info
    queryClient.prefetchQuery({
      queryKey: configurationKeys.environment(),
      queryFn: async () => {
        const configManager = getConfigurationManager();
        await configManager.initialize();
        return configManager.get('system.environment') || 'development';
      },
      ...defaultQueryOptions
    });
  }, [queryClient]);
}
