import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { TreePine } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-primary/10 rounded-lg flex items-center justify-center">
            <TreePine className="w-12 h-12 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-6xl font-bold">404</h1>
          <h2 className="text-2xl font-semibold">Page not found</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <Link href="/">
          <Button size="lg">Back to Auctions</Button>
        </Link>
      </div>
    </div>
  );
}
