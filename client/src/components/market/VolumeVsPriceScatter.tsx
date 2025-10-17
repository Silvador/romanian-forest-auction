import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Legend
} from "recharts";

interface ScatterPoint {
  volume: number;
  pricePerM3: number;
  species: string;
  region: string;
  diameter?: number;
  treatmentType?: string;
}

interface VolumeVsPriceScatterProps {
  scatterData: ScatterPoint[];
  hasActiveFilters?: boolean;
}

export function VolumeVsPriceScatter({ scatterData, hasActiveFilters }: VolumeVsPriceScatterProps) {
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);

  // Get unique species for color mapping
  const speciesColors = useMemo(() => {
    const colors: Record<string, string> = {
      Stejar: "#8B4513",
      Gorun: "#A0522D",
      Fag: "#D2691E",
      Molid: "#228B22",
      Pin: "#32CD32",
      Paltin: "#FFD700",
      Frasin: "#DEB887",
      Unknown: "#94A3B8",
    };
    return colors;
  }, []);

  // Group data by species for multiple scatter series
  const groupedData = useMemo(() => {
    const groups: Record<string, ScatterPoint[]> = {};

    scatterData.forEach(point => {
      const species = point.species || "Unknown";
      if (!groups[species]) {
        groups[species] = [];
      }
      groups[species].push({
        ...point,
        x: point.volume,
        y: point.pricePerM3,
      } as any);
    });

    return groups;
  }, [scatterData]);

  // Filter data based on selected species
  const filteredData = useMemo(() => {
    if (!selectedSpecies) return groupedData;

    return {
      [selectedSpecies]: groupedData[selectedSpecies]
    };
  }, [groupedData, selectedSpecies]);

  // Calculate statistics for insights
  const statistics = useMemo(() => {
    if (scatterData.length === 0) return null;

    const volumes = scatterData.map(d => d.volume);
    const prices = scatterData.map(d => d.pricePerM3);

    // Find outliers (simple method: values beyond 1.5 * IQR)
    const sortedPrices = [...prices].sort((a, b) => a - b);
    const q1Price = sortedPrices[Math.floor(sortedPrices.length * 0.25)];
    const q3Price = sortedPrices[Math.floor(sortedPrices.length * 0.75)];
    const iqrPrice = q3Price - q1Price;
    const lowerBound = q1Price - 1.5 * iqrPrice;
    const upperBound = q3Price + 1.5 * iqrPrice;

    const outliers = scatterData.filter(d =>
      d.pricePerM3 < lowerBound || d.pricePerM3 > upperBound
    );

    const highestValue = scatterData.reduce((max, d) =>
      d.volume > max.volume ? d : max
    );

    const bestPrice = scatterData.reduce((max, d) =>
      d.pricePerM3 > max.pricePerM3 ? d : max
    );

    return {
      totalAuctions: scatterData.length,
      avgVolume: volumes.reduce((sum, v) => sum + v, 0) / volumes.length,
      avgPrice: prices.reduce((sum, p) => sum + p, 0) / prices.length,
      maxVolume: Math.max(...volumes),
      maxPrice: Math.max(...prices),
      minPrice: Math.min(...prices),
      outliers: outliers.length,
      highestValue,
      bestPrice,
    };
  }, [scatterData]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold mb-2">{data.species}</p>
        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground">
            <span className="font-medium">Volume:</span> {data.volume.toFixed(2)} m³
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium">Price:</span> €{data.pricePerM3.toFixed(2)}/m³
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium">Region:</span> {data.region}
          </p>
          {data.diameter && (
            <p className="text-muted-foreground">
              <span className="font-medium">Diameter:</span> {data.diameter}cm
            </p>
          )}
          {data.treatmentType && (
            <p className="text-muted-foreground">
              <span className="font-medium">Treatment:</span> {data.treatmentType}
            </p>
          )}
        </div>
      </div>
    );
  };

  if (scatterData.length === 0) {
    return (
      <Card data-testid="card-volume-price-scatter">
        <CardHeader>
          <CardTitle>Volume vs Price Analysis</CardTitle>
          <p className="text-sm text-muted-foreground">
            No scatter data available
            {hasActiveFilters && " (filtered)"}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            No data to display
          </div>
        </CardContent>
      </Card>
    );
  }

  const speciesList = Object.keys(groupedData);

  return (
    <Card data-testid="card-volume-price-scatter" className="transition-all duration-200 ease-out">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Volume vs Price Analysis</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Identify opportunities and outliers in the market
              {hasActiveFilters && " (filtered)"}
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge
              variant={selectedSpecies === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedSpecies(null)}
            >
              All
            </Badge>
            {speciesList.map(species => (
              <Badge
                key={species}
                variant={selectedSpecies === species ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedSpecies(species)}
                style={{
                  backgroundColor: selectedSpecies === species ? speciesColors[species] : undefined,
                  borderColor: speciesColors[species],
                }}
              >
                {species}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              type="number"
              dataKey="x"
              name="Volume"
              unit=" m³"
              label={{
                value: 'Volume (m³)',
                position: 'insideBottom',
                offset: -10,
                style: { fill: "hsl(var(--muted-foreground))" }
              }}
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Price"
              unit=" €/m³"
              label={{
                value: 'Price (€/m³)',
                angle: -90,
                position: 'insideLeft',
                style: { fill: "hsl(var(--muted-foreground))" }
              }}
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <ZAxis range={[50, 200]} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            {Object.entries(filteredData).map(([species, points]) => (
              <Scatter
                key={species}
                name={species}
                data={points}
                fill={speciesColors[species] || speciesColors.Unknown}
                fillOpacity={0.6}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>

        {/* Insights */}
        {statistics && (
          <div className="mt-6 pt-4 border-t space-y-4">
            <h4 className="font-semibold text-sm">Market Insights</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Auctions</p>
                <p className="font-semibold">{statistics.totalAuctions}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg Volume</p>
                <p className="font-semibold">{statistics.avgVolume.toFixed(2)} m³</p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg Price</p>
                <p className="font-semibold">€{statistics.avgPrice.toFixed(2)}/m³</p>
              </div>
              <div>
                <p className="text-muted-foreground">Price Range</p>
                <p className="font-semibold">
                  €{statistics.minPrice.toFixed(0)} - €{statistics.maxPrice.toFixed(0)}/m³
                </p>
              </div>
            </div>
            {statistics.outliers > 0 && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm">
                  <span className="font-semibold">{statistics.outliers} outlier(s)</span> detected -
                  these auctions have prices significantly above or below the market average,
                  which may indicate exceptional quality, urgent sales, or data anomalies.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
