import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('sdec_token'));
  const [student, setStudent] = useState(() => {
    const raw = localStorage.getItem('sdec_student');
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (token) localStorage.setItem('sdec_token', token);
    else localStorage.removeItem('sdec_token');
  }, [token]);

  useEffect(() => {
    if (student) localStorage.setItem('sdec_student', JSON.stringify(student));
    else localStorage.removeItem('sdec_student');
  }, [student]);

  function login(newToken, newStudent) {
    setToken(newToken);
    setStudent(newStudent);
  }

  function logout() {
    setToken(null);
    setStudent(null);
  }

  return (
    <AuthContext.Provider value={{ token, student, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
