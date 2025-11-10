"use client";

import { useState, useCallback, useEffect } from "react";

interface PermissionState {
  camera: PermissionState | null;
  microphone: PermissionState | null;
  storage: PermissionState | null;
  photos: PermissionState | null;
  bluetooth: PermissionState | null;
  location: PermissionState | null;
  notifications: PermissionState | null;
}

type PermissionStatus = "granted" | "denied" | "prompt" | "not-supported";

interface PermissionRequest {
  camera?: boolean;
  microphone?: boolean;
  storage?: boolean;
  photos?: boolean;
  bluetooth?: boolean;
  location?: boolean;
  notifications?: boolean;
}

interface PermissionResult {
  camera: boolean;
  microphone: boolean;
  storage: boolean;
  photos: boolean;
  bluetooth: boolean;
  location: boolean;
  notifications: boolean;
}

export function useMobilePermissions() {
  const [permissionStates, setPermissionStates] = useState<Record<string, PermissionStatus>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if a permission is supported
  const isPermissionSupported = useCallback((permissionName: string): boolean => {
    if (typeof navigator === 'undefined') return false;

    switch (permissionName) {
      case 'camera':
        return 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
      case 'microphone':
        return 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
      case 'storage':
        return 'storage' in navigator && 'persist' in navigator.storage;
      case 'bluetooth':
        return 'bluetooth' in navigator;
      case 'location':
        return 'geolocation' in navigator;
      case 'notifications':
        return 'Notification' in window;
      default:
        return 'permissions' in navigator;
    }
  }, []);

  // Check current permission status
  const checkPermissionStatus = useCallback(async (permissionName: string): Promise<PermissionStatus> => {
    if (!isPermissionSupported(permissionName)) {
      return "not-supported";
    }

    try {
      // For Web Audio/Video permissions, we need to check navigator.permissions
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({
          name: permissionName as PermissionName
        });
        return permission.state as PermissionStatus;
      }

      // Fallback checks for certain permissions
      switch (permissionName) {
        case 'notifications':
          return Notification.permission as PermissionStatus;
        case 'camera':
        case 'microphone':
          // For camera/microphone, we need to try to access the device
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              [permissionName === 'camera' ? 'video' : 'audio']: true
            });
            stream.getTracks().forEach(track => track.stop());
            return "granted";
          } catch (err: any) {
            if (err.name === 'NotAllowedError') return "denied";
            if (err.name === 'NotReadableError') return "granted"; // Already in use
            return "prompt";
          }
        default:
          return "prompt";
      }
    } catch (error) {
      console.warn(`Error checking permission ${permissionName}:`, error);
      return "prompt";
    }
  }, [isPermissionSupported]);

  // Request permission
  const requestPermission = useCallback(async (permissionName: string): Promise<boolean> => {
    if (!isPermissionSupported(permissionName)) {
      return false;
    }

    try {
      switch (permissionName) {
        case 'camera':
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
          } catch (error) {
            console.warn("Camera permission denied:", error);
            return false;
          }

        case 'microphone':
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
          } catch (error) {
            console.warn("Microphone permission denied:", error);
            return false;
          }

        case 'notifications':
          const notificationResult = await Notification.requestPermission();
          return notificationResult === 'granted';

        case 'bluetooth':
          try {
            await (navigator as any).bluetooth.requestDevice({
              acceptAllDevices: true
            });
            return true;
          } catch (error) {
            console.warn("Bluetooth permission denied:", error);
            return false;
          }

        case 'location':
          try {
            await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(
                () => resolve(true),
                reject,
                { timeout: 5000 }
              );
            });
            return true;
          } catch (error) {
            console.warn("Location permission denied:", error);
            return false;
          }

        case 'storage':
          try {
            if ('storage' in navigator && 'persist' in navigator.storage) {
              const persisted = await navigator.storage.persist();
              return persisted;
            }
            return true; // Assume granted if API not available
          } catch (error) {
            console.warn("Storage permission error:", error);
            return false;
          }

        default:
          // Try using the permissions API for other permissions
          if ('permissions' in navigator) {
            try {
              const result = await navigator.permissions.request({
                name: permissionName as PermissionName
              });
              return result.state === 'granted';
            } catch (error) {
              console.warn(`Permission request failed for ${permissionName}:`, error);
              return false;
            }
          }
          return false;
      }
    } catch (error) {
      console.error(`Error requesting permission ${permissionName}:`, error);
      return false;
    }
  }, [isPermissionSupported]);

  // Check multiple permissions
  const checkPermissions = useCallback(async (permissions: PermissionRequest): Promise<PermissionResult> => {
    const results: Partial<PermissionResult> = {};

    for (const [permission, requested] of Object.entries(permissions)) {
      if (requested) {
        results[permission as keyof PermissionResult] = await checkPermissionStatus(permission);
      }
    }

    return {
      camera: permissions.camera ? await checkPermissionStatus('camera') === 'granted' : false,
      microphone: permissions.microphone ? await checkPermissionStatus('microphone') === 'granted' : false,
      storage: permissions.storage ? await checkPermissionStatus('storage') === 'granted' : false,
      photos: permissions.photos ? await checkPermissionStatus('camera') === 'granted' : false,
      bluetooth: permissions.bluetooth ? await checkPermissionStatus('bluetooth') === 'granted' : false,
      location: permissions.location ? await checkPermissionStatus('location') === 'granted' : false,
      notifications: permissions.notifications ? await checkPermissionStatus('notifications') === 'granted' : false
    } as PermissionResult;
  }, [checkPermissionStatus]);

  // Request multiple permissions
  const requestPermissions = useCallback(async (permissions: PermissionRequest): Promise<PermissionResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const results: Partial<PermissionResult> = {};

      // Request permissions that were specifically requested
      for (const [permission, shouldRequest] of Object.entries(permissions)) {
        if (shouldRequest) {
          let granted = false;

          switch (permission) {
            case 'camera':
              granted = await requestPermission('camera');
              break;
            case 'microphone':
              granted = await requestPermission('microphone');
              break;
            case 'notifications':
              granted = await requestPermission('notifications');
              break;
            case 'bluetooth':
              granted = await requestPermission('bluetooth');
              break;
            case 'location':
              granted = await requestPermission('location');
              break;
            case 'storage':
              granted = await requestPermission('storage');
              break;
            case 'photos':
              // Photos permission is typically the same as camera
              granted = await requestPermission('camera');
              break;
          }

          results[permission as keyof PermissionResult] = granted;
        }
      }

      const finalResult = {
        camera: results.camera ?? false,
        microphone: results.microphone ?? false,
        storage: results.storage ?? false,
        photos: results.photos ?? false,
        bluetooth: results.bluetooth ?? false,
        location: results.location ?? false,
        notifications: results.notifications ?? false
      } as PermissionResult;

      return finalResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setError(errorMessage);
      console.error("Error requesting permissions:", error);

      // Return all permissions as denied on error
      return {
        camera: false,
        microphone: false,
        storage: false,
        photos: false,
        bluetooth: false,
        location: false,
        notifications: false
      };
    } finally {
      setIsLoading(false);
    }
  }, [requestPermission]);

  // Refresh all permission states
  const refreshPermissions = useCallback(async () => {
    const states: Record<string, PermissionStatus> = {};

    const permissionsToCheck = ['camera', 'microphone', 'notifications', 'bluetooth', 'location'];

    for (const permission of permissionsToCheck) {
      states[permission] = await checkPermissionStatus(permission);
    }

    setPermissionStates(states);
  }, [checkPermissionStatus]);

  // Check if all required permissions are granted
  const hasAllPermissions = useCallback((requiredPermissions: PermissionRequest): boolean => {
    return Object.entries(requiredPermissions)
      .filter(([_, required]) => required)
      .every(([permission, _]) => {
        const status = permissionStates[permission];
        return status === 'granted';
      });
  }, [permissionStates]);

  // Check if any permission is denied
  const hasDeniedPermissions = useCallback((permissions: PermissionRequest): boolean => {
    return Object.entries(permissions)
      .filter(([_, required]) => required)
      .some(([permission, _]) => {
        const status = permissionStates[permission];
        return status === 'denied';
      });
  }, [permissionStates]);

  // Get user-friendly permission status
  const getPermissionStatusText = useCallback((permission: string, status: PermissionStatus): string => {
    switch (status) {
      case 'granted':
        return 'Allowed';
      case 'denied':
        return 'Blocked';
      case 'prompt':
        return 'Needs permission';
      case 'not-supported':
        return 'Not available';
      default:
        return 'Unknown';
    }
  }, []);

  // Initialize permission states on mount
  useEffect(() => {
    refreshPermissions();
  }, [refreshPermissions]);

  return {
    // Permission states
    permissionStates,
    isLoading,
    error,

    // Permission checking
    checkPermissions,
    hasAllPermissions,
    hasDeniedPermissions,

    // Permission requesting
    requestPermissions,

    // Utilities
    refreshPermissions,
    isPermissionSupported,
    getPermissionStatusText,

    // Legacy support
    checkPermission: checkPermissionStatus,
    requestPermission
  };
}

// Hook for managing permission states across the app
export function usePermissionManager() {
  const [permissionHistory, setPermissionHistory] = useState<Array<{
    permission: string;
    status: PermissionStatus;
    timestamp: Date;
  }>>([]);

  const {
    requestPermissions,
    checkPermissions,
    permissionStates,
    refreshPermissions
  } = useMobilePermissions();

  // Request permission with history tracking
  const requestPermissionWithHistory = useCallback(async (permissions: PermissionRequest) => {
    const timestamp = new Date();

    // Check current states before requesting
    const beforeStates = await checkPermissions(permissions);

    // Request permissions
    const afterStates = await requestPermissions(permissions);

    // Record history
    const historyEntries = Object.entries(permissions)
      .filter(([_, requested]) => requested)
      .map(([permission, _]) => ({
        permission,
        status: afterStates[permission as keyof PermissionResult] ? 'granted' : 'denied',
        timestamp
      }));

    setPermissionHistory(prev => [...prev, ...historyEntries]);

    return afterStates;
  }, [requestPermissions, checkPermissions]);

  // Get permission history for a specific permission
  const getPermissionHistory = useCallback((permission: string) => {
    return permissionHistory.filter(entry => entry.permission === permission);
  }, [permissionHistory]);

  // Clear permission history
  const clearPermissionHistory = useCallback(() => {
    setPermissionHistory([]);
  }, []);

  return {
    requestPermissionWithHistory,
    getPermissionHistory,
    clearPermissionHistory,
    permissionHistory,
    permissionStates,
    refreshPermissions
  };
}
