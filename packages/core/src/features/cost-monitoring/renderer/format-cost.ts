/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

const fallbackCurrency = "USD";

const createFormatter = (currency: string) => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    // RangeError for codes which are not ISO 4217
    return undefined;
  }
};

export const isValidCurrency = (currency: string) => Boolean(currency.trim() && createFormatter(currency.trim()));

export type FormatCost = (value: number) => string;

/**
 * Formats amounts with two fractions, showing that tiny amounts are not zero
 */
export const createCostFormatter = (currency: string): FormatCost => {
  const formatter = createFormatter(currency.trim() || fallbackCurrency) ?? createFormatter(fallbackCurrency);

  return (value) => {
    if (!formatter) {
      return value.toFixed(2);
    }

    if (value > 0 && value < 0.01) {
      return `<${formatter.format(0.01)}`;
    }

    return formatter.format(value);
  };
};

/**
 * Formats an efficiency ratio, where 1 is fully used
 */
export const formatEfficiency = (ratio: number | undefined) => (
  ratio === undefined
    ? "-"
    : `${(ratio * 100).toFixed(1)}%`
);

export const formatShare = (share: number) => `${(share * 100).toFixed(1)}%`;
