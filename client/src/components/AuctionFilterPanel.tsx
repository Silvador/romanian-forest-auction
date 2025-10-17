import { useState } from "react";
import { AuctionFilters, SortOption, regions, speciesTypes } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Filter, X, ArrowUpDown } from "lucide-react";

interface AuctionFilterPanelProps {
  filters: AuctionFilters;
  onFiltersChange: (filters: AuctionFilters) => void;
  totalCount: number;
  filteredCount: number;
}

export function AuctionFilterPanel({ filters, onFiltersChange, totalCount, filteredCount }: AuctionFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = (key: keyof AuctionFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'sortBy') return false; // Don't count sort as a filter
    return value !== undefined && value !== '';
  }).length;

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "endTime", label: "Ending Soon" },
    { value: "volumeDesc", label: "Volume (High to Low)" },
    { value: "volumeAsc", label: "Volume (Low to High)" },
    { value: "priceDesc", label: "Price (High to Low)" },
    { value: "priceAsc", label: "Price (Low to High)" },
  ];

  return (
    <div className="space-y-3">
      {/* Sort Control - Always Visible */}
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium whitespace-nowrap">Sort by:</Label>
        <Select
          value={filters.sortBy || "endTime"}
          onValueChange={(value) => updateFilter('sortBy', value as SortOption)}
        >
          <SelectTrigger className="w-[200px]" data-testid="select-sort">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filter Panel */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <CardTitle className="text-base">Filters</CardTitle>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterCount}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-8 text-xs"
                    data-testid="button-clear-all"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Clear All
                  </Button>
                )}
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
            {!isOpen && activeFilterCount > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Showing {filteredCount} of {totalCount} auctions
              </p>
            )}
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {/* Region and Species */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="filter-region">Region</Label>
                  <Select
                    value={filters.region || "all"}
                    onValueChange={(value) => updateFilter('region', value === "all" ? undefined : value)}
                  >
                    <SelectTrigger id="filter-region" data-testid="filter-region">
                      <SelectValue placeholder="All Regions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Regions</SelectItem>
                      {regions.map(region => (
                        <SelectItem key={region} value={region}>{region}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filter-species">Species</Label>
                  <Select
                    value={filters.species || "all"}
                    onValueChange={(value) => updateFilter('species', value === "all" ? undefined : value)}
                  >
                    <SelectTrigger id="filter-species" data-testid="filter-species">
                      <SelectValue placeholder="All Species" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Species</SelectItem>
                      {speciesTypes.map(species => (
                        <SelectItem key={species} value={species}>{species}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Treatment Type */}
              <div className="space-y-2">
                <Label htmlFor="filter-treatment">Treatment/Cutting Type</Label>
                <Input
                  id="filter-treatment"
                  placeholder="e.g., PRODUSE ACCIDENTALE, TĂIERI FINALE"
                  value={filters.treatmentType || ""}
                  onChange={(e) => updateFilter('treatmentType', e.target.value || undefined)}
                  data-testid="filter-treatment"
                />
                <p className="text-xs text-muted-foreground">
                  Search for specific treatment types from APV permit
                </p>
              </div>

              {/* Volume Range */}
              <div className="space-y-2">
                <Label>Volume (m³)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters.minVolume || ""}
                      onChange={(e) => updateFilter('minVolume', e.target.value ? parseFloat(e.target.value) : undefined)}
                      data-testid="filter-min-volume"
                    />
                  </div>
                  <div className="space-y-1">
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.maxVolume || ""}
                      onChange={(e) => updateFilter('maxVolume', e.target.value ? parseFloat(e.target.value) : undefined)}
                      data-testid="filter-max-volume"
                    />
                  </div>
                </div>
              </div>

              {/* Diameter Range */}
              <div className="space-y-2">
                <Label>Average Diameter (cm)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters.minDiameter || ""}
                      onChange={(e) => updateFilter('minDiameter', e.target.value ? parseFloat(e.target.value) : undefined)}
                      data-testid="filter-min-diameter"
                    />
                  </div>
                  <div className="space-y-1">
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.maxDiameter || ""}
                      onChange={(e) => updateFilter('maxDiameter', e.target.value ? parseFloat(e.target.value) : undefined)}
                      data-testid="filter-max-diameter"
                    />
                  </div>
                </div>
              </div>

              {/* Price Range */}
              <div className="space-y-2">
                <Label>Price per m³ (€)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters.minPrice || ""}
                      onChange={(e) => updateFilter('minPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                      data-testid="filter-min-price"
                    />
                  </div>
                  <div className="space-y-1">
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.maxPrice || ""}
                      onChange={(e) => updateFilter('maxPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                      data-testid="filter-max-price"
                    />
                  </div>
                </div>
              </div>

              {/* Results Summary */}
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing <strong>{filteredCount}</strong> of <strong>{totalCount}</strong> auctions
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
