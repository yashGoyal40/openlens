/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

export interface LogsSinceOption {
  /**
   * The value for `sinceSeconds`, `0` means all logs
   */
  value: number;
  label: string;
}

const minute = 60;
const hour = 60 * minute;

export const logsSinceOptions: LogsSinceOption[] = [
  { value: 0, label: "All" },
  { value: 5 * minute, label: "5m" },
  { value: 15 * minute, label: "15m" },
  { value: hour, label: "1h" },
  { value: 6 * hour, label: "6h" },
  { value: 24 * hour, label: "24h" },
];
