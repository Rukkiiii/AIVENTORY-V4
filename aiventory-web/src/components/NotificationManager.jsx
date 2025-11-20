import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import NotificationToast from './NotificationToast';
import { API_BASE } from '../config/api';

const NotificationManager = () => {
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [currentNotification, setCurrentNotification] = useState(null);
  const [shownNotifications, setShownNotifications] = useState(new Set());
  const [checkCount, setCheckCount] = useState(0); // Limit the number of checks
  const [lastReset, setLastReset] = useState(Date.now()); // Track when we last reset

  // Function to manually check for stock alerts
  const checkStockAlerts = async () => {
    // Only run on dashboard page
    if (location.pathname !== '/dashboard') return;
    
    // Check if notifications are enabled in settings
    const savedSettings = localStorage.getItem('appSettings');
    const settings = savedSettings ? JSON.parse(savedSettings) : { notifications: true, lowStock: true };
    if (!settings.notifications || !settings.lowStock) return; // Don't show notifications if disabled
    
    try {
      const response = await fetch(`${API_BASE}/api/products`);
      if (response.ok) {
        const products = await response.json();
        const alerts = [];
        
        products.forEach(product => {
          const stock = Number(product.Product_stock || 0);
          const threshold = Number(product.reorder_level || 0);
          
          // Only create alerts for actual stock issues
          if (stock <= 0) {
            alerts.push({
              id: `out_of_stock_${product.Product_id}`,
              type: 'out_of_stock',
              message: `${product.Product_name} is out of stock`,
              productId: product.Product_id,
              productName: product.Product_name,
              stock: stock
            });
          } else if (stock <= threshold) {
            alerts.push({
              id: `critical_${product.Product_id}`,
              type: 'critical',
              message: `${product.Product_name} is below reorder level (${stock}/${threshold})`,
              productId: product.Product_id,
              productName: product.Product_name,
              stock: stock
            });
          } else if (stock <= threshold * 1.5) {
            alerts.push({
              id: `low_stock_${product.Product_id}`,
              type: 'low_stock',
              message: `${product.Product_name} is running low (${stock}/${threshold})`,
              productId: product.Product_id,
              productName: product.Product_name,
              stock: stock
            });
          }
        });
        
        // Filter out alerts that have already been shown
        const newAlerts = alerts.filter(alert => 
          !shownNotifications.has(alert.id)
        );
        
        if (newAlerts.length > 0) {
          // Add new alerts to the shown notifications set
          const updatedShown = new Set(shownNotifications);
          newAlerts.forEach(alert => updatedShown.add(alert.id));
          setShownNotifications(updatedShown);
          
          setNotifications(prev => [...prev, ...newAlerts]);
        }
      }
    } catch (error) {
      console.error('Error checking stock alerts:', error);
    }
  };

  // Check for stock alerts periodically
  useEffect(() => {
    // Only run on dashboard page
    if (location.pathname !== '/dashboard') return;
    
    // Check if notifications are enabled in settings
    const savedSettings = localStorage.getItem('appSettings');
    const settings = savedSettings ? JSON.parse(savedSettings) : { notifications: true, lowStock: true };
    if (!settings.notifications || !settings.lowStock) return; // Don't show notifications if disabled
    
    // Reset the system every 24 hours to allow alerts to show again
    const now = Date.now();
    if (now - lastReset > 24 * 60 * 60 * 1000) { // 24 hours
      setShownNotifications(new Set());
      setCheckCount(0);
      setLastReset(now);
    }
    
    // Only check for alerts a maximum of 10 times to prevent infinite looping
    if (checkCount >= 10) return;

    // Check immediately on mount
    checkStockAlerts();
    
    // Check every 30 seconds, but limit to 10 checks total
    const interval = setInterval(() => {
      // Check if notifications are still enabled
      const savedSettings = localStorage.getItem('appSettings');
      const settings = savedSettings ? JSON.parse(savedSettings) : { notifications: true, lowStock: true };
      if (settings.notifications && settings.lowStock) {
        checkStockAlerts();
        setCheckCount(prev => prev + 1);
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [shownNotifications, checkCount, lastReset, location.pathname]);

  // Show notifications one by one
  useEffect(() => {
    if (location.pathname !== '/dashboard') return;
    
    // Check if notifications are enabled in settings
    const savedSettings = localStorage.getItem('appSettings');
    const settings = savedSettings ? JSON.parse(savedSettings) : { notifications: true, lowStock: true };
    if (!settings.notifications || !settings.lowStock) return; // Don't show notifications if disabled
    
    if (notifications.length > 0 && !currentNotification) {
      const [first, ...rest] = notifications;
      setCurrentNotification(first);
      setNotifications(rest);
    }
  }, [notifications, currentNotification, location.pathname]);

  const handleNotificationClose = () => {
    // Mark this notification as permanently shown
    if (currentNotification) {
      setShownNotifications(prev => new Set(prev).add(currentNotification.id));
    }
    setCurrentNotification(null);
  };

  // Function to manually refresh alerts (resets check count)
  const handleManualRefresh = () => {
    setCheckCount(0);
    checkStockAlerts();
  };

  // Function to completely reset the notification system
  const handleResetSystem = () => {
    setShownNotifications(new Set());
    setCheckCount(0);
    setLastReset(Date.now());
    setNotifications([]);
    setCurrentNotification(null);
  };

  // Only render on dashboard page
  if (location.pathname !== '/dashboard') {
    return null;
  }

  // Check if notifications are enabled before rendering
  const savedSettings = localStorage.getItem('appSettings');
  const settings = savedSettings ? JSON.parse(savedSettings) : { notifications: true, lowStock: true };
  if (!settings.notifications || !settings.lowStock) {
    return null;
  }

  return (
    <NotificationToast 
      notification={currentNotification} 
      onClose={handleNotificationClose} 
    />
  );
};

export default NotificationManager;