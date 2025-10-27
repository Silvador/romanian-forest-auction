// React & Hooks
import { useMemo } from "react";

// Query & Context
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

// Custom Hooks
import { useMarketFilters } from "@/hooks/useMarketFilters";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MarketFiltersPanel } from "@/components/market/MarketFiltersPanel";

// Phase 2 Chart Components
import { DiameterClassChart } from "@/components/market/DiameterClassChart";
import { TreatmentTypeChart } from "@/components/market/TreatmentTypeChart";
import { VolumeVsPriceScatter } from "@/components/market/VolumeVsPriceScatter";
import { SeasonalTrendsChart } from "@/components/market/SeasonalTrendsChart";

// Phase 3 Components
import { MarketInsights } from "@/components/market/MarketInsights";
import { PriceAlerts } from "@/components/market/PriceAlerts";
import { MarketPrediction } from "@/components/market/MarketPrediction";

// Icons
import { TrendingUp, Package, DollarSign, BarChart3 } from "lucide-react";

// Utils & Formatters
import { formatPricePerM3, formatVolume } from "@/utils/formatters";

// Charts
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

interface DiameterClassStats {
  label: string;
  auctionCount: number;
  avgPricePerM3: number;
  totalVolume: number;
  minPricePerM3?: number;
  maxPricePerM3?: number;
  medianPricePerM3?: number;
  volumePercentage?: number;
}

interface TreatmentTypeStats {
  treatmentType: string;
  auctionCount: number;
  totalVolume: number;
  avgPricePerM3: number;
  volumePercentage?: number;
}

interface ScatterPoint {
  volume: number;
  pricePerM3: number;
  species: string;
  region: string;
  diameter?: number;
  treatmentType?: string;
}

interface MarketAnalytics {
  stats: {
    totalVolume: number;
    avgMarketPrice: number;
    mostPopularSpecies: string;
    totalAuctions: number;
  };
  priceTrendsBySpecies: Record<string, { date: string; pricePerM3: number; count: number }[]>;
  volumeBySpecies: Record<string, number>;
  avgPriceByRegion: { region: string; avgPricePerM3: number }[];
  // Phase 2 analytics
  diameterClasses?: Record<string, DiameterClassStats>;
  treatmentTypes?: Record<string, TreatmentTypeStats>;
  scatterData?: ScatterPoint[];
}

export default function MarketPage() {
  const { currentUser } = useAuth();

  // Fetch market analytics data
  const { data: analytics, isLoading } = useQuery<MarketAnalytics>({
    queryKey: ["/api/market/analytics"],
    queryFn: async () => {
      if (!currentUser) throw new Error("Not authenticated");
      const token = await currentUser.getIdToken();
      const response = await fetch("/api/market/analytics", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch market analytics");
      return response.json();
    },
    enabled: !!currentUser,
    refetchInterval: 60000, // Poll every 60 seconds for real-time market updates
  });

  // Apply filters using custom hook
  const {
    filters,
    setFilters,
    filteredData,
    resetFilters,
    hasActiveFilters,
  } = useMarketFilters(analytics);

  // Use filtered data if available, otherwise fall back to original
  const displayData = filteredData || analytics;

  // Memoize chart data preparation for performance
  const chartData = useMemo(() => {
    if (!displayData) return null;

    // Species colors for consistent visualization
    const speciesColors: Record<string, string> = {
      // Hardwood species (Foioase) - earth tones and browns
      "Stejar pedunculat": "#8B4513",
      "Stejar brumăriu": "#704214",
      "Gorun": "#A0522D",
      "Cer": "#8B7355",
      "Fag": "#D2691E",
      "Carpen": "#BDB76B",
      "Frasin": "#DEB887",
      "Jugastru": "#CD853F",
      "Paltin de câmp": "#FFD700",
      "Paltin de munte": "#DAA520",
      "Tei argintiu": "#C0C0C0",
      "Tei cu frunze mari": "#B0B0B0",
      "Ulm de câmp": "#8FBC8F",
      "Ulm de munte": "#6B8E23",
      "Anin alb": "#F5F5DC",
      "Anin negru": "#2C1810",
      "Mesteacăn": "#FFFAF0",
      "Plop tremurător": "#98FB98",
      "Plop alb": "#F0FFF0",
      "Plop negru": "#556B2F",
      "Salcie albă": "#E0EEE0",
      "Salcâm": "#ADFF2F",
      "Cireș sălbatic": "#DC143C",
      "Măr sălbatic": "#90EE90",
      "Păr sălbatic": "#9ACD32",
      "Sorb de munte": "#FF6347",
      "Nuc": "#8B7765",
      "Castanul": "#654321",

      // Coniferous species (Răşinoase) - greens
      "Molid": "#228B22",
      "Brad": "#006400",
      "Pin silvestru": "#32CD32",
      "Pin negru": "#2F4F2F",
      "Larice": "#7CFC00",
      "Zâmbru": "#008000",
      "Tisă": "#013220",

      // Other
      "Altele": "#808080",
    };

    // Price trends chart data
    const priceTrendsData = Object.entries(displayData.priceTrendsBySpecies)
      .flatMap(([species, trends]) =>
        trends.map(t => ({
          date: t.date,
          species,
          pricePerM3: typeof t.pricePerM3 === 'number' ? parseFloat(t.pricePerM3.toFixed(2)) : parseFloat(t.pricePerM3 || 0)
        }))
      )
      .reduce((acc, item) => {
        const existing = acc.find(d => d.date === item.date);
        if (existing) {
          existing[item.species] = item.pricePerM3;
        } else {
          acc.push({ date: item.date, [item.species]: item.pricePerM3 });
        }
        return acc;
      }, [] as any[])
      .sort((a, b) => a.date.localeCompare(b.date));

    // Volume by species chart data
    const volumeData = Object.entries(displayData.volumeBySpecies)
      .map(([species, volume]) => ({
        species,
        volume: parseFloat(volume.toFixed(2))
      }))
      .sort((a, b) => b.volume - a.volume);

    // Regional price chart data
    const regionalData = displayData.avgPriceByRegion
      .map(r => ({
        region: r.region,
        avgPricePerM3: typeof r.avgPricePerM3 === 'number' ? parseFloat(r.avgPricePerM3.toFixed(2)) : parseFloat(r.avgPricePerM3 || 0)
      }))
      .sort((a, b) => b.avgPricePerM3 - a.avgPricePerM3);

    return {
      priceTrendsData,
      volumeData,
      regionalData,
      speciesColors,
      availableSpecies: Object.keys(displayData.priceTrendsBySpecies)
    };
  }, [displayData]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 pb-24">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  // No data state
  if (!displayData || !chartData) {
    return (
      <div className="min-h-screen bg-background p-4 pb-24">
        <div className="max-w-7xl mx-auto">
          <p className="text-muted-foreground">No market data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Market Dashboard</h1>
          <p className="text-muted-foreground">Timber market insights and analytics</p>
        </div>

        {/* Sticky Filter Bar with smooth transitions */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border pb-4 transition-all duration-200 ease-out">
          <MarketFiltersPanel
            filters={filters}
            setFilters={setFilters}
            onResetFilters={resetFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </div>

        {/* Stats Cards with animation on filter change */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-200 ease-out">
          <Card data-testid="card-total-volume">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Volume Sold</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatVolume(displayData.stats.totalVolume)}</div>
              <p className="text-xs text-muted-foreground mt-1">Cubic meters</p>
            </CardContent>
          </Card>

          <Card data-testid="card-avg-price">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Market Price</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPricePerM3(displayData.stats.avgMarketPrice)}</div>
              <p className="text-xs text-muted-foreground mt-1">Per cubic meter</p>
            </CardContent>
          </Card>

          <Card data-testid="card-popular-species">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Popular Species</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayData.stats.mostPopularSpecies}</div>
              <p className="text-xs text-muted-foreground mt-1">Leading timber type</p>
            </CardContent>
          </Card>

          <Card data-testid="card-total-auctions">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Auctions</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayData.stats.totalAuctions}</div>
              <p className="text-xs text-muted-foreground mt-1">Total sold</p>
            </CardContent>
          </Card>
        </div>

        {/* Price Trends Chart */}
        <Card data-testid="card-price-trends" className="transition-all duration-200 ease-out">
          <CardHeader>
            <CardTitle>Price Trends by Species</CardTitle>
            <p className="text-sm text-muted-foreground">
              €/m³ over selected time period
              {hasActiveFilters && " (filtered)"}
            </p>
          </CardHeader>
          <CardContent>
            {chartData.priceTrendsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData.priceTrendsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem"
                    }}
                  />
                  <Legend />
                  {chartData.availableSpecies.map((species) => (
                    <Line
                      key={species}
                      type="monotone"
                      dataKey={species}
                      stroke={chartData.speciesColors[species as keyof typeof chartData.speciesColors] || "#8884d8"}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <p className="text-sm">No price trend data available</p>
                  <p className="text-xs mt-2">Data will appear once auctions are completed</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Volume by Species Chart */}
        {chartData.volumeData.length > 0 && (
          <Card data-testid="card-volume-species" className="transition-all duration-200 ease-out">
            <CardHeader>
              <CardTitle>Volume Sold by Species</CardTitle>
              <p className="text-sm text-muted-foreground">
                Total volume in m³
                {hasActiveFilters && " (filtered)"}
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.volumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="species"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem"
                    }}
                  />
                  <Bar dataKey="volume" fill="#8BC34A" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Regional Price Comparison */}
        {chartData.regionalData.length > 0 && (
          <Card data-testid="card-regional-price" className="transition-all duration-200 ease-out">
            <CardHeader>
              <CardTitle>Regional Price Comparison</CardTitle>
              <p className="text-sm text-muted-foreground">
                Average price per m³ by region
                {hasActiveFilters && " (filtered)"}
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.regionalData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    type="number"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    dataKey="region"
                    type="category"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem"
                    }}
                  />
                  <Bar dataKey="avgPricePerM3" fill="#8BC34A" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* PHASE 2 CHARTS */}

        {/* Diameter Class Analysis */}
        {displayData.diameterClasses && Object.keys(displayData.diameterClasses).length > 0 && (
          <DiameterClassChart
            diameterClasses={displayData.diameterClasses}
            hasActiveFilters={hasActiveFilters}
          />
        )}

        {/* Treatment Type Breakdown */}
        {displayData.treatmentTypes && Object.keys(displayData.treatmentTypes).length > 0 && (
          <TreatmentTypeChart
            treatmentTypes={displayData.treatmentTypes}
            hasActiveFilters={hasActiveFilters}
          />
        )}

        {/* Volume vs Price Scatter Plot */}
        {displayData.scatterData && displayData.scatterData.length > 0 && (
          <VolumeVsPriceScatter
            scatterData={displayData.scatterData}
            hasActiveFilters={hasActiveFilters}
          />
        )}

        {/* Seasonal Trends */}
        {displayData.priceTrendsBySpecies && Object.keys(displayData.priceTrendsBySpecies).length > 0 && (
          <SeasonalTrendsChart
            priceTrendsBySpecies={displayData.priceTrendsBySpecies}
            hasActiveFilters={hasActiveFilters}
          />
        )}

        {/* PHASE 3: MARKET INSIGHTS */}
        {displayData && (
          <MarketInsights
            analytics={displayData}
            hasActiveFilters={hasActiveFilters}
          />
        )}

        {/* PHASE 3: PRICE ALERTS */}
        <PriceAlerts hasActiveFilters={hasActiveFilters} />

        {/* PHASE 3: MARKET PREDICTION */}
        {displayData.priceTrendsBySpecies && Object.keys(displayData.priceTrendsBySpecies).length > 0 && (
          <MarketPrediction
            priceTrendsBySpecies={displayData.priceTrendsBySpecies}
            hasActiveFilters={hasActiveFilters}
          />
        )}

        {/* Empty state when filters return no results */}
        {hasActiveFilters && chartData.volumeData.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">
              No data matches your current filters. Try adjusting your selection.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
