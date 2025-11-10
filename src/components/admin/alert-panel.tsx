"use client";

import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

import type {
  PerformanceAlert,
  AlertSeverity,
  PerformanceMetricCategory,
  PerformanceAlert as AlertType,
} from "@/types/admin/performance-dashboard";

import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Bell,
  BellOff,
  Clock,
  Filter,
  Search,
  Download,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  Shield,
  TrendingUp,
  Settings,
  Archive,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface AlertPanelProps {
  alerts: PerformanceAlert[];
  onAcknowledgeAlert: (alertId: string) => void;
  onResolveAlert: (alertId: string) => void;
  onDeleteAlert?: (alertId: string) => void;
  onBulkAction?: (
    alertIds: string[],
    action: "acknowledge" | "resolve" | "delete",
  ) => void;
  onExportAlerts?: (alerts: PerformanceAlert[]) => void;
  maxVisible?: number;
  className?: string;
  compact?: boolean;
  showFilters?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface AlertFilter {
  severity: AlertSeverity[];
  category: PerformanceMetricCategory[];
  status: "active" | "acknowledged" | "resolved" | "all";
  search: string;
  timeRange: "1h" | "6h" | "24h" | "7d" | "30d" | "all";
  acknowledged: boolean;
}

interface AlertStats {
  total: number;
  critical: number;
  error: number;
  warning: number;
  info: number;
  acknowledged: number;
  resolved: number;
  active: number;
}

const AlertPanel: React.FC<AlertPanelProps> = ({
  alerts,
  onAcknowledgeAlert,
  onResolveAlert,
  onDeleteAlert,
  onBulkAction,
  onExportAlerts,
  maxVisible = 50,
  className = "",
  compact = false,
  showFilters = true,
  autoRefresh = false,
  refreshInterval = 30000,
}) => {
  const [filter, setFilter] = useState<AlertFilter>({
    severity: [],
    category: [],
    status: "active",
    search: "",
    timeRange: "24h",
    acknowledged: false,
  });

  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Auto-refresh effect
  React.useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Calculate alert statistics
  const alertStats = useMemo((): AlertStats => {
    return alerts.reduce(
      (stats, alert) => {
        stats.total++;
        stats[alert.severity]++;

        if (alert.acknowledged) stats.acknowledged++;
        if (alert.resolvedAt) stats.resolved++;
        if (!alert.acknowledged && !alert.resolvedAt) stats.active++;

        return stats;
      },
      {
        total: 0,
        critical: 0,
        error: 0,
        warning: 0,
        info: 0,
        acknowledged: 0,
        resolved: 0,
        active: 0,
      } as AlertStats,
    );
  }, [alerts]);

  // Filter alerts based on current filter settings
  const filteredAlerts = useMemo(() => {
    return alerts
      .filter((alert) => {
        // Severity filter
        if (
          filter.severity.length > 0 &&
          !filter.severity.includes(alert.severity)
        ) {
          return false;
        }

        // Category filter
        if (
          filter.category.length > 0 &&
          !filter.category.includes(alert.category)
        ) {
          return false;
        }

        // Status filter
        if (
          filter.status === "active" &&
          (alert.acknowledged || alert.resolvedAt)
        ) {
          return false;
        }
        if (filter.status === "acknowledged" && !alert.acknowledged) {
          return false;
        }
        if (filter.status === "resolved" && !alert.resolvedAt) {
          return false;
        }

        // Search filter
        if (
          filter.search &&
          !alert.title.toLowerCase().includes(filter.search.toLowerCase()) &&
          !alert.message.toLowerCase().includes(filter.search.toLowerCase())
        ) {
          return false;
        }

        // Time range filter
        if (filter.timeRange !== "all") {
          const now = new Date();
          const alertTime = new Date(alert.timestamp);
          const timeDiff = now.getTime() - alertTime.getTime();

          const timeRanges = {
            "1h": 60 * 60 * 1000,
            "6h": 6 * 60 * 60 * 1000,
            "24h": 24 * 60 * 60 * 1000,
            "7d": 7 * 24 * 60 * 60 * 1000,
            "30d": 30 * 24 * 60 * 60 * 1000,
          };

          if (timeDiff > timeRanges[filter.timeRange]) {
            return false;
          }
        }

        return true;
      })
      .slice(0, maxVisible);
  }, [alerts, filter, maxVisible]);

  // Get severity color
  const getSeverityColor = (severity: AlertSeverity): string => {
    switch (severity) {
      case "critical":
        return "text-red-600 bg-red-50 border-red-200";
      case "error":
        return "text-red-500 bg-red-50 border-red-200";
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "info":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  // Get severity icon
  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case "critical":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "error":
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-600" />;
    }
  };

  // Toggle alert selection
  const toggleAlertSelection = (alertId: string) => {
    const newSelection = new Set(selectedAlerts);
    if (newSelection.has(alertId)) {
      newSelection.delete(alertId);
    } else {
      newSelection.add(alertId);
    }
    setSelectedAlerts(newSelection);
    setShowBulkActions(newSelection.size > 0);
  };

  // Toggle all alerts selection
  const toggleAllAlerts = () => {
    if (selectedAlerts.size === filteredAlerts.length) {
      setSelectedAlerts(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedAlerts(new Set(filteredAlerts.map((alert) => alert.id)));
      setShowBulkActions(true);
    }
  };

  // Toggle alert expansion
  const toggleAlertExpansion = (alertId: string) => {
    const newExpanded = new Set(expandedAlerts);
    if (newExpanded.has(alertId)) {
      newExpanded.delete(alertId);
    } else {
      newExpanded.add(alertId);
    }
    setExpandedAlerts(newExpanded);
  };

  // Bulk action handler
  const handleBulkAction = (action: "acknowledge" | "resolve" | "delete") => {
    if (onBulkAction && selectedAlerts.size > 0) {
      onBulkAction(Array.from(selectedAlerts), action);
      setSelectedAlerts(new Set());
      setShowBulkActions(false);
    }
  };

  // Export alerts
  const handleExport = () => {
    if (onExportAlerts) {
      onExportAlerts(filteredAlerts);
    }
  };

  // Alert card component
  const AlertCard: React.FC<{ alert: PerformanceAlert; compact?: boolean }> = ({
    alert,
    compact = false,
  }) => {
    const isSelected = selectedAlerts.has(alert.id);
    const isExpanded = expandedAlerts.has(alert.id);

    return (
      <Card
        className={`border-l-4 ${
          alert.severity === "critical"
            ? "border-l-red-500"
            : alert.severity === "error"
              ? "border-l-red-400"
              : alert.severity === "warning"
                ? "border-l-yellow-500"
                : "border-l-blue-500"
        } ${isSelected ? "ring-2 ring-blue-500" : ""} ${compact ? "p-3" : "p-4"}`}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleAlertSelection(alert.id)}
              className="mt-1"
            />

            {getSeverityIcon(alert.severity)}

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3
                  className={`font-semibold truncate ${compact ? "text-sm" : "text-base"}`}
                >
                  {alert.title}
                </h3>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <Badge
                    variant={getSeverityColor(alert.severity) as any}
                    className="text-xs"
                  >
                    {alert.severity}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {alert.category}
                  </Badge>
                  {alert.acknowledged && (
                    <Badge variant="secondary" className="text-xs">
                      <Eye className="w-3 h-3 mr-1" />
                      Acknowledged
                    </Badge>
                  )}
                  {alert.resolvedAt && (
                    <Badge variant="default" className="text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Resolved
                    </Badge>
                  )}
                </div>
              </div>

              <p
                className={`text-gray-600 ${compact ? "text-sm line-clamp-2" : ""}`}
              >
                {alert.message}
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleAlertExpansion(alert.id)}
              className="flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Expanded content */}
          {isExpanded && (
            <div className="space-y-3 pl-8">
              {/* Recommendations */}
              {alert.recommendations.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Recommendations:</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    {alert.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              {alert.actions && alert.actions.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Quick Actions:</h4>
                  <div className="flex flex-wrap gap-2">
                    {alert.actions.map((action, index) => (
                      <Button
                        key={index}
                        variant={
                          action.type === "primary" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={action.action}
                        className="text-xs"
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>Metric:</span>
                  <span className="font-mono">{alert.metric}</span>
                </div>
                <div className="flex justify-between">
                  <span>Value:</span>
                  <span>
                    {alert.value} (Threshold: {alert.threshold})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Time:</span>
                  <span>{alert.timestamp.toLocaleString()}</span>
                </div>
                {alert.resolvedAt && (
                  <div className="flex justify-between">
                    <span>Resolved:</span>
                    <span>{alert.resolvedAt.toLocaleString()}</span>
                  </div>
                )}
                {alert.tags && Object.keys(alert.tags).length > 0 && (
                  <div>
                    <span className="font-medium">Tags:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(alert.tags).map(([key, value]) => (
                        <Badge key={key} variant="outline" className="text-xs">
                          {key}: {value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              {!alert.acknowledged && !alert.resolvedAt && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAcknowledgeAlert(alert.id)}
                  className="text-xs"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Acknowledge
                </Button>
              )}

              {!alert.resolvedAt && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onResolveAlert(alert.id)}
                  className="text-xs"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Resolve
                </Button>
              )}

              {onDeleteAlert && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDeleteAlert(alert.id)}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              )}
            </div>

            <div className="text-xs text-gray-500">
              {alert.timestamp.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  if (compact) {
    return (
      <div className={className}>
        {filteredAlerts.length > 0 ? (
          <div className="space-y-2">
            {filteredAlerts.slice(0, 3).map((alert) => (
              <AlertCard key={alert.id} alert={alert} compact={true} />
            ))}
            {filteredAlerts.length > 3 && (
              <div className="text-center text-sm text-gray-500 pt-2">
                {filteredAlerts.length - 3} more alerts...
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-4">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p>No active alerts</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Stats Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-red-600">
                {alertStats.critical}
              </div>
              <div className="text-sm text-gray-600">Critical</div>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {alertStats.warning}
              </div>
              <div className="text-sm text-gray-600">Warning</div>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {alertStats.active}
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            <AlertTriangle className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {alertStats.resolved}
              </div>
              <div className="text-sm text-gray-600">Resolved</div>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Filters</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setFilter({
                  severity: [],
                  category: [],
                  status: "active",
                  search: "",
                  timeRange: "24h",
                  acknowledged: false,
                })
              }
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div>
              <Input
                placeholder="Search alerts..."
                value={filter.search}
                onChange={(e) =>
                  setFilter((prev) => ({ ...prev, search: e.target.value }))
                }
                className="text-sm"
              />
            </div>

            {/* Status filter */}
            <div>
              <Select
                value={filter.status}
                onValueChange={(value: any) =>
                  setFilter((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Severity filter */}
            <div>
              <Select
                value={filter.severity.join(",")}
                onValueChange={(value) =>
                  setFilter((prev) => ({
                    ...prev,
                    severity: value ? value.split(",") : [],
                  }))
                }
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time range filter */}
            <div>
              <Select
                value={filter.timeRange}
                onValueChange={(value: any) =>
                  setFilter((prev) => ({ ...prev, timeRange: value }))
                }
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="6h">Last 6 Hours</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Auto-refresh toggle */}
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="text-sm">Auto-refresh</span>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => {}}
                className="rounded"
              />
            </div>

            {/* Export */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="text-sm"
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </Card>
      )}

      {/* Bulk Actions */}
      {showBulkActions && (
        <Alert className="border-blue-200 bg-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {selectedAlerts.size} alert{selectedAlerts.size > 1 ? "s" : ""}{" "}
                selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction("acknowledge")}
              >
                <Eye className="w-4 h-4 mr-1" />
                Acknowledge All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction("resolve")}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Resolve All
              </Button>
              {onDeleteAlert && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("delete")}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete All
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAlerts(new Set())}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Alert>
      )}

      {/* Alert List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">
            Alerts ({filteredAlerts.length} of {alerts.length})
          </h3>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={
                selectedAlerts.size === filteredAlerts.length &&
                filteredAlerts.length > 0
              }
              onChange={toggleAllAlerts}
              className="rounded"
            />
            <span className="text-sm text-gray-600">Select All</span>
          </div>
        </div>

        {filteredAlerts.length > 0 ? (
          <ScrollArea className="h-[600px]">
            <div className="space-y-3 pr-4">
              {filteredAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <Card className="p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Alerts Found</h3>
            <p className="text-gray-600 mb-4">
              {alerts.length === 0
                ? "Great! No performance issues detected."
                : "No alerts match your current filters."}
            </p>
            {alerts.length > 0 && (
              <Button
                variant="outline"
                onClick={() =>
                  setFilter({
                    severity: [],
                    category: [],
                    status: "active",
                    search: "",
                    timeRange: "24h",
                    acknowledged: false,
                  })
                }
              >
                Clear Filters
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
        <div>Last updated: {lastRefresh.toLocaleTimeString()}</div>
        <div className="flex items-center gap-4">
          <span>
            Showing {filteredAlerts.length} of {alerts.length} alerts
          </span>
          {autoRefresh && (
            <div className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Auto-refresh enabled</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertPanel;
