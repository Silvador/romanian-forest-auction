import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

interface PriceTrend {
  date: string;
  pricePerM3: number;
  count: number;
}

interface SeasonalTrendsChartProps {
  priceTrendsBySpecies: Record<string, PriceTrend[]>;
  hasActiveFilters?: boolean;
}

export function SeasonalTrendsChart({ priceTrendsBySpecies, hasActiveFilters }: SeasonalTrendsChartProps) {
  // Transform data to show monthly aggregates and identify seasonal patterns
  const chartData = useMemo(() => {
    const monthlyData: Record<string, any> = {};

    Object.entries(priceTrendsBySpecies).forEach(([species, trends]) => {
      trends.forEach(trend => {
        // Extract year-month from date
        const date = new Date(trend.date);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        if (!monthlyData[yearMonth]) {
          monthlyData[yearMonth] = {
            month: monthName,
            sortKey: yearMonth,
          };
        }

        // Aggregate species prices for this month
        if (!monthlyData[yearMonth][species]) {
          monthlyData[yearMonth][species] = {
            total: 0,
            count: 0,
          };
        }

        monthlyData[yearMonth][species].total += trend.pricePerM3 * trend.count;
        monthlyData[yearMonth][species].count += trend.count;
      });
    });

    // Calculate averages and format for chart
    return Object.values(monthlyData)
      .map((month: any) => {
        const result: any = {
          month: month.month,
          sortKey: month.sortKey,
        };

        Object.keys(priceTrendsBySpecies).forEach(species => {
          if (month[species]) {
            result[species] = parseFloat(
              (month[species].total / month[species].count).toFixed(2)
            );
          }
        });

        return result;
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [priceTrendsBySpecies]);

  // Species colors for consistent visualization
  const speciesColors: Record<string, string> = {
    Stejar: "#8B4513",
    Gorun: "#A0522D",
    Fag: "#D2691E",
    Molid: "#228B22",
    Pin: "#32CD32",
    Paltin: "#FFD700",
    Frasin: "#DEB887",
  };

  // Calculate seasonal insights
  const seasonalInsights = useMemo(() => {
    if (chartData.length < 2) return null;

    const speciesList = Object.keys(priceTrendsBySpecies);
    const insights: Record<string, any> = {};

    speciesList.forEach(species => {
      const prices = chartData
        .map(d => d[species])
        .filter(p => p !== undefined);

      if (prices.length === 0) return;

      const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      const maxPrice = Math.max(...prices);
      const minPrice = Math.min(...prices);
      const volatility = ((maxPrice - minPrice) / avgPrice) * 100;

      // Find best and worst months
      const bestMonth = chartData.find(d => d[species] === maxPrice);
      const worstMonth = chartData.find(d => d[species] === minPrice);

      insights[species] = {
        avgPrice,
        maxPrice,
        minPrice,
        volatility: volatility.toFixed(1),
        bestMonth: bestMonth?.month,
        worstMonth: worstMonth?.month,
      };
    });

    return insights;
  }, [chartData, priceTrendsBySpecies]);

  const availableSpecies = Object.keys(priceTrendsBySpecies);

  if (chartData.length === 0) {
    return (
      <Card data-testid="card-seasonal-trends">
        <CardHeader>
          <CardTitle>Seasonal Trends</CardTitle>
          <p className="text-sm text-muted-foreground">
            No seasonal data available
            {hasActiveFilters && " (filtered)"}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No data to display
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-seasonal-trends" className="transition-all duration-200 ease-out">
      <CardHeader>
        <CardTitle>Seasonal Trends Analysis</CardTitle>
        <p className="text-sm text-muted-foreground">
          Monthly price patterns to identify seasonal opportunities
          {hasActiveFilters && " (filtered)"}
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              label={{
                value: '€/m³',
                angle: -90,
                position: 'insideLeft',
                style: { fill: "hsl(var(--muted-foreground))" }
              }}
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem"
              }}
              formatter={(value: any) => [`€${value}/m³`, '']}
            />
            <Legend />
            {availableSpecies.map((species) => (
              <Line
                key={species}
                type="monotone"
                dataKey={species}
                stroke={speciesColors[species] || "#8884d8"}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* Seasonal Insights */}
        {seasonalInsights && Object.keys(seasonalInsights).length > 0 && (
          <div className="mt-6 pt-4 border-t space-y-4">
            <h4 className="font-semibold text-sm">Seasonal Insights</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(seasonalInsights).map(([species, insight]: [string, any]) => (
                <div
                  key={species}
                  className="border rounded-lg p-3 space-y-2"
                  style={{ borderColor: speciesColors[species] + '40' }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: speciesColors[species] }}
                    />
                    <h5 className="font-semibold text-sm">{species}</h5>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Avg Price</p>
                      <p className="font-medium">€{insight.avgPrice.toFixed(2)}/m³</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Volatility</p>
                      <p className="font-medium">{insight.volatility}%</p>
                    </div>
                    {insight.bestMonth && (
                      <div>
                        <p className="text-muted-foreground">Best Month</p>
                        <p className="font-medium text-green-600 dark:text-green-400">
                          {insight.bestMonth}
                        </p>
                      </div>
                    )}
                    {insight.worstMonth && (
                      <div>
                        <p className="text-muted-foreground">Worst Month</p>
                        <p className="font-medium text-red-600 dark:text-red-400">
                          {insight.worstMonth}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-semibold mb-1">Market Timing Tip</p>
              <p className="text-muted-foreground">
                Price volatility indicates seasonal demand fluctuations.
                Consider selling during peak months (shown in green) and buying during low-demand periods
                for optimal margins.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
