import { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { User } from "@shared/schema";

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      console.log("Auth state changed. User:", user ? user.uid : "null");
      setCurrentUser(user);

      if (user) {
        const token = await user.getIdToken();
        let data: User | null = null;

        // Retry up to 3 times with 1s delay to handle signup race condition:
        // onAuthStateChanged fires before POST /api/users completes
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const response = await fetch("/api/user/me", {
              headers: { "Authorization": `Bearer ${token}` }
            });

            if (response.ok) {
              data = await response.json() as User;
              console.log("User data loaded from backend:", data.role, data.displayName);
              break;
            } else if (response.status === 404 && attempt < 2) {
              console.log(`User document not ready yet, retrying in 1s (attempt ${attempt + 1}/3)`);
              await new Promise(r => setTimeout(r, 1000));
            } else {
              console.warn("Failed to fetch user data:", response.status);
              break;
            }
          } catch (error) {
            console.error("Error fetching user data from backend:", error);
            break;
          }
        }

        setUserData(data);
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOut = async () => {
    await auth.signOut();
    setUserData(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, userData, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
