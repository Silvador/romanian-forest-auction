import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/queryClient";
import { WatchlistPreset } from "@shared/schema";
import { MarketFilters } from "@/hooks/useMarketFilters";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save, Star, Trash2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface FilterPresetsManagerProps {
  currentFilters: MarketFilters;
  onApplyPreset: (filters: MarketFilters) => void;
}

export function FilterPresetsManager({ currentFilters, onApplyPreset }: FilterPresetsManagerProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState("");

  // Fetch user's presets
  const { data: presets = [], isLoading } = useQuery<WatchlistPreset[]>({
    queryKey: ["/api/market/watchlist/presets"],
    queryFn: async () => {
      if (!currentUser) throw new Error("Not authenticated");
      const token = await currentUser.getIdToken();
      const response = await fetch("/api/market/watchlist/presets", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch presets");
      return response.json();
    },
    enabled: !!currentUser,
  });

  // Save preset mutation
  const savePresetMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!currentUser) throw new Error("Not authenticated");
      const token = await currentUser.getIdToken();
      const response = await fetch("/api/market/watchlist/presets", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          filters: currentFilters,
        })
      });
      if (!response.ok) throw new Error("Failed to save preset");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/market/watchlist/presets"] });
      toast({
        title: "Preset saved",
        description: `Filter preset "${presetName}" has been saved successfully.`,
      });
      setPresetName("");
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save preset",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete preset mutation
  const deletePresetMutation = useMutation({
    mutationFn: async (presetId: string) => {
      if (!currentUser) throw new Error("Not authenticated");
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/market/watchlist/presets/${presetId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        }
      });
      if (!response.ok) throw new Error("Failed to delete preset");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/market/watchlist/presets"] });
      toast({
        title: "Preset deleted",
        description: "Filter preset has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete preset",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update last used timestamp
  const updateLastUsedMutation = useMutation({
    mutationFn: async (presetId: string) => {
      if (!currentUser) throw new Error("Not authenticated");
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/market/watchlist/presets/${presetId}/use`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
        }
      });
      if (!response.ok) throw new Error("Failed to update preset");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/market/watchlist/presets"] });
    },
  });

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for this preset.",
        variant: "destructive",
      });
      return;
    }
    savePresetMutation.mutate(presetName);
  };

  const handleApplyPreset = (preset: WatchlistPreset) => {
    onApplyPreset(preset.filters);
    updateLastUsedMutation.mutate(preset.id);
    toast({
      title: "Preset applied",
      description: `Filters from "${preset.name}" have been applied.`,
    });
  };

  const handleDeletePreset = (presetId: string, presetName: string) => {
    if (window.confirm(`Are you sure you want to delete the preset "${presetName}"?`)) {
      deletePresetMutation.mutate(presetId);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Save className="h-4 w-4" />
              Save Preset
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Filter Preset</DialogTitle>
              <DialogDescription>
                Save your current filter settings for quick access later.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="preset-name">Preset Name</Label>
                <Input
                  id="preset-name"
                  placeholder="e.g., Stejar in Maramureș"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSavePreset();
                    }
                  }}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                Current filters:
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  {currentFilters.species.length > 0 && (
                    <li>Species: {currentFilters.species.join(", ")}</li>
                  )}
                  {currentFilters.regions.length > 0 && (
                    <li>Regions: {currentFilters.regions.join(", ")}</li>
                  )}
                  <li>Date Range: {currentFilters.dateRange}</li>
                  {currentFilters.minPrice && <li>Min Price: €{currentFilters.minPrice}/m³</li>}
                  {currentFilters.maxPrice && <li>Max Price: €{currentFilters.maxPrice}/m³</li>}
                  {currentFilters.minVolume && <li>Min Volume: {currentFilters.minVolume}m³</li>}
                  {currentFilters.maxVolume && <li>Max Volume: {currentFilters.maxVolume}m³</li>}
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePreset} disabled={savePresetMutation.isPending}>
                {savePresetMutation.isPending ? "Saving..." : "Save Preset"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Saved Presets */}
      {presets.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Star className="h-4 w-4" />
            Saved Presets
          </h4>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="group relative flex items-center gap-2 rounded-lg border bg-card p-2 hover:bg-accent transition-colors"
              >
                <button
                  onClick={() => handleApplyPreset(preset)}
                  className="flex items-center gap-2 text-sm"
                >
                  <Badge variant="secondary" className="gap-1">
                    {preset.name}
                  </Badge>
                  {preset.lastUsed && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(preset.lastUsed, { addSuffix: true })}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => handleDeletePreset(preset.id, preset.name)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                  aria-label="Delete preset"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading presets...</p>
      )}
    </div>
  );
}
