//Login.jsx
import React, { useState } from 'react';
import axios from "axios";
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config/api';
import '../css/style.css';
import { 
  Visibility, 
  VisibilityOff, 
  Person, 
  Email, 
  Lock, 
  AdminPanelSettings,
  SupervisorAccount,
  AccountCircle
} from '@mui/icons-material';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Paper, 
  IconButton, 
  InputAdornment,
  Alert,
  CircularProgress
} from '@mui/material';

const Login = () => {
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [role, setRole] = useState('Admin');
  const [newRole, setNewRole] = useState('Admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
  // Registration form state
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  
  const navigate = useNavigate();

  const handleShowCreateAccount = (e) => {
    e.preventDefault();
    setShowCreateAccount(true);
    setError('');
  };
  
  const handleBackToLogin = (e) => {
    e.preventDefault();
    setShowCreateAccount(false);
    setError('');
  };
  
  const handleRoleClick = (selectedRole) => setRole(selectedRole);
  const handleNewRoleClick = (selectedRole) => setNewRole(selectedRole);
  
  const handleClickShowLoginPassword = () => setShowLoginPassword(!showLoginPassword);
  const handleClickShowRegPassword = () => setShowRegPassword(!showRegPassword);
  
  const handleMouseDownPassword = (e) => {
    e.preventDefault();
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    
    if (!loginIdentifier || !loginPassword) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await axios.post(`${API_BASE}/api/login`, {
        email: loginIdentifier,
        username: loginIdentifier,
        password: loginPassword,
        role
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccountSubmit = async (e) => {
    e.preventDefault();
    
    if (!fullName || !regEmail || !regUsername || !regPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (regPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await axios.post(`${API_BASE}/api/register`, {
        fullName,
        email: regEmail,
        username: regUsername,
        password: regPassword,
        role: newRole
      });

      // Clear the registration form
      setFullName("");
      setRegEmail("");
      setRegUsername("");
      setRegPassword("");
      
      // Switch back to login form
      setShowCreateAccount(false);
      
      // Pre-fill the login form with the new account details
      setLoginIdentifier(regEmail);
      setLoginPassword(regPassword);
      setRole(newRole);
      
      setError(res.data.message + " Please login with your new account.");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: 2
      }}
    >
      <Paper 
        elevation={6} 
        sx={{ 
          maxWidth: 500, 
          width: '100%', 
          borderRadius: 3,
          overflow: 'hidden'
        }}
      >
        <Box 
          sx={{ 
            background: 'linear-gradient(180deg, #2E3A8C 0%, #1a246e 100%)',
            color: 'white',
            textAlign: 'center',
            py: 4,
            px: 2
          }}
        >
          <img 
            src="/src/assets/logo copy.jpg" 
            alt="AIVENTORY Logo" 
            style={{ 
              width: 100, 
              height: 100, 
              marginBottom: 16,
              borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.2)'
            }} 
          />
          <Typography variant="h4" fontWeight={700} mb={1}>
            AIVENTORY
          </Typography>
          <Typography variant="h6" fontWeight={500} mb={1}>
            SMART INVENTORY MANAGEMENT
          </Typography>
          <Typography variant="body1" color="rgba(255,255,255,0.8)">
            Predictive Replenishment and Alert Notifications
          </Typography>
        </Box>
        
        <Box sx={{ p: 3 }}>
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 2, borderRadius: 2 }}
              onClose={() => setError('')}
            >
              {error}
            </Alert>
          )}
          
          {!showCreateAccount ? (
            <form onSubmit={handleLoginSubmit}>
              <TextField
                fullWidth
                label="Email or Username"
                type="text"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                required
                margin="normal"
                variant="outlined"
                helperText="Enter your email or username"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccountCircle />
                    </InputAdornment>
                  ),
                }}
              />
              
              <TextField
                fullWidth
                label="Password"
                type={showLoginPassword ? 'text' : 'password'}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                margin="normal"
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowLoginPassword}
                        onMouseDown={handleMouseDownPassword}
                        edge="end"
                      >
                        {showLoginPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              
              <Box sx={{ 
                display: 'flex', 
                mt: 3, 
                mb: 2, 
                gap: 1,
                background: '#f5f7ff',
                borderRadius: 2,
                p: 0.5
              }}>
                <Button
                  fullWidth
                  variant={role === 'Admin' ? 'contained' : 'outlined'}
                  onClick={() => handleRoleClick('Admin')}
                  startIcon={<AdminPanelSettings />}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    ...(role === 'Admin' ? {
                      bgcolor: '#2E3A8C',
                      '&:hover': { bgcolor: '#1a246e' }
                    } : {
                      color: '#2E3A8C',
                      borderColor: '#2E3A8C'
                    })
                  }}
                >
                  Admin
                </Button>
                <Button
                  fullWidth
                  variant={role === 'Staff' ? 'contained' : 'outlined'}
                  onClick={() => handleRoleClick('Staff')}
                  startIcon={<SupervisorAccount />}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    ...(role === 'Staff' ? {
                      bgcolor: '#2E3A8C',
                      '&:hover': { bgcolor: '#1a246e' }
                    } : {
                      color: '#2E3A8C',
                      borderColor: '#2E3A8C'
                    })
                  }}
                >
                  Staff
                </Button>
              </Box>
              
              <Button
                fullWidth
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{
                  py: 1.5,
                  mt: 1,
                  mb: 2,
                  bgcolor: '#2E3A8C',
                  '&:hover': { bgcolor: '#1a246e' },
                  borderRadius: 2,
                  fontWeight: 600,
                  textTransform: 'none'
                }}
              >
                {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Login'}
              </Button>
              
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Don't have an account?{' '}
                  <Button 
                    onClick={handleShowCreateAccount}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Create Account
                  </Button>
                </Typography>
              </Box>
            </form>
          ) : (
            <form onSubmit={handleCreateAccountSubmit}>
              <TextField
                fullWidth
                label="Full Name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                margin="normal"
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }}
              />
              
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
                margin="normal"
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                }}
              />
              
              <TextField
                fullWidth
                label="Username"
                type="text"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                required
                margin="normal"
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccountCircle />
                    </InputAdornment>
                  ),
                }}
              />
              
              <TextField
                fullWidth
                label="Password"
                type={showRegPassword ? 'text' : 'password'}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
                margin="normal"
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowRegPassword}
                        onMouseDown={handleMouseDownPassword}
                        edge="end"
                      >
                        {showRegPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              
              <Box sx={{ 
                display: 'flex', 
                mt: 3, 
                mb: 2, 
                gap: 1,
                background: '#f5f7ff',
                borderRadius: 2,
                p: 0.5
              }}>
                <Button
                  fullWidth
                  variant={newRole === 'Admin' ? 'contained' : 'outlined'}
                  onClick={() => handleNewRoleClick('Admin')}
                  startIcon={<AdminPanelSettings />}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    ...(newRole === 'Admin' ? {
                      bgcolor: '#2E3A8C',
                      '&:hover': { bgcolor: '#1a246e' }
                    } : {
                      color: '#2E3A8C',
                      borderColor: '#2E3A8C'
                    })
                  }}
                >
                  Admin
                </Button>
                <Button
                  fullWidth
                  variant={newRole === 'Staff' ? 'contained' : 'outlined'}
                  onClick={() => handleNewRoleClick('Staff')}
                  startIcon={<SupervisorAccount />}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    ...(newRole === 'Staff' ? {
                      bgcolor: '#2E3A8C',
                      '&:hover': { bgcolor: '#1a246e' }
                    } : {
                      color: '#2E3A8C',
                      borderColor: '#2E3A8C'
                    })
                  }}
                >
                  Staff
                </Button>
              </Box>
              
              <Button
                fullWidth
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{
                  py: 1.5,
                  mt: 1,
                  mb: 2,
                  bgcolor: '#2E3A8C',
                  '&:hover': { bgcolor: '#1a246e' },
                  borderRadius: 2,
                  fontWeight: 600,
                  textTransform: 'none'
                }}
              >
                {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Create Account'}
              </Button>
              
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Already have an account?{' '}
                  <Button 
                    onClick={handleBackToLogin}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Back to Login
                  </Button>
                </Typography>
              </Box>
            </form>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default Login;