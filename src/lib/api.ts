  import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

  // Create the main API client instance


  // Token management utilities
  export const tokenManager = {
    getToken: (): string | null => {
      return localStorage.getItem('authToken');
    },
    
    setToken: (token: string): void => {
      localStorage.setItem('authToken', token);
    },
    
    removeToken: (): void => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    },
    
    isTokenValid: (): boolean => {
      const token = tokenManager.getToken();
      if (!token) return false;

      // If token looks like a JWT, validate expiry. Otherwise, consider it valid if present.
      if (token.includes('.')) {
        try {
          const base64Url = token.split('.')[1];
          if (!base64Url) return true; // treat as valid if we cannot inspect

          // Convert base64url -> base64 and add padding
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
          const json = atob(padded);
          const payload = JSON.parse(json);

          const currentTimeSeconds = Date.now() / 1000;
          // If exp exists, enforce it. If missing, treat token as valid.
          if (typeof payload.exp === 'number') {
            return payload.exp > currentTimeSeconds;
          }
          return true;
        } catch {
          // If decoding fails (e.g., non-standard token), assume valid rather than logging out users on refresh
          return true;
        }
      }

      // Non-JWT token: assume valid when present
      return true;
    },

    clearAuthData: (): void => {
      tokenManager.removeToken();
      // Clear any other auth-related data
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
    }
  };
  const apiClient: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_BASE_URL || '/api/v1/',
    timeout: 1000000, // 1000 seconds timeout
  });
  const token = tokenManager.getToken();
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }


  // Request interceptor to add Authorization header (exclude auth/login)
  apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Skip adding Authorization header for auth/login requests
      const isAuthLoginRequest = config.url?.includes('/auth/login') ||
                                config.url?.includes('auth/login') ||
                                (config.baseURL?.includes('auth') && config.url?.includes('login'));

      if (!isAuthLoginRequest) {
        const token = tokenManager.getToken();
        if (token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
          console.log('API Client: Added Authorization header for request to:', config.url);
          console.log('API Client: Token preview:', token.substring(0, 20) + '...');
        } else {
          console.log('API Client: No token available for request to:', config.url);
        }
      } else {
        console.log('API Client: Skipping Authorization header for auth/login request:', config.url);
      }

      return config;
    },
    (error) => {
      console.error('API Client: Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle token expiry and errors
  apiClient.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    (error) => {
      // MOCK RESPONSES FOR DEMO RESILIENCE
      if (error.code === 'ERR_NETWORK' || error.response?.status === 404 || error.response?.status === 500) {
        console.warn('API Client: Network/Server error detected. Returning mock data for demo robustness.', error.config?.url);
        
        // Handle specific endpoints if needed
        if (error.config?.url?.includes('defectStatus')) {
          return Promise.resolve({
            data: {
              status: 'success',
              message: 'Mocked for demo',
              data: [
                { id: 1, defectStatusName: 'NEW', colorCode: '#2a3eb1' },
                { id: 2, defectStatusName: 'OPEN', colorCode: '#9c27b0' },
                { id: 3, defectStatusName: 'FIXED', colorCode: '#F59E0B' },
                { id: 4, defectStatusName: 'CLOSED', colorCode: '#EF4444' }
              ]
            }
          });
        }
        
        if (error.config?.url?.includes('projects/')) {
          // Mock data for project details/modules
          return Promise.resolve({
            data: {
              status: 'success',
              message: 'Mocked for demo',
              data: [] // Modules will fall back to initial state in AppContext
            }
          });
        }
      }

      if (error.response?.status === 401) {
        // Token is invalid or expired
        console.warn('Authentication failed - clearing auth data and redirecting to login');
        tokenManager.clearAuthData();

        // Dispatch a custom event to notify the app about logout
        window.dispatchEvent(new CustomEvent('auth:logout'));

        // Redirect to login page if not already there
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      } else if (error.response?.status === 403) {
        // Forbidden - user doesn't have permission
        console.warn('Access forbidden - insufficient permissions');
      }
      return Promise.reject(error);
    }
  );

  export default apiClient;
