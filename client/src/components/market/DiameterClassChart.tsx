import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
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

interface DiameterClassChartProps {
  diameterClasses: Record<string, DiameterClassStats>;
  hasActiveFilters?: boolean;
}

export function DiameterClassChart({ diameterClasses, hasActiveFilters }: DiameterClassChartProps) {
  // Transform data for chart display
  const chartData = useMemo(() => {
    // Define the order of diameter ranges
    const order = ["< 20cm", "20-30cm", "30-40cm", "40-50cm", "50-60cm", "> 60cm"];

    return order
      .map(label => {
        const data = diameterClasses[label];
        if (!data) return null;

        return {
          diameter: label,
          avgPrice: parseFloat(data.avgPricePerM3.toFixed(2)),
          minPrice: data.minPricePerM3 ? parseFloat(data.minPricePerM3.toFixed(2)) : undefined,
          maxPrice: data.maxPricePerM3 ? parseFloat(data.maxPricePerM3.toFixed(2)) : undefined,
          medianPrice: data.medianPricePerM3 ? parseFloat(data.medianPricePerM3.toFixed(2)) : undefined,
          volume: parseFloat(data.totalVolume.toFixed(2)),
          auctionCount: data.auctionCount,
          volumePercentage: data.volumePercentage ? parseFloat(data.volumePercentage.toFixed(1)) : undefined,
        };
      })
      .filter(Boolean); // Remove null entries
  }, [diameterClasses]);

  // Color gradient from light to dark green based on diameter
  const colors = ["#C6E48B", "#7BC96F", "#49AF5D", "#2E7D32", "#1B5E20", "#0D3818"];

  // Custom tooltip for detailed information
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold mb-2">{data.diameter}</p>
        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground">
            <span className="font-medium">Avg Price:</span> €{data.avgPrice}/m³
          </p>
          {data.medianPrice !== undefined && (
            <p className="text-muted-foreground">
              <span className="font-medium">Median:</span> €{data.medianPrice}/m³
            </p>
          )}
          {data.minPrice !== undefined && data.maxPrice !== undefined && (
            <p className="text-muted-foreground">
              <span className="font-medium">Range:</span> €{data.minPrice} - €{data.maxPrice}/m³
            </p>
          )}
          <p className="text-muted-foreground">
            <span className="font-medium">Volume:</span> {data.volume.toLocaleString()} m³
            {data.volumePercentage !== undefined && ` (${data.volumePercentage}%)`}
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
      <Card data-testid="card-diameter-class">
        <CardHeader>
          <CardTitle>Diameter Class Analysis</CardTitle>
          <p className="text-sm text-muted-foreground">
            No diameter data available
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
    <Card data-testid="card-diameter-class" className="transition-all duration-200 ease-out">
      <CardHeader>
        <CardTitle>Diameter Class Analysis</CardTitle>
        <p className="text-sm text-muted-foreground">
          Average price per m³ by timber diameter class
          {hasActiveFilters && " (filtered)"}
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="diameter"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
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
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              dataKey="avgPrice"
              name="Avg Price (€/m³)"
              radius={[8, 8, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Summary statistics */}
        <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Volume</p>
            <p className="font-semibold">
              {chartData.reduce((sum, d) => sum + d.volume, 0).toLocaleString()} m³
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Auctions</p>
            <p className="font-semibold">
              {chartData.reduce((sum, d) => sum + d.auctionCount, 0)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Price Range</p>
            <p className="font-semibold">
              €{Math.min(...chartData.map(d => d.avgPrice))} - €{Math.max(...chartData.map(d => d.avgPrice))}/m³
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Most Common</p>
            <p className="font-semibold">
              {chartData.reduce((max, d) => d.auctionCount > max.auctionCount ? d : max).diameter}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
