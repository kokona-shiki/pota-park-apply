// src/components/SideBar.tsx
import { useState } from 'react';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import AddIcon from '@mui/icons-material/Add';
import ListIcon from '@mui/icons-material/List';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import InfoIcon from '@mui/icons-material/Info';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import { useNavigate } from 'react-router-dom';
import PotaAuthDialog from './PotaAuthDialog';

interface SideBarProps {
  isOpen: boolean;
  isAdmin: boolean;
  isSysAdmin: boolean;
  isPotaRepresentative: boolean;
}

function SideBar({ isOpen, isAdmin, isSysAdmin, isPotaRepresentative }: SideBarProps) {
  const navigate = useNavigate();
  const [potaAuthDialogOpen, setPotaAuthDialogOpen] = useState(false);

  // 系统管理员只能进行用户管理，不显示其他功能入口

  return (
    <>
      <Drawer
        variant="persistent"
        anchor="left"
        open={isOpen}
        sx={{
          width: 240,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: 240 },
        }}
      >
        <Toolbar />
        <Typography variant="h6" sx={{ p: 2 }}>
          POTA公园申请
        </Typography>
        <List>
          <ListItemButton onClick={() => navigate('/')}>
            <ListItemIcon>
              <HomeIcon />
            </ListItemIcon>
            <ListItemText primary="首页" />
          </ListItemButton>

          {/* 系统管理员只能看到用户管理，隐藏其他功能入口 */}
          {!isSysAdmin && (
            <>
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

              <ListItemButton onClick={() => navigate('/export')}>
                <ListItemIcon>
                  <DownloadIcon />
                </ListItemIcon>
                <ListItemText primary="导出" />
              </ListItemButton>
            </>
          )}

          {isSysAdmin && (
            <ListItemButton onClick={() => navigate('/admin-panel')}>
              <ListItemIcon>
                <AdminPanelSettingsIcon />
              </ListItemIcon>
              <ListItemText primary="用户管理" />
            </ListItemButton>
          )}

          {isPotaRepresentative && (
            <ListItemButton onClick={() => setPotaAuthDialogOpen(true)}>
              <ListItemIcon>
                <VpnKeyIcon />
              </ListItemIcon>
              <ListItemText primary="POTA 认证" />
            </ListItemButton>
          )}

          <ListItemButton onClick={() => navigate('/about')}>
            <ListItemIcon>
              <InfoIcon />
            </ListItemIcon>
            <ListItemText primary="关于" />
          </ListItemButton>
        </List>
      </Drawer>

      {isPotaRepresentative && (
        <PotaAuthDialog open={potaAuthDialogOpen} onClose={() => setPotaAuthDialogOpen(false)} />
      )}
    </>
  );
}

export default SideBar;
