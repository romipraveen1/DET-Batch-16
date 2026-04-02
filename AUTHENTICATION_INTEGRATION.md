# Authentication Integration

This document describes the authentication system that has been integrated into the DefectTracker Pro frontend application.

## Overview

The authentication system implements the following flow:
1. When a user is created, a random password is generated automatically
2. The user gets a username as userID in the format US0001
3. The username and generated password are used to authenticate via the API: `http://localhost:8086/api/v1/auth/login`
4. For every API request, the header must include `Authorization: Bearer <token>`
5. Only requests with valid tokens are allowed access

## Architecture

### Components

1. **AuthService** (`src/services/authService.ts`)
   - Handles login API calls to the authentication server
   - Manages token storage and retrieval
   - Provides authentication status checks

2. **Centralized API Client** (`src/lib/api.ts`)
   - Axios instance with automatic token injection
   - Request/response interceptors for authentication
   - Automatic logout on 401 responses

3. **AuthContext** (`src/context/AuthContext.tsx`)
   - React context for authentication state management
   - Provides login/logout functions
   - Manages user data persistence

4. **ProtectedRoute** (in `src/App.tsx`)
   - Route wrapper that ensures authentication
   - Redirects unauthenticated users to login

### Key Features

- **Automatic Token Management**: All API requests automatically include the Bearer token
- **Token Validation**: Checks token validity and expiry
- **Automatic Logout**: Clears auth data and redirects on 401 responses
- **Persistent Sessions**: User data persists across browser sessions
- **Loading States**: Proper loading indicators during authentication checks

## Configuration

### Environment Variables

```
VITE_BASE_URL=/api/v1/
VITE_AUTH_URL=http://localhost:8086/api/v1/auth
```

### Proxy Configuration

The Vite development server is configured to proxy:
- Authentication requests to `localhost:8086`
- Other API requests to `localhost:8080`

## Usage

### Login Process

1. User enters username (e.g., US0001) and password
2. Frontend calls `AuthService.login(username, password)`
3. AuthService makes POST request to `/api/v1/auth/login`
4. On success, token and user data are stored
5. User is redirected to dashboard

### API Requests

All API requests automatically include the Authorization header:

```typescript
// This is handled automatically by the centralized API client
const response = await apiClient.get('users/all');
```

### Logout Process

```typescript
// From any component
const { logout } = useAuth();
logout(); // Clears token and redirects to login
```

## Security Features

1. **Token Expiry Handling**: Automatic logout when token expires
2. **401 Response Handling**: Clears auth data on authentication failures
3. **Protected Routes**: All application routes require authentication
4. **Secure Storage**: Tokens stored in localStorage (consider httpOnly cookies for production)

## Testing the Integration

1. Start the authentication server on `localhost:8086`
2. Start the main API server on `localhost:8080`
3. Start the frontend development server: `npm run dev`
4. Navigate to the application and attempt to login with valid credentials

## Migration Notes

- All existing API calls have been updated to use the centralized API client
- The mock authentication has been replaced with real API integration
- User interface remains unchanged for seamless user experience

## Future Enhancements

1. **Refresh Token Support**: Implement token refresh mechanism
2. **Remember Me**: Extend session duration for remembered logins
3. **Multi-factor Authentication**: Add 2FA support
4. **Session Management**: Server-side session validation
5. **Security Headers**: Add CSRF protection and security headers
