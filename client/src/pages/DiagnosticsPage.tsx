import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { auth, db, storage } from "@/lib/firebase";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { ref, listAll } from "firebase/storage";

export default function DiagnosticsPage() {
  const [checks, setChecks] = useState({
    firebaseInit: "pending" as "pending" | "success" | "error",
    auth: "pending" as "pending" | "success" | "error",
    firestore: "pending" as "pending" | "success" | "error",
    storage: "pending" as "pending" | "success" | "error",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [config, setConfig] = useState({
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
  });

  useEffect(() => {
    setConfig({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "NOT SET",
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "NOT SET",
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "NOT SET",
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "NOT SET",
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "NOT SET",
      appId: import.meta.env.VITE_FIREBASE_APP_ID || "NOT SET",
    });
  }, []);

  const runDiagnostics = async () => {
    const newChecks = { ...checks };
    const newErrors = { ...errors };

    try {
      newChecks.firebaseInit = "success";
    } catch (error: any) {
      newChecks.firebaseInit = "error";
      newErrors.firebaseInit = error.message;
    }

    try {
      await auth.authStateReady();
      newChecks.auth = "success";
    } catch (error: any) {
      newChecks.auth = "error";
      newErrors.auth = error.message;
    }

    try {
      const q = query(collection(db, "auctions"), limit(1));
      await getDocs(q);
      newChecks.firestore = "success";
    } catch (error: any) {
      newChecks.firestore = "error";
      newErrors.firestore = error.message;
    }

    try {
      const storageRef = ref(storage);
      await listAll(storageRef);
      newChecks.storage = "success";
    } catch (error: any) {
      newChecks.storage = "error";
      newErrors.storage = error.message;
    }

    setChecks(newChecks);
    setErrors(newErrors);
  };

  const getIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-primary" />;
      case "error":
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-primary">OK</Badge>;
      case "error":
        return <Badge variant="destructive">FAILED</Badge>;
      default:
        return <Badge variant="secondary">PENDING</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Firebase Diagnostics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Configuration</h3>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-48">API Key:</span>
                  <span>{config.apiKey.substring(0, 20)}...</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-48">Auth Domain:</span>
                  <span>{config.authDomain}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-48">Project ID:</span>
                  <span>{config.projectId}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-48">Storage Bucket:</span>
                  <span>{config.storageBucket}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-48">Messaging Sender ID:</span>
                  <span>{config.messagingSenderId}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-48">App ID:</span>
                  <span>{config.appId.substring(0, 30)}...</span>
                </div>
              </div>
            </div>

            <Button onClick={runDiagnostics} data-testid="button-run-diagnostics">
              Run Diagnostics
            </Button>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Service Status</h3>
              
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  {getIcon(checks.firebaseInit)}
                  <span className="font-medium">Firebase Initialization</span>
                </div>
                {getStatusBadge(checks.firebaseInit)}
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  {getIcon(checks.auth)}
                  <span className="font-medium">Authentication Service</span>
                </div>
                {getStatusBadge(checks.auth)}
              </div>
              {errors.auth && (
                <div className="ml-8 text-sm text-destructive">{errors.auth}</div>
              )}

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  {getIcon(checks.firestore)}
                  <span className="font-medium">Firestore Database</span>
                </div>
                {getStatusBadge(checks.firestore)}
              </div>
              {errors.firestore && (
                <div className="ml-8 text-sm text-destructive">{errors.firestore}</div>
              )}

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  {getIcon(checks.storage)}
                  <span className="font-medium">Storage Service</span>
                </div>
                {getStatusBadge(checks.storage)}
              </div>
              {errors.storage && (
                <div className="ml-8 text-sm text-destructive">{errors.storage}</div>
              )}
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Next Steps if Checks Fail:</h4>
              <ol className="list-decimal ml-5 space-y-2 text-sm">
                <li>Verify Firebase Console credentials match the secrets in Replit</li>
                <li>Enable Email/Password authentication in Firebase Console → Authentication → Sign-in method</li>
                <li>Create Firestore Database in Firebase Console → Firestore Database (start in test mode)</li>
                <li>Enable Firebase Storage in Firebase Console → Storage</li>
                <li>Check Firestore security rules allow read/write access</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
