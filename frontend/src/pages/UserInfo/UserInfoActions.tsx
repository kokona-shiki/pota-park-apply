// src/pages/UserInfo/UserInfoActions.tsx
import { Box, Button, Alert } from '@mui/material';

interface UserInfoActionsProps {
  loading: boolean;
  hasViewAllUsersPermission: boolean;
  onOpenEmailDialog: () => void;
  onOpenPasswordDialog: () => void;
  onOpenCallsignDialog: () => void;
  onRefreshRole: () => void;
}

function UserInfoActions({
  loading,
  hasViewAllUsersPermission,
  onOpenEmailDialog,
  onOpenPasswordDialog,
  onOpenCallsignDialog,
  onRefreshRole,
}: UserInfoActionsProps) {
  return (
    <>
      {hasViewAllUsersPermission === true && (
        <Alert severity="info" sx={{ mb: 2 }}>
          您是系统管理员，根据权限设置，不允许修改个人信息（邮箱、呼号）。
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          onClick={onOpenEmailDialog}
          disabled={loading || hasViewAllUsersPermission === true}
          sx={{ mt: 1 }}
          title={hasViewAllUsersPermission === true ? '系统管理员不允许修改邮箱' : ''}
        >
          修改邮箱
        </Button>
        <Button
          variant="contained"
          onClick={onOpenPasswordDialog}
          disabled={loading}
          sx={{ mt: 1 }}
          title=""
        >
          修改密码
        </Button>
        <Button
          variant="contained"
          onClick={onOpenCallsignDialog}
          disabled={loading || hasViewAllUsersPermission === true}
          sx={{ mt: 1 }}
          title={hasViewAllUsersPermission === true ? '系统管理员不允许修改呼号' : ''}
        >
          修改呼号
        </Button>
        <Button
          variant="outlined"
          onClick={onRefreshRole}
          disabled={loading}
          sx={{ mt: 1 }}
        >
          刷新用户信息
        </Button>
      </Box>
    </>
  );
}

export default UserInfoActions;