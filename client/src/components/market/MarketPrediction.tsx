import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  Download,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { usePriceForecast } from "@/hooks/usePriceForecast";
import type { ForecastResult } from "@/types/forecast";
import { useToast } from "@/hooks/use-toast";

interface PriceTrend {
  date: string;
  pricePerM3: number;
  count: number;
}

interface MarketPredictionProps {
  priceTrendsBySpecies: Record<string, PriceTrend[]>;
  hasActiveFilters?: boolean;
}

export function MarketPrediction({
  priceTrendsBySpecies,
  hasActiveFilters,
}: MarketPredictionProps) {
  const { toast } = useToast();
  const [showPrediction, setShowPrediction] = useState(true);
  const [showConfidenceBand, setShowConfidenceBand] = useState(true);

  // Filter species with sufficient data
  const availableSpecies = useMemo(
    () =>
      Object.keys(priceTrendsBySpecies)
        .filter(species => priceTrendsBySpecies[species].length >= 3)
        .sort((a, b) => {
          // Sort by most recent activity
          const aLatest = Math.max(
            ...priceTrendsBySpecies[a].map(t => new Date(t.date).getTime())
          );
          const bLatest = Math.max(
            ...priceTrendsBySpecies[b].map(t => new Date(t.date).getTime())
          );
          return bLatest - aLatest;
        }),
    [priceTrendsBySpecies]
  );

  const [selectedSpecies, setSelectedSpecies] = useState<string>(
    availableSpecies[0] || ""
  );

  // Use forecast hook (memoized, only recomputes when selectedSpecies changes)
  const forecast: ForecastResult | null = usePriceForecast({
    trends: selectedSpecies ? priceTrendsBySpecies[selectedSpecies] : [],
    forecastPeriods: 4,
    movingAverageWindow: 5,
    model: "linear",
  });

  // Memoize chart data to avoid recomputations
  const chartData = useMemo(() => {
    if (!forecast) return [];

    const combined: any[] = forecast.historicalData.map(h => {
      const ma = forecast.movingAverage.find(m => m.date === h.date);
      return {
        date: h.date,
        actual: h.actual,
        ma: ma ? ma.ma : null,
        predicted: null,
        lower: null,
        upper: null,
      };
    });

    if (showPrediction) {
      forecast.forecastData.forEach(p => {
        combined.push({
          date: p.date,
          actual: null,
          ma: null,
          predicted: p.predicted,
          lower: showConfidenceBand ? p.lower : null,
          upper: showConfidenceBand ? p.upper : null,
        });
      });
    }

    return combined;
  }, [forecast, showPrediction, showConfidenceBand]);

  // Export forecast data as CSV
  const handleExportCSV = () => {
    if (!forecast) return;

    const headers = ["Date", "Actual Price", "Moving Average", "Predicted Price", "Lower Bound", "Upper Bound"];
    const rows = chartData.map(d => [
      d.date,
      d.actual ?? "",
      d.ma ?? "",
      d.predicted ?? "",
      d.lower ?? "",
      d.upper ?? "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedSpecies}_forecast_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: `Forecast data for ${selectedSpecies} has been downloaded.`,
    });
  };

  // Custom tooltip with model metadata
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !forecast) return null;

    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium mb-2">{payload[0]?.payload?.date}</p>
        {payload.map((entry: any, index: number) => (
          entry.value !== null && (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.name}: €{entry.value}/m³</span>
            </div>
          )
        ))}
        <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
          Model: Linear Regression · Confidence: {forecast.summary.confidence.toUpperCase()}
        </div>
      </div>
    );
  };

  if (availableSpecies.length === 0) {
    return (
      <Card data-testid="card-market-prediction">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Market Predictions
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            AI-powered price forecasting
            {hasActiveFilters && " (filtered)"}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Insufficient data for predictions. Need at least 3 data points per species.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const lastHistoricalDate = forecast?.historicalData[forecast.historicalData.length - 1]?.date;

  return (
    <Card
      data-testid="card-market-prediction"
      className="transition-all duration-200 ease-out"
    >
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Market Predictions
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              AI-powered price forecasting using linear regression
              {hasActiveFilters && " (filtered)"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedSpecies} onValueChange={setSelectedSpecies}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select species" />
              </SelectTrigger>
              <SelectContent>
                {availableSpecies.map(species => (
                  <SelectItem key={species} value={species}>
                    {species}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="gap-2"
              disabled={!forecast}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {forecast && (
          <div className="space-y-6">
            {/* Prediction Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Trend Card */}
              <div className="p-4 border rounded-lg bg-gradient-to-br from-background to-muted/20">
                <div className="flex items-center gap-2 mb-2">
                  {forecast.summary.trend === "up" && (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  )}
                  {forecast.summary.trend === "down" && (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  {forecast.summary.trend === "stable" && (
                    <Activity className="h-5 w-5 text-blue-600" />
                  )}
                  <span className="text-sm font-medium">Price Trend</span>
                </div>
                <p className="text-2xl font-bold capitalize">
                  {forecast.summary.trend}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on {forecast.statsMeta.dataPoints} data points
                </p>
              </div>

              {/* Forecast Card */}
              <div className="p-4 border rounded-lg bg-gradient-to-br from-background to-muted/20">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">4-Week Forecast</span>
                </div>
                <p
                  className={`text-2xl font-bold ${
                    forecast.summary.forecastChange > 0
                      ? "text-green-600"
                      : forecast.summary.forecastChange < 0
                      ? "text-red-600"
                      : ""
                  }`}
                >
                  {forecast.summary.forecastChange > 0 ? "+" : ""}
                  {forecast.summary.forecastChange}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  €{forecast.summary.forecastPrice}/m³ predicted
                </p>
              </div>

              {/* Confidence Card */}
              <div className="p-4 border rounded-lg bg-gradient-to-br from-background to-muted/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Confidence</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold capitalize">
                    {forecast.summary.confidence}
                  </p>
                  <Badge
                    variant={
                      forecast.summary.confidence === "high"
                        ? "default"
                        : forecast.summary.confidence === "medium"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    R²={forecast.statsMeta.rSquared?.toFixed(2)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {forecast.summary.volatilityLabel}
                </p>
              </div>

              {/* Price Range Card */}
              <div className="p-4 border rounded-lg bg-gradient-to-br from-background to-muted/20">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Price Range</span>
                </div>
                <div className="space-y-1">
                  <div className="text-xs flex justify-between">
                    <span className="text-muted-foreground">Min:</span>
                    <span className="font-medium">
                      €{forecast.summary.priceRange.min}/m³
                    </span>
                  </div>
                  <div className="text-xs flex justify-between">
                    <span className="text-muted-foreground">Median:</span>
                    <span className="font-bold text-base">
                      €{forecast.summary.priceRange.median}/m³
                    </span>
                  </div>
                  <div className="text-xs flex justify-between">
                    <span className="text-muted-foreground">Max:</span>
                    <span className="font-medium">
                      €{forecast.summary.priceRange.max}/m³
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart Controls */}
            <div className="flex items-center gap-6 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Switch
                  id="show-prediction"
                  checked={showPrediction}
                  onCheckedChange={setShowPrediction}
                />
                <Label htmlFor="show-prediction" className="text-sm cursor-pointer">
                  {showPrediction ? (
                    <span className="flex items-center gap-2">
                      <Eye className="h-4 w-4" /> Show Forecast
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <EyeOff className="h-4 w-4" /> Hide Forecast
                    </span>
                  )}
                </Label>
              </div>
              {showPrediction && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-confidence"
                    checked={showConfidenceBand}
                    onCheckedChange={setShowConfidenceBand}
                  />
                  <Label htmlFor="show-confidence" className="text-sm cursor-pointer">
                    Confidence Band
                  </Label>
                </div>
              )}
            </div>

            {/* Forecast Chart */}
            <div>
              <h4 className="text-sm font-medium mb-4">Price Forecast Visualization</h4>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                >
                  <defs>
                    <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4169E1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4169E1" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    opacity={0.3}
                  />

                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    tickMargin={8}
                  />

                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    label={{
                      value: "€/m³",
                      angle: -90,
                      position: "insideLeft",
                      style: { fontSize: 12 },
                    }}
                  />

                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} />

                  {/* Shaded Forecast Zone */}
                  {showPrediction && lastHistoricalDate && (
                    <ReferenceArea
                      x1={lastHistoricalDate}
                      x2={chartData[chartData.length - 1]?.date}
                      fill="#4169E1"
                      fillOpacity={0.05}
                      label={{
                        value: "Forecast Zone",
                        position: "insideTopRight",
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                    />
                  )}

                  {/* Reference line for today */}
                  {lastHistoricalDate && (
                    <ReferenceLine
                      x={lastHistoricalDate}
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="3 3"
                      label={{
                        value: "Today",
                        position: "top",
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                    />
                  )}

                  {/* Confidence Band Area */}
                  {showPrediction && showConfidenceBand && (
                    <Area
                      type="monotone"
                      dataKey="upper"
                      stroke="none"
                      fill="url(#confidenceGradient)"
                      fillOpacity={0.4}
                      isAnimationActive={true}
                      animationDuration={400}
                    />
                  )}
                  {showPrediction && showConfidenceBand && (
                    <Area
                      type="monotone"
                      dataKey="lower"
                      stroke="none"
                      fill="url(#confidenceGradient)"
                      fillOpacity={0.4}
                      isAnimationActive={true}
                      animationDuration={400}
                    />
                  )}

                  {/* Historical Actual Prices */}
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#8B4513"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#8B4513" }}
                    name="Actual Price"
                    connectNulls={false}
                    isAnimationActive={true}
                    animationDuration={400}
                  />

                  {/* Moving Average */}
                  <Line
                    type="monotone"
                    dataKey="ma"
                    stroke="#FFA500"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="5-Period MA"
                    connectNulls={false}
                    isAnimationActive={true}
                    animationDuration={400}
                  />

                  {/* Predicted Prices */}
                  {showPrediction && (
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke="#4169E1"
                      strokeWidth={3}
                      strokeDasharray="8 4"
                      dot={{ r: 5, fill: "#4169E1", strokeWidth: 2, stroke: "#fff" }}
                      name="Forecast"
                      connectNulls={false}
                      isAnimationActive={true}
                      animationDuration={400}
                      style={{
                        filter: "drop-shadow(0 0 4px rgba(65, 105, 225, 0.5))",
                      }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Disclaimer */}
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Disclaimer:</strong> Predictions use linear regression with {forecast.statsMeta.dataPoints} historical data points.
                Model accuracy: R²={forecast.statsMeta.rSquared?.toFixed(3)} ({forecast.summary.confidence} confidence).
                Market conditions change rapidly due to external factors. Use forecasts as one tool in your decision-making process, not as the sole basis for action.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
