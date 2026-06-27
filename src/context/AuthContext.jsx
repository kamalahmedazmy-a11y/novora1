import { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for existing session
    const storedUser = localStorage.getItem('novora_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password, subdomain = null) => {
    try {
      // If subdomain is not explicitly passed, try to detect it from the hostname
      let activeSubdomain = subdomain;
      if (!activeSubdomain) {
        const hostname = window.location.hostname;
        const parts = hostname.split('.');
        if (parts.length > 2 && !hostname.startsWith('localhost') && !hostname.startsWith('127.0.0.1')) {
          activeSubdomain = parts[0];
        }
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, subdomain: activeSubdomain })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.msg || 'Login failed');
      }

      setUser(data);
      localStorage.setItem('novora_user', JSON.stringify(data));
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const register = async (name, email, password, role = 'student', schoolId = null, parentOf = []) => {
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // If logged in user (like school_admin) is creating a student
      const storedUser = localStorage.getItem('novora_user');
      if (storedUser) {
        const token = JSON.parse(storedUser).token;
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name, email, password, role, schoolId, parentOf })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.msg || 'Registration failed');
      }

      // Only set user if we are registering a new user as public registration (no current session)
      if (!storedUser) {
        setUser(data);
        localStorage.setItem('novora_user', JSON.stringify(data));
      }
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('novora_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
