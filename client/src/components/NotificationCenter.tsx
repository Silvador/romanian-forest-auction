import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, TrendingDown, Trophy, DollarSign, Gavel, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { Notification } from "@shared/schema";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNotificationUpdates, useWebSocket } from "@/hooks/useWebSocket";

export function NotificationCenter() {
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const previousNotificationIds = useRef<Set<string>>(new Set());

  const { connected } = useWebSocket();
  const { onNotificationNew } = useNotificationUpdates();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      if (!currentUser) throw new Error("Not authenticated");
      const token = await currentUser.getIdToken();
      const response = await fetch("/api/notifications", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch notifications");
      return response.json();
    },
    enabled: !!currentUser,
    // Removed refetchInterval - using WebSocket for real-time updates
    refetchInterval: connected ? false : 30000,
  });

  // ===== WEBSOCKET REAL-TIME NOTIFICATION UPDATES =====
  useEffect(() => {
    const cleanup = onNotificationNew((notification) => {
      console.log('[WebSocket] New notification:', notification);

      // Add new notification to cache
      queryClient.setQueryData(['/api/notifications'], (old: Notification[] | undefined) => {
        const newNotification: Notification = {
          id: String(notification.id),
          userId: '', // Will be filled by backend
          type: notification.type,
          title: notification.title,
          message: notification.message,
          auctionId: notification.auctionId ? String(notification.auctionId) : undefined,
          read: notification.isRead,
          timestamp: notification.timestamp,
        };

        return [newNotification, ...(old || [])];
      });

      // Show toast notification
      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.type === "won" ? "default" : notification.type === "outbid" ? "destructive" : "default",
      });
    });

    return cleanup;
  }, [onNotificationNew, toast]);

  // Show toast for new notifications
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    const newNotifications = notifications.filter(
      n => !previousNotificationIds.current.has(n.id) && !n.read
    );

    newNotifications.forEach(notification => {
      previousNotificationIds.current.add(notification.id);
      
      // Show toast for new unread notifications
      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.type === "won" ? "default" : notification.type === "outbid" ? "destructive" : "default",
      });
    });
  }, [notifications, toast]);

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!currentUser) throw new Error("Not authenticated");
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if (!response.ok) throw new Error("Failed to mark notification as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.auctionId) {
      window.location.href = `/auction/${notification.auctionId}`;
    }
    setOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    const iconClass = "h-5 w-5";
    switch (type) {
      case "outbid":
        return <TrendingDown className={iconClass} />;
      case "won":
        return <Trophy className={iconClass} />;
      case "sold":
        return <DollarSign className={iconClass} />;
      case "new_bid":
        return <Gavel className={iconClass} />;
      case "auction_ending":
        return <Clock className={iconClass} />;
      default:
        return <Bell className={iconClass} />;
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              data-testid="badge-unread-count"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`cursor-pointer p-4 ${!notification.read ? "bg-accent/50" : ""}`}
                onClick={() => handleNotificationClick(notification)}
                data-testid={`notification-${notification.id}`}
              >
                <div className="flex gap-3 w-full">
                  <div className="text-2xl flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm">{notification.title}</h4>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
