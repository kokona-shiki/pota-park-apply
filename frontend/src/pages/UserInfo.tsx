// src/pages/UserInfo.tsx
import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import { useAuth } from '../auth/useAuth';
import { usePermission } from '../hooks/usePermission';
import { getRoleDisplayName } from '../utils/roleDisplay';
import EmailUpdateDialog from './UserInfo/EmailUpdateDialog';
import PasswordUpdateDialog from './UserInfo/PasswordUpdateDialog';
import CallsignUpdateDialog from './UserInfo/CallsignUpdateDialog';

function UserInfo() {
  const { user, refreshSession } = useAuth();
  const { hasPermission: hasViewAllUsersPermission } = usePermission('view_all_users');

  const [openEmailDialog, setOpenEmailDialog] = useState(false);
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [openCallsignDialog, setOpenCallsignDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleRefreshRole = async () => {
    try {
      setLoading(true);
      await refreshSession();
      setSuccessMessage('用户信息已刷新');
    } catch (e: unknown) {
      setErrorMessage('刷新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEmailDialog = () => {
    setOpenEmailDialog(true);
  };

  const handleOpenPasswordDialog = () => {
    setOpenPasswordDialog(true);
  };

  const handleOpenCallsignDialog = () => {
    setOpenCallsignDialog(true);
  };

  const handleDialogSuccess = () => {
    refreshSession();
    setSuccessMessage('操作成功');
  };

  if (!user) return null;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Card>
        <CardHeader title="用户信息" />
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <List>
              <ListItem>
                <ListItemText
                  primary="用户ID"
                  secondary={user.id?.toString() || ''}
                  sx={{ flex: 1 }}
                />
                <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
                <ListItemText primary="呼号" secondary={user.callsign || ''} sx={{ flex: 1 }} />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText primary="邮箱" secondary={user.email || ''} sx={{ flex: 1 }} />
                <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
                <ListItemText
                  primary="角色"
                  secondary={getRoleDisplayName(user.role || '')}
                  sx={{ flex: 1 }}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText primary="状态" secondary={user.is_active ? '启用' : '禁用'} />
              </ListItem>
            </List>
            {hasViewAllUsersPermission === true && (
              <Alert severity="info" sx={{ mb: 2 }}>
                您是系统管理员，根据权限设置，不允许修改个人信息（邮箱、呼号）。
              </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                onClick={handleOpenEmailDialog}
                disabled={loading || hasViewAllUsersPermission === true}
                sx={{ mt: 1 }}
                title={hasViewAllUsersPermission === true ? '系统管理员不允许修改邮箱' : ''}
              >
                修改邮箱
              </Button>
              <Button
                variant="contained"
                onClick={handleOpenPasswordDialog}
                disabled={loading}
                sx={{ mt: 1 }}
                title=""
              >
                修改密码
              </Button>
              <Button
                variant="contained"
                onClick={handleOpenCallsignDialog}
                disabled={loading || hasViewAllUsersPermission === true}
                sx={{ mt: 1 }}
                title={hasViewAllUsersPermission === true ? '系统管理员不允许修改呼号' : ''}
              >
                修改呼号
              </Button>
              <Button
                variant="outlined"
                onClick={handleRefreshRole}
                disabled={loading}
                sx={{ mt: 1 }}
              >
                刷新用户信息
              </Button>
            </Box>

            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorMessage}
              </Alert>
            )}
            {successMessage && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {successMessage}
              </Alert>
            )}
          </Box>
        </CardContent>
      </Card>

      <EmailUpdateDialog
        open={openEmailDialog}
        onClose={() => setOpenEmailDialog(false)}
        userId={user.id}
        currentEmail={user.email || ''}
        onSuccess={handleDialogSuccess}
      />

      <PasswordUpdateDialog
        open={openPasswordDialog}
        onClose={() => setOpenPasswordDialog(false)}
        userId={user.id}
        onSuccess={handleDialogSuccess}
      />

      <CallsignUpdateDialog
        open={openCallsignDialog}
        onClose={() => setOpenCallsignDialog(false)}
        userId={user.id}
        currentCallsign={user.callsign || ''}
        onSuccess={handleDialogSuccess}
      />
    </Box>
  );
}

export default UserInfo;