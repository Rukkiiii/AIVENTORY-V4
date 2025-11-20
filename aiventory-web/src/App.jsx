import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Suppliers from './pages/Suppliers';
import Scan from './pages/Scan';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Analysis from './pages/Analysis';
import Orders from './pages/Orders';
import Prediction from './pages/Prediction';
import Invoices from './pages/Invoices';
import './App.css'

import PrivateRoute from "../routes/PrivateRoute"; 
import PageTransition from './components/PageTransition';

function App() {
  useEffect(() => {
    try {
      const savedSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
      document.documentElement.setAttribute('data-theme', savedSettings?.darkMode ? 'dark' : 'light');
    } catch (error) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={
          <PageTransition loadingMessage="Loading login page...">
            <Login />
          </PageTransition>
        } />
        <Route path="/login" element={
          <PageTransition loadingMessage="Loading login page...">
            <Login />
          </PageTransition>
        } />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <PageTransition loadingMessage="Loading dashboard...">
                <Dashboard />
              </PageTransition>
            </PrivateRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <PrivateRoute>
              <PageTransition loadingMessage="Loading inventory...">
                <Inventory />
              </PageTransition>
            </PrivateRoute>
          }
        />
        <Route
          path="/suppliers"
          element={
            <PrivateRoute allowedRoles={["Admin", "Staff"]}>
              <PageTransition loadingMessage="Loading suppliers...">
                <Suppliers />
              </PageTransition>
            </PrivateRoute>
          }
        />
        <Route
          path="/scan"
          element={
            <PrivateRoute>
              <PageTransition loadingMessage="Loading scanner...">
                <Scan />
              </PageTransition>
            </PrivateRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <PrivateRoute allowedRoles={["Admin"]}>
              <PageTransition loadingMessage="Loading reports...">
                <Reports />
              </PageTransition>
            </PrivateRoute>
          }
        />
        <Route
          path="/invoices"
          element={
            <PrivateRoute allowedRoles={["Admin", "Staff"]}>
              <PageTransition loadingMessage="Loading invoices...">
                <Invoices />
              </PageTransition>
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <PageTransition loadingMessage="Loading settings...">
                <Settings />
              </PageTransition>
            </PrivateRoute>
          }
        />
        <Route
          path="/analysis"
          element={
            <PrivateRoute>
              <PageTransition loadingMessage="Loading analysis...">
                <Analysis />
              </PageTransition>
            </PrivateRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <PrivateRoute allowedRoles={["Admin", "Staff"]}>
              <PageTransition loadingMessage="Loading orders...">
                <Orders />
              </PageTransition>
            </PrivateRoute>
          }
        />
        <Route
          path="/prediction/:productId"
          element={
            <PrivateRoute>
              <PageTransition loadingMessage="Loading prediction...">
                <Prediction />
              </PageTransition>
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;