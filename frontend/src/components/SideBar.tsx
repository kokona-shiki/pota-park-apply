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
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  DialogContentText,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import AddIcon from '@mui/icons-material/Add';
import ListIcon from '@mui/icons-material/List';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import InfoIcon from '@mui/icons-material/Info';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import HistoryIcon from '@mui/icons-material/History';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import SettingsIcon from '@mui/icons-material/Settings';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import ListAltIcon from '@mui/icons-material/ListAlt';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useNavigate } from 'react-router-dom';
import PotaAuthDialog from './PotaAuthDialog';
import { useAuth } from '../auth/useAuth';
import { usePermission } from '../hooks/usePermission';

interface SideBarProps {
  isOpen: boolean;
  isAdmin: boolean;
  isSysAdmin: boolean;
  isPotaRepresentative: boolean;
}

function SideBar({ isOpen, isSysAdmin, isPotaRepresentative }: SideBarProps) {
  const navigate = useNavigate();
  const [potaAuthDialogOpen, setPotaAuthDialogOpen] = useState(false);
  const [potaMenuOpen, setPotaMenuOpen] = useState(false);
  const [globalNotificationMenuOpen, setGlobalNotificationMenuOpen] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const { user } = useAuth();
  const { hasPermission: hasExportPermission } = usePermission('export_parks');

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

          {/* 未登录用户只显示首页和申请录入公园 */}
          {!user ? (
            <>
              <ListItemButton onClick={() => setLoginPromptOpen(true)}>
                <ListItemIcon>
                  <AddIcon />
                </ListItemIcon>
                <ListItemText primary="申请录入公园" />
              </ListItemButton>
            </>
          ) : (
            // 登录用户根据角色显示不同菜单
            <>
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
                </>
              )}

              {isSysAdmin && (
                <>
                  <ListItemButton onClick={() => navigate('/admin-panel')}>
                    <ListItemIcon>
                      <AdminPanelSettingsIcon />
                    </ListItemIcon>
                    <ListItemText primary="用户管理" />
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
                </>
              )}

              {isPotaRepresentative && (
                <>
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
                        onClick={() => navigate('/park-type-alignment')}
                      >
                        <ListItemIcon>
                          <CompareArrowsIcon />
                        </ListItemIcon>
                        <ListItemText primary="公园类型对齐" />
                      </ListItemButton>
                    </List>
                  </Collapse>
                </>
              )}
            </>
          )}

          <ListItemButton onClick={() => navigate('/about')}>
            <ListItemIcon>
              <InfoIcon />
            </ListItemIcon>
            <ListItemText primary="关于" />
          </ListItemButton>
        </List>
      </Drawer>

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

      {isPotaRepresentative && (
        <PotaAuthDialog open={potaAuthDialogOpen} onClose={() => setPotaAuthDialogOpen(false)} />
      )}
    </>
  );
}

export default SideBar;
