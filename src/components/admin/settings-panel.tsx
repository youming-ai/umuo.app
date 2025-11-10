"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";

import type {
  DashboardConfiguration,
  NotificationSettings,
  PerformanceThreshold,
  AlertSeverity,
  PerformanceMetricCategory,
  TimeRange,
  RefreshInterval,
  RealtimeMonitoringConfig,
} from "@/types/admin/performance-dashboard";

import {
  Settings,
  Bell,
  Database,
  Smartphone,
  Monitor,
  Wifi,
  Battery,
  HardDrive,
  Cpu,
  MemoryStick,
  Save,
  RotateCcw,
  Download,
  Upload,
  Trash2,
  Plus,
  X,
  Edit2,
  Check,
  AlertTriangle,
  Info,
  Shield,
  Target,
  Activity,
  Clock,
  Calendar,
  Filter,
  Zap,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Mail,
  Webhook,
  Smartphone as MobileIcon,
  Globe,
} from "lucide-react";

interface SettingsPanelProps {
  configuration: DashboardConfiguration;
  onConfigurationChange: (config: DashboardConfiguration) => void;
  onSave?: () => void;
  onReset?: () => void;
  onExport?: () => void;
  onImport?: (config: DashboardConfiguration) => void;
  className?: string;
}

interface ThresholdEditorProps {
  threshold: PerformanceThreshold;
  onChange: (threshold: PerformanceThreshold) => void;
  onDelete?: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  configuration,
  onConfigurationChange,
  onSave,
  onReset,
  onExport,
  onImport,
  className = "",
}) => {
  const [activeTab, setActiveTab] = useState("general");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [thresholds, setThresholds] = useState<PerformanceThreshold[]>([]);
  const [editingThreshold, setEditingThreshold] = useState<string | null>(null);

  // Load default thresholds
  useEffect(() => {
    const defaultThresholds: PerformanceThreshold[] = [
      {
        id: "cpu_usage",
        metric: "CPU Usage",
        category: "system",
        thresholds: {
          excellent: 20,
          good: 50,
          fair: 80,
          poor: 95,
          critical: 100,
        },
        unit: "%",
        enabled: true,
        description: "CPU utilization percentage",
        notifications: { email: false, push: true, webhook: false },
      },
      {
        id: "memory_usage",
        metric: "Memory Usage",
        category: "memory",
        thresholds: {
          excellent: 30,
          good: 60,
          fair: 80,
          poor: 90,
          critical: 95,
        },
        unit: "%",
        enabled: true,
        description: "Memory utilization percentage",
        notifications: { email: false, push: true, webhook: false },
      },
      {
        id: "network_latency",
        metric: "Network Latency",
        category: "network",
        thresholds: {
          excellent: 50,
          good: 100,
          fair: 200,
          poor: 500,
          critical: 1000,
        },
        unit: "ms",
        enabled: true,
        description: "Network round-trip time",
        notifications: { email: false, push: true, webhook: false },
      },
      {
        id: "battery_level",
        metric: "Battery Level",
        category: "battery",
        thresholds: {
          excellent: 80,
          good: 50,
          fair: 20,
          poor: 10,
          critical: 5,
        },
        unit: "%",
        enabled: true,
        description: "Battery charge level",
        notifications: { email: false, push: true, webhook: false },
      },
      {
        id: "transcription_speed",
        metric: "Transcription Speed",
        category: "transcription",
        thresholds: {
          excellent: 2.0,
          good: 1.5,
          fair: 1.0,
          poor: 0.5,
          critical: 0.3,
        },
        unit: "x",
        enabled: true,
        description: "Real-time processing speed",
        notifications: { email: false, push: true, webhook: false },
      },
      {
        id: "database_query_time",
        metric: "Database Query Time",
        category: "database",
        thresholds: {
          excellent: 10,
          good: 50,
          fair: 100,
          poor: 200,
          critical: 500,
        },
        unit: "ms",
        enabled: true,
        description: "Average database query duration",
        notifications: { email: false, push: true, webhook: false },
      },
    ];

    setThresholds(defaultThresholds);
  }, []);

  // Handle configuration changes
  const handleConfigurationChange = (
    updates: Partial<DashboardConfiguration>,
  ) => {
    const newConfig = { ...configuration, ...updates };
    onConfigurationChange(newConfig);
    setHasUnsavedChanges(true);
  };

  // Handle threshold changes
  const handleThresholdChange = (
    thresholdId: string,
    updates: Partial<PerformanceThreshold>,
  ) => {
    setThresholds((prev) =>
      prev.map((t) => (t.id === thresholdId ? { ...t, ...updates } : t)),
    );
    setHasUnsavedChanges(true);
  };

  // Add new threshold
  const addThreshold = () => {
    const newThreshold: PerformanceThreshold = {
      id: `custom_${Date.now()}`,
      metric: "New Metric",
      category: "system",
      thresholds: { excellent: 20, good: 50, fair: 80, poor: 90, critical: 95 },
      unit: "%",
      enabled: true,
      description: "Custom performance threshold",
      notifications: { email: false, push: true, webhook: false },
    };

    setThresholds((prev) => [...prev, newThreshold]);
    setEditingThreshold(newThreshold.id);
    setHasUnsavedChanges(true);
  };

  // Delete threshold
  const deleteThreshold = (thresholdId: string) => {
    setThresholds((prev) => prev.filter((t) => t.id !== thresholdId));
    setHasUnsavedChanges(true);
  };

  // Handle export
  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      const exportData = {
        configuration,
        thresholds,
        timestamp: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dashboard-settings-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Handle import
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setIsImporting(true);
        const reader = new FileReader();

        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);

            if (data.configuration && onImport) {
              onImport(data.configuration);
            }

            if (data.thresholds) {
              setThresholds(data.thresholds);
            }

            setHasUnsavedChanges(false);
          } catch (error) {
            console.error("Failed to import settings:", error);
            alert("Failed to import settings. Please check the file format.");
          } finally {
            setIsImporting(false);
          }
        };

        reader.readAsText(file);
      }
    };

    input.click();
  };

  // Handle reset
  const handleReset = () => {
    if (onReset) {
      onReset();
      setHasUnsavedChanges(false);
    }
  };

  // Threshold Editor Component
  const ThresholdEditor: React.FC<ThresholdEditorProps> = ({
    threshold,
    onChange,
    onDelete,
  }) => {
    const [isEditing, setIsEditing] = useState(false);

    return (
      <Card className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={threshold.enabled}
              onCheckedChange={(checked) =>
                onChange({ ...threshold, enabled: checked })
              }
            />
            <h4 className="font-medium">{threshold.metric}</h4>
            <Badge variant="outline">{threshold.category}</Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? (
                <Check className="w-4 h-4" />
              ) : (
                <Edit2 className="w-4 h-4" />
              )}
            </Button>

            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="text-red-600"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Metric Name</Label>
              <Input
                value={threshold.metric}
                onChange={(e) =>
                  onChange({ ...threshold, metric: e.target.value })
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm">Category</Label>
              <Select
                value={threshold.category}
                onValueChange={(value: PerformanceMetricCategory) =>
                  onChange({ ...threshold, category: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="memory">Memory</SelectItem>
                  <SelectItem value="network">Network</SelectItem>
                  <SelectItem value="transcription">Transcription</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                  <SelectItem value="ui">UI</SelectItem>
                  <SelectItem value="battery">Battery</SelectItem>
                  <SelectItem value="storage">Storage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm">Unit</Label>
              <Input
                value={threshold.unit}
                onChange={(e) =>
                  onChange({ ...threshold, unit: e.target.value })
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm">Description</Label>
              <Input
                value={threshold.description}
                onChange={(e) =>
                  onChange({ ...threshold, description: e.target.value })
                }
                className="mt-1"
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600 mb-4">{threshold.description}</p>
        )}

        {/* Thresholds */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Thresholds</Label>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(threshold.thresholds).map(([level, value]) => (
              <div key={level} className="text-center">
                <div className="text-xs text-gray-600 capitalize mb-1">
                  {level}
                </div>
                {isEditing ? (
                  <Input
                    type="number"
                    value={value}
                    onChange={(e) =>
                      onChange({
                        ...threshold,
                        thresholds: {
                          ...threshold.thresholds,
                          [level]: Number(e.target.value),
                        },
                      })
                    }
                    className="text-sm"
                  />
                ) : (
                  <div className="text-sm font-medium">
                    {value}
                    {threshold.unit}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="mt-4 space-y-2">
          <Label className="text-sm font-medium">Notifications</Label>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <Switch
                checked={threshold.notifications.email}
                onCheckedChange={(checked) =>
                  onChange({
                    ...threshold,
                    notifications: {
                      ...threshold.notifications,
                      email: checked,
                    },
                  })
                }
              />
              <span className="text-sm">Email</span>
            </div>

            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <Switch
                checked={threshold.notifications.push}
                onCheckedChange={(checked) =>
                  onChange({
                    ...threshold,
                    notifications: {
                      ...threshold.notifications,
                      push: checked,
                    },
                  })
                }
              />
              <span className="text-sm">Push</span>
            </div>

            <div className="flex items-center gap-2">
              <Webhook className="w-4 h-4" />
              <Switch
                checked={threshold.notifications.webhook}
                onCheckedChange={(checked) =>
                  onChange({
                    ...threshold,
                    notifications: {
                      ...threshold.notifications,
                      webhook: checked,
                    },
                  })
                }
              />
              <span className="text-sm">Webhook</span>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Dashboard Settings</h2>
          <p className="text-sm text-gray-600">
            Configure performance monitoring and alerts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge
              variant="outline"
              className="text-yellow-600 border-yellow-600"
            >
              Unsaved changes
            </Badge>
          )}

          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleImport}
            disabled={isImporting}
          >
            <Upload className="w-4 h-4 mr-1" />
            {isImporting ? "Importing..." : "Import"}
          </Button>

          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>

          {onSave && (
            <Button size="sm" onClick={onSave} disabled={!hasUnsavedChanges}>
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Display Settings</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Theme</Label>
                  <p className="text-sm text-gray-600">
                    Choose dashboard theme
                  </p>
                </div>
                <Select
                  value={configuration.theme}
                  onValueChange={(value: "light" | "dark" | "auto") =>
                    handleConfigurationChange({ theme: value })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="auto">Auto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Compact View</Label>
                  <p className="text-sm text-gray-600">
                    Use compact layout for metrics
                  </p>
                </div>
                <Switch
                  checked={configuration.compact}
                  onCheckedChange={(checked) =>
                    handleConfigurationChange({ compact: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-refresh</Label>
                  <p className="text-sm text-gray-600">
                    Automatically refresh data
                  </p>
                </div>
                <Switch
                  checked={configuration.alerts.enabled}
                  onCheckedChange={(checked) =>
                    handleConfigurationChange({
                      alerts: { ...configuration.alerts, enabled: checked },
                    })
                  }
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Time Settings</h3>

            <div className="space-y-4">
              <div>
                <Label>Default Time Range</Label>
                <p className="text-sm text-gray-600 mb-2">
                  Default time range for charts
                </p>
                <Select
                  value={configuration.timeRange.toString()}
                  onValueChange={(value) =>
                    handleConfigurationChange({
                      timeRange: Number(value) as TimeRange,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10000">10 seconds</SelectItem>
                    <SelectItem value="60000">1 minute</SelectItem>
                    <SelectItem value="300000">5 minutes</SelectItem>
                    <SelectItem value="900000">15 minutes</SelectItem>
                    <SelectItem value="3600000">1 hour</SelectItem>
                    <SelectItem value="86400000">24 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Refresh Interval</Label>
                <p className="text-sm text-gray-600 mb-2">
                  How often to refresh data
                </p>
                <Select
                  value={configuration.refreshInterval.toString()}
                  onValueChange={(value) =>
                    handleConfigurationChange({
                      refreshInterval: Number(value) as RefreshInterval,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1000">1 second</SelectItem>
                    <SelectItem value="5000">5 seconds</SelectItem>
                    <SelectItem value="10000">10 seconds</SelectItem>
                    <SelectItem value="30000">30 seconds</SelectItem>
                    <SelectItem value="60000">1 minute</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Monitoring Settings */}
        <TabsContent value="monitoring" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Real-time Monitoring</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Real-time Updates</Label>
                  <p className="text-sm text-gray-600">Live data streaming</p>
                </div>
                <Switch
                  checked={configuration.alerts.enabled}
                  onCheckedChange={(checked) =>
                    handleConfigurationChange({
                      alerts: { ...configuration.alerts, enabled: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>WebSocket Connection</Label>
                  <p className="text-sm text-gray-600">
                    Use WebSocket for real-time data
                  </p>
                </div>
                <Switch defaultChecked={false} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Data Compression</Label>
                  <p className="text-sm text-gray-600">
                    Compress data for better performance
                  </p>
                </div>
                <Switch defaultChecked={true} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Batch Processing</Label>
                  <p className="text-sm text-gray-600">
                    Process metrics in batches
                  </p>
                </div>
                <Switch defaultChecked={true} />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Data Collection</h3>

            <div className="space-y-4">
              <div>
                <Label>System Metrics</Label>
                <p className="text-sm text-gray-600 mb-2">
                  Collect system performance data
                </p>
                <div className="space-y-2">
                  {[
                    "CPU Usage",
                    "Memory Usage",
                    "Network Latency",
                    "Disk I/O",
                  ].map((metric) => (
                    <div
                      key={metric}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">{metric}</span>
                      <Switch defaultChecked={true} />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Application Metrics</Label>
                <p className="text-sm text-gray-600 mb-2">
                  Collect application performance data
                </p>
                <div className="space-y-2">
                  {[
                    "Transcription Speed",
                    "Database Queries",
                    "API Response Time",
                    "User Interactions",
                  ].map((metric) => (
                    <div
                      key={metric}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">{metric}</span>
                      <Switch defaultChecked={true} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Thresholds */}
        <TabsContent value="thresholds" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Performance Thresholds</h3>
            <Button size="sm" onClick={addThreshold}>
              <Plus className="w-4 h-4 mr-1" />
              Add Threshold
            </Button>
          </div>

          <div className="space-y-4">
            {thresholds.map((threshold) => (
              <ThresholdEditor
                key={threshold.id}
                threshold={threshold}
                onChange={(updates) =>
                  handleThresholdChange(threshold.id, updates)
                }
                onDelete={() => deleteThreshold(threshold.id)}
              />
            ))}
          </div>

          {thresholds.length === 0 && (
            <Card className="p-8 text-center">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Thresholds Configured
              </h3>
              <p className="text-gray-600 mb-4">
                Add performance thresholds to receive alerts when metrics exceed
                limits.
              </p>
              <Button size="sm" onClick={addThreshold}>
                <Plus className="w-4 h-4 mr-1" />
                Add Your First Threshold
              </Button>
            </Card>
          )}
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Alert Settings</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Alerts</Label>
                  <p className="text-sm text-gray-600">
                    Send alerts when thresholds are exceeded
                  </p>
                </div>
                <Switch
                  checked={configuration.alerts.enabled}
                  onCheckedChange={(checked) =>
                    handleConfigurationChange({
                      alerts: { ...configuration.alerts, enabled: checked },
                    })
                  }
                />
              </div>

              <Separator />

              <div>
                <Label>Alert Severity</Label>
                <p className="text-sm text-gray-600 mb-2">
                  Minimum severity level for alerts
                </p>
                <Select defaultValue="warning">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              Notification Channels
            </h3>

            <div className="space-y-4">
              {/* Email Notifications */}
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    <h4 className="font-medium">Email Notifications</h4>
                  </div>
                  <Switch
                    checked={configuration.alerts.notifications.email.enabled}
                    onCheckedChange={(checked) =>
                      handleConfigurationChange({
                        alerts: {
                          ...configuration.alerts,
                          notifications: {
                            ...configuration.alerts.notifications,
                            email: {
                              ...configuration.alerts.notifications.email,
                              enabled: checked,
                            },
                          },
                        },
                      })
                    }
                  />
                </div>

                {configuration.alerts.notifications.email.enabled && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm">Recipients</Label>
                      <Input
                        placeholder="admin@example.com, ops@example.com"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-sm">Severity Levels</Label>
                      <div className="flex gap-2 mt-1">
                        {(["error", "critical"] as AlertSeverity[]).map(
                          (severity) => (
                            <Badge
                              key={severity}
                              variant="outline"
                              className="text-xs"
                            >
                              {severity}
                            </Badge>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Push Notifications */}
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    <h4 className="font-medium">Push Notifications</h4>
                  </div>
                  <Switch
                    checked={configuration.alerts.notifications.push.enabled}
                    onCheckedChange={(checked) =>
                      handleConfigurationChange({
                        alerts: {
                          ...configuration.alerts,
                          notifications: {
                            ...configuration.alerts.notifications,
                            push: {
                              ...configuration.alerts.notifications.push,
                              enabled: checked,
                            },
                          },
                        },
                      })
                    }
                  />
                </div>

                {configuration.alerts.notifications.push.enabled && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4" />
                      <Switch defaultChecked={true} />
                      <span className="text-sm">Sound</span>
                    </div>

                    <div>
                      <Label className="text-sm">Severity Levels</Label>
                      <div className="flex gap-2 mt-1">
                        {(
                          ["warning", "error", "critical"] as AlertSeverity[]
                        ).map((severity) => (
                          <Badge
                            key={severity}
                            variant="outline"
                            className="text-xs"
                          >
                            {severity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Webhook Notifications */}
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Webhook className="w-5 h-5" />
                    <h4 className="font-medium">Webhook Notifications</h4>
                  </div>
                  <Switch
                    checked={configuration.alerts.notifications.webhook.enabled}
                    onCheckedChange={(checked) =>
                      handleConfigurationChange({
                        alerts: {
                          ...configuration.alerts,
                          notifications: {
                            ...configuration.alerts.notifications,
                            webhook: {
                              ...configuration.alerts.notifications.webhook,
                              enabled: checked,
                            },
                          },
                        },
                      })
                    }
                  />
                </div>

                {configuration.alerts.notifications.webhook.enabled && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm">Webhook URL</Label>
                      <Input
                        placeholder="https://hooks.slack.com/services/..."
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-sm">Custom Headers</Label>
                      <Input
                        placeholder="Authorization: Bearer token"
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Performance Settings</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Data Retention</Label>
                  <p className="text-sm text-gray-600">
                    How long to keep performance data
                  </p>
                </div>
                <Select defaultValue="7d">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1d">1 day</SelectItem>
                    <SelectItem value="7d">7 days</SelectItem>
                    <SelectItem value="30d">30 days</SelectItem>
                    <SelectItem value="90d">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Max Data Points</Label>
                  <p className="text-sm text-gray-600">
                    Maximum data points per metric
                  </p>
                </div>
                <Select defaultValue="1000">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="500">500</SelectItem>
                    <SelectItem value="1000">1,000</SelectItem>
                    <SelectItem value="5000">5,000</SelectItem>
                    <SelectItem value="10000">10,000</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Sample Rate</Label>
                  <p className="text-sm text-gray-600">
                    Data collection frequency
                  </p>
                </div>
                <Select defaultValue="100">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50%</SelectItem>
                    <SelectItem value="100">100%</SelectItem>
                    <SelectItem value="200">200%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Debug Settings</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Debug Mode</Label>
                  <p className="text-sm text-gray-600">Enable debug logging</p>
                </div>
                <Switch defaultChecked={false} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Verbose Logging</Label>
                  <p className="text-sm text-gray-600">
                    Detailed performance logs
                  </p>
                </div>
                <Switch defaultChecked={false} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Performance Profiling</Label>
                  <p className="text-sm text-gray-600">
                    Collect performance profiles
                  </p>
                </div>
                <Switch defaultChecked={false} />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Danger Zone</h3>

            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                These actions cannot be undone. Please proceed with caution.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button variant="outline" className="text-red-600 border-red-600">
                <Trash2 className="w-4 h-4 mr-1" />
                Clear All Data
              </Button>

              <Button variant="outline" className="text-red-600 border-red-600">
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset to Default Settings
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPanel;
