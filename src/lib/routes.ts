/**
 * 应用路由常量定义
 * 统一管理所有路由路径，避免硬编码
 */

export const ROUTES = {
  /** 首页 - 文件列表 */
  HOME: "/",
  /** 播放器页面 */
  PLAYER: "/player/[fileId]",
  /** 设置页面 */
  SETTINGS: "/settings",
  /** 账户页面 */
  ACCOUNT: "/account",
} as const;

export type RouteKey = keyof typeof ROUTES;

/**
 * 生成路由路径
 * @param key 路由键
 * @param params 路径参数
 */
export function generatePath(key: RouteKey, params?: Record<string, string>): string {
  const path = ROUTES[key];

  if (!params) {
    return path;
  }

  // Special handling for player route
  if (key === "PLAYER" && params.fileId) {
    return path.replace("[fileId]", params.fileId);
  }

  return path;
}

/**
 * 获取播放器路由
 */
export function getPlayerRoute(fileId: string): string {
  return generatePath("PLAYER", { fileId });
}
