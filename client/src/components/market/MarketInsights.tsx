import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Info
} from "lucide-react";

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

interface MarketInsightsProps {
  analytics: MarketAnalyticsData;
  hasActiveFilters?: boolean;
}

interface Insight {
  type: "opportunity" | "trend" | "alert" | "info";
  title: string;
  description: string;
  icon: React.ReactNode;
  severity?: "high" | "medium" | "low";
}

export function MarketInsights({ analytics, hasActiveFilters }: MarketInsightsProps) {
  const insights = useMemo(() => {
    const insights: Insight[] = [];

    // Analyze price trends by species
    Object.entries(analytics.priceTrendsBySpecies).forEach(([species, trends]) => {
      if (trends.length < 2) return;

      const sortedTrends = [...trends].sort((a, b) => a.date.localeCompare(b.date));
      const recentPrices = sortedTrends.slice(-5).map(t => t.pricePerM3);
      const olderPrices = sortedTrends.slice(0, Math.max(1, sortedTrends.length - 5)).map(t => t.pricePerM3);

      const recentAvg = recentPrices.reduce((sum, p) => sum + p, 0) / recentPrices.length;
      const olderAvg = olderPrices.reduce((sum, p) => sum + p, 0) / olderPrices.length;
      const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

      if (Math.abs(changePercent) > 10) {
        if (changePercent > 0) {
          insights.push({
            type: "trend",
            title: `${species} prices rising`,
            description: `${species} prices have increased by ${changePercent.toFixed(1)}% recently. Consider selling if you have inventory.`,
            icon: <TrendingUp className="h-5 w-5 text-green-600" />,
          });
        } else {
          insights.push({
            type: "opportunity",
            title: `${species} prices declining`,
            description: `${species} prices have decreased by ${Math.abs(changePercent).toFixed(1)}%. This could be a buying opportunity.`,
            icon: <TrendingDown className="h-5 w-5 text-orange-600" />,
          });
        }
      }

      // Price volatility analysis
      const priceVariance = recentPrices.reduce((sum, p) => sum + Math.pow(p - recentAvg, 2), 0) / recentPrices.length;
      const volatility = Math.sqrt(priceVariance) / recentAvg;

      if (volatility > 0.15) {
        insights.push({
          type: "alert",
          title: `High volatility for ${species}`,
          description: `${species} prices are experiencing high volatility (${(volatility * 100).toFixed(1)}%). Exercise caution in trading.`,
          icon: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
          severity: "medium",
        });
      }
    });

    // Regional price comparison
    if (analytics.avgPriceByRegion.length > 1) {
      const sortedRegions = [...analytics.avgPriceByRegion].sort((a, b) => b.avgPricePerM3 - a.avgPricePerM3);
      const highestRegion = sortedRegions[0];
      const lowestRegion = sortedRegions[sortedRegions.length - 1];
      const priceDiff = ((highestRegion.avgPricePerM3 - lowestRegion.avgPricePerM3) / lowestRegion.avgPricePerM3) * 100;

      if (priceDiff > 20) {
        insights.push({
          type: "info",
          title: "Significant regional price differences",
          description: `Prices in ${highestRegion.region} are ${priceDiff.toFixed(1)}% higher than in ${lowestRegion.region}. Consider regional arbitrage opportunities.`,
          icon: <Info className="h-5 w-5 text-blue-600" />,
        });
      }
    }

    // Volume distribution insights
    const volumeEntries = Object.entries(analytics.volumeBySpecies);
    if (volumeEntries.length > 0) {
      const totalVolume = volumeEntries.reduce((sum, [, vol]) => sum + vol, 0);
      const topSpecies = volumeEntries.sort((a, b) => b[1] - a[1])[0];
      const topSpeciesPercent = (topSpecies[1] / totalVolume) * 100;

      if (topSpeciesPercent > 40) {
        insights.push({
          type: "alert",
          title: "Market concentration risk",
          description: `${topSpecies[0]} represents ${topSpeciesPercent.toFixed(1)}% of total volume. Market is heavily concentrated in one species.`,
          icon: <AlertTriangle className="h-5 w-5 text-orange-600" />,
          severity: "low",
        });
      }
    }

    // Market activity insights
    if (analytics.stats.totalAuctions > 0) {
      const avgVolumePerAuction = analytics.stats.totalVolume / analytics.stats.totalAuctions;

      if (avgVolumePerAuction > 100) {
        insights.push({
          type: "info",
          title: "Large auction sizes",
          description: `Average auction size is ${avgVolumePerAuction.toFixed(0)}m³. Market dominated by larger transactions.`,
          icon: <Info className="h-5 w-5 text-blue-600" />,
        });
      }
    }

    // Best time to sell (based on recent trends)
    const trendsWithData = Object.entries(analytics.priceTrendsBySpecies)
      .filter(([, trends]) => trends.length >= 3)
      .map(([species, trends]) => {
        const sorted = [...trends].sort((a, b) => a.date.localeCompare(b.date));
        const recent = sorted.slice(-3);
        const avgRecentPrice = recent.reduce((sum, t) => sum + t.pricePerM3, 0) / recent.length;
        const trend = recent[recent.length - 1].pricePerM3 > recent[0].pricePerM3 ? "up" : "down";
        return { species, avgPrice: avgRecentPrice, trend };
      });

    if (trendsWithData.length > 0) {
      const upwardTrends = trendsWithData.filter(t => t.trend === "up");
      if (upwardTrends.length > 0) {
        const best = upwardTrends.sort((a, b) => b.avgPrice - a.avgPrice)[0];
        insights.push({
          type: "opportunity",
          title: `Strong seller's market for ${best.species}`,
          description: `${best.species} shows upward price momentum with recent average of €${best.avgPrice.toFixed(2)}/m³. Good selling opportunity.`,
          icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
        });
      }
    }

    // Limit to top 6 insights
    return insights.slice(0, 6);
  }, [analytics]);

  if (insights.length === 0) {
    return (
      <Card data-testid="card-market-insights">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Market Insights
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            AI-powered market analysis
            {hasActiveFilters && " (filtered)"}
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Not enough data to generate insights. More auction data needed for analysis.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "opportunity": return "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950";
      case "trend": return "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950";
      case "alert": return "border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950";
      case "info": return "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950";
      default: return "border-gray-200";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "opportunity": return "Opportunity";
      case "trend": return "Trend";
      case "alert": return "Alert";
      case "info": return "Info";
      default: return type;
    }
  };

  return (
    <Card data-testid="card-market-insights" className="transition-all duration-200 ease-out">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Market Insights
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          AI-powered analysis of market conditions and opportunities
          {hasActiveFilters && " (filtered)"}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 space-y-2 transition-all hover:shadow-md ${getTypeColor(insight.type)}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {insight.icon}
                  <Badge variant="outline" className="text-xs">
                    {getTypeLabel(insight.type)}
                  </Badge>
                </div>
                {insight.severity && (
                  <Badge
                    variant={insight.severity === "high" ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {insight.severity}
                  </Badge>
                )}
              </div>
              <h4 className="font-semibold text-sm">{insight.title}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {insight.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Insights are generated based on historical price trends, volatility analysis, and market patterns.
            Use as reference only and conduct your own due diligence.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
