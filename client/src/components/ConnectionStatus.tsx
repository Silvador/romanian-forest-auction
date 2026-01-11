import { useWebSocket } from "@/hooks/useWebSocket";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";

export function ConnectionStatus() {
  const { connected } = useWebSocket();

  if (connected) {
    return (
      <Badge variant="outline" className="flex items-center gap-2 bg-green-50 text-green-700 border-green-200">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <Wifi className="w-3 h-3" />
        <span className="font-semibold">LIVE</span>
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="flex items-center gap-2 bg-yellow-50 text-yellow-700 border-yellow-200">
      <WifiOff className="w-3 h-3" />
      <span>Connecting...</span>
    </Badge>
  );
}

export function ConnectionStatusInline() {
  const { connected } = useWebSocket();

  if (connected) {
    return (
      <div className="inline-flex items-center gap-2 text-sm text-green-600">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="font-medium">LIVE</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 text-sm text-yellow-600">
      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
      <span>Connecting...</span>
    </div>
  );
}
