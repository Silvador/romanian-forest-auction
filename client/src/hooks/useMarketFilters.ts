import { useState, useMemo, useEffect } from "react";
import { speciesTypes, regions } from "@shared/schema";

// Type-safe filter types inferred from schema
export type Species = typeof speciesTypes[number];
export type Region = typeof regions[number];
export type DateRange = "7d" | "30d" | "90d" | "1y" | "all";

export interface MarketFilters {
  species: Species[];
  regions: Region[];
  minVolume?: number;
  maxVolume?: number;
  minPrice?: number;
  maxPrice?: number;
  dateRange: DateRange;
}

interface MarketAnalyticsData {
  stats: {
    totalVolume: number;
    avgMarketPrice: number;
    mostPopularSpecies: string;
    totalAuctions: number;
  };
  priceTrendsBySpecies: Record<string, { date: string; pricePerM3: number; count: number }[]>;
  volumeBySpecies: Record<string, number>;
  avgPriceByRegion: { region: string; avgPricePerM3: number }[];
}

const STORAGE_KEY = "market_filters_preset";
const DEFAULT_FILTERS: MarketFilters = {
  species: [],
  regions: [],
  dateRange: "30d",
};

export function useMarketFilters(analytics: MarketAnalyticsData | undefined) {
  const [filters, setFilters] = useState<MarketFilters>(() => {
    // Load saved preferences from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_FILTERS, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error("Failed to load filter preferences:", error);
    }
    return DEFAULT_FILTERS;
  });

  // Save filter preferences to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
      console.error("Failed to save filter preferences:", error);
    }
  }, [filters]);

  // Filtered data based on current filters
  const filteredData = useMemo(() => {
    if (!analytics) return null;

    const { species: selectedSpecies, regions: selectedRegions, dateRange, minVolume, maxVolume, minPrice, maxPrice } = filters;

    // Calculate date threshold based on range
    const getDateThreshold = (range: DateRange): number => {
      const now = Date.now();
      switch (range) {
        case "7d": return now - (7 * 24 * 60 * 60 * 1000);
        case "30d": return now - (30 * 24 * 60 * 60 * 1000);
        case "90d": return now - (90 * 24 * 60 * 60 * 1000);
        case "1y": return now - (365 * 24 * 60 * 60 * 1000);
        case "all": return 0;
        default: return now - (30 * 24 * 60 * 60 * 1000);
      }
    };

    const dateThreshold = getDateThreshold(dateRange);

    // Filter price trends by species
    let filteredPriceTrends = { ...analytics.priceTrendsBySpecies };
    if (selectedSpecies.length > 0) {
      filteredPriceTrends = Object.fromEntries(
        Object.entries(analytics.priceTrendsBySpecies).filter(([species]) =>
          selectedSpecies.includes(species as Species)
        )
      );
    }

    // Filter by date range
    filteredPriceTrends = Object.fromEntries(
      Object.entries(filteredPriceTrends).map(([species, trends]) => [
        species,
        trends.filter(t => new Date(t.date).getTime() >= dateThreshold)
      ])
    );

    // Filter volume by species
    let filteredVolumeBySpecies = { ...analytics.volumeBySpecies };
    if (selectedSpecies.length > 0) {
      filteredVolumeBySpecies = Object.fromEntries(
        Object.entries(analytics.volumeBySpecies).filter(([species]) =>
          selectedSpecies.includes(species as Species)
        )
      );
    }

    // Apply volume filters
    if (minVolume !== undefined || maxVolume !== undefined) {
      filteredVolumeBySpecies = Object.fromEntries(
        Object.entries(filteredVolumeBySpecies).filter(([_, volume]) => {
          if (minVolume !== undefined && volume < minVolume) return false;
          if (maxVolume !== undefined && volume > maxVolume) return false;
          return true;
        })
      );
    }

    // Filter regional prices
    let filteredRegionalPrices = [...analytics.avgPriceByRegion];
    if (selectedRegions.length > 0) {
      filteredRegionalPrices = analytics.avgPriceByRegion.filter(item =>
        selectedRegions.includes(item.region as Region)
      );
    }

    // Apply price filters
    if (minPrice !== undefined || maxPrice !== undefined) {
      filteredRegionalPrices = filteredRegionalPrices.filter(item => {
        if (minPrice !== undefined && item.avgPricePerM3 < minPrice) return false;
        if (maxPrice !== undefined && item.avgPricePerM3 > maxPrice) return false;
        return true;
      });
    }

    // Recalculate stats based on filtered data
    const filteredSpeciesVolumes = Object.values(filteredVolumeBySpecies);
    const totalVolume = filteredSpeciesVolumes.reduce((sum, vol) => sum + vol, 0);

    const regionalPrices = filteredRegionalPrices.map(r => r.avgPricePerM3);
    const avgMarketPrice = regionalPrices.length > 0
      ? regionalPrices.reduce((sum, p) => sum + p, 0) / regionalPrices.length
      : 0;

    const mostPopularSpecies = Object.entries(filteredVolumeBySpecies)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || "N/A";

    return {
      stats: {
        totalVolume,
        avgMarketPrice,
        mostPopularSpecies,
        totalAuctions: analytics.stats.totalAuctions, // Keep original count
      },
      priceTrendsBySpecies: filteredPriceTrends,
      volumeBySpecies: filteredVolumeBySpecies,
      avgPriceByRegion: filteredRegionalPrices,
    };
  }, [analytics, filters]);

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.species.length > 0 ||
      filters.regions.length > 0 ||
      filters.minVolume !== undefined ||
      filters.maxVolume !== undefined ||
      filters.minPrice !== undefined ||
      filters.maxPrice !== undefined ||
      filters.dateRange !== "30d"
    );
  }, [filters]);

  // Placeholder for future URL sync feature
  const syncFiltersToURL = (filters: MarketFilters) => {
    // TODO: Implement URL param syncing
    // const params = new URLSearchParams();
    // if (filters.species.length > 0) params.set('species', filters.species.join(','));
    // etc...
  };

  return {
    filters,
    setFilters,
    filteredData,
    resetFilters,
    hasActiveFilters,
    syncFiltersToURL,
  };
}
