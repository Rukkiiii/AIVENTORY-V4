import React, { useState, useEffect } from 'react';
import { Snackbar, Alert, IconButton, Slide } from '@mui/material';
import { Close as CloseIcon, Error as ErrorIcon, Warning as WarningIcon, Info as InfoIcon } from '@mui/icons-material';

const NotificationToast = ({ notification, onClose }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (notification) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [notification]);

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
    // Call onClose after animation completes
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };

  if (!notification) return null;

  const getSeverity = () => {
    switch (notification.type) {
      case 'out_of_stock':
        return 'error';
      case 'critical':
        return 'error';
      case 'warning':
      case 'low_stock':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'out_of_stock':
      case 'critical':
        return <ErrorIcon />;
      case 'warning':
      case 'low_stock':
        return <WarningIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const getTitle = () => {
    switch (notification.type) {
      case 'out_of_stock':
        return 'Out of Stock';
      case 'critical':
        return 'Critical Stock';
      case 'low_stock':
        return 'Low Stock';
      default:
        return 'Notification';
    }
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      TransitionComponent={Slide}
      sx={{ mb: 2 }}
    >
      <Alert
        icon={getIcon()}
        onClose={handleClose}
        severity={getSeverity()}
        variant="filled"
        sx={{ 
          width: '100%', 
          minWidth: 350,
          maxWidth: 400,
          borderRadius: 1, // Square corners like Microsoft
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
          '& .MuiAlert-message': {
            width: '100%',
            paddingRight: 2
          }
        }}
        action={
          <IconButton
            aria-label="close"
            color="inherit"
            size="small"
            onClick={handleClose}
            sx={{ 
              position: 'absolute',
              top: 8,
              right: 8,
              padding: 0.5
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      >
        <strong>{getTitle()}</strong>
        <br />
        {notification.message}
      </Alert>
    </Snackbar>
  );
};

export default NotificationToast;