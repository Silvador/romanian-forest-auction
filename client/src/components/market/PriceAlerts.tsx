import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/queryClient";
import { PriceAlert } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bell, BellOff, Trash2, Plus, TrendingDown, TrendingUp, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { speciesTypes, regions } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface PriceAlertsProps {
  hasActiveFilters?: boolean;
}

export function PriceAlerts({ hasActiveFilters }: PriceAlertsProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [alertForm, setAlertForm] = useState({
    species: "",
    region: "",
    alertType: "price_below" as "price_below" | "price_above" | "volume_threshold",
    threshold: "",
  });

  // Fetch user's alerts
  const { data: alerts = [], isLoading } = useQuery<PriceAlert[]>({
    queryKey: ["/api/market/alerts"],
    queryFn: async () => {
      if (!currentUser) throw new Error("Not authenticated");
      const token = await currentUser.getIdToken();
      const response = await fetch("/api/market/alerts", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch alerts");
      return response.json();
    },
    enabled: !!currentUser,
  });

  // Create alert mutation
  const createAlertMutation = useMutation({
    mutationFn: async (alertData: any) => {
      if (!currentUser) throw new Error("Not authenticated");
      const token = await currentUser.getIdToken();
      const response = await fetch("/api/market/alerts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(alertData)
      });
      if (!response.ok) throw new Error("Failed to create alert");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/market/alerts"] });
      toast({
        title: "Alert created",
        description: "You'll be notified when the condition is met.",
      });
      setAlertForm({
        species: "",
        region: "",
        alertType: "price_below",
        threshold: "",
      });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create alert",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle alert active status
  const toggleAlertMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      if (!currentUser) throw new Error("Not authenticated");
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/market/alerts/${id}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ active })
      });
      if (!response.ok) throw new Error("Failed to update alert");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/market/alerts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update alert",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete alert mutation
  const deleteAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      if (!currentUser) throw new Error("Not authenticated");
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/market/alerts/${alertId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        }
      });
      if (!response.ok) throw new Error("Failed to delete alert");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/market/alerts"] });
      toast({
        title: "Alert deleted",
        description: "Price alert has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete alert",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateAlert = () => {
    if (!alertForm.threshold) {
      toast({
        title: "Threshold required",
        description: "Please enter a threshold value.",
        variant: "destructive",
      });
      return;
    }

    const alertData: any = {
      alertType: alertForm.alertType,
      threshold: parseFloat(alertForm.threshold),
      active: true,
    };

    if (alertForm.species) alertData.species = alertForm.species;
    if (alertForm.region) alertData.region = alertForm.region;

    createAlertMutation.mutate(alertData);
  };

  const handleToggleAlert = (alert: PriceAlert) => {
    toggleAlertMutation.mutate({ id: alert.id, active: !alert.active });
  };

  const handleDeleteAlert = (alertId: string) => {
    if (window.confirm("Are you sure you want to delete this alert?")) {
      deleteAlertMutation.mutate(alertId);
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case "price_below": return "Price Below";
      case "price_above": return "Price Above";
      case "volume_threshold": return "Volume Above";
      default: return type;
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case "price_below": return <TrendingDown className="h-4 w-4" />;
      case "price_above": return <TrendingUp className="h-4 w-4" />;
      case "volume_threshold": return <Activity className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const formatAlertDescription = (alert: PriceAlert) => {
    const parts = [];
    if (alert.species) parts.push(alert.species);
    if (alert.region) parts.push(alert.region);

    const location = parts.length > 0 ? parts.join(" in ") : "Any timber";
    const unit = alert.alertType === "volume_threshold" ? "m³" : "€/m³";

    return `${location} - ${getAlertTypeLabel(alert.alertType)} ${alert.threshold}${unit}`;
  };

  const activeAlerts = alerts.filter(a => a.active);
  const inactiveAlerts = alerts.filter(a => !a.active);

  return (
    <Card data-testid="card-price-alerts" className="transition-all duration-200 ease-out">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Price Alerts
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Get notified when market conditions match your criteria
              {hasActiveFilters && " (filtered view)"}
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                New Alert
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Price Alert</DialogTitle>
                <DialogDescription>
                  Set up an alert to notify you when market conditions are met
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="alert-type">Alert Type</Label>
                  <Select
                    value={alertForm.alertType}
                    onValueChange={(value: any) => setAlertForm({ ...alertForm, alertType: value })}
                  >
                    <SelectTrigger id="alert-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="price_below">Price Falls Below</SelectItem>
                      <SelectItem value="price_above">Price Rises Above</SelectItem>
                      <SelectItem value="volume_threshold">Volume Exceeds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="threshold">
                    Threshold ({alertForm.alertType === "volume_threshold" ? "m³" : "€/m³"})
                  </Label>
                  <Input
                    id="threshold"
                    type="number"
                    placeholder="Enter threshold value"
                    value={alertForm.threshold}
                    onChange={(e) => setAlertForm({ ...alertForm, threshold: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alert-species">Species (Optional)</Label>
                  <Select
                    value={alertForm.species || "all"}
                    onValueChange={(value) => setAlertForm({ ...alertForm, species: value === "all" ? "" : value })}
                  >
                    <SelectTrigger id="alert-species">
                      <SelectValue placeholder="Any species" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any species</SelectItem>
                      {speciesTypes.map(species => (
                        <SelectItem key={species} value={species}>{species}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alert-region">Region (Optional)</Label>
                  <Select
                    value={alertForm.region || "all"}
                    onValueChange={(value) => setAlertForm({ ...alertForm, region: value === "all" ? "" : value })}
                  >
                    <SelectTrigger id="alert-region">
                      <SelectValue placeholder="Any region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any region</SelectItem>
                      {regions.map(region => (
                        <SelectItem key={region} value={region}>{region}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAlert} disabled={createAlertMutation.isPending}>
                  {createAlertMutation.isPending ? "Creating..." : "Create Alert"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading alerts...</p>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              No price alerts set up yet. Create your first alert to stay informed about market changes.
            </p>
            <Button onClick={() => setIsDialogOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Create First Alert
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active Alerts */}
            {activeAlerts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Bell className="h-4 w-4 text-green-600" />
                  Active Alerts ({activeAlerts.length})
                </h4>
                <div className="space-y-2">
                  {activeAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="text-green-600">
                          {getAlertTypeIcon(alert.alertType)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{formatAlertDescription(alert)}</p>
                          <p className="text-xs text-muted-foreground">
                            Created {formatDistanceToNow(alert.createdAt, { addSuffix: true })}
                            {alert.lastTriggered && ` • Last triggered ${formatDistanceToNow(alert.lastTriggered, { addSuffix: true })}`}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {getAlertTypeLabel(alert.alertType)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Switch
                          checked={alert.active}
                          onCheckedChange={() => handleToggleAlert(alert)}
                          aria-label="Toggle alert"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAlert(alert.id)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inactive Alerts */}
            {inactiveAlerts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                  Inactive Alerts ({inactiveAlerts.length})
                </h4>
                <div className="space-y-2">
                  {inactiveAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3 flex-1 opacity-60">
                        <div className="text-muted-foreground">
                          {getAlertTypeIcon(alert.alertType)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{formatAlertDescription(alert)}</p>
                          <p className="text-xs text-muted-foreground">
                            Created {formatDistanceToNow(alert.createdAt, { addSuffix: true })}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {getAlertTypeLabel(alert.alertType)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Switch
                          checked={alert.active}
                          onCheckedChange={() => handleToggleAlert(alert)}
                          aria-label="Toggle alert"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAlert(alert.id)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Alerts are checked when new auctions are completed. You'll receive notifications through the app.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
