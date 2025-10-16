import { useQuery, useMutation } from "@tanstack/react-query";
import { collection, query, where, orderBy, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Notification } from "@shared/schema";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, TrendingUp, Award, Clock } from "lucide-react";
import { getRelativeTime } from "@/utils/formatters";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";

export default function NotificationsPage() {
  const { userData } = useAuth();

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", userData?.id],
    queryFn: async () => {
      if (!userData?.id) return [];
      
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", userData.id),
        orderBy("timestamp", "desc")
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Notification));
    },
    enabled: !!userData?.id,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications?.filter(n => !n.read) || [];
      await Promise.all(
        unread.map(n => updateDoc(doc(db, "notifications", n.id), { read: true }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "outbid":
        return <TrendingUp className="w-5 h-5 text-destructive" />;
      case "won":
        return <Award className="w-5 h-5 text-primary" />;
      case "sold":
        return <Award className="w-5 h-5 text-primary" />;
      case "new_bid":
        return <TrendingUp className="w-5 h-5 text-primary" />;
      case "auction_ending":
        return <Clock className="w-5 h-5 text-destructive" />;
      default:
        return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="gap-2"
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all as read
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : notifications && notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.map(notification => (
              <Link
                key={notification.id}
                href={notification.auctionId ? `/auction/${notification.auctionId}` : "#"}
              >
                <Card
                  className={`p-4 hover-elevate active-elevate-2 cursor-pointer ${
                    !notification.read ? "border-primary/50 bg-primary/5" : ""
                  }`}
                  onClick={() => {
                    if (!notification.read) {
                      markAsReadMutation.mutate(notification.id);
                    }
                  }}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-sm">{notification.title}</h3>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        {getRelativeTime(notification.timestamp)}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Bell className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No notifications yet</h3>
            <p className="text-muted-foreground">
              You'll see updates about your auctions and bids here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
