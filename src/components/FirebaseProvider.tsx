import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserSetting } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  settings: UserSetting | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updateSettings: (newSettings: Partial<UserSetting>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<UserSetting | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Fetch or create settings
        const settingsRef = doc(db, 'settings', user.uid);
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          setSettings(settingsSnap.data() as UserSetting);
        } else {
          const defaultSettings: UserSetting = {
            userId: user.uid,
            passMark: 33,
            defaultSubjects: ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology']
          };
          await setDoc(settingsRef, defaultSettings);
          setSettings(defaultSettings);
        }
      } else {
        setSettings(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateSettings = async (newSettings: Partial<UserSetting>) => {
    if (!user) return;
    const settingsRef = doc(db, 'settings', user.uid);
    const updated = { ...settings, ...newSettings, userId: user.uid } as UserSetting;
    await setDoc(settingsRef, updated);
    setSettings(updated);
  };

  return (
    <AuthContext.Provider value={{ user, loading, settings, login, logout, updateSettings }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
