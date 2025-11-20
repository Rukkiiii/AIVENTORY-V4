/**
 * API Configuration
 * Uses environment variables for different environments
 */

// Get API base URL from environment variable or fallback to localhost
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001';

// Export for use in other files
export default API_BASE;

