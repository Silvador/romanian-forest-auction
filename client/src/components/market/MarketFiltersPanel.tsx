import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Filter, X, RotateCcw } from "lucide-react";
import { speciesTypes, regions } from "@shared/schema";
import type { MarketFilters, Species, Region, DateRange } from "@/hooks/useMarketFilters";
import { FilterPresetsManager } from "./FilterPresetsManager";

interface MarketFiltersPanelProps {
  filters: MarketFilters;
  setFilters: (filters: MarketFilters | ((prev: MarketFilters) => MarketFilters)) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

export function MarketFiltersPanel({ filters, setFilters, onResetFilters, hasActiveFilters }: MarketFiltersPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSpecies = (species: Species) => {
    setFilters(prev => ({
      ...prev,
      species: prev.species.includes(species)
        ? prev.species.filter(s => s !== species)
        : [...prev.species, species]
    }));
  };

  const toggleRegion = (region: Region) => {
    setFilters(prev => ({
      ...prev,
      regions: prev.regions.includes(region)
        ? prev.regions.filter(r => r !== region)
        : [...prev.regions, region]
    }));
  };

  const updateDateRange = (range: DateRange) => {
    setFilters(prev => ({ ...prev, dateRange: range }));
  };

  const updateVolumeRange = (min?: number, max?: number) => {
    setFilters(prev => ({ ...prev, minVolume: min, maxVolume: max }));
  };

  const updatePriceRange = (min?: number, max?: number) => {
    setFilters(prev => ({ ...prev, minPrice: min, maxPrice: max }));
  };

  const removeSpeciesFilter = (species: Species) => {
    setFilters(prev => ({
      ...prev,
      species: prev.species.filter(s => s !== species)
    }));
  };

  const removeRegionFilter = (region: Region) => {
    setFilters(prev => ({
      ...prev,
      regions: prev.regions.filter(r => r !== region)
    }));
  };

  const dateRangeOptions: { value: DateRange; label: string }[] = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "1y", label: "Last year" },
    { value: "all", label: "All time" },
  ];

  return (
    <div className="space-y-3">
      {/* Filter trigger button and active filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2" data-testid="filter-toggle">
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {filters.species.length + filters.regions.length + (filters.minVolume !== undefined ? 1 : 0) + (filters.minPrice !== undefined ? 1 : 0)}
                </Badge>
              )}
            </Button>
          </SheetTrigger>

          <SheetContent side="left" className="w-[400px] sm:w-[540px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Market Filters</SheetTitle>
              <SheetDescription>
                Customize your market analytics view
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              {/* Date Range */}
              <div className="space-y-2">
                <Label htmlFor="date-range">Time Period</Label>
                <Select value={filters.dateRange} onValueChange={(value) => updateDateRange(value as DateRange)}>
                  <SelectTrigger id="date-range" data-testid="filter-date-range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dateRangeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Species Filter */}
              <div className="space-y-2">
                <Label>Species</Label>
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {speciesTypes.map(species => (
                        <div key={species} className="flex items-center space-x-2">
                          <Checkbox
                            id={`species-${species}`}
                            checked={filters.species.includes(species)}
                            onCheckedChange={() => toggleSpecies(species)}
                            data-testid={`filter-species-${species}`}
                          />
                          <label
                            htmlFor={`species-${species}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {species}
                          </label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Region Filter */}
              <div className="space-y-2">
                <Label>Regions</Label>
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {regions.map(region => (
                        <div key={region} className="flex items-center space-x-2">
                          <Checkbox
                            id={`region-${region}`}
                            checked={filters.regions.includes(region)}
                            onCheckedChange={() => toggleRegion(region)}
                            data-testid={`filter-region-${region}`}
                          />
                          <label
                            htmlFor={`region-${region}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {region}
                          </label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Volume Range */}
              <div className="space-y-2">
                <Label>Volume Range (m³)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters.minVolume || ""}
                      onChange={(e) => updateVolumeRange(e.target.value ? parseFloat(e.target.value) : undefined, filters.maxVolume)}
                      data-testid="filter-min-volume"
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.maxVolume || ""}
                      onChange={(e) => updateVolumeRange(filters.minVolume, e.target.value ? parseFloat(e.target.value) : undefined)}
                      data-testid="filter-max-volume"
                    />
                  </div>
                </div>
              </div>

              {/* Price Range */}
              <div className="space-y-2">
                <Label>Price Range (€/m³)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters.minPrice || ""}
                      onChange={(e) => updatePriceRange(e.target.value ? parseFloat(e.target.value) : undefined, filters.maxPrice)}
                      data-testid="filter-min-price"
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.maxPrice || ""}
                      onChange={(e) => updatePriceRange(filters.minPrice, e.target.value ? parseFloat(e.target.value) : undefined)}
                      data-testid="filter-max-price"
                    />
                  </div>
                </div>
              </div>

              {/* Filter Presets Manager */}
              <div className="pt-4 border-t">
                <FilterPresetsManager
                  currentFilters={filters}
                  onApplyPreset={(presetFilters) => {
                    setFilters(presetFilters);
                  }}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    onResetFilters();
                    setIsOpen(false);
                  }}
                  className="flex-1 gap-2"
                  disabled={!hasActiveFilters}
                  data-testid="filter-reset"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
                <Button
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                  data-testid="filter-apply"
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Active filter chips */}
        {filters.species.map(species => (
          <Badge key={species} variant="secondary" className="gap-1 transition-all duration-200">
            {species}
            <button
              onClick={() => removeSpeciesFilter(species)}
              className="ml-1 hover:bg-muted rounded-full p-0.5"
              data-testid={`remove-species-${species}`}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}

        {filters.regions.map(region => (
          <Badge key={region} variant="secondary" className="gap-1 transition-all duration-200">
            {region}
            <button
              onClick={() => removeRegionFilter(region)}
              className="ml-1 hover:bg-muted rounded-full p-0.5"
              data-testid={`remove-region-${region}`}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}

        {filters.minVolume !== undefined && (
          <Badge variant="secondary" className="gap-1 transition-all duration-200">
            Vol ≥ {filters.minVolume} m³
            <button
              onClick={() => updateVolumeRange(undefined, filters.maxVolume)}
              className="ml-1 hover:bg-muted rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        )}

        {filters.maxVolume !== undefined && (
          <Badge variant="secondary" className="gap-1 transition-all duration-200">
            Vol ≤ {filters.maxVolume} m³
            <button
              onClick={() => updateVolumeRange(filters.minVolume, undefined)}
              className="ml-1 hover:bg-muted rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        )}

        {filters.minPrice !== undefined && (
          <Badge variant="secondary" className="gap-1 transition-all duration-200">
            Price ≥ €{filters.minPrice}/m³
            <button
              onClick={() => updatePriceRange(undefined, filters.maxPrice)}
              className="ml-1 hover:bg-muted rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        )}

        {filters.maxPrice !== undefined && (
          <Badge variant="secondary" className="gap-1 transition-all duration-200">
            Price ≤ €{filters.maxPrice}/m³
            <button
              onClick={() => updatePriceRange(filters.minPrice, undefined)}
              className="ml-1 hover:bg-muted rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        )}

        {filters.dateRange !== "30d" && (
          <Badge variant="secondary" className="gap-1 transition-all duration-200">
            {dateRangeOptions.find(opt => opt.value === filters.dateRange)?.label}
            <button
              onClick={() => updateDateRange("30d")}
              className="ml-1 hover:bg-muted rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        )}

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="gap-1 text-xs"
            data-testid="clear-all-filters"
          >
            <X className="w-3 h-3" />
            Clear all
          </Button>
        )}
      </div>
    </div>
  );
}
