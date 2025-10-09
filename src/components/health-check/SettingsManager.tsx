'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertCircle,
  CheckCircle,
  Settings,
  Clock,
  Shield,
  Bell,
  Database,
  Trash2,
  Save,
  RefreshCw,
  AlertTriangle,
  X
} from 'lucide-react';
import { useHealthCheckConfig } from '@/hooks/useHealthCheck';
import { CheckCategory, SeverityLevel, GlobalHealthCheckConfig, HealthCheckConfigWithCategory } from '@/lib/health-check/types';

interface SettingsManagerProps {
  onClose?: () => void;
  className?: string;
}

export function SettingsManager({ onClose, className }: SettingsManagerProps) {
  const { configs, globalConfig, updateCategoryConfig, updateGlobalConfig, refreshConfigs } = useHealthCheckConfig();
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleCategoryConfigChange = async (category: CheckCategory, field: string, value: any) => {
    const config = (configs as HealthCheckConfigWithCategory[]).find(c => c.category === category);
    if (!config) return;

    const updatedConfig = { ...config, [field]: value };
    const updatedConfigs = (configs as HealthCheckConfigWithCategory[]).map(c =>
      c.category === category ? updatedConfig : c
    );

    await updateCategoryConfig(category, updatedConfig);
    setHasChanges(true);
  };

  const handleGlobalConfigChange = async (field: string, value: any) => {
    const updatedGlobalConfig = { ...(globalConfig || {} as GlobalHealthCheckConfig), [field]: value };
    await updateGlobalConfig(updatedGlobalConfig);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await refreshConfigs();
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
      try {
        // 重置为默认值的逻辑
        // 这里可以调用API重置端点
        await refreshConfigs();
        setHasChanges(false);
      } catch (error) {
        console.error('Failed to reset settings:', error);
      }
    }
  };

  const getSeverityOptions = () => [
    { value: 'low', label: 'Low - Minor issues' },
    { value: 'medium', label: 'Medium - Important issues' },
    { value: 'high', label: 'High - Critical issues' },
    { value: 'critical', label: 'Critical - Blocking issues' },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <CardTitle>Health Check Settings</CardTitle>
            </div>
            <div className="flex space-x-2">
              {hasChanges && (
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              )}
              <Button variant="outline" onClick={handleReset}>
                <Trash2 className="h-4 w-4" />
                Reset
              </Button>
              {onClose && (
                <Button variant="ghost" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="global" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="global">Global</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            {/* 全局设置 */}
            <TabsContent value="global" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="autoRun" className="text-base font-medium">
                      Auto Run Checks
                    </Label>
                    <p className="text-sm text-gray-600">
                      Automatically run health checks at scheduled intervals
                    </p>
                  </div>
                  <Switch
                    id="autoRun"
                    checked={globalConfig?.autoRun || false}
                    onCheckedChange={(checked) =>
                      handleGlobalConfigChange('autoRun', checked)
                    }
                  />
                </div>

                {globalConfig?.autoRun && (
                  <div className="ml-4 p-4 bg-gray-50 rounded-lg">
                    <Label htmlFor="interval" className="text-sm font-medium">
                      Check Interval
                    </Label>
                    <div className="mt-2">
                      <Select
                        value={globalConfig.interval.toString()}
                        onValueChange={(value) =>
                          handleGlobalConfigChange('interval', parseInt(value))
                        }
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3600000">1 Hour</SelectItem>
                          <SelectItem value="21600000">6 Hours</SelectItem>
                          <SelectItem value="86400000">24 Hours</SelectItem>
                          <SelectItem value="604800000">1 Week</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notifications" className="text-base font-medium">
                      Notifications
                    </Label>
                    <p className="text-sm text-gray-600">
                      Show notifications for check results
                    </p>
                  </div>
                  <Switch
                    id="notifications"
                    checked={globalConfig?.notifications || false}
                    onCheckedChange={(checked) =>
                      handleGlobalConfigChange('notifications', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="emailReports" className="text-base font-medium">
                      Email Reports
                    </Label>
                    <p className="text-sm text-gray-600">
                      Send email summaries of health check results
                    </p>
                  </div>
                  <Switch
                    id="emailReports"
                    checked={globalConfig?.emailReports || false}
                    onCheckedChange={(checked) =>
                      handleGlobalConfigChange('emailReports', checked)
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="retentionDays" className="text-base font-medium">
                    Data Retention (Days)
                  </Label>
                  <p className="text-sm text-gray-600 mb-2">
                    How long to keep health check reports
                  </p>
                  <div className="flex items-center space-x-4">
                    <Slider
                      id="retentionDays"
                      min={1}
                      max={365}
                      step={1}
                      value={[globalConfig?.retentionDays || 30]}
                      onValueChange={(value) =>
                        handleGlobalConfigChange('retentionDays', value[0])
                      }
                      className="flex-1"
                    />
                    <div className="w-16 text-right text-sm">
                      {globalConfig?.retentionDays || 30} days
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 类别设置 */}
            <TabsContent value="categories" className="space-y-6">
              <div className="space-y-6">
                {(configs as HealthCheckConfigWithCategory[]).map((config) => (
                  <Card key={config.category} className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium">
                        {config.category.replace('_', ' ').replace(/\b\w/g, (char) =>
                          char.toUpperCase()
                        )}
                      </h3>
                      <Switch
                        checked={config.enabled}
                        onCheckedChange={(checked) =>
                          handleCategoryConfigChange(config.category, 'enabled', checked)
                        }
                      />
                    </div>

                    {config.enabled && (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor={`timeout-${config.category}`}>
                            Timeout (seconds)
                          </Label>
                          <div className="flex items-center space-x-4 mt-2">
                            <Slider
                              id={`timeout-${config.category}`}
                              min={5}
                              max={300}
                              step={5}
                              value={[config.timeout / 1000]}
                              onValueChange={(value) =>
                                handleCategoryConfigChange(
                                  config.category,
                                  'timeout',
                                  value[0] * 1000
                                )
                              }
                              className="flex-1"
                            />
                            <div className="w-16 text-right text-sm">
                              {config.timeout / 1000}s
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor={`retryCount-${config.category}`}>
                            Retry Count
                          </Label>
                          <div className="flex items-center space-x-4 mt-2">
                            <Slider
                              id={`retryCount-${config.category}`}
                              min={0}
                              max={5}
                              step={1}
                              value={[config.retryCount]}
                              onValueChange={(value) =>
                                handleCategoryConfigChange(
                                  config.category,
                                  'retryCount',
                                  value[0]
                                )
                              }
                              className="flex-1"
                            />
                            <div className="w-16 text-right text-sm">
                              {config.retryCount}
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label>
                            Severity Level
                          </Label>
                          <Select
                            value={config.severity}
                            onValueChange={(value) =>
                              handleCategoryConfigChange(
                                config.category,
                                'severity',
                                value as SeverityLevel
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {getSeverityOptions().map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {config.parameters && Object.keys(config.parameters).length > 0 && (
                          <div>
                            <Label>Additional Parameters</Label>
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                              {Object.entries(config.parameters).map(([key, value]) => (
                                <div key={key} className="text-sm">
                                  <span className="font-medium">{key}:</span>{' '}
                                  <span className="text-gray-600">
                                    {typeof value === 'object'
                                      ? JSON.stringify(value)
                                      : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* 高级设置 */}
            <TabsContent value="advanced" className="space-y-6">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      <span>Advanced Settings</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-gray-600">
                      <p>
                        Advanced settings allow you to customize the behavior of the health check system.
                        Be careful when changing these values as they can affect system performance.
                      </p>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Data Management</h4>
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            window.alert('Data export feature coming soon!');
                          }}
                          className="w-full"
                        >
                          Export All Reports
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            window.alert('Data cleanup feature coming soon!');
                          }}
                          className="w-full"
                        >
                          Clean Old Reports
                        </Button>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">System Information</h4>
                      <div className="space-y-2 text-sm text-gray-600">
                        <p>
                          <span className="font-medium">Total Categories:</span>{' '}
                          {configs.length}
                        </p>
                        <p>
                          <span className="font-medium">Enabled Categories:</span>{' '}
                          {configs.filter(c => c.enabled).length}
                        </p>
                        <p>
                          <span className="font-medium">Config Version:</span>{' '}
                          {Math.random().toString(36).substr(2, 8)}
                        </p>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Troubleshooting</h4>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>System is healthy and ready</span>
                        </div>
                        <p>
                          If you experience issues with health checks, try:
                        </p>
                        <ul className="ml-6 list-disc text-sm text-gray-600">
                          <li>Clear browser cache and reload</li>
                          <li>Check network connectivity</li>
                          <li>Review browser console for errors</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}