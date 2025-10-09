'use client';

import React, { useState, useEffect, useCallback, useId } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  BellRing,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  X,
  Settings,
  Trash2,
  Download,
  Filter,
  Clock,
  Zap,
  Shield,
  Activity,
  Monitor,
  Database
} from 'lucide-react';
import { useHealthCheckConfig } from '@/hooks/useHealthCheck';
import { CheckStatus, CheckCategory, HealthCheckResult } from '@/lib/health-check/types';

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  category?: CheckCategory;
  read: boolean;
  actions?: NotificationAction[];
}

interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
}

interface NotificationManagerProps {
  className?: string;
  onNotificationClick?: (notification: Notification) => void;
}

export function NotificationManager({ className, onNotificationClick }: NotificationManagerProps) {
  const notificationsId = useId();
  const { configs } = useHealthCheckConfig();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'success' | 'warning' | 'error' | 'info'>('all');

  // 生成示例通知（在实际应用中，这些会来自真实的健康检查结果）
  useEffect(() => {
    const sampleNotifications: Notification[] = [
      {
        id: '1',
        type: 'success',
        title: 'API连接检查完成',
        message: '所有API端点响应正常，平均响应时间245ms',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        category: CheckCategory.API_CONNECTIVITY,
        read: false,
        actions: [
          {
            label: '查看详情',
            action: () => console.log('查看API检查详情'),
            variant: 'outline'
          }
        ]
      },
      {
        id: '2',
        type: 'warning',
        title: '性能检查发现异常',
        message: '首页加载时间超过预期，建议优化图片资源',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        category: CheckCategory.PERFORMANCE,
        read: false,
        actions: [
          {
            label: '查看报告',
            action: () => console.log('查看性能报告'),
            variant: 'default'
          },
          {
            label: '忽略',
            action: () => console.log('忽略性能警告'),
            variant: 'outline'
          }
        ]
      },
      {
        id: '3',
        type: 'info',
        title: '定期检查计划',
        message: '系统将在今晚22:00执行定期健康检查',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        read: true,
        actions: [
          {
            label: '修改计划',
            action: () => console.log('修改检查计划'),
            variant: 'outline'
          }
        ]
      },
      {
        id: '4',
        type: 'error',
        title: '安全检查失败',
        message: '发现过期的HTTPS证书，需要立即更新',
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        category: CheckCategory.SECURITY,
        read: false,
        actions: [
          {
            label: '立即修复',
            action: () => console.log('修复安全证书'),
            variant: 'destructive'
          },
          {
            label: '查看详情',
            action: () => console.log('查看安全详情'),
            variant: 'outline'
          }
        ]
      }
    ];

    setNotifications(sampleNotifications);
  }, []);

  // 添加新通知
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  // 标记通知为已读
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  }, []);

  // 删除通知
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // 清空所有通知
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // 标记所有通知为已读
  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  // 获取通知图标
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'info':
        return <Bell className="h-5 w-5 text-blue-500" />;
    }
  };

  // 获取类别图标
  const getCategoryIcon = (category?: CheckCategory) => {
    const iconMap = {
      'api_connectivity': <Zap className="h-4 w-4" />,
      'error_handling': <Shield className="h-4 w-4" />,
      'performance': <Activity className="h-4 w-4" />,
      'user_experience': <Monitor className="h-4 w-4" />,
      'security': <Shield className="h-4 w-4" />,
      'offline_capability': <Database className="h-4 w-4" />,
    };
    return category ? iconMap[category] : <Bell className="h-4 w-4" />;
  };

  // 过滤通知
  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read;
      case 'success':
        return notification.type === 'success';
      case 'warning':
        return notification.type === 'warning';
      case 'error':
        return notification.type === 'error';
      case 'info':
        return notification.type === 'info';
      default:
        return true;
    }
  });

  // 格式化时间
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return `${days}天前`;
  };

  // 统计数据
  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    errors: notifications.filter(n => n.type === 'error').length,
    warnings: notifications.filter(n => n.type === 'warning').length,
    success: notifications.filter(n => n.type === 'success').length,
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 头部统计 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BellRing className="h-5 w-5" />
              <CardTitle>通知中心</CardTitle>
              {stats.unread > 0 && (
                <Badge variant="destructive" className="h-5 px-2">
                  {stats.unread}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id={notificationsId}
                  checked={isEnabled}
                  onCheckedChange={setIsEnabled}
                />
                <Label htmlFor={notificationsId} className="text-sm">
                  启用通知
                </Label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">全部通知</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
              <div className="text-sm text-gray-600">错误</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.warnings}</div>
              <div className="text-sm text-gray-600">警告</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.success}</div>
              <div className="text-sm text-gray-600">成功</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{stats.unread}</div>
              <div className="text-sm text-gray-600">未读</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="notifications" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="notifications">通知列表</TabsTrigger>
          <TabsTrigger value="settings">通知设置</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          {/* 过滤器 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4" />
                  <span className="text-sm font-medium">筛选:</span>
                  <div className="flex space-x-1">
                    {[
                      { value: 'all', label: '全部' },
                      { value: 'unread', label: '未读' },
                      { value: 'error', label: '错误' },
                      { value: 'warning', label: '警告' },
                      { value: 'success', label: '成功' },
                    ].map(option => (
                      <Button
                        key={option.value}
                        variant={filter === option.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter(option.value as any)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex space-x-2">
                  {stats.unread > 0 && (
                    <Button variant="outline" size="sm" onClick={markAllAsRead}>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      全部已读
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={clearAllNotifications}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    清空
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 通知列表 */}
          <div className="space-y-2">
            {filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-gray-500">
                    <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无通知</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredNotifications.map(notification => (
                <Card
                  key={notification.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    !notification.read ? 'border-l-4 border-l-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => {
                    markAsRead(notification.id);
                    onNotificationClick?.(notification);
                  }}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium truncate">{notification.title}</h4>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              {formatTime(notification.timestamp)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeNotification(notification.id);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {notification.category && (
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                {getCategoryIcon(notification.category)}
                                <span>{notification.category.replace('_', ' ')}</span>
                              </div>
                            )}
                            {!notification.read && (
                              <Badge variant="secondary" className="text-xs">
                                未读
                              </Badge>
                            )}
                          </div>
                          {notification.actions && notification.actions.length > 0 && (
                            <div className="flex space-x-1">
                              {notification.actions.map((action, index) => (
                                <Button
                                  key={index}
                                  variant={action.variant || 'outline'}
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    action.action();
                                  }}
                                >
                                  {action.label}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">通知设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">通知类型</h4>
                {[
                  { type: 'success', label: '成功通知', description: '健康检查成功完成时' },
                  { type: 'warning', label: '警告通知', description: '发现潜在问题时' },
                  { type: 'error', label: '错误通知', description: '检查失败或系统错误时' },
                  { type: 'info', label: '信息通知', description: '定期检查计划和提醒' },
                ].map(({ type, label, description }) => (
                  <div key={type} className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">{label}</Label>
                      <p className="text-sm text-gray-600">{description}</p>
                    </div>
                    <Switch defaultChecked={type !== 'info'} />
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">通知方式</h4>
                {[
                  { method: 'browser', label: '浏览器通知', description: '在浏览器中显示推送通知' },
                  { method: 'sound', label: '声音提醒', description: '播放提示音' },
                  { method: 'desktop', label: '桌面通知', description: '在桌面显示通知（需要权限）' },
                ].map(({ method, label, description }) => (
                  <div key={method} className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">{label}</Label>
                      <p className="text-sm text-gray-600">{description}</p>
                    </div>
                    <Switch defaultChecked={method === 'browser'} />
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">通知规则</h4>
                {[
                  { rule: 'frequency', label: '频率限制', description: '避免同类型通知过于频繁' },
                  { rule: 'grouping', label: '通知合并', description: '将相似通知合并显示' },
                  { rule: 'autoClear', label: '自动清理', description: '7天后自动删除已读通知' },
                ].map(({ rule, label, description }) => (
                  <div key={rule} className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">{label}</Label>
                      <p className="text-sm text-gray-600">{description}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 导出通知管理器的类型
export type { Notification, NotificationAction, NotificationManagerProps };