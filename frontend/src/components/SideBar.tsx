// src/components/SideBar.tsx
import React from 'react';
import {
  Drawer,
  List,
  ListItemButton,     // 新增：使用 ListItemButton 替代 ListItem + button
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
import { useNavigate } from 'react-router-dom';

interface SideBarProps {
  isOpen: boolean;
  isAdmin: boolean;
  isSysAdmin: boolean;
}

function SideBar({ isOpen, isAdmin, isSysAdmin }: SideBarProps) {
  const navigate = useNavigate();

  // 可选：如果你希望系统管理员也能看到“申请列表”，可以把 isAdmin 改为 isAdmin || isSysAdmin
  // 这里保持原逻辑不变，只管理员可见

  return (
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
      <Toolbar /> {/* 留出顶栏空间 */}
      <Typography variant="h6" sx={{ p: 2 }}>
        POTA公园申请
      </Typography>
      <List>
        <ListItemButton onClick={() => navigate('/')}>
          <ListItemIcon><HomeIcon /></ListItemIcon>
          <ListItemText primary="首页" />
        </ListItemButton>

        <ListItemButton onClick={() => navigate('/add-park')}>
          <ListItemIcon><AddIcon /></ListItemIcon>
          <ListItemText primary="申请添加公园" />
        </ListItemButton>

        {isAdmin && (
          <ListItemButton onClick={() => navigate('/applications')}>
            <ListItemIcon><ListIcon /></ListItemIcon>
            <ListItemText primary="申请列表" />
          </ListItemButton>
        )}

        <ListItemButton onClick={() => navigate('/my-uploads')}>
          <ListItemIcon><UploadIcon /></ListItemIcon>
          <ListItemText primary="我的上传" />
        </ListItemButton>

        <ListItemButton onClick={() => navigate('/export')}>
          <ListItemIcon><DownloadIcon /></ListItemIcon>
          <ListItemText primary="导出" />
        </ListItemButton>

        <ListItemButton onClick={() => navigate('/about')}>
          <ListItemIcon><InfoIcon /></ListItemIcon>
          <ListItemText primary="关于" />
        </ListItemButton>
      </List>
    </Drawer>
  );
}

export default SideBar;