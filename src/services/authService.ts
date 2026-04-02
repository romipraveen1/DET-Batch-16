import axios from 'axios';
import { tokenManager } from '../lib/api';

// Authentication API base URL (use proxy in development)
const AUTH_BASE_URL = `${import.meta.env.VITE_BASE_URL}auth`;

// Create a separate axios instance for authentication (no interceptors)
const authClient = axios.create({
  baseURL: AUTH_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 1000000,
});

// Add request interceptor for debugging
authClient.interceptors.request.use(
  (config) => {

    console.log('AuthClient: Making request to:', config.url);
    console.log('AuthClient: Request method:', config.method);
    console.log('AuthClient: Request data:', JSON.stringify(config.data, null, 2));
    console.log('AuthClient: Request headers:', JSON.stringify(config.headers, null, 2));
    return config;
  },
  (error) => {
    console.error('AuthClient: Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
authClient.interceptors.response.use(
  (response) => {
    console.log('AuthClient: Response received from:', response.config.url);
    console.log('AuthClient: Response status:', response.status);
    console.log('AuthClient: Response headers:', JSON.stringify(response.headers, null, 2));
    console.log('AuthClient: Response data:', JSON.stringify(response.data, null, 2));
    return response;
  },
  (error) => {
    console.error('AuthClient: Response error:', error);
    if (error.response) {
      console.error('AuthClient: Error response status:', error.response.status);
      console.error('AuthClient: Error response data:', JSON.stringify(error.response.data, null, 2));
    }
    return Promise.reject(error);
  }
);

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token?: string;
  accessToken?: string; // Alternative token field name
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
    userId?: string; // The userID in format US0001
  };
  data?: any; // In case user data is nested in data field
  message?: string;
  status?: string;
}

export interface AuthError {
  message: string;
  status?: number;
}

export class AuthService {
  /**
   * Login user with username and password
   * @param username - User's username (e.g., US0001)
   * @param password - User's password (auto-generated)
   * @returns Promise with login response or throws error
   */
  static async login(username: string, password: string): Promise<LoginResponse> {
    try {
      console.log('AuthService: Making login request to:', AUTH_BASE_URL + '/login');
      
      // MOCK LOGIN FOR DEMO
      if (username === 'admin@gmail.com' && password === 'admin') {
        console.log('AuthService: Demo credentials detected, returning mock response');
        const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJ1c2VybmFtZSI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTYxNjYwMDAwMCwiZXhwIjoyNjE2NjAwMDAwfQ.mock_signature';
        const mockUser = {
          id: '1',
          username: 'admin@gmail.com',
          email: 'admin@gmail.com',
          role: 'admin',
          userId: 'US0001'
        };
        
        tokenManager.setToken(mockToken);
        localStorage.setItem('user', JSON.stringify(mockUser));
        
        return {
          token: mockToken,
          user: mockUser,
          message: 'Login successful (Demo Mode)',
          status: 'success'
        };
      }

      const response = await authClient.post<any>('/login', {
        username,
        password,
      });

      console.log('AuthService: Response status:', response.status);
      console.log('AuthService: Raw API response:', JSON.stringify(response.data, null, 2));
      console.log('AuthService: Response data type:', typeof response.data);
      console.log('AuthService: Response data keys:', Object.keys(response.data || {}));

      // Check if response status is 200 (success)
      if (response.status === 200) {
        console.log('AuthService: 200 OK response received - processing as successful login');

        // Handle different possible response structures
        const responseData = response.data;

        // Add detailed logging to see the response structure
        console.log('AuthService: Full response data:', JSON.stringify(responseData, null, 2));
        console.log('AuthService: Response data keys:', Object.keys(responseData || {}));
        console.log('AuthService: Response data type:', typeof responseData);

        // Try to extract token from various possible locations
        let token = responseData.token ||
                   responseData.accessToken ||
                   responseData.access_token ||
                   responseData.jwt ||
                   responseData.authToken ||
                   responseData.data?.token ||
                   responseData.data?.accessToken ||
                   responseData.data?.jwt ||
                   responseData.data?.authToken ||
                   // Additional patterns
                   responseData.result?.token ||
                   responseData.payload?.token ||
                   responseData.user?.token ||
                   // Check if entire response is the token
                   (typeof responseData === 'string' && responseData.startsWith('eyJ') ? responseData : null);

        console.log('AuthService: Token extraction results:');
        console.log('  - responseData.token:', responseData.token || 'NOT FOUND');
        console.log('  - responseData.accessToken:', responseData.accessToken || 'NOT FOUND');
        console.log('  - responseData.data?.token:', responseData.data?.token || 'NOT FOUND');
        console.log('  - Final token:', token ? `FOUND: ${token.substring(0, 30)}...` : 'NOT FOUND');
        tokenManager.setToken(token || '');

        // CRITICAL: Do not create session tokens - we need the real JWT
        if (!token) {
          console.error('AuthService: CRITICAL ERROR - No JWT token found in API response!');
          console.error('AuthService: This means the API response structure is not as expected');
          console.error('AuthService: Please check the API documentation or response format');
          throw new Error('Authentication failed: No JWT token received from server');
        }

        // Try to extract user data from various possible locations
        const user = responseData.user ||
                    responseData.data?.user ||
                    responseData.userData ||
                    responseData.data;

        console.log('AuthService: Using token:', token ? `Present (${token.substring(0, 20)}...)` : 'Missing');
        console.log('AuthService: Extracted user:', JSON.stringify(user, null, 2));

        // Since we have a 200 response, treat this as successful login
        console.log('AuthService: Processing 200 response as successful login');

        // Store token and user data
        

        // Create a normalized user object
        const normalizedUser = user || {
          id: responseData.id || responseData.data?.id || '1',
          username: responseData.username || responseData.data?.username || username,
          role: responseData.role || responseData.data?.role || user?.role || 'user',
          userId: responseData.userId || responseData.data?.userId || username
        };

        localStorage.setItem('user', JSON.stringify(normalizedUser));

        console.log('AuthService: Login successful (200), token and user stored');
        console.log('AuthService: Normalized user:', JSON.stringify(normalizedUser, null, 2));

        // Return normalized response
        return {
          token,
          user: normalizedUser,
          message: responseData.message || 'Login successful',
          status: 'success'
        };
      } else {
        console.error('AuthService: Non-200 response:', response.status);
        throw new Error(`Login failed with status: ${response.status}`);
      }
    } catch (error: any) {
      console.error('AuthService: Login error:', error);

      // Handle different types of errors
      if (error.response) {
        console.error('AuthService: Server error response:', error.response.data);
        console.error('AuthService: Server error status:', error.response.status);

        // Server responded with error status
        const authError: AuthError = {
          message: error.response.data?.message || `Login failed (${error.response.status})`,
          status: error.response.status,
        };
        throw authError;
      } else if (error.request) {
        // Network error
        console.error('AuthService: Network error - no response received');
        console.error('AuthService: Request details:', error.request);
        throw new Error('Network error: Unable to connect to authentication server at ' + AUTH_BASE_URL);
      } else {
        // Other error
        console.error('AuthService: Other error:', error.message);
        throw new Error(error.message || 'An unexpected error occurred during login');
      }
    }
  }

  /**
   * Logout user by clearing stored data
   */
  static logout(): void {
    tokenManager.removeToken();
  }

  /**
   * Check if user is currently authenticated
   */
  static isAuthenticated(): boolean {
    const token = tokenManager.getToken();
    return token !== null && tokenManager.isTokenValid();
  }

  /**
   * Get current user data from localStorage
   */
  static getCurrentUser(): any | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Get current auth token
   */
  static getToken(): string | null {
    return tokenManager.getToken();
  }
}

export default AuthService;
