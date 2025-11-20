import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Resolve API base URL for emulator/device/Web automatically
function resolveBaseURL() {
  // 1) Allow override via env (expo): EXPO_PUBLIC_API_URL=http://<host>:<port>/api
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && typeof envUrl === 'string') {
    return envUrl.endsWith('/api') ? envUrl : envUrl.replace(/\/$/, '') + '/api';
  }

  // 2) Port can be overridden; default backend port is 5001
  const port = process.env.EXPO_PUBLIC_API_PORT || '5001';

  // 3) Try to infer dev machine IP from Expo hostUri when running in Expo Go
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.hostUri || '';
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:${port}/api`;
    }
  }

  // 4) Android emulator fallback (10.0.2.2) or localhost for web/iOS simulator
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${port}/api`;
  }

  return `http://localhost:${port}/api`;
}

// Resolve and log the base URL for debugging
const baseURL = resolveBaseURL();
console.log('🔗 API Base URL:', baseURL);

// Create axios instance with default config
const api = axios.create({
  baseURL: baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token if available
api.interceptors.request.use(
  async (config) => {
    // Add auth token from AsyncStorage if available
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // AsyncStorage not available or token not found
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Enhanced error logging for debugging
    if (error.code === 'ECONNREFUSED' || error.message?.includes('Network')) {
      console.error('❌ Connection Error:', {
        message: error.message,
        code: error.code,
        baseURL: baseURL,
        url: error.config?.url,
        fullURL: error.config ? `${baseURL}${error.config.url}` : 'unknown'
      });
      error.userMessage = `Cannot connect to backend at ${baseURL}. Make sure your backend is running on port 5001.`;
    } else if (error.response?.status === 401) {
      // Handle unauthorized access
      // You might want to redirect to login
    } else if (error.response) {
      // Server responded with error
      console.error('❌ API Error:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      });
    }
    return Promise.reject(error);
  }
);

export default api;

// API functions for products
export const getProducts = () => api.get('/items');
export const getProduct = (id) => api.get(`/items/${id}`);
export const createProduct = (product) => api.post('/items', product);
export const updateProduct = (id, product) => api.put(`/items/${id}`, product);
export const deleteProduct = (id) => api.delete(`/items/${id}`);

// API functions for suppliers
export const getSuppliers = () => api.get('/suppliers');
export const createSupplier = (supplier) => api.post('/suppliers', supplier);
export const updateSupplier = (id, supplier) => api.put(`/suppliers/${id}`, supplier);
export const deleteSupplier = (id) => api.delete(`/suppliers/${id}`);

// API functions for orders
export const getOrders = () => api.get('/orders');
export const createOrder = (order) => api.post('/orders', order);
export const updateOrder = (id, order) => api.put(`/orders/${id}`, order);
export const deleteOrder = (id) => api.delete(`/orders/${id}`);

// API functions for invoices
export const getInvoices = () => api.get('/invoices');
export const getInvoice = (id) => api.get(`/invoices/${id}`);
export const createInvoice = (payload) => api.post('/invoices', payload);
export const updateInvoiceStatus = (id, status) => api.patch(`/invoices/${id}/status`, { status });

// API functions for authentication
export const login = (email, password, role) => api.post('/login', { email, password, role });
export const register = (fullName, email, password, role, username) => api.post('/register', { fullName, email, password, role, username });

// API functions for user profile
export const getProfile = (role, id) => api.get(`/profile/${role}/${id}`);
export const updateProfile = (role, id, profileData) => api.put(`/profile/${role}/${id}`, profileData);
export const changePassword = (role, id, passwordData) => api.put(`/profile/${role}/${id}/password`, passwordData);

// API functions for dashboard
export const getDashboardMetrics = () => api.get('/dashboard/metrics');
export const getLowStockItems = () => api.get('/reports/low-stock');

// API functions for AI predictions (LSTM)
export const getProductPrediction = (productId) => api.get(`/predictions/products/${productId}`);
export const getProductForecast = (productId, days = 30) => api.get(`/predictions/products/${productId}?days=${days}`);
export const trainLSTMModels = (limit = null) => api.post('/ml/train', limit ? { limit } : {});
export const getMLServiceHealth = () => api.get('/ml/health');