import { Badge, IconButton } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useUnreadNotifications } from '../hooks/useNotifications';

interface NotificationIconProps {
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
}

export const NotificationIcon = ({ onClick }: NotificationIconProps) => {
  const { unreadCount, loading } = useUnreadNotifications();

  return (
    <IconButton onClick={onClick} color="inherit">
      <Badge badgeContent={loading ? 0 : unreadCount} color="error" max={99} overlap="circular" invisible={loading ? false : unreadCount === 0}>
        <NotificationsIcon />
      </Badge>
    </IconButton>
  );
};
