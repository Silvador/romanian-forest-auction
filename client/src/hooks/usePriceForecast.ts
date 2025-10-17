import { useMemo } from "react";
import {
  calculateMovingAverage,
  linearRegression,
  calculateMedian,
  calculateVolatility,
  calculateTrend,
  calculateConfidenceBand,
} from "@/utils/forecastHelpers";
import type {
  ForecastResult,
  HistoricalPoint,
  ForecastPoint,
  MovingAveragePoint,
  ForecastModel,
} from "@/types/forecast";

interface PriceTrend {
  date: string;
  pricePerM3: number;
  count: number;
}

interface UsePriceForecastOptions {
  trends: PriceTrend[];
  forecastPeriods?: number;
  movingAverageWindow?: number;
  model?: ForecastModel;
}

/**
 * Custom hook for price forecasting with moving averages and linear regression
 * Returns comprehensive forecast data with confidence metrics
 */
export function usePriceForecast({
  trends,
  forecastPeriods = 4,
  movingAverageWindow = 5,
  model = "linear",
}: UsePriceForecastOptions): ForecastResult | null {
  return useMemo(() => {
    if (!trends || trends.length < 3) {
      return null;
    }

    // Sort trends by date
    const sortedTrends = [...trends].sort((a, b) => a.date.localeCompare(b.date));

    // 1. Prepare historical data
    const historicalData: HistoricalPoint[] = sortedTrends.map(t => ({
      date: t.date,
      actual: parseFloat(t.pricePerM3.toFixed(2)),
    }));

    // 2. Calculate moving average
    const prices = sortedTrends.map(t => t.pricePerM3);
    const window = Math.min(movingAverageWindow, prices.length);
    const maValues = calculateMovingAverage(prices, window);

    const movingAverage: MovingAveragePoint[] = sortedTrends.map((t, i) => ({
      date: t.date,
      ma: maValues[i] && !isNaN(maValues[i]) ? parseFloat(maValues[i].toFixed(2)) : NaN,
    })).filter(item => !isNaN(item.ma));

    // 3. Linear regression for prediction (extensible for other models)
    const regressionData = sortedTrends.map((t, i) => ({
      x: i,
      y: t.pricePerM3,
    }));

    const { slope, intercept, rSquared } = linearRegression(regressionData);

    // 4. Generate forecast points
    const lastDate = new Date(sortedTrends[sortedTrends.length - 1].date);
    const forecastValues: number[] = [];
    const forecastData: ForecastPoint[] = [];

    for (let i = 1; i <= forecastPeriods; i++) {
      const futureDate = new Date(lastDate);
      futureDate.setDate(futureDate.getDate() + (i * 7)); // Weekly predictions
      const predictedValue = slope * (sortedTrends.length - 1 + i) + intercept;
      const clampedValue = Math.max(0, predictedValue);

      forecastValues.push(clampedValue);
      forecastData.push({
        date: futureDate.toISOString().split('T')[0],
        predicted: parseFloat(clampedValue.toFixed(2)),
      });
    }

    // 5. Calculate confidence bands
    const { lower, upper } = calculateConfidenceBand(forecastValues, prices);
    forecastData.forEach((point, i) => {
      point.lower = parseFloat(lower[i].toFixed(2));
      point.upper = parseFloat(upper[i].toFixed(2));
    });

    // 6. Calculate trend analysis
    const recentPrices = sortedTrends.slice(-5).map(t => t.pricePerM3);
    const olderPrices = sortedTrends
      .slice(0, Math.max(1, sortedTrends.length - 5))
      .map(t => t.pricePerM3);

    const { trend, changePercent } = calculateTrend(recentPrices, olderPrices);

    // 7. Calculate volatility metrics
    const { volatility, coefficientOfVariation, label: volatilityLabel } =
      calculateVolatility(prices);

    // 8. Determine confidence level
    let confidence: "high" | "medium" | "low" = "medium";
    if (
      coefficientOfVariation < 0.1 &&
      trends.length > 10 &&
      rSquared > 0.7
    ) {
      confidence = "high";
    } else if (
      coefficientOfVariation > 0.3 ||
      trends.length < 5 ||
      rSquared < 0.3
    ) {
      confidence = "low";
    }

    // 9. Calculate price range from recent data
    const priceRange = {
      min: parseFloat(Math.min(...recentPrices).toFixed(2)),
      median: parseFloat(calculateMedian(recentPrices).toFixed(2)),
      max: parseFloat(Math.max(...recentPrices).toFixed(2)),
    };

    // 10. Calculate forecast change
    const lastPrice = sortedTrends[sortedTrends.length - 1].pricePerM3;
    const forecastPrice = forecastData[forecastData.length - 1].predicted;
    const forecastChange = ((forecastPrice - lastPrice) / lastPrice) * 100;

    return {
      historicalData,
      movingAverage,
      forecastData,
      summary: {
        trend,
        confidence,
        forecastChange: parseFloat(forecastChange.toFixed(2)),
        volatility: parseFloat(volatility.toFixed(2)),
        volatilityLabel,
        lastPrice: parseFloat(lastPrice.toFixed(2)),
        forecastPrice: parseFloat(forecastPrice.toFixed(2)),
        priceRange,
      },
      statsMeta: {
        dataPoints: trends.length,
        coefficientOfVariation: parseFloat(coefficientOfVariation.toFixed(4)),
        slope: parseFloat(slope.toFixed(4)),
        intercept: parseFloat(intercept.toFixed(2)),
        rSquared: parseFloat(rSquared.toFixed(4)),
      },
    };
  }, [trends, forecastPeriods, movingAverageWindow, model]);
}
