// src/pages/AdminPanel.tsx
import { useState, useEffect, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  Switch,
  Typography,
  Button,
  Tabs,
  Tab,
  Box,
  Alert,
  Divider
} from '@mui/material';
import axios from 'axios';
import { useAuth } from '../auth/useAuth';
import { getApiErrorMessage } from '../utils/error';
import { getRoleOptions, getRoleDisplayName } from '../utils/roleDisplay';

const ROLE_OPTIONS = getRoleOptions();

type UserAdminAuditLog = {
  id: number;
  action: 'user_role_changed' | 'user_disabled' | 'user_enabled' | 'refresh_token_reuse_detected';
  operator_id: number | null;
  target_user_id: number | null;
  old_role: string | null;
  new_role: string | null;
  old_is_active: boolean | null;
  new_is_active: boolean | null;
  reason: string | null;
  metadata: any;
  created_at: string;

  operator_callsign?: string | null;
  operator_email?: string | null;
  target_callsign?: string | null;
  target_email?: string | null;
};

function AdminPanel() {
  const { user: currentUser, isAuthLoading } = useAuth();
  const [tab, setTab] = useState(0);

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [logs, setLogs] = useState<UserAdminAuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const roleChangeRequestRef = useRef<Record<number, boolean>>({});
  const activeChangeRequestRef = useRef<Record<number, boolean>>({});
  const hasLoadedRef = useRef(false);
  const userIdRef = useRef<number | null>(null);

  // 只在用户 ID 真正变化时才重置加载标志
  useEffect(() => {
    const currentUserId = currentUser?.id ?? null;
    if (currentUserId !== userIdRef.current) {
      userIdRef.current = currentUserId;
      hasLoadedRef.current = false;
    }
  }, [currentUser]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/users');
      setUsers(res.data.users || []);
    } catch (e: any) {
      alert(getApiErrorMessage(e, '获取用户列表失败'));
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    setLogsError(null);
    try {
      const res = await axios.get('/api/user-admin-audit-logs', { params: { limit: 200 } });
      setLogs(res.data.logs || []);
    } catch (e: any) {
      setLogsError(getApiErrorMessage(e, '获取操作日志失败'));
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    // 等待认证加载完成，且用户已登录时才发起请求
    if (isAuthLoading || !currentUser) return;

    // 使用 ref 确保组件挂载时只请求一次
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    loadUsers();
    loadLogs();
  }, [isAuthLoading, currentUser]);

  const handleRoleChange = async (targetUser: any, newRole: string) => {
    const reason = window.prompt('请输入修改角色理由（必填）');
    if (!reason || !reason.trim()) {
      alert('必须填写理由');
      return;
    }

    if (roleChangeRequestRef.current[targetUser.id]) return;
    roleChangeRequestRef.current[targetUser.id] = true;

    try {
      const res = await axios.put(`/api/users/${targetUser.id}/role`, { role: newRole, reason });
      const updated = res.data.user;
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (e: any) {
      alert(getApiErrorMessage(e, '修改角色失败'));
    } finally {
      roleChangeRequestRef.current[targetUser.id] = false;
    }
  };

  const handleActiveChange = async (targetUser: any, isActive: boolean) => {
    if (activeChangeRequestRef.current[targetUser.id]) return;
    activeChangeRequestRef.current[targetUser.id] = true;

    try {
      const res = await axios.put(`/api/users/${targetUser.id}/active`, { isActive });
      const updated = res.data.user;
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (e: any) {
      alert(getApiErrorMessage(e, '封禁/解封失败'));
    } finally {
      activeChangeRequestRef.current[targetUser.id] = false;
    }
  };

  const roleChangeLogs = logs.filter((l) => l.action === 'user_role_changed');
  const activeChangeLogs = logs.filter((l) => l.action === 'user_disabled' || l.action === 'user_enabled');

  return (
    <Box>
      <Typography variant="h6">用户管理</Typography>

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mt: 1 }}>
        <Tab label="用户列表" />
        <Tab label="操作日志" />
      </Tabs>

      <Divider sx={{ my: 2 }} />

      {tab === 0 && (
        <>
          <Button sx={{ mb: 1 }} variant="outlined" onClick={loadUsers} disabled={loading}>
            刷新用户列表
          </Button>

          <Paper>
            <Typography sx={{ p: 2, fontWeight: 700 }}>用户列表</Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>呼号</TableCell>
                    <TableCell>邮箱</TableCell>
                    <TableCell>角色</TableCell>
                    <TableCell>启用</TableCell>
                    <TableCell>最后登录</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((u) => {
                    const isSelf = currentUser?.id === u.id;
                    const roleSelectDisabled = isSelf || !u.is_active;

                    return (
                      <TableRow key={u.id}>
                        <TableCell>{u.id}</TableCell>
                        <TableCell>{u.callsign}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Select
                            size="small"
                            value={u.role}
                            disabled={roleSelectDisabled}
                            onChange={(e) => handleRoleChange(u, e.target.value as string)}
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <MenuItem key={r.value} value={r.value}>
                                {r.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={!!u.is_active}
                            disabled={isSelf}
                            onChange={(e) => handleActiveChange(u, e.target.checked)}
                          />
                        </TableCell>
                        <TableCell>{u.last_login ? new Date(u.last_login).toLocaleString() : '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}

      {tab === 1 && (
        <>
          <Button sx={{ mb: 1 }} variant="outlined" onClick={loadLogs} disabled={logsLoading}>
            刷新操作日志
          </Button>

          {logsError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {logsError}
            </Alert>
          )}

          <Paper sx={{ mb: 2 }}>
            <Typography sx={{ p: 2, fontWeight: 700 }}>用户角色变动日志</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>时间</TableCell>
                    <TableCell>操作者</TableCell>
                    <TableCell>目标用户</TableCell>
                    <TableCell>旧角色</TableCell>
                    <TableCell>新角色</TableCell>
                    <TableCell>理由</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {roleChangeLogs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{new Date(l.created_at).toLocaleString()}</TableCell>
                      <TableCell>{l.operator_callsign || l.operator_email || '-'}</TableCell>
                      <TableCell>{l.target_callsign || l.target_email || '-'}</TableCell>
                      <TableCell>{l.old_role ? getRoleDisplayName(l.old_role) : '-'}</TableCell>
                      <TableCell>{l.new_role ? getRoleDisplayName(l.new_role) : '-'}</TableCell>
                      <TableCell>{l.reason || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {!logsLoading && roleChangeLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ color: 'text.secondary' }}>
                        暂无记录
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Paper>
            <Typography sx={{ p: 2, fontWeight: 700 }}>用户封禁/解封日志</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>时间</TableCell>
                    <TableCell>操作者</TableCell>
                    <TableCell>目标用户</TableCell>
                    <TableCell>旧状态</TableCell>
                    <TableCell>新状态</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activeChangeLogs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{new Date(l.created_at).toLocaleString()}</TableCell>
                      <TableCell>{l.operator_callsign || l.operator_email || '-'}</TableCell>
                      <TableCell>{l.target_callsign || l.target_email || '-'}</TableCell>
                      <TableCell>{l.old_is_active === null ? '-' : l.old_is_active ? '启用' : '禁用'}</TableCell>
                      <TableCell>{l.new_is_active === null ? '-' : l.new_is_active ? '启用' : '禁用'}</TableCell>
                    </TableRow>
                  ))}
                  {!logsLoading && activeChangeLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ color: 'text.secondary' }}>
                        暂无记录
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Box>
  );
}

export default AdminPanel;
