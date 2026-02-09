// src/components/SideBar/AdminMenu.tsx
import { useState } from 'react';
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ListIcon from '@mui/icons-material/List';
import ListAltIcon from '@mui/icons-material/ListAlt';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import { useNavigate } from 'react-router-dom';

const AdminMenu = () => {
  const navigate = useNavigate();
  const [globalNotificationMenuOpen, setGlobalNotificationMenuOpen] = useState(false);

  return (
    <List>
      <ListItemButton onClick={() => navigate('/')}>
        <ListItemIcon>
          <HomeIcon />
        </ListItemIcon>
        <ListItemText primary="首页" />
      </ListItemButton>

      <ListItemButton onClick={() => navigate('/admin-panel')}>
        <ListItemIcon>
          <AdminPanelSettingsIcon />
        </ListItemIcon>
        <ListItemText primary="用户管理" />
      </ListItemButton>

      <ListItemButton onClick={() => navigate('/notifications')}>
        <ListItemIcon>
          <NotificationsIcon />
        </ListItemIcon>
        <ListItemText primary="通知中心" />
      </ListItemButton>

      <ListItemButton onClick={() => setGlobalNotificationMenuOpen(!globalNotificationMenuOpen)}>
        <ListItemIcon>
          <NotificationsIcon />
        </ListItemIcon>
        <ListItemText primary="全局通知" />
        {globalNotificationMenuOpen ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>
      <Collapse in={globalNotificationMenuOpen} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          <ListItemButton
            sx={{ pl: 4 }}
            onClick={() => navigate('/global-notification-editor')}
          >
            <ListItemIcon>
              <NotificationsIcon />
            </ListItemIcon>
            <ListItemText primary="创建通知" />
          </ListItemButton>
          <ListItemButton
            sx={{ pl: 4 }}
            onClick={() => navigate('/global-notification-manager')}
          >
            <ListItemIcon>
              <NotificationsIcon />
            </ListItemIcon>
            <ListItemText primary="已发布通知管理" />
          </ListItemButton>
        </List>
      </Collapse>

      <ListItemButton onClick={() => navigate('/callsign-change-requests')}>
        <ListItemIcon>
          <ListIcon />
        </ListItemIcon>
        <ListItemText primary="呼号变更申请" />
      </ListItemButton>

      <ListItemButton onClick={() => navigate('/export-audit-logs')}>
        <ListItemIcon>
          <ListAltIcon />
        </ListItemIcon>
        <ListItemText primary="导出审计日志" />
      </ListItemButton>

      <ListItemButton onClick={() => navigate('/about')}>
        <ListItemIcon>
          <InfoIcon />
        </ListItemIcon>
        <ListItemText primary="关于" />
      </ListItemButton>
    </List>
  );
};

export default AdminMenu;