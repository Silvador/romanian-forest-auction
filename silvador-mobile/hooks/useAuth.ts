import { useState, useEffect, useCallback } from 'react';
import { type User as FirebaseUser } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from '../lib/auth';
import { getCurrentUser } from '../lib/api';
import type { User } from '../types';

interface AuthState {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const user = await getCurrentUser();
          setState({ firebaseUser, user, loading: false, error: null });
        } catch (err) {
          // Firebase auth succeeded but API user fetch failed — still authenticated
          setState({
            firebaseUser,
            user: null,
            loading: false,
            error: null,
          });
        }
      } else {
        setState({ firebaseUser: null, user: null, loading: false, error: null });
      }
    });

    return unsubscribe;
  }, []);

  const refreshUser = useCallback(async () => {
    if (!state.firebaseUser) return;
    try {
      const user = await getCurrentUser();
      setState((prev) => ({ ...prev, user }));
    } catch {}
  }, [state.firebaseUser]);

  return {
    ...state,
    isAuthenticated: !!state.firebaseUser,
    isForestOwner: state.user?.role === 'forest_owner',
    isBuyer: state.user?.role === 'buyer',
    refreshUser,
  };
}
