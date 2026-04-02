import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import AuthService from '../services/authService';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Initialize from persisted auth synchronously to avoid redirect flicker on refresh
    if (AuthService.isAuthenticated()) {
      const currentUser = AuthService.getCurrentUser();
      return currentUser || null;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated on app load
    const initializeAuth = () => {
      if (AuthService.isAuthenticated()) {
        const currentUser = AuthService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } else {
        // Clear any invalid data
        AuthService.logout();
      }
      setIsLoading(false);
    };

    // Listen for logout events from API interceptor
    const handleLogout = () => {
      setUser(null);
    };

    window.addEventListener('auth:logout', handleLogout);
    initializeAuth();

    return () => {
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      console.log('AuthContext: Attempting login with:', { username });
      const response = await AuthService.login(username, password);
      console.log('AuthContext: Login response received:', JSON.stringify(response, null, 2));

      // Check if we have a token and user (which indicates successful login)
      if (response && response.token && response.user) {
        // Create user object with token
        const userWithToken: User = {
          ...response.user,
          token: response.token,
        };

        console.log('AuthContext: Setting user state:', JSON.stringify(userWithToken, null, 2));
        setUser(userWithToken);
        console.log('AuthContext: Login successful - returning true');
        return true;
      } else if (response && response.token) {
        // We have a token but maybe no user object, create a basic user
        console.log('AuthContext: Token found but no user object, creating basic user');
        const basicUser: User = {
          id: '1',
          username: username,
          role: 'user',
          userId: username,
          token: response.token,
        };

        console.log('AuthContext: Setting basic user state:', JSON.stringify(basicUser, null, 2));
        setUser(basicUser);
        console.log('AuthContext: Login successful with basic user - returning true');
        return true;
      }

      console.log('AuthContext: Login failed - no token in response');
      console.log('AuthContext: Response details:', response);
      return false;
    } catch (error: any) {
      console.error('AuthContext: Login failed with error:', error);
      console.error('AuthContext: Error details:', error.message);
      return false;
    }
  };

  const logout = () => {
    AuthService.logout();
    setUser(null);
  };

  const isAuthenticated = AuthService.isAuthenticated();

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};