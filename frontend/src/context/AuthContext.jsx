import { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services/auth.service';

const AuthContext = createContext(null);

const initialState = {
  user: JSON.parse(localStorage.getItem('ps1_user') || 'null'),
  token: localStorage.getItem('ps1_token') || null,
  loading: true,
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload, error: null };
    case 'AUTH_SUCCESS':
      return { ...state, user: action.payload.user, token: action.payload.token, loading: false, error: null };
    case 'AUTH_ERROR':
      return { ...state, user: null, token: null, loading: false, error: action.payload };
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } };
    case 'LOGOUT':
      return { ...state, user: null, token: null, loading: false, error: null };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // On mount, verify token is still valid
  useEffect(() => {
    const verifyAuth = async () => {
      if (!state.token) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }
      try {
        const data = await authService.getMe();
        dispatch({ type: 'AUTH_SUCCESS', payload: { user: data.user, token: state.token } });
      } catch {
        localStorage.removeItem('ps1_token');
        localStorage.removeItem('ps1_user');
        dispatch({ type: 'AUTH_ERROR', payload: 'Session expired' });
      }
    };
    verifyAuth();
  }, []);

  const login = async (credentials) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const data = await authService.login(credentials);
      localStorage.setItem('ps1_token', data.token);
      localStorage.setItem('ps1_user', JSON.stringify(data.user));
      dispatch({ type: 'AUTH_SUCCESS', payload: data });
      return data;
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Login failed';
      dispatch({ type: 'AUTH_ERROR', payload: msg });
      throw new Error(msg);
    }
  };

  const signup = async (formData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const data = await authService.signup(formData);
      localStorage.setItem('ps1_token', data.token);
      localStorage.setItem('ps1_user', JSON.stringify(data.user));
      dispatch({ type: 'AUTH_SUCCESS', payload: data });
      return data;
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Signup failed';
      dispatch({ type: 'AUTH_ERROR', payload: msg });
      throw new Error(msg);
    }
  };

  const logout = () => {
    localStorage.removeItem('ps1_token');
    localStorage.removeItem('ps1_user');
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = async (updates) => {
    const data = await authService.updateProfile(updates);
    const updatedUser = { ...state.user, ...data.user };
    localStorage.setItem('ps1_user', JSON.stringify(updatedUser));
    dispatch({ type: 'UPDATE_USER', payload: data.user });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
