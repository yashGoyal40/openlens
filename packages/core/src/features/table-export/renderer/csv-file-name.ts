/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Formats a date (in local time) as `YYYYMMDD-HHmmss`
 */
export function formatFileNameTimestamp(date: Date): string {
  const day = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;

  return `${day}-${time}`;
}

/**
 * Creates a file system friendly file name like `<baseName>-<YYYYMMDD-HHmmss>.csv`
 */
export function getCsvFileName(baseName: string, date: Date): string {
  const safeBaseName = baseName
    .trim()
    .replace(/[^a-z0-9._-]+/gi, "_")
    .replace(/^[._]+|_+$/g, "")
    || "table";

  return `${safeBaseName}-${formatFileNameTimestamp(date)}.csv`;
}
