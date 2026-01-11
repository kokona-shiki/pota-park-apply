/**
 * 将后端角色英文标识转换为前端显示的中文名称
 * @param role 后端角色英文标识
 * @returns 对应的中文显示名称
 */
export const getRoleDisplayName = (role: string): string => {
  const roleMap: Record<string, string> = {
    'system_admin': '系统管理员',
    'pota_representative': 'POTA地图代表',
    'park_reviewer': '地图审核员',
    'user': '普通用户',
    'banned': '封禁用户(可登录但权限受限)',
  };

  return roleMap[role] || role; // 如果没有找到对应的中文名称，则返回原始英文角色名
};

/**
 * 获取所有可用的角色选项，包括英文值和中文显示名称
 * @returns 角色选项数组
 */
export const getRoleOptions = (): Array<{ value: string; label: string }> => {
  return [
    { value: 'user', label: '普通用户' },
    { value: 'park_reviewer', label: '地图审核员' },
    { value: 'pota_representative', label: 'POTA地图代表' },
    { value: 'system_admin', label: '系统管理员' },
    { value: 'banned', label: '封禁用户(可登录但权限受限)' },
  ];
};