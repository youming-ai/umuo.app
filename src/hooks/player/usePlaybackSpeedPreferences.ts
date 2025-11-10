"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

// Schema for playback speed preferences
export const PlaybackSpeedPreferencesSchema = z.object({
  defaultSpeed: z.number().min(0.25).max(3).default(1),
  recentSpeeds: z.array(z.number().min(0.25).max(3)).max(10).default([]),
  customPresets: z
    .array(
      z.object({
        label: z.string().min(1).max(20),
        value: z.number().min(0.25).max(3),
        description: z.string().max(50).optional(),
      }),
    )
    .max(6)
    .default([]),
  autoSave: z.boolean().default(true),
  enableHapticFeedback: z.boolean().default(true),
  enableKeyboardShortcuts: z.boolean().default(true),
  lastUpdated: z.date().optional(),
});

export type PlaybackSpeedPreferences = z.infer<
  typeof PlaybackSpeedPreferencesSchema
>;

// Query keys for playback speed preferences
export const playbackSpeedKeys = {
  all: ["playback-speed"] as const,
  preferences: ["playback-speed", "preferences"] as const,
  recent: ["playback-speed", "recent"] as const,
  presets: ["playback-speed", "presets"] as const,
};

// Default preferences
const DEFAULT_PREFERENCES: PlaybackSpeedPreferences = {
  defaultSpeed: 1,
  recentSpeeds: [1, 1.25, 1.5, 0.75],
  customPresets: [],
  autoSave: true,
  enableHapticFeedback: true,
  enableKeyboardShortcuts: true,
  lastUpdated: new Date(),
};

// Storage key
const STORAGE_KEY = "umuo-playback-speed-preferences";

// Utility functions for localStorage operations
const preferencesStorage = {
  get: (): PlaybackSpeedPreferences | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      // Validate with schema
      const validated = PlaybackSpeedPreferencesSchema.safeParse(parsed);

      if (validated.success) {
        return {
          ...validated.data,
          lastUpdated: validated.data.lastUpdated
            ? new Date(validated.data.lastUpdated)
            : new Date(),
        };
      }

      // If validation fails, return null to use defaults
      return null;
    } catch (error) {
      console.warn("Failed to load playback speed preferences:", error);
      return null;
    }
  },

  set: (preferences: PlaybackSpeedPreferences): boolean => {
    try {
      const toStore = {
        ...preferences,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
      return true;
    } catch (error) {
      console.warn("Failed to save playback speed preferences:", error);
      return false;
    }
  },

  remove: (): boolean => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.warn("Failed to remove playback speed preferences:", error);
      return false;
    }
  },
};

// Query to fetch preferences
function usePreferencesQuery() {
  return useQuery({
    queryKey: playbackSpeedKeys.preferences,
    queryFn: async () => {
      const stored = preferencesStorage.get();
      return stored || DEFAULT_PREFERENCES;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

// Hook for managing playback speed preferences
export interface UsePlaybackSpeedPreferencesOptions {
  enableAutoSave?: boolean;
  enablePersistence?: boolean;
  onError?: (error: Error) => void;
}

export function usePlaybackSpeedPreferences(
  options: UsePlaybackSpeedPreferencesOptions = {},
) {
  const { enableAutoSave = true, enablePersistence = true, onError } = options;
  const queryClient = useQueryClient();

  // Fetch preferences
  const {
    data: preferences = DEFAULT_PREFERENCES,
    isLoading,
    error,
    refetch,
  } = usePreferencesQuery();

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences: Partial<PlaybackSpeedPreferences>) => {
      const current = preferencesStorage.get() || DEFAULT_PREFERENCES;
      const updated = {
        ...current,
        ...newPreferences,
        lastUpdated: new Date(),
      };

      // Validate with schema
      const validated = PlaybackSpeedPreferencesSchema.safeParse(updated);
      if (!validated.success) {
        throw new Error(`Invalid preferences: ${validated.error.message}`);
      }

      if (enablePersistence) {
        const success = preferencesStorage.set(validated.data);
        if (!success) {
          throw new Error("Failed to save preferences to storage");
        }
      }

      return validated.data;
    },
    onSuccess: (updatedPreferences) => {
      queryClient.setQueryData(
        playbackSpeedKeys.preferences,
        updatedPreferences,
      );
      queryClient.invalidateQueries({ queryKey: playbackSpeedKeys.all });
    },
    onError: (error) => {
      onError?.(error as Error);
    },
  });

  // Add speed to recent speeds
  const addToRecentSpeedsMutation = useMutation({
    mutationFn: async (speed: number) => {
      if (speed < 0.25 || speed > 3) {
        throw new Error("Speed must be between 0.25x and 3x");
      }

      const current = preferencesStorage.get() || DEFAULT_PREFERENCES;
      const recentSpeeds = [
        speed,
        ...current.recentSpeeds.filter((s) => s !== speed),
      ].slice(0, 10);

      const updated = {
        ...current,
        recentSpeeds,
        lastUpdated: new Date(),
      };

      if (enablePersistence) {
        const success = preferencesStorage.set(updated);
        if (!success) {
          throw new Error("Failed to update recent speeds");
        }
      }

      return recentSpeeds;
    },
    onSuccess: (recentSpeeds) => {
      queryClient.setQueryData(playbackSpeedKeys.recent, recentSpeeds);
      // Update preferences with new recent speeds
      const current = queryClient.getQueryData(
        playbackSpeedKeys.preferences,
      ) as PlaybackSpeedPreferences;
      queryClient.setQueryData(playbackSpeedKeys.preferences, {
        ...current,
        recentSpeeds,
      });
    },
    onError: (error) => {
      onError?.(error as Error);
    },
  });

  // Add custom preset
  const addCustomPresetMutation = useMutation({
    mutationFn: async (preset: {
      label: string;
      value: number;
      description?: string;
    }) => {
      const current = preferencesStorage.get() || DEFAULT_PREFERENCES;

      // Validate preset
      if (preset.value < 0.25 || preset.value > 3) {
        throw new Error("Speed must be between 0.25x and 3x");
      }

      if (!preset.label.trim()) {
        throw new Error("Preset label is required");
      }

      // Check if preset already exists
      const existingIndex = current.customPresets.findIndex(
        (p) =>
          Math.abs(p.value - preset.value) < 0.01 || p.label === preset.label,
      );

      let customPresets = [...current.customPresets];
      if (existingIndex >= 0) {
        // Update existing preset
        customPresets[existingIndex] = preset;
      } else if (customPresets.length >= 6) {
        // Replace oldest preset
        customPresets[0] = preset;
      } else {
        // Add new preset
        customPresets.push(preset);
      }

      const updated = {
        ...current,
        customPresets,
        lastUpdated: new Date(),
      };

      if (enablePersistence) {
        const success = preferencesStorage.set(updated);
        if (!success) {
          throw new Error("Failed to save custom preset");
        }
      }

      return updated.customPresets;
    },
    onSuccess: (customPresets) => {
      queryClient.setQueryData(playbackSpeedKeys.presets, customPresets);
      // Update preferences
      const current = queryClient.getQueryData(
        playbackSpeedKeys.preferences,
      ) as PlaybackSpeedPreferences;
      queryClient.setQueryData(playbackSpeedKeys.preferences, {
        ...current,
        customPresets,
      });
    },
    onError: (error) => {
      onError?.(error as Error);
    },
  });

  // Remove custom preset
  const removeCustomPresetMutation = useMutation({
    mutationFn: async (label: string) => {
      const current = preferencesStorage.get() || DEFAULT_PREFERENCES;
      const customPresets = current.customPresets.filter(
        (p) => p.label !== label,
      );

      const updated = {
        ...current,
        customPresets,
        lastUpdated: new Date(),
      };

      if (enablePersistence) {
        const success = preferencesStorage.set(updated);
        if (!success) {
          throw new Error("Failed to remove custom preset");
        }
      }

      return customPresets;
    },
    onSuccess: (customPresets) => {
      queryClient.setQueryData(playbackSpeedKeys.presets, customPresets);
      // Update preferences
      const current = queryClient.getQueryData(
        playbackSpeedKeys.preferences,
      ) as PlaybackSpeedPreferences;
      queryClient.setQueryData(playbackSpeedKeys.preferences, {
        ...current,
        customPresets,
      });
    },
    onError: (error) => {
      onError?.(error as Error);
    },
  });

  // Reset preferences to defaults
  const resetPreferencesMutation = useMutation({
    mutationFn: async () => {
      if (enablePersistence) {
        const success = preferencesStorage.set(DEFAULT_PREFERENCES);
        if (!success) {
          throw new Error("Failed to reset preferences");
        }
      }
      return DEFAULT_PREFERENCES;
    },
    onSuccess: () => {
      queryClient.setQueryData(
        playbackSpeedKeys.preferences,
        DEFAULT_PREFERENCES,
      );
      queryClient.setQueryData(
        playbackSpeedKeys.recent,
        DEFAULT_PREFERENCES.recentSpeeds,
      );
      queryClient.setQueryData(
        playbackSpeedKeys.presets,
        DEFAULT_PREFERENCES.customPresets,
      );
      queryClient.invalidateQueries({ queryKey: playbackSpeedKeys.all });
    },
    onError: (error) => {
      onError?.(error as Error);
    },
  });

  // Memoized action functions
  const updatePreferences = useCallback(
    (newPreferences: Partial<PlaybackSpeedPreferences>) => {
      if (enableAutoSave) {
        updatePreferencesMutation.mutate(newPreferences);
      }
    },
    [enableAutoSave, updatePreferencesMutation],
  );

  const setDefaultSpeed = useCallback(
    (speed: number) => {
      updatePreferences({ defaultSpeed: speed });
    },
    [updatePreferences],
  );

  const addToRecentSpeeds = useCallback(
    (speed: number) => {
      if (enableAutoSave) {
        addToRecentSpeedsMutation.mutate(speed);
      }
    },
    [enableAutoSave, addToRecentSpeedsMutation],
  );

  const addCustomPreset = useCallback(
    (preset: { label: string; value: number; description?: string }) => {
      if (enableAutoSave) {
        addCustomPresetMutation.mutate(preset);
      }
    },
    [enableAutoSave, addCustomPresetMutation],
  );

  const removeCustomPreset = useCallback(
    (label: string) => {
      if (enableAutoSave) {
        removeCustomPresetMutation.mutate(label);
      }
    },
    [enableAutoSave, removeCustomPresetMutation],
  );

  const resetPreferences = useCallback(() => {
    resetPreferencesMutation.mutate();
  }, [resetPreferencesMutation]);

  // Auto-save current speed when it changes
  useEffect(() => {
    // This effect can be used to automatically save the current speed
    // when it's changed in the player
    return () => {
      // Cleanup if needed
    };
  }, []);

  return {
    // Data
    preferences,
    recentSpeeds: preferences.recentSpeeds,
    customPresets: preferences.customPresets,
    defaultSpeed: preferences.defaultSpeed,

    // State
    isLoading,
    error,

    // Actions
    updatePreferences,
    setDefaultSpeed,
    addToRecentSpeeds,
    addCustomPreset,
    removeCustomPreset,
    resetPreferences,

    // Mutations status
    isUpdating: updatePreferencesMutation.isPending,
    isAddingRecent: addToRecentSpeedsMutation.isPending,
    isAddingPreset: addCustomPresetMutation.isPending,
    isRemovingPreset: removeCustomPresetMutation.isPending,
    isResetting: resetPreferencesMutation.isPending,

    // Utilities
    refetch,

    // Configuration
    enableAutoSave,
    enablePersistence,
  };
}

// Hook for managing a single playback speed instance
export function usePlaybackSpeed(
  initialSpeed: number = 1,
  options: UsePlaybackSpeedPreferencesOptions & {
    trackInRecent?: boolean;
    autoTrackUsage?: boolean;
  } = {},
) {
  const {
    trackInRecent = true,
    autoTrackUsage = true,
    ...preferencesOptions
  } = options;
  const { addToRecentSpeeds, preferences, enablePersistence } =
    usePlaybackSpeedPreferences(preferencesOptions);

  const [currentSpeed, setCurrentSpeed] = useState(initialSpeed);
  const [isChanging, setIsChanging] = useState(false);

  // Set initial speed from preferences if available
  useEffect(() => {
    if (enablePersistence && preferences.defaultSpeed) {
      setCurrentSpeed(preferences.defaultSpeed);
    }
  }, [preferences.defaultSpeed, enablePersistence]);

  const changeSpeed = useCallback(
    (newSpeed: number) => {
      const validSpeed = Math.max(0.25, Math.min(3, newSpeed));

      setIsChanging(true);
      setCurrentSpeed(validSpeed);

      // Add to recent speeds if tracking is enabled
      if (trackInRecent && autoTrackUsage) {
        addToRecentSpeeds(validSpeed);
      }

      // Reset changing state after animation
      setTimeout(() => {
        setIsChanging(false);
      }, 300);
    },
    [addToRecentSpeeds, trackInRecent, autoTrackUsage],
  );

  const resetSpeed = useCallback(() => {
    changeSpeed(1);
  }, [changeSpeed]);

  return {
    speed: currentSpeed,
    changeSpeed,
    resetSpeed,
    isChanging,
    canIncrease: currentSpeed < 3,
    canDecrease: currentSpeed > 0.25,

    // Speed adjustment helpers
    increase: useCallback(() => {
      changeSpeed(Math.min(currentSpeed + 0.25, 3));
    }, [currentSpeed, changeSpeed]),

    decrease: useCallback(() => {
      changeSpeed(Math.max(currentSpeed - 0.25, 0.25));
    }, [currentSpeed, changeSpeed]),

    // Quick presets
    setSpeed0_5x: () => changeSpeed(0.5),
    setSpeed0_75x: () => changeSpeed(0.75),
    setSpeed1x: () => changeSpeed(1),
    setSpeed1_25x: () => changeSpeed(1.25),
    setSpeed1_5x: () => changeSpeed(1.5),
    setSpeed2x: () => changeSpeed(2),
  };
}

// Export convenience functions
export const usePlaybackSpeedQuery = usePlaybackSpeedPreferences;
export default usePlaybackSpeedPreferences;
