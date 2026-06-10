import { createContext, useState, useContext, useEffect } from 'react';
import { couchdb } from '@/api/couchdbClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    setIsLoadingPublicSettings(true);
    setAuthError(null);

    try {
      const publicSettings = await couchdb.publicSettings.get();
      setAppPublicSettings(publicSettings);
    } catch (error) {
      console.error('Public settings check failed:', error);
      setAppPublicSettings(null);
    } finally {
      setIsLoadingPublicSettings(false);
    }

    if (couchdb.auth.getToken()) {
      await checkUserAuth();
    } else {
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await couchdb.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      
      if (error.status === 401 || error.status === 403) {
        couchdb.auth.clearSession();
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      } else {
        console.error('User auth check failed:', error);
      }
    }
  };

  const logout = async (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthChecked(true);

    try {
      await couchdb.auth.logout();
    } catch {}

    if (shouldRedirect) {
      window.location.href = '/login';
    }
  };

  const navigateToLogin = () => {
    couchdb.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
