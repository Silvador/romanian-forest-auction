// Forecast domain types

export interface HistoricalPoint {
  date: string;
  actual: number;
}

export interface ForecastPoint {
  date: string;
  predicted: number;
  lower?: number; // Confidence band lower bound
  upper?: number; // Confidence band upper bound
}

export interface MovingAveragePoint {
  date: string;
  ma: number;
}

export interface ForecastSummary {
  trend: "up" | "down" | "stable";
  confidence: "high" | "medium" | "low";
  forecastChange: number;
  volatility: number;
  volatilityLabel: string;
  lastPrice: number;
  forecastPrice: number;
  priceRange: {
    min: number;
    median: number;
    max: number;
  };
}

export interface StatsMeta {
  dataPoints: number;
  coefficientOfVariation: number;
  slope: number;
  intercept: number;
  rSquared?: number;
}

export interface ForecastResult {
  historicalData: HistoricalPoint[];
  movingAverage: MovingAveragePoint[];
  forecastData: ForecastPoint[];
  summary: ForecastSummary;
  statsMeta: StatsMeta;
}

export type ForecastModel = "linear" | "exponential" | "holt-winters";
