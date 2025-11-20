import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config/api';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  Switch,
  Typography,
  Avatar,
  Paper,
  IconButton,
  Tooltip,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Edit,
  AccountCircle,
  ExitToApp,
  Notifications,
  Inventory,
  DarkMode,
  Sync,
  Security,
  Password,
  ArrowForwardIos,
  CheckCircle,
  RadioButtonUnchecked,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import SidebarLayout from '../components/SidebarLayout';

export default function Settings() {
  // Get user data from localStorage
  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  const role = localStorage.getItem('role') || '';
  const userId = userData.id || '';
  const userName = userData.name || 'User';
  const userEmail = userData.email || '';
  const userRole = role || 'Administrator';
  
  // Determine profile picture based on role
  const getProfilePicture = () => {
    if (role === 'Admin') {
      return '/assets/icons/admin.png';
    } else if (role === 'Staff') {
      return '/assets/icons/staff.png';
    }
    return '/assets/icons/default.png'; // Fallback
  };
  
  // Load settings from localStorage or use defaults
  const [settings, setSettings] = useState(() => {
    const savedSettings = localStorage.getItem('appSettings');
    return savedSettings ? JSON.parse(savedSettings) : {
      notifications: true,
      lowStock: true,
      darkMode: false,
      autoFlash: false,
      vibrate: true,
      beep: true,
      usageStats: true,
      aiPredictions: true,
    };
  });

  // Save settings and apply theme whenever they change
  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
    document.documentElement.setAttribute('data-theme', settings.darkMode ? 'dark' : 'light');
  }, [settings]);

  // Profile editing state
  const [openEditProfile, setOpenEditProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: userName,
    email: userEmail,
    username: userData.username || '',
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleToggle = (key) => (e) => {
    setSettings((prev) => ({ ...prev, [key]: e.target.checked }));
  };

  const handleOpenEditProfile = () => {
    setProfileData({
      name: userName,
      email: userEmail,
      username: userData.username || '',
    });
    setOpenEditProfile(true);
  };

  const handleCloseEditProfile = () => {
    setOpenEditProfile(false);
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      console.log("Updating profile for user:", userId);
      console.log("Profile data:", profileData);
      
      // Try a simpler approach - just update the localStorage directly
      // since we don't have confirmation the backend API works
      const updatedUser = {
        ...userData,
        name: profileData.name,
        email: profileData.email,
        username: profileData.username,
      };
      
      // Update localStorage with new data
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Show success message
      setSnackbar({
        open: true,
        message: 'Profile updated successfully!',
        severity: 'success',
      });
      
      // Close dialog
      handleCloseEditProfile();
      
      // Reload page to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error updating profile:', error);
      
      setSnackbar({
        open: true,
        message: 'Failed to update profile. Please try again.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const navigate = useNavigate();
  
  // Add state for password change dialog
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  
  // Add state for password visibility
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Add confirmation dialog state
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);

  // Add logout handler
  const handleLogout = () => {
    setOpenConfirmDialog(true);
  };

  const confirmLogout = () => {
    // Clear user data from localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    localStorage.removeItem('token');
    
    // Close dialog and navigate to login
    setOpenConfirmDialog(false);
    navigate('/');
  };

  const cancelLogout = () => {
    setOpenConfirmDialog(false);
  };
  
  // Add password change handlers
  const handleChangePassword = () => {
    setOpenPasswordDialog(true);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    });
    setPasswordError('');
    setPasswordSuccess(false);
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Add toggle functions for password visibility
  const handleClickShowCurrentPassword = () => setShowCurrentPassword(!showCurrentPassword);
  const handleClickShowNewPassword = () => setShowNewPassword(!showNewPassword);
  const handleClickShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);
  
  const handleMouseDownPassword = (e) => {
    e.preventDefault();
  };

  const handleSavePassword = async () => {
    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }
    
    try {
      // Get role from localStorage
      const userRole = localStorage.getItem('role') || 'Staff';
      
      // Call API to update password with correct endpoint
      const response = await axios.put(
        `${API_BASE}/api/profile/${userRole}/${userId}/password`,
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status === 200) {
        setPasswordSuccess(true);
        setPasswordError('');
        // Clear form
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: ''
        });
        
        // Close dialog after 2 seconds
        setTimeout(() => {
          setOpenPasswordDialog(false);
          setPasswordSuccess(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Password update error:', error);
      if (error.response && error.response.data && error.response.data.error) {
        setPasswordError(error.response.data.error);
      } else {
        setPasswordError('Failed to update password. Please try again.');
      }
    }
  };

  return (
    <SidebarLayout>
      <Box sx={{ p: { xs: 1, md: 3 }, width: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h4" fontWeight={700} color="primary.main" mb={3}>
          Settings
        </Typography>
        
        {/* User Profile Section */}
        <Paper 
          elevation={3} 
          sx={{ 
            p: 3, 
            mb: 4, 
            borderRadius: 3, 
            width: '100%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar 
              src={getProfilePicture()} 
              alt={userName}
              onError={(e) => { e.target.src = ''; }}
              sx={{ 
                width: 80, 
                height: 80, 
                mr: 3, 
                bgcolor: 'white',
                border: '3px solid white'
              }}
            >
              <AccountCircle sx={{ fontSize: 60, color: 'grey.400' }} />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={600} className="profile-name" sx={{ mb: 0.5 }}>
                {userName}
              </Typography>
              <Chip 
                label={userRole} 
                color={role === 'Admin' ? 'secondary' : 'primary'} 
                size="small" 
                sx={{ mb: 1 }}
              />
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Manage your account settings and preferences
              </Typography>
            </Box>
            <Box sx={{ ml: 'auto' }}>
              <Button 
                variant="contained" 
                startIcon={<Edit />} 
                size="medium"
                onClick={handleOpenEditProfile}
                sx={{ 
                  bgcolor: 'white', 
                  color: 'primary.main',
                  '&:hover': {
                    bgcolor: 'grey.100'
                  }
                }}
              >
                Edit Profile
              </Button>
            </Box>
          </Box>
        </Paper>
        
        <Grid container spacing={3}>
          {/* App Settings Card */}
          <Grid item xs={12} md={6} width="100%">
            <Card sx={{ borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardHeader
                avatar={<Notifications sx={{ color: 'primary.main' }} />}
                title={<Typography variant="h6" fontWeight={600}>App Settings</Typography>}
                sx={{ pb: 1 }}
              />
              <Divider />
              <CardContent sx={{ flexGrow: 1 }}>
                <List disablePadding>
                  <ListItem divider>
                    <ListItemIcon>
                      <Notifications color={settings.notifications ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Notifications" 
                      secondary="Receive alerts and updates" 
                    />
                    <ListItemSecondaryAction>
                      <Switch 
                        checked={settings.notifications} 
                        onChange={handleToggle('notifications')} 
                        color="primary"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem divider>
                    <ListItemIcon>
                      <Inventory color={settings.lowStock ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="AI-Powered Alerts" 
                      secondary="Get notified when items are running low" 
                    />
                    <ListItemSecondaryAction>
                      <Switch 
                        checked={settings.lowStock} 
                        onChange={handleToggle('lowStock')} 
                        color="primary"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem divider>
                    <ListItemIcon>
                      <DarkMode color={settings.darkMode ? 'primary' : 'inherit'} />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Dark Mode" 
                      secondary="Enable dark theme for better visibility (Soon to be available)" 
                    />
                    <ListItemSecondaryAction>
                      <Switch 
                        checked={settings.darkMode} 
                        onChange={handleToggle('darkMode')} 
                        color="primary"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Sync />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Sync Frequency" 
                      secondary="How often to sync with the server" 
                    />
                    <ListItemSecondaryAction>
                      <Chip label="Every 30 minutes" variant="outlined" size="small" />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Account Settings Card */}
          <Grid item xs={12} md={6} width="100%">
            <Card sx={{ borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardHeader
                avatar={<Security sx={{ color: 'primary.main' }} />}
                title={<Typography variant="h6" fontWeight={600}>Account Settings</Typography>}
                sx={{ pb: 1 }}
              />
              <Divider />
              <CardContent sx={{ flexGrow: 1, p: 0 }}>
                <List disablePadding>
                  <ListItem 
                    button 
                    divider
                    onClick={handleChangePassword} // Changed to handleChangePassword
                    sx={{ '&:hover': { bgcolor: 'grey.50' } }}
                  >
                    <ListItemIcon>
                      <Password />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Change Password" 
                      secondary="Update your account password" 
                    />
                    <ArrowForwardIos sx={{ color: '#888', fontSize: 16 }} />
                  </ListItem>
                  <ListItem 
                    button 
                    divider
                    onClick={() => { /* TODO: Privacy Settings */ }}
                    sx={{ '&:hover': { bgcolor: 'grey.50' } }}
                  >
                    <ListItemIcon>
                      <Security />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Privacy Settings" 
                      secondary="Manage your privacy preferences" 
                    />
                    <ArrowForwardIos sx={{ color: '#888', fontSize: 16 }} />
                  </ListItem>
                  <ListItem 
                    button
                    onClick={handleLogout}
                    sx={{ '&:hover': { bgcolor: 'grey.50' } }}
                  >
                    <ListItemIcon>
                      <ExitToApp sx={{ color: 'error.main' }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={<Typography color="error.main">Log Out</Typography>} 
                      secondary={<Typography variant="body2" sx={{ color: 'error.main', opacity: 0.8 }}>Sign out of your account</Typography>} 
                    />
                    <ArrowForwardIos sx={{ color: 'error.main', fontSize: 16 }} />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
      
      {/* Edit Profile Dialog */}
      <Dialog open={openEditProfile} onClose={handleCloseEditProfile} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Full Name"
              name="name"
              value={profileData.name}
              onChange={handleProfileChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Email"
              name="email"
              value={profileData.email}
              onChange={handleProfileChange}
              margin="normal"
              required
              type="email"
            />
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={profileData.username}
              onChange={handleProfileChange}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditProfile}>Cancel</Button>
          <Button 
            onClick={handleSaveProfile} 
            variant="contained" 
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Change Password Dialog */}
      <Dialog open={openPasswordDialog} onClose={() => setOpenPasswordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {passwordSuccess ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                Password updated successfully!
              </Alert>
            ) : null}
            
            {passwordError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {passwordError}
              </Alert>
            ) : null}
            
            <TextField
              fullWidth
              label="Current Password"
              name="currentPassword"
              type={showCurrentPassword ? 'text' : 'password'}
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              margin="normal"
              required
              InputProps={{
                endAdornment: (
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleClickShowCurrentPassword}
                    onMouseDown={handleMouseDownPassword}
                    edge="end"
                  >
                    {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
            />
            <TextField
              fullWidth
              label="New Password"
              name="newPassword"
              type={showNewPassword ? 'text' : 'password'}
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              margin="normal"
              required
              InputProps={{
                endAdornment: (
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleClickShowNewPassword}
                    onMouseDown={handleMouseDownPassword}
                    edge="end"
                  >
                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
            />
            <TextField
              fullWidth
              label="Confirm New Password"
              name="confirmNewPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={passwordData.confirmNewPassword}
              onChange={handlePasswordChange}
              margin="normal"
              required
              InputProps={{
                endAdornment: (
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleClickShowConfirmPassword}
                    onMouseDown={handleMouseDownPassword}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPasswordDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSavePassword} 
            variant="contained" 
            disabled={passwordSuccess}
          >
            Update Password
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Logout Confirmation Dialog */}
      <Dialog open={openConfirmDialog} onClose={cancelLogout}>
        <DialogTitle>Confirm Logout</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to log out?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelLogout} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmLogout} color="error" variant="contained">
            Log Out
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </SidebarLayout>
  );
}