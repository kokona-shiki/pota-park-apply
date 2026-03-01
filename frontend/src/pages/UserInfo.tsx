// src/pages/UserInfo.tsx
import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
} from '@mui/material';
import { useAuth } from '../auth/useAuth';
import { usePermission } from '../hooks/usePermission';
import UserInfoList from './UserInfo/UserInfoList';
import UserInfoActions from './UserInfo/UserInfoActions';
import StatusMessage from './UserInfo/StatusMessage';
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
    } catch {
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
            <UserInfoList
              userId={user.id}
              callsign={user.callsign}
              email={user.email}
              role={user.role}
              isActive={user.is_active}
            />

            <UserInfoActions
              loading={loading}
              hasViewAllUsersPermission={hasViewAllUsersPermission === true}
              onOpenEmailDialog={handleOpenEmailDialog}
              onOpenPasswordDialog={handleOpenPasswordDialog}
              onOpenCallsignDialog={handleOpenCallsignDialog}
              onRefreshRole={handleRefreshRole}
            />

            <StatusMessage
              errorMessage={errorMessage}
              successMessage={successMessage}
            />
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