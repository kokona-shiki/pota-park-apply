// src/components/SideBar/GuestMenu.tsx
import { useState } from 'react';
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';

const GuestMenu = () => {
  const navigate = useNavigate();
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);

  return (
    <>
      <List>
        <ListItemButton onClick={() => navigate('/')}>
          <ListItemIcon>
            <HomeIcon />
          </ListItemIcon>
          <ListItemText primary="首页" />
        </ListItemButton>

        <ListItemButton onClick={() => setLoginPromptOpen(true)}>
          <ListItemIcon>
            <AddIcon />
          </ListItemIcon>
          <ListItemText primary="申请录入公园" />
        </ListItemButton>
      </List>

      {/* 登录提示弹框 */}
      <Dialog
        open={loginPromptOpen}
        onClose={() => setLoginPromptOpen(false)}
        aria-labelledby="login-prompt-dialog-title"
      >
        <DialogTitle id="login-prompt-dialog-title">需要登录</DialogTitle>
        <DialogContent>
          <DialogContentText>
            您需要登录才能使用此功能。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoginPromptOpen(false)} color="inherit">
            取消
          </Button>
          <Button onClick={() => { setLoginPromptOpen(false); navigate('/login'); }} color="primary">
            去登录
          </Button>
          <Button onClick={() => { setLoginPromptOpen(false); navigate('/register'); }} color="primary">
            去注册
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default GuestMenu;