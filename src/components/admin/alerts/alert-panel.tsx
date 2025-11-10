"use client";

import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// Types
import type {
  PerformanceAlert,
  AlertSeverity,
  PerformanceMetricCategory
} from "@/types/admin/performance-dashboard";

// Icons
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Filter,
  Search,
  Bell,
  BellOff,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  Download,
  Settings,
  Zap,
  Shield,
  Activity,
  Database,
  Wifi,
  Cpu,
  MemoryStick,
  Battery
} from "lucide-react";

interface AlertPanelProps {
  alerts: PerformanceAlert[];
  onAcknowledgeAlert: (alertId: string) => void;
  onResolveAlert: (alertId: string) => void;
  onDeleteAlert: (alertId: string) => void;
  onClearAllAlerts: () => void;
  onExportAlerts?: (format: 'json' | 'csv') => void;
  maxVisible?: number;
  className?: string;
  showFilters?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface AlertFilters {
  severity: AlertSeverity[];
  category: PerformanceMetricCategory[];
  acknowledged: boolean | null;
  search: string;
  timeRange: 'all' | '1h' | '24h' | '7d' | '30d';
}

const DEFAULT_FILTERS: AlertFilters = {
  severity: ['critical', 'error', 'warning'],
  category: [],
  acknowledged: null,
  search: '',
  timeRange: '24h'
};

const SEVERITY_CONFIG = {
  critical: {
    color: 'text-red-600 bg-red-50 border-red-200',
    icon: AlertTriangle,
    priority: 4
  },
  error: {
    color: 'text-red-500 bg-red-50 border-red-200',
    icon: XCircle,
    priority: 3
  },
  warning: {
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    icon: AlertCircle,
    priority: 2
  },
  info: {
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    icon: Info,
    priority: 1
  }
};

const CATEGORY_ICONS = {
  system: Cpu,
  memory: MemoryStick,
  network: Wifi,
  battery: Battery,
  database: Database,
  transcription: Zap,
  player: Activity,
  ui: Activity,
  storage: Database,
  mobile: MemoryStick
};

/**
 * Alert Panel Component
 * Comprehensive alert management interface for performance monitoring
 */
export const AlertPanel: React.FC<AlertPanelProps> = ({
  alerts,
  onAcknowledgeAlert,
  onResolveAlert,
  onDeleteAlert,
  onClearAllAlerts,
  onExportAlerts,
  maxVisible = 50,
  className = "",
  showFilters = true,
  autoRefresh = false,
  refreshInterval = 30000
}) => {
  const [filters, setFilters] = useState<AlertFilters>(DEFAULT_FILTERS);
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<PerformanceAlert | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(autoRefresh);

  // Auto-refresh effect
  React.useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      // This would trigger a refresh of alerts from the parent component
      console.log('Auto-refreshing alerts...');
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, refreshInterval]);

  // Filter alerts based on current filters
  const filteredAlerts = useMemo(() => {
    let filtered = [...alerts];

    // Filter by severity
    if (filters.severity.length > 0) {
      filtered = filtered.filter(alert => filters.severity.includes(alert.severity));
    }

    // Filter by category
    if (filters.category.length > 0) {
      filtered = filtered.filter(alert => filters.category.includes(alert.category));
    }

    // Filter by acknowledgment status
    if (filters.acknowledged !== null) {
      filtered = filtered.filter(alert => alert.acknowledged === filters.acknowledged);
    }

    // Filter by search term
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(alert =>
        alert.title.toLowerCase().includes(searchLower) ||
        alert.message.toLowerCase().includes(searchLower) ||
        alert.metric.toLowerCase().includes(searchLower)
      );
    }

    // Filter by time range
    if (filters.timeRange !== 'all') {
      const now = new Date();
      const timeRanges = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };

      const cutoff = new Date(now.getTime() - timeRanges[filters.timeRange]);
      filtered = filtered.filter(alert => alert.timestamp >= cutoff);
    }

    // Sort by severity and timestamp
    filtered.sort((a, b) => {
      const severityDiff = SEVERITY_CONFIG[b.severity].priority - SEVERITY_CONFIG[a.severity].priority;
      if (severityDiff !== 0) return severityDiff;

      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    return filtered.slice(0, maxVisible);
  }, [alerts, filters, maxVisible]);

  // Alert statistics
  const alertStats = useMemo(() => {
    const stats = {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      error: alerts.filter(a => a.severity === 'error').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      info: alerts.filter(a => a.severity === 'info').length,
      acknowledged: alerts.filter(a => a.acknowledged).length,
      unacknowledged: alerts.filter(a => !a.acknowledged).length,
      resolved: alerts.filter(a => a.resolvedAt).length
    };

    return stats;
  }, [alerts]);

  // Toggle alert expansion
  const toggleAlertExpansion = (alertId: string) => {
    setExpandedAlerts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(alertId)) {
        newSet.delete(alertId);
      } else {
        newSet.add(alertId);
      }
      return newSet;
    });
  };

  // Handle filter changes
  const updateFilter = (key: keyof AlertFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  // Export alerts
  const handleExport = (format: 'json' | 'csv') => {
    if (onExportAlerts) {
      onExportAlerts(format);
    }
  };

  // Get category icon
  const getCategoryIcon = (category: PerformanceMetricCategory) => {
    const IconComponent = CATEGORY_ICONS[category] || AlertCircle;
    return <IconComponent className="w-4 h-4" />;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
            <div>
              <h2 className="text-xl font-semibold">Performance Alerts</h2>
              <p className="text-sm text-gray-600">
                {alertStats.total} total alerts ({alertStats.unacknowledged} unacknowledged)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-refresh toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            >
              {autoRefreshEnabled ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  Auto-refresh
                </>
              ) : (
                <>
                  <BellOff className="w-4 h-4 mr-1" />
                  Auto-refresh
                </>
              )}
            </Button>

            {/* Filters button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            >
              <Filter className="w-4 h-4 mr-1" />
              Filters
              {Object.values(filters).filter((v, k) =>
                k !== 'acknowledged' || v !== null
              ).some(v =>
                Array.isArray(v) ? v.length > 0 : v !== '' && v !== 'all'
              ) && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  Active
                </Badge>
              )}
            </Button>

            {/* Export button */}
            <Select onValueChange={handleExport}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={<Download className="w-4 h-4" />} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">Export JSON</SelectItem>
                <SelectItem value="csv">Export CSV</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear all button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onClearAllAlerts}
              disabled={alerts.length === 0}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mt-4">
          <div className="text-center p-2 bg-red-50 rounded-lg">
            <div className="text-lg font-bold text-red-600">{alertStats.critical}</div>
            <div className="text-xs text-red-600">Critical</div>
          </div>
          <div className="text-center p-2 bg-orange-50 rounded-lg">
            <div className="text-lg font-bold text-orange-600">{alertStats.error}</div>
            <div className="text-xs text-orange-600">Error</div>
          </div>
          <div className="text-center p-2 bg-yellow-50 rounded-lg">
            <div className="text-lg font-bold text-yellow-600">{alertStats.warning}</div>
            <div className="text-xs text-yellow-600">Warning</div>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-600">{alertStats.info}</div>
            <div className="text-xs text-blue-600">Info</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-600">{alertStats.unacknowledged}</div>
            <div className="text-xs text-gray-600">Unacknowledged</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-600">{alertStats.acknowledged}</div>
            <div className="text-xs text-green-600">Acknowledged</div>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded-lg">
            <div className="text-lg font-bold text-purple-600">{alertStats.resolved}</div>
            <div className="text-xs text-purple-600">Resolved</div>
          </div>
          <div className="text-center p-2 bg-gray-100 rounded-lg">
            <div className="text-lg font-bold text-gray-600">{alertStats.total}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
        </div>
      </Card>

      {/* Filters Panel */}
      {showFiltersPanel && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Alert Filters</h3>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search alerts..."
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Severity filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Severity</label>
              <div className="space-y-2">
                {(['critical', 'error', 'warning', 'info'] as AlertSeverity[]).map(severity => (
                  <label key={severity} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.severity.includes(severity)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateFilter('severity', [...filters.severity, severity]);
                        } else {
                          updateFilter('severity', filters.severity.filter(s => s !== severity));
                        }
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${SEVERITY_CONFIG[severity].color.split(' ')[1]}`} />
                      <span className="text-sm capitalize">{severity}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Category filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {(['system', 'memory', 'network', 'battery', 'database', 'transcription', 'player', 'ui', 'storage', 'mobile'] as PerformanceMetricCategory[]).map(category => (
                  <label key={category} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.category.includes(category)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateFilter('category', [...filters.category, category]);
                        } else {
                          updateFilter('category', filters.category.filter(c => c !== category));
                        }
                      }}
                    />
                    <div className="flex items-center gap-1">
                      {getCategoryIcon(category)}
                      <span className="text-sm capitalize">{category}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Acknowledgment filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Acknowledgment Status</label>
              <Select
                value={filters.acknowledged === null ? 'all' : filters.acknowledged ? 'acknowledged' : 'unacknowledged'}
                onValueChange={(value) => {
                  updateFilter('acknowledged',
                    value === 'all' ? null : value === 'acknowledged'
                  );
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="unacknowledged">Unacknowledged</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time range filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Time Range</label>
              <Select
                value={filters.timeRange}
                onValueChange={(value: any) => updateFilter('timeRange', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}

      {/* Alert List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Alerts ({filteredAlerts.length} of {alerts.length})
          </h3>
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Alerts Found</h3>
            <p className="text-gray-600">
              {alerts.length === 0
                ? "Great! No performance alerts have been generated."
                : "No alerts match your current filters."
              }
            </p>
            {alerts.length > 0 && filteredAlerts.length === 0 && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {filteredAlerts.map((alert) => {
                const SeverityIcon = SEVERITY_CONFIG[alert.severity].icon;
                const isExpanded = expandedAlerts.has(alert.id);

                return (
                  <Card
                    key={alert.id}
                    className={`p-4 border-2 ${SEVERITY_CONFIG[alert.severity].color} ${
                      alert.acknowledged ? 'opacity-75' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Severity icon */}
                      <div className="flex-shrink-0">
                        <SeverityIcon className="w-6 h-6" />
                      </div>

                      {/* Alert content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {/* Title and metadata */}
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-gray-900">{alert.title}</h4>
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
                                <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Resolved
                                </Badge>
                              )}
                            </div>

                            {/* Message */}
                            <p className="text-gray-700 mb-2">{alert.message}</p>

                            {/* Metric information */}
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                              <div className="flex items-center gap-1">
                                {getCategoryIcon(alert.category)}
                                <span>{alert.metric}</span>
                              </div>
                              <div>
                                Value: <span className="font-medium">{alert.value}</span>
                              </div>
                              <div>
                                Threshold: <span className="font-medium">{alert.threshold}</span>
                              </div>
                            </div>

                            {/* Timestamp */}
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              <span>{alert.timestamp.toLocaleString()}</span>
                              {alert.resolvedAt && (
                                <>
                                  <span>•</span>
                                  <span className="text-green-600">
                                    Resolved: {alert.resolvedAt.toLocaleString()}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Recommendations (expanded) */}
                            {isExpanded && alert.recommendations.length > 0 && (
                              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                <h5 className="font-medium text-gray-900 mb-2">Recommendations:</h5>
                                <ul className="space-y-1">
                                  {alert.recommendations.map((rec, index) => (
                                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                                      <span className="text-blue-500 mt-0.5">•</span>
                                      <span>{rec}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleAlertExpansion(alert.id)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>

                            {!alert.acknowledged && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onAcknowledgeAlert(alert.id)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Acknowledge
                              </Button>
                            )}

                            {!alert.resolvedAt && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onResolveAlert(alert.id)}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Resolve
                              </Button>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onDeleteAlert(alert.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
  );
};

export default AlertPanel;
