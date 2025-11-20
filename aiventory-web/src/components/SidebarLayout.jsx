import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Avatar,
  Tooltip,
  IconButton,
  Badge,
  Chip
} from '@mui/material';

import {
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  People as PeopleIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Assessment as AssessmentIcon,
  ReceiptLong as ReceiptLongIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  KeyboardDoubleArrowLeft as CollapseIcon,
  KeyboardDoubleArrowRight as ExpandIcon,
  Home as HomeIcon,
  TrendingUp as TrendingUpIcon,
  Business as BusinessIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';

import NotificationManager from './NotificationManager';

const drawerWidth = 250;
const collapsedWidth = 80;

const navLinks = [
  { to: '/dashboard', icon: <DashboardIcon />, text: 'Dashboard', badge: null },
  { to: '/inventory', icon: <InventoryIcon />, text: 'Inventory', badge: null },
  { to: '/suppliers', icon: <BusinessIcon />, text: 'Suppliers', badge: null },
  { to: '/invoices', icon: <ReceiptLongIcon />, text: 'Invoices', badge: null },
  { to: '/reports', icon: <BarChartIcon />, text: 'Analytics', badge: null },
  { to: '/settings', icon: <SettingsIcon />, text: 'Settings', badge: null },
];

export default function SidebarLayout({ children }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [time, setTime] = useState(new Date());
  
  // Get user data from localStorage
  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  const role = localStorage.getItem('role') || '';
  const userName = userData.name || 'User';
  const userRole = role || 'Administrator';
  
  // Determine profile picture based on role
  const getProfilePicture = () => {
    if (role === 'Admin') {
      return '/assets/icons/admin.png';
    } else if (role === 'Staff') {
      return '/assets/icons/staff.png';
    }
    return '/assets/icons/arthur.jpg'; // Fallback to existing image
  };

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Format time for display
  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: collapsed ? collapsedWidth : drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: collapsed ? collapsedWidth : drawerWidth,
            boxSizing: 'border-box',
            background: 'linear-gradient(180deg, #2E3A8C 0%, #1a246e 100%)',
            borderRight: 'none',
            color: '#fff',
            transition: 'width 0.3s ease',
            overflowX: 'hidden',
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Logo Section */}
          <Box sx={{ 
            p: 2, 
            textAlign: 'center', 
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            transition: 'padding 0.3s ease'
          }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: 1 
            }}>
              <Avatar 
                src="/assets/logo.jpg" 
                alt="AIVENTORY Logo" 
                sx={{ 
                  width: collapsed ? 40 : 50, 
                  height: collapsed ? 40 : 50,
                  transition: 'all 0.3s ease'
                }} 
              />
              {!collapsed && (
                
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1 }}>
                    AIVENTORY
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>
                    Inventory Management
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* Time Display */}
          <Box sx={{ 
            p: 1.5, 
            textAlign: 'center', 

          }}>
            <Typography 
              variant="h5" 
              sx={{ 
                color: '#fff' , 
                fontWeight: 600,
                display: 'block'
              }}
            >
              {formatTime(time)}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: '#fff', 
                display: 'block',
                mt: 0.5
              }}
            >
              {formatDate(time)}
            </Typography>
          </Box>

          {/* Navigation Links */}
          <List sx={{ flex: 1, py: 2 }}>
            {navLinks.map(link => (
              <ListItem key={link.to} disablePadding sx={{ mb: 0.5 }}>
                <Tooltip title={collapsed ? link.text : ''} placement="right">
                  <ListItemButton
                    component={Link}
                    to={link.to}
                    selected={location.pathname === link.to}
                    sx={{
                      minHeight: 48,
                      justifyContent: collapsed ? 'center' : 'initial',
                      px: 2.5,
                      mx: 1,
                      borderRadius: 2,
                      color: location.pathname === link.to ? '#fff' : 'rgba(255,255,255,0.7)',
                      backgroundColor: location.pathname === link.to ? 'rgba(255,255,255,0.1)' : 'transparent',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.15)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <ListItemIcon 
                      sx={{ 
                        minWidth: 0, 
                        mr: collapsed ? 0 : 3, 
                        justifyContent: 'center',
                        color: location.pathname === link.to ? '#fff' : 'rgba(255,255,255,0.7)',
                      }}
                    >
                      {link.icon}
                    </ListItemIcon>
                    {!collapsed && (
                      <ListItemText 
                        primary={link.text}
                        sx={{ 
                          opacity: collapsed ? 0 : 1,
                          transition: 'opacity 0.3s ease'
                        }}
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            ))}
          </List>

          <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)', mx: 2 }} />

          {/* Profile Section */}
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar 
                src={getProfilePicture()} 
                alt={userName} 
                sx={{ width: 40, height: 40 }} 
              />
              {!collapsed && (
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      color: '#fff', 
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {userName}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: 'rgba(255,255,255,0.7)',
                      display: 'block'
                    }}
                  >
                    {userRole}
                  </Typography>
                </Box>
              )}
              <IconButton 
                onClick={toggleCollapse}
                sx={{ 
                  color: 'rgba(255,255,255,0.7)',
                  '&:hover': {
                    color: '#fff',
                    bgcolor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                {collapsed ? <ExpandIcon /> : <CollapseIcon />}
              </IconButton>
            </Box>
            
            {/* Logout Button */}
            {!collapsed && (
              <Box sx={{ mt: 2 }}>
                <ListItemButton
                  component={Link}
                  to="/"
                  onClick={() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('role');
                    localStorage.removeItem('user');
                  }}
                  sx={{
                    minHeight: 40,
                    justifyContent: 'center',
                    px: 2,
                    borderRadius: 2,
                    color: 'rgba(255,255,255,0.9)',
                    backgroundColor: 'rgba(255,65,65,0.15)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,65,65,0.25)',
                    },
                  }}
                >
                  <ListItemIcon sx={{ 
                    minWidth: 0, 
                    mr: 1.5, 
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.9)',
                  }}>
                    <LogoutIcon />
                  </ListItemIcon>
                  <ListItemText primary="Logout" />
                  <Chip 
                    label="NEW" 
                    size="small" 
                    sx={{ 
                      height: 18, 
                      fontSize: 10,
                      bgcolor: 'rgba(255,255,255,0.15)',
                      color: 'rgba(255,255,255,0.9)',
                      '& .MuiChip-label': {
                        px: 0.5
                      }
                    }} 
                  />
                </ListItemButton>
              </Box>
            )}
          </Box>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'var(--page-bg)',
          minHeight: '100vh',
          px: 3,
          pt: 4,
          pb: 4,
        }}
      >
        {children}
        <NotificationManager />
      </Box>
    </Box>
  );
}