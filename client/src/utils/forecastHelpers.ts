// Pure helper functions for forecasting calculations

/**
 * Calculate simple moving average
 */
export function calculateMovingAverage(data: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      result.push(NaN);
    } else {
      const sum = data.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / window);
    }
  }
  return result;
}

/**
 * Simple linear regression
 * Returns slope, intercept, and R-squared for quality assessment
 */
export function linearRegression(data: { x: number; y: number }[]) {
  const n = data.length;
  const sumX = data.reduce((sum, point) => sum + point.x, 0);
  const sumY = data.reduce((sum, point) => sum + point.y, 0);
  const sumXY = data.reduce((sum, point) => sum + point.x * point.y, 0);
  const sumXX = data.reduce((sum, point) => sum + point.x * point.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared for goodness of fit
  const meanY = sumY / n;
  const ssTotal = data.reduce((sum, point) => sum + Math.pow(point.y - meanY, 2), 0);
  const ssResidual = data.reduce((sum, point) => {
    const predicted = slope * point.x + intercept;
    return sum + Math.pow(point.y - predicted, 2);
  }, 0);
  const rSquared = 1 - (ssResidual / ssTotal);

  return { slope, intercept, rSquared };
}

/**
 * Calculate median from array of numbers
 */
export function calculateMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Calculate volatility and categorize risk
 */
export function calculateVolatility(prices: number[]): {
  volatility: number;
  coefficientOfVariation: number;
  label: string;
} {
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / mean;
  const volatility = coefficientOfVariation * 100;

  let label = "Moderate volatility (Normal Market)";
  if (volatility < 10) label = "Low volatility (Stable Market)";
  else if (volatility > 30) label = "High volatility (Unpredictable)";

  return { volatility, coefficientOfVariation, label };
}

/**
 * Determine trend direction and magnitude
 */
export function calculateTrend(recentPrices: number[], olderPrices: number[]): {
  trend: "up" | "down" | "stable";
  changePercent: number;
} {
  const avgRecent = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
  const avgOlder = olderPrices.reduce((a, b) => a + b, 0) / olderPrices.length;
  const changePercent = ((avgRecent - avgOlder) / avgOlder) * 100;

  let trend: "up" | "down" | "stable" = "stable";
  if (changePercent > 5) trend = "up";
  else if (changePercent < -5) trend = "down";

  return { trend, changePercent };
}

/**
 * Calculate confidence band intervals
 * Returns upper and lower bounds based on standard error
 */
export function calculateConfidenceBand(
  predictions: number[],
  historicalPrices: number[],
  confidenceLevel: number = 1.96 // 95% confidence
): { lower: number[]; upper: number[] } {
  const mean = historicalPrices.reduce((a, b) => a + b, 0) / historicalPrices.length;
  const variance = historicalPrices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / historicalPrices.length;
  const stdDev = Math.sqrt(variance);
  const standardError = stdDev / Math.sqrt(historicalPrices.length);

  const margin = confidenceLevel * standardError;

  return {
    lower: predictions.map(p => Math.max(0, p - margin)),
    upper: predictions.map(p => p + margin),
  };
}
