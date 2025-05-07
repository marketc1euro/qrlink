import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import bcrypt from 'bcryptjs';

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

// Initial admin user with hashed password
const initialAdminUser: User = {
  id: '1',
  email: 'admin@qrcode.com',
  role: 'admin',
  name: 'Administrateur',
  password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy' // "Admin123!" hashed
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [mockUsers, setMockUsers] = useState<User[]>([initialAdminUser]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for stored user on mount
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('Tentative de connexion avec:', { email });
      
      const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      console.log('Utilisateur trouvé:', user ? 'Oui' : 'Non');
      
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }
      
      if (!user.password) {
        console.log('Pas de mot de passe pour cet utilisateur');
        throw new Error('Compte invalide');
      }

      console.log('Vérification du mot de passe...');
      const isValidPassword = await bcrypt.compare(password, user.password);
      console.log('Mot de passe valide:', isValidPassword);
      
      if (!isValidPassword) {
        throw new Error('Mot de passe incorrect');
      }
      
      const { password: _, ...userWithoutPassword } = user;
      
      setCurrentUser(userWithoutPassword);
      localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
      
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
      console.error('Erreur de connexion:', error);
      toast({
        title: 'Échec de connexion',
        description: error instanceof Error ? error.message : 'Une erreur inconnue est survenue',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addUserAccount = async (userData: Omit<User, 'id'>) => {
    try {
      if (!userData.password) {
        throw new Error('Le mot de passe est requis');
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const newUser: User = {
        ...userData,
        id: Date.now().toString(),
        password: hashedPassword
      };

      setMockUsers(prev => [...prev, newUser]);
      
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
    localStorage.removeItem('currentUser');
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
