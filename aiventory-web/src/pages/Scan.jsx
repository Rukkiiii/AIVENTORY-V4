import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Grid,
  IconButton,
  Paper,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Snackbar,
  Alert
} from '@mui/material';
import { QrCodeScanner, SwitchCamera, Delete } from '@mui/icons-material';
import SidebarLayout from '../components/SidebarLayout';

const mockScanned = [
  { id: 1, code: '123456789012', label: 'Item A' },
  { id: 2, code: '987654321098', label: 'Item B' },
];

export default function Scan() {
  const [scanned, setScanned] = useState([]);
  const [manual, setManual] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(true);

  // Simulate data loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setScanned(mockScanned);
      setLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const handleAddManual = () => {
    if (!manual.trim()) {
      setSnackbar({ open: true, message: 'Please enter a barcode.', severity: 'error' });
      return;
    }
    setScanned((prev) => [
      ...prev,
      { id: Date.now(), code: manual, label: 'Manual Entry' },
    ]);
    setManual('');
    setSnackbar({ open: true, message: 'Barcode added.', severity: 'success' });
  };

  const handleDelete = (id) => {
    setScanned((prev) => prev.filter((item) => item.id !== id));
    setSnackbar({ open: true, message: 'Item removed.', severity: 'info' });
  };

  // Show loading state
  if (loading) {
    return (
      <SidebarLayout>
        <Box sx={{ p: { xs: 1, md: 3 }, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <Typography variant="h6" color="text.secondary">
            Loading scanner...
          </Typography>
        </Box>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <Box sx={{ p: { xs: 1, md: 3 } }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Typography variant="h4" fontWeight={700} color="primary.main">
            Barcode Scanner
          </Typography>
          <Button
            variant="outlined"
            startIcon={<SwitchCamera />}
            sx={{ borderRadius: 2 }}
            // onClick={handleSwitchCamera} // Placeholder for camera switch logic
          >
            Switch Camera
          </Button>
        </Box>
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 3, minHeight: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <QrCodeScanner sx={{ fontSize: 80, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" mb={1}>
                Barcode Scanner Area
              </Typography>
              <Typography variant="body2" color="text.secondary">
                (Camera preview will appear here)
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" fontWeight={600} color="primary.main" mb={2}>
                Scanned Items
              </Typography>
              <List dense>
                {scanned.length === 0 ? (
                  <ListItem>
                    <ListItemText primary="No items scanned yet." />
                  </ListItem>
                ) : (
                  scanned.map((item) => (
                    <React.Fragment key={item.id}>
                      <ListItem>
                        <ListItemText
                          primary={item.label || 'Scanned Item'}
                          secondary={item.code}
                        />
                        <ListItemSecondaryAction>
                          <IconButton edge="end" color="error" onClick={() => handleDelete(item.id)}>
                            <Delete />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                      <Divider component="li" />
                    </React.Fragment>
                  ))
                )}
              </List>
            </Paper>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} color="primary.main" mb={2}>
                Manual Entry
              </Typography>
              <Box display="flex" gap={2}>
                <TextField
                  label="Enter barcode manually"
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  size="small"
                  fullWidth
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddManual(); }}
                />
                <Button variant="contained" onClick={handleAddManual} sx={{ minWidth: 100 }}>
                  Add Item
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={2500}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </SidebarLayout>
  );
}