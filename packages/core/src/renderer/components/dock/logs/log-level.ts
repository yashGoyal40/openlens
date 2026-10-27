/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * The severities which are highlighted in the logs, everything else is shown as is
 */
export type HighlightedLogLevel = "error" | "warn" | "debug";

type LogLevel = HighlightedLogLevel | "info";

const levelsByName = new Map<string, LogLevel>([
  ["emerg", "error"],
  ["emergency", "error"],
  ["alert", "error"],
  ["crit", "error"],
  ["critical", "error"],
  ["fatal", "error"],
  ["panic", "error"],
  ["dpanic", "error"],
  ["error", "error"],
  ["err", "error"],
  ["eror", "error"],
  ["severe", "error"],
  ["warn", "warn"],
  ["warning", "warn"],
  ["wrn", "warn"],
  ["info", "info"],
  ["inf", "info"],
  ["information", "info"],
  ["notice", "info"],
  ["debug", "debug"],
  ["dbg", "debug"],
  ["trace", "debug"],
  ["trc", "debug"],
  ["verbose", "debug"],
]);

// eslint-disable-next-line no-control-regex
const ansiEscapeCodesRegex = /\u001b\[[0-9;]*[A-Za-z]/g;
const leadingTimestampRegex = /^\d{4}-\d{2}-\d{2}T\S+\s?/;
const leadingContainerPrefixRegex = /^\[[^\]\s]+\]\s?/;

/**
 * JSON structured logs, eg. `{"level":"error"}`, `{"severity":"WARNING"}` or `{"level":50}` (pino/bunyan)
 */
const jsonLevelRegex = /"(?:level|severity|lvl|loglevel|log\.level)"\s*:\s*(?:"([^"]*)"|(\d+))/i;

/**
 * logfmt structured logs, eg. `level=error` or `lvl="warn"`
 */
const logfmtLevelRegex = /(?:^|\s)(?:level|lvl|severity)=(?:"([^"]*)"|([^\s"]+))/i;

/**
 * klog / glog header, eg. `E0102 15:04:05.123456 ...`
 */
const klogLevelRegex = /^([EFWI])\d{4} \d{2}:\d{2}:\d{2}\.\d+\s/;

/**
 * Level names in capitals anywhere in the line, eg. `2023-01-02 ERROR [main] ...`
 */
const upperCaseLevelRegex = /\b(EMERG(?:ENCY)?|ALERT|CRIT(?:ICAL)?|FATAL|D?PANIC|ERROR|ERR|SEVERE|WARN(?:ING)?|INFO|NOTICE|DEBUG|DBG|TRACE)\b/;

/**
 * Level names in any case when they are clearly marked as such, eg. `[error]`, `<warn>` or `Warning: ...`
 */
const markedLevelRegex = /[[(<]\s*(emerg|alert|crit|critical|fatal|panic|error|err|warn|warning|info|notice|debug|trace)\s*[\])>]|^\s*(fatal|panic|error|warn|warning|info|debug|trace)\s*:/i;

const toLevel = (name: string | undefined): LogLevel | undefined => (
  name
    ? levelsByName.get(name.trim().toLowerCase())
    : undefined
);

const fromNumericLevel = (level: number): LogLevel => {
  if (level >= 50) {
    return "error";
  }

  if (level >= 40) {
    return "warn";
  }

  if (level >= 30) {
    return "info";
  }

  return "debug";
};

const fromKlogLevel = (level: string): LogLevel => {
  switch (level) {
    case "E":
    case "F":
      return "error";
    case "W":
      return "warn";
    default:
      return "info";
  }
};

/**
 * Removes the parts of a displayed log line which are not part of the message itself
 * @param line The log line as displayed
 * @param hasContainerPrefix Whether the line is prefixed with `[container-name]`
 */
export function getLogMessage(line: string, hasContainerPrefix = false): string {
  let message = line.replace(ansiEscapeCodesRegex, "").replace(leadingTimestampRegex, "");

  if (hasContainerPrefix) {
    message = message.replace(leadingContainerPrefixRegex, "");
  }

  return message;
}

const detectLevel = (message: string): LogLevel | undefined => {
  const jsonMatch = jsonLevelRegex.exec(message);

  if (jsonMatch) {
    const [, name, numeric] = jsonMatch;

    return numeric
      ? fromNumericLevel(Number(numeric))
      : toLevel(name);
  }

  const logfmtMatch = logfmtLevelRegex.exec(message);

  if (logfmtMatch) {
    return toLevel(logfmtMatch[1] ?? logfmtMatch[2]);
  }

  const klogMatch = klogLevelRegex.exec(message);

  if (klogMatch) {
    return fromKlogLevel(klogMatch[1]);
  }

  const upperCaseMatch = upperCaseLevelRegex.exec(message);
  const markedMatch = markedLevelRegex.exec(message);

  // The level which comes first in the line is most likely the level of the line
  if (upperCaseMatch && (!markedMatch || upperCaseMatch.index <= markedMatch.index)) {
    return toLevel(upperCaseMatch[1]);
  }

  if (markedMatch) {
    return toLevel(markedMatch[1] ?? markedMatch[2]);
  }

  return undefined;
};

/**
 * Detects the severity of a log message from the most common log formats: plain level names,
 * logfmt (`level=`), JSON (`"level"` / `"severity"` fields) and klog headers.
 * @param message The log message, see {@link getLogMessage}
 * @returns The level if it should be highlighted
 */
export function detectLogLevel(message: string): HighlightedLogLevel | undefined {
  const level = detectLevel(message);

  return level === "info"
    ? undefined
    : level;
}
