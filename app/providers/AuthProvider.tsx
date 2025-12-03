import { signOut as fbSignOut, onAuthStateChanged, signInWithEmailAndPassword, User } from 'firebase/auth';
import { get, ref, set } from 'firebase/database';
import * as React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { migrateHotelDataToFirebase } from '../utils/migrateHotelData';

type AuthContextType = {
  user: User | null;
  role: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Trigger hotel data migration on first app load
    migrateHotelDataToFirebase();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setRole(null);
      if (u) {
        try {
          const snapshot = await get(ref(db, `users/${u.uid}/role`));
          const r = snapshot.exists() ? snapshot.val() : null;
          if (r) {
            setRole(r);
          } else {
            // Fallback: treat specific known email as admin and persist to DB
            if (u.email && u.email.toLowerCase() === 'arin@gmail.com') {
              try {
                await set(ref(db, `users/${u.uid}/role`), 'admin');
                setRole('admin');
              } catch (writeErr) {
                console.error('Error writing fallback admin role:', writeErr);
                setRole('admin'); // still grant locally even if DB write fails
              }
            } else {
              setRole(null);
            }
          }
        } catch (err) {
          console.error('Error reading role:', err);
          // If read failed but email matches, still grant admin locally
          if (u.email && u.email.toLowerCase() === 'arin@gmail.com') {
            setRole('admin');
          } else {
            setRole(null);
          }
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await fbSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthProvider;
