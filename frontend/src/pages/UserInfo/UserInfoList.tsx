// src/pages/UserInfo/UserInfoList.tsx
import {
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import { getRoleDisplayName } from '../../utils/roleDisplay';

interface UserInfoListProps {
  userId?: number | null;
  callsign?: string | null;
  email?: string | null;
  role?: string | null;
  isActive?: boolean | null;
}

function UserInfoList({ userId, callsign, email, role, isActive }: UserInfoListProps) {
  return (
    <List>
      <ListItem>
        <ListItemText
          primary="用户ID"
          secondary={userId?.toString() || ''}
          sx={{ flex: 1 }}
        />
        <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
        <ListItemText primary="呼号" secondary={callsign || ''} sx={{ flex: 1 }} />
      </ListItem>
      <Divider />
      <ListItem>
        <ListItemText primary="邮箱" secondary={email || ''} sx={{ flex: 1 }} />
        <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
        <ListItemText
          primary="角色"
          secondary={getRoleDisplayName(role || '')}
          sx={{ flex: 1 }}
        />
      </ListItem>
      <Divider />
      <ListItem>
        <ListItemText primary="状态" secondary={isActive ? '启用' : '禁用'} />
      </ListItem>
    </List>
  );
}

export default UserInfoList;