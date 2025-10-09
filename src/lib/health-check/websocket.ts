/**
 * WebSocket integration for real-time health check updates
 * Provides live status updates during health check execution
 */

export interface WebSocketMessage {
  type: 'status_update' | 'progress_update' | 'check_complete' | 'error';
  timestamp: string;
  data: any;
}

export interface StatusUpdateMessage extends WebSocketMessage {
  type: 'status_update';
  data: {
    checkId: string;
    status: 'running' | 'completed' | 'failed';
    currentTask?: string;
  };
}

export interface ProgressUpdateMessage extends WebSocketMessage {
  type: 'progress_update';
  data: {
    checkId: string;
    completed: number;
    total: number;
    percentage: number;
    currentCategory: string;
    estimatedTimeRemaining?: number;
  };
}

export interface CheckCompleteMessage extends WebSocketMessage {
  type: 'check_complete';
  data: {
    checkId: string;
    status: 'completed' | 'failed';
    duration: number;
    summary: any;
  };
}

export interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  data: {
    checkId: string;
    error: {
      code: string;
      message: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    };
  };
}

export class HealthCheckWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private messageHandlers: Map<string, (message: WebSocketMessage) => void> = new Map();
  private connectionStateHandlers: ((connected: boolean) => void)[] = [];

  constructor(url?: string) {
    // Use relative URL for same-origin WebSocket connection
    this.url = url || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/health-check/ws`;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('HealthCheck WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.notifyConnectionStateHandlers(true);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('HealthCheck WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.notifyConnectionStateHandlers(false);

          // Attempt to reconnect if not intentionally closed
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('HealthCheck WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  /**
   * Subscribe to health check updates for a specific check ID
   */
  subscribe(checkId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        checkId
      }));
    }
  }

  /**
   * Unsubscribe from health check updates
   */
  unsubscribe(checkId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        checkId
      }));
    }
  }

  /**
   * Register message handler for specific message type
   */
  onMessageType<T extends WebSocketMessage>(
    messageType: T['type'],
    handler: (message: T) => void
  ): void {
    this.messageHandlers.set(messageType, handler as (message: WebSocketMessage) => void);
  }

  /**
   * Remove message handler
   */
  offMessageType(messageType: string): void {
    this.messageHandlers.delete(messageType);
  }

  /**
   * Register connection state handler
   */
  onConnectionStateChange(handler: (connected: boolean) => void): void {
    this.connectionStateHandlers.push(handler);
  }

  /**
   * Remove connection state handler
   */
  offConnectionStateChange(handler: (connected: boolean) => void): void {
    const index = this.connectionStateHandlers.indexOf(handler);
    if (index > -1) {
      this.connectionStateHandlers.splice(index, 1);
    }
  }

  /**
   * Get current connection state
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get current connection state as string
   */
  get connectionState(): 'connecting' | 'connected' | 'disconnected' | 'reconnecting' {
    if (this.isConnecting) return 'connecting';
    if (this.isConnected) return 'connected';
    if (this.reconnectAttempts > 0 && this.reconnectAttempts < this.maxReconnectAttempts) return 'reconnecting';
    return 'disconnected';
  }

  private handleMessage(message: WebSocketMessage): void {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message);
    }

    // Log message for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('HealthCheck WebSocket message:', message);
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  private notifyConnectionStateHandlers(connected: boolean): void {
    this.connectionStateHandlers.forEach(handler => {
      try {
        handler(connected);
      } catch (error) {
        console.error('Error in connection state handler:', error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.disconnect();
    this.messageHandlers.clear();
    this.connectionStateHandlers = [];
  }
}

/**
 * Singleton WebSocket instance for health check updates
 */
let wsInstance: HealthCheckWebSocket | null = null;

export function getHealthCheckWebSocket(): HealthCheckWebSocket {
  if (!wsInstance) {
    wsInstance = new HealthCheckWebSocket();
  }
  return wsInstance;
}

/**
 * React hook for health check WebSocket integration
 */
export function useHealthCheckWebSocket() {
  const ws = getHealthCheckWebSocket();

  React.useEffect(() => {
    // Auto-connect on hook mount
    ws.connect().catch(error => {
      console.warn('Failed to connect to health check WebSocket:', error);
    });

    // Cleanup on unmount
    return () => {
      // Don't disconnect immediately as other components might be using it
      // The singleton will be cleaned up when the page unloads
    };
  }, [ws]);

  return {
    ws,
    isConnected: ws.isConnected,
    connectionState: ws.connectionState,
    subscribe: ws.subscribe.bind(ws),
    unsubscribe: ws.unsubscribe.bind(ws),
    onMessageType: ws.onMessageType.bind(ws),
    offMessageType: ws.offMessageType.bind(ws),
    onConnectionStateChange: ws.onConnectionStateChange.bind(ws),
    offConnectionStateChange: ws.offConnectionStateChange.bind(ws),
  };
}

/**
 * Hook for subscribing to real-time health check updates
 */
export function useHealthCheckUpdates(checkId: string) {
  const [status, setStatus] = React.useState<'idle' | 'running' | 'completed' | 'failed'>('idle');
  const [progress, setProgress] = React.useState({ completed: 0, total: 0, percentage: 0 });
  const [currentTask, setCurrentTask] = React.useState<string>('');
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = React.useState<number | undefined>();
  const [error, setError] = React.useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = React.useState<Date | null>(null);

  const { ws, isConnected, subscribe, unsubscribe, onMessageType, offMessageType } = useHealthCheckWebSocket();

  React.useEffect(() => {
    if (!isConnected || !checkId) return;

    const handleStatusUpdate = (message: StatusUpdateMessage) => {
      if (message.data.checkId === checkId) {
        setStatus(message.data.status);
        if (message.data.currentTask) {
          setCurrentTask(message.data.currentTask);
        }
        setLastUpdate(new Date(message.timestamp));
      }
    };

    const handleProgressUpdate = (message: ProgressUpdateMessage) => {
      if (message.data.checkId === checkId) {
        setProgress({
          completed: message.data.completed,
          total: message.data.total,
          percentage: message.data.percentage,
        });
        setCurrentTask(message.data.currentCategory);
        setEstimatedTimeRemaining(message.data.estimatedTimeRemaining);
        setLastUpdate(new Date(message.timestamp));
      }
    };

    const handleCheckComplete = (message: CheckCompleteMessage) => {
      if (message.data.checkId === checkId) {
        setStatus(message.data.status);
        setProgress({ completed: message.data.total, total: message.data.total, percentage: 100 });
        setCurrentTask('Complete');
        setEstimatedTimeRemaining(0);
        setLastUpdate(new Date(message.timestamp));
        setError(null);
      }
    };

    const handleError = (message: ErrorMessage) => {
      if (message.data.checkId === checkId) {
        setStatus('failed');
        setError(message.data.error.message);
        setLastUpdate(new Date(message.timestamp));
      }
    };

    // Register message handlers
    onMessageType('status_update', handleStatusUpdate);
    onMessageType('progress_update', handleProgressUpdate);
    onMessageType('check_complete', handleCheckComplete);
    onMessageType('error', handleError);

    // Subscribe to updates
    subscribe(checkId);

    // Cleanup
    return () => {
      offMessageType('status_update', handleStatusUpdate);
      offMessageType('progress_update', handleProgressUpdate);
      offMessageType('check_complete', handleCheckComplete);
      offMessageType('error', handleError);
      unsubscribe(checkId);
    };
  }, [ws, isConnected, checkId, subscribe, unsubscribe, onMessageType, offMessageType]);

  return {
    status,
    progress,
    currentTask,
    estimatedTimeRemaining,
    error,
    lastUpdate,
    isConnected,
  };
}

// Export types for external use
export type {
  WebSocketMessage,
  StatusUpdateMessage,
  ProgressUpdateMessage,
  CheckCompleteMessage,
  ErrorMessage,
};