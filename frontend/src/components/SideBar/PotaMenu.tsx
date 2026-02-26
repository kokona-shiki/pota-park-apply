// src/components/SideBar/PotaMenu.tsx
import { useState } from 'react';
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import SettingsIcon from '@mui/icons-material/Settings';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import UploadIcon from '@mui/icons-material/Upload';
import ListIcon from '@mui/icons-material/List';
import HistoryIcon from '@mui/icons-material/History';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import NotificationsIcon from '@mui/icons-material/Notifications';
import InfoIcon from '@mui/icons-material/Info';
import QueueIcon from '@mui/icons-material/Queue';
import { useNavigate } from 'react-router-dom';
import PotaAuthDialog from '../PotaAuthDialog';
import { usePermission } from '../../hooks/usePermission';

const PotaMenu = () => {
  const navigate = useNavigate();
  const [potaAuthDialogOpen, setPotaAuthDialogOpen] = useState(false);
  const [potaMenuOpen, setPotaMenuOpen] = useState(false);
  const { hasPermission: hasExportPermission } = usePermission('export_parks');

  return (
    <>
      <List>
        <ListItemButton onClick={() => navigate('/')}>
          <ListItemIcon>
            <HomeIcon />
          </ListItemIcon>
          <ListItemText primary="首页" />
        </ListItemButton>

        <ListItemButton onClick={() => navigate('/add-park')}>
          <ListItemIcon>
            <SettingsIcon />
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
              <UploadIcon />
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

        <ListItemButton onClick={() => setPotaMenuOpen(!potaMenuOpen)}>
          <ListItemIcon>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText primary="POTA 管理" />
          {potaMenuOpen ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <Collapse in={potaMenuOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItemButton
              sx={{ pl: 4 }}
              onClick={() => setPotaAuthDialogOpen(true)}
            >
              <ListItemIcon>
                <VpnKeyIcon />
              </ListItemIcon>
              <ListItemText primary="POTA 认证" />
            </ListItemButton>
            <ListItemButton
              sx={{ pl: 4 }}
              onClick={() => navigate('/pota-import')}
            >
              <ListItemIcon>
                <UploadIcon />
              </ListItemIcon>
              <ListItemText primary="公园导入" />
            </ListItemButton>
            <ListItemButton
              sx={{ pl: 4 }}
              onClick={() => navigate('/pota-unprocessed')}
            >
              <ListItemIcon>
                <ListIcon />
              </ListItemIcon>
              <ListItemText primary="未处理公园" />
            </ListItemButton>
            <ListItemButton
              sx={{ pl: 4 }}
              onClick={() => navigate('/pota-sync-logs')}
            >
              <ListItemIcon>
                <HistoryIcon />
              </ListItemIcon>
              <ListItemText primary="同步日志" />
            </ListItemButton>
            <ListItemButton
              sx={{ pl: 4 }}
              onClick={() => navigate('/pota-upload-queue')}
            >
              <ListItemIcon>
                <QueueIcon />
              </ListItemIcon>
              <ListItemText primary="上传队列" />
            </ListItemButton>
            <ListItemButton
              sx={{ pl: 4 }}
              onClick={() => navigate('/park-type-alignment')}
            >
              <ListItemIcon>
                <CompareArrowsIcon />
              </ListItemIcon>
              <ListItemText primary="公园类型对齐" />
            </ListItemButton>
          </List>
        </Collapse>

        <ListItemButton onClick={() => navigate('/about')}>
          <ListItemIcon>
            <InfoIcon />
          </ListItemIcon>
          <ListItemText primary="关于" />
        </ListItemButton>
      </List>

      <PotaAuthDialog open={potaAuthDialogOpen} onClose={() => setPotaAuthDialogOpen(false)} />
    </>
  );
};

export default PotaMenu;