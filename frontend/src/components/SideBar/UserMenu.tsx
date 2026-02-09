// src/components/SideBar/UserMenu.tsx
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import AddIcon from '@mui/icons-material/Add';
import ListIcon from '@mui/icons-material/List';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import NotificationsIcon from '@mui/icons-material/Notifications';
import InfoIcon from '@mui/icons-material/Info';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '../../hooks/usePermission';

const UserMenu = () => {
  const navigate = useNavigate();
  const { hasPermission: hasExportPermission } = usePermission('export_parks');

  return (
    <List>
      <ListItemButton onClick={() => navigate('/')}>
        <ListItemIcon>
          <HomeIcon />
        </ListItemIcon>
        <ListItemText primary="首页" />
      </ListItemButton>

      <ListItemButton onClick={() => navigate('/add-park')}>
        <ListItemIcon>
          <AddIcon />
        </ListItemIcon>
        <ListItemText primary="申请添加公园" />
      </ListItemButton>

      <ListItemButton onClick={() => navigate('/applications')}>
        <ListItemIcon>
          <ListIcon />
        </ListItemIcon>
        <ListItemText primary="申请列表" />
      </ListItemButton>

      <ListItemButton onClick={() => navigate('/my-uploads')}>
        <ListItemIcon>
          <UploadIcon />
        </ListItemIcon>
        <ListItemText primary="我的上传" />
      </ListItemButton>

      {hasExportPermission && (
        <ListItemButton onClick={() => navigate('/export')}>
          <ListItemIcon>
            <DownloadIcon />
          </ListItemIcon>
          <ListItemText primary="导出" />
        </ListItemButton>
      )}

      <ListItemButton onClick={() => navigate('/notifications')}>
        <ListItemIcon>
          <NotificationsIcon />
        </ListItemIcon>
        <ListItemText primary="通知中心" />
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

export default UserMenu;