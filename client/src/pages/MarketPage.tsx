import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Package, DollarSign, BarChart3 } from "lucide-react";
import { formatPricePerM3, formatVolume } from "@/utils/formatters";

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
}

export default function MarketPage() {
  const { currentUser } = useAuth();

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 pb-24">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
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

  if (!analytics) {
    return (
      <div className="min-h-screen bg-background p-4 pb-24">
        <div className="max-w-7xl mx-auto">
          <p className="text-muted-foreground">No market data available</p>
        </div>
      </div>
    );
  }

  // Prepare price trends data for chart
  const speciesColors = {
    Stejar: "#8B4513",
    Gorun: "#A0522D",
    Fag: "#D2691E",
    Molid: "#228B22",
    Pin: "#32CD32",
    Paltin: "#FFD700",
    Frasin: "#DEB887",
  };

  const priceTrendsData = Object.entries(analytics.priceTrendsBySpecies)
    .flatMap(([species, trends]) => 
      trends.map(t => ({
        date: t.date,
        species,
        pricePerM3: parseFloat(t.pricePerM3.toFixed(2))
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

  // Prepare volume by species data
  const volumeData = Object.entries(analytics.volumeBySpecies)
    .map(([species, volume]) => ({
      species,
      volume: parseFloat(volume.toFixed(2))
    }))
    .sort((a, b) => b.volume - a.volume);

  // Prepare regional price data
  const regionalData = analytics.avgPriceByRegion
    .map(r => ({
      region: r.region,
      avgPricePerM3: parseFloat(r.avgPricePerM3.toFixed(2))
    }))
    .sort((a, b) => b.avgPricePerM3 - a.avgPricePerM3);

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Market Dashboard</h1>
          <p className="text-muted-foreground">Timber market insights and analytics</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card data-testid="card-total-volume">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Volume Sold</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatVolume(analytics.stats.totalVolume)}</div>
              <p className="text-xs text-muted-foreground mt-1">Cubic meters</p>
            </CardContent>
          </Card>

          <Card data-testid="card-avg-price">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Market Price</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPricePerM3(analytics.stats.avgMarketPrice)}</div>
              <p className="text-xs text-muted-foreground mt-1">Per cubic meter</p>
            </CardContent>
          </Card>

          <Card data-testid="card-popular-species">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Popular Species</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.stats.mostPopularSpecies}</div>
              <p className="text-xs text-muted-foreground mt-1">Leading timber type</p>
            </CardContent>
          </Card>

          <Card data-testid="card-total-auctions">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Auctions</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.stats.totalAuctions}</div>
              <p className="text-xs text-muted-foreground mt-1">Total sold</p>
            </CardContent>
          </Card>
        </div>

        {/* Price Trends Chart */}
        {priceTrendsData.length > 0 && (
          <Card data-testid="card-price-trends">
            <CardHeader>
              <CardTitle>Price Trends by Species</CardTitle>
              <p className="text-sm text-muted-foreground">€/m³ over the last 30 days</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={priceTrendsData}>
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
                  {Object.keys(analytics.priceTrendsBySpecies).map((species) => (
                    <Line
                      key={species}
                      type="monotone"
                      dataKey={species}
                      stroke={speciesColors[species as keyof typeof speciesColors] || "#8884d8"}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Volume by Species Chart */}
        {volumeData.length > 0 && (
          <Card data-testid="card-volume-species">
            <CardHeader>
              <CardTitle>Volume Sold by Species</CardTitle>
              <p className="text-sm text-muted-foreground">Total volume in m³</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={volumeData}>
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
        {regionalData.length > 0 && (
          <Card data-testid="card-regional-price">
            <CardHeader>
              <CardTitle>Regional Price Comparison</CardTitle>
              <p className="text-sm text-muted-foreground">Average price per m³ by region</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={regionalData} layout="vertical">
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
      </div>
    </div>
  );
}
