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
        try {
          console.log("Fetching user data from backend API for UID:", user.uid);
          const token = await user.getIdToken();
          const response = await fetch("/api/user/me", {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json() as User;
            console.log("User data loaded from backend:", data.role, data.displayName);
            setUserData(data);
          } else {
            console.warn("Failed to fetch user data:", response.status);
            setUserData(null);
          }
        } catch (error) {
          console.error("Error fetching user data from backend:", error);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
      
      console.log("Setting loading to false");
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
