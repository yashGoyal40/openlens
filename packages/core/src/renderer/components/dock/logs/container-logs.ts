/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { ResourceDescriptor } from "@k8slens/kube-api";
import type { CallForLogs, PodLogsRequestQuery } from "./call-for-logs.injectable";

export interface ContainerLogs {
  container: string;

  /**
   * Log lines, each starting with a timestamp
   */
  lines: string[];
}

const timestampRegex = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})?\s/;

/**
 * Kubernetes timestamps are RFC3339 with up to nanosecond precision and with trailing zeros
 * removed, so they are not sortable as text
 * @returns A key which sorts in chronological order or `undefined` if the line has no timestamp
 */
const getSortKey = (line: string): string | undefined => {
  const match = timestampRegex.exec(line);

  if (!match) {
    return undefined;
  }

  const [, dateTime, fraction = "", zone = "Z"] = match;
  const milliseconds = Date.parse(`${dateTime}${zone}`);

  if (Number.isNaN(milliseconds)) {
    return undefined;
  }

  return `${String(milliseconds).padStart(15, "0")}${fraction.padEnd(9, "0").slice(0, 9)}`;
};

/**
 * Removes the leading timestamp of a log line
 */
export const removeLogTimestamp = (line: string): string => line.replace(/^\d+.*?\s/, "");

/**
 * Splits the text of a pod logs response into lines
 */
export const splitLogLines = (logs: string): string[] => logs.trimEnd().replace(/\r/g, "\n").split("\n");

/**
 * Prefixes the log lines with `[container]` (after the timestamp) and merges them in
 * chronological order
 */
export function mergeContainerLogs(containerLogs: ContainerLogs[]): string[] {
  const entries = containerLogs.flatMap(({ container, lines }) => {
    let previousKey = "";

    return lines
      .filter(Boolean)
      .map(line => {
        // Lines without a timestamp stay with the line before them
        const key = getSortKey(line) ?? previousKey;
        const [timestamp] = line.match(/^\S+/) ?? [""];
        const prefixed = timestampRegex.test(line)
          ? `${timestamp} [${container}]${line.slice(timestamp.length)}`
          : `[${container}] ${line}`;

        previousKey = key;

        return { key, line: prefixed };
      });
  });

  // Array.prototype.sort is stable so lines with the same timestamp keep their order
  return entries
    .sort((left, right) => (left.key < right.key ? -1 : left.key > right.key ? 1 : 0))
    .map(({ line }) => line);
}

/**
 * Requests the logs (always with timestamps) of several containers and merges them
 * using {@link mergeContainerLogs}. Containers whose logs can't be loaded (eg. because they are
 * not started yet) are skipped, unless the logs of no container can be loaded.
 */
export async function callForMergedContainerLogs(
  callForLogs: CallForLogs,
  params: ResourceDescriptor,
  containers: string[],
  query: Omit<PodLogsRequestQuery, "container" | "timestamps">,
): Promise<string[]> {
  const results = await Promise.allSettled(containers.map(async (container) => ({
    container,
    lines: splitLogLines(await callForLogs(params, { ...query, timestamps: true, container })),
  })));
  const loaded = results.flatMap(result => result.status === "fulfilled" ? [result.value] : []);

  if (loaded.length === 0) {
    const failure = results.find((result): result is PromiseRejectedResult => result.status === "rejected");

    if (failure) {
      throw failure.reason;
    }
  }

  return mergeContainerLogs(loaded);
}
