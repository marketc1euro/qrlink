import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

// Types for our users
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'client';
  name?: string;
  profilePicture?: string;
  qrCode?: string;
  customLink?: string;
  password?: string;
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isClient: boolean;
  addUserAccount: (userData: Omit<User, 'id'>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Admin user with simple password
const initialAdminUser: User = {
  id: '1',
  email: 'admin@qrcode.com',
  role: 'admin',
  name: 'Administrateur',
  password: 'Admin123!'
};

// Mock users storage
const MOCK_USERS_KEY = 'qrlink_users';
const CURRENT_USER_KEY = 'qrlink_current_user';

// Helper functions for storage
const getStoredUsers = (): User[] => {
  try {
    const stored = localStorage.getItem(MOCK_USERS_KEY);
    if (stored) {
      const users = JSON.parse(stored);
      // Vérifier si l'admin existe déjà
      const hasAdmin = users.some((user: User) => user.email === initialAdminUser.email);
      return hasAdmin ? users : [initialAdminUser, ...users];
    }
    return [initialAdminUser];
  } catch (error) {
    console.error('Error reading users from storage:', error);
    return [initialAdminUser];
  }
};

const setStoredUsers = (users: User[]) => {
  try {
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Error saving users to storage:', error);
  }
};

const getStoredUser = (): User | null => {
  try {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error reading current user from storage:', error);
    return null;
  }
};

const setStoredUser = (user: User | null) => {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (error) {
    console.error('Error saving current user to storage:', error);
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [mockUsers, setMockUsers] = useState<User[]>(getStoredUsers);
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Initialize loading state
  useEffect(() => {
    setLoading(false);
  }, []);

  // Update storage when users change
  useEffect(() => {
    setStoredUsers(mockUsers);
  }, [mockUsers]);

  // Update storage when current user changes
  useEffect(() => {
    setStoredUser(currentUser);
  }, [currentUser]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }
      
      if (user.password !== password) {
        throw new Error('Mot de passe incorrect');
      }
      
      const { password: _, ...userWithoutPassword } = user;
      
      setCurrentUser(userWithoutPassword);
      
      toast({
        title: 'Connexion réussie',
        description: `Bienvenue, ${user.name || user.email}!`,
      });
      
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/client/dashboard');
      }
    } catch (error) {
      toast({
        title: 'Échec de connexion',
        description: error instanceof Error ? error.message : 'Une erreur inconnue est survenue',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const addUserAccount = async (userData: Omit<User, 'id'>) => {
    try {
      if (!userData.password) {
        throw new Error('Le mot de passe est requis');
      }
      
      // Vérifier si l'utilisateur existe déjà
      const existingUser = mockUsers.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
      if (existingUser) {
        throw new Error('Un utilisateur avec cet email existe déjà');
      }
      
      const newUser: User = {
        ...userData,
        id: Date.now().toString()
      };

      const updatedUsers = [...mockUsers, newUser];
      setMockUsers(updatedUsers);
      setStoredUsers(updatedUsers);
      
      toast({
        title: 'Compte créé',
        description: 'Le compte a été créé avec succès',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de la création du compte',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    toast({
      title: 'Déconnexion',
      description: 'Vous avez été déconnecté avec succès.',
    });
    navigate('/login');
  };

  const isAdmin = currentUser?.role === 'admin';
  const isClient = currentUser?.role === 'client';

  return (
    <AuthContext.Provider value={{
      currentUser,
      loading,
      login,
      logout,
      isAdmin,
      isClient,
      addUserAccount
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
