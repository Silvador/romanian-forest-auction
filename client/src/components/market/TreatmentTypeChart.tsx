import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from "recharts";

interface TreatmentTypeStats {
  treatmentType: string;
  auctionCount: number;
  totalVolume: number;
  avgPricePerM3: number;
  volumePercentage?: number;
}

interface TreatmentTypeChartProps {
  treatmentTypes: Record<string, TreatmentTypeStats>;
  hasActiveFilters?: boolean;
}

export function TreatmentTypeChart({ treatmentTypes, hasActiveFilters }: TreatmentTypeChartProps) {
  // Transform data for chart display
  const chartData = useMemo(() => {
    return Object.values(treatmentTypes)
      .map(data => ({
        name: data.treatmentType,
        volume: parseFloat(data.totalVolume.toFixed(2)),
        avgPrice: parseFloat(data.avgPricePerM3.toFixed(2)),
        auctionCount: data.auctionCount,
        percentage: data.volumePercentage ? parseFloat(data.volumePercentage.toFixed(1)) : 0,
      }))
      .sort((a, b) => b.volume - a.volume); // Sort by volume descending
  }, [treatmentTypes]);

  // Color palette for different treatment types
  const COLORS = [
    "#2E7D32", // Dark green
    "#43A047", // Medium green
    "#66BB6A", // Light green
    "#81C784", // Lighter green
    "#A5D6A7", // Very light green
    "#C8E6C9", // Pale green
    "#8BC34A", // Yellow-green
    "#9CCC65", // Light yellow-green
  ];

  // Custom label for pie segments
  const renderCustomLabel = (entry: any) => {
    return `${entry.percentage}%`;
  };

  // Custom tooltip for detailed information
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold mb-2">{data.name}</p>
        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground">
            <span className="font-medium">Volume:</span> {data.volume.toLocaleString()} m³ ({data.percentage}%)
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium">Avg Price:</span> €{data.avgPrice}/m³
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium">Auctions:</span> {data.auctionCount}
          </p>
        </div>
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <Card data-testid="card-treatment-type">
        <CardHeader>
          <CardTitle>Treatment Type Breakdown</CardTitle>
          <p className="text-sm text-muted-foreground">
            No treatment type data available
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

  const totalVolume = chartData.reduce((sum, d) => sum + d.volume, 0);
  const totalAuctions = chartData.reduce((sum, d) => sum + d.auctionCount, 0);
  const avgPrice = chartData.reduce((sum, d) => sum + (d.avgPrice * d.volume), 0) / totalVolume;

  return (
    <Card data-testid="card-treatment-type" className="transition-all duration-200 ease-out">
      <CardHeader>
        <CardTitle>Treatment Type Breakdown</CardTitle>
        <p className="text-sm text-muted-foreground">
          Distribution of timber by APV treatment type
          {hasActiveFilters && " (filtered)"}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={100}
                  innerRadius={60}
                  fill="#8884d8"
                  dataKey="volume"
                  paddingAngle={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend and Details */}
          <div className="flex flex-col justify-center space-y-3">
            {chartData.map((item, index) => (
              <div
                key={item.name}
                className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.auctionCount} auction{item.auctionCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">{item.volume.toLocaleString()} m³</p>
                  <p className="text-xs text-muted-foreground">€{item.avgPrice}/m³</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary statistics */}
        <div className="mt-6 pt-4 border-t grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Volume</p>
            <p className="font-semibold">
              {totalVolume.toLocaleString()} m³
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Auctions</p>
            <p className="font-semibold">
              {totalAuctions}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Weighted Avg Price</p>
            <p className="font-semibold">
              €{avgPrice.toFixed(2)}/m³
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
