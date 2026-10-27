/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { detectLogLevel, getLogMessage } from "../log-level";

describe("log level detection", () => {
  describe("detectLogLevel()", () => {
    it.each([
      // plain level words
      ["2023-01-02 10:00:00.000 ERROR 1 --- [main] o.s.boot.SpringApplication : failed", "error"],
      ["FATAL: database is gone", "error"],
      ["panic: runtime error: index out of range", "error"],
      ["[error] 7#7: *1 open() failed", "error"],
      ["<crit> disk full", "error"],
      ["WARNING:root:something is odd", "warn"],
      ["2023/01/02 10:00:00 [warn] upstream is slow", "warn"],
      ["Warning: deprecated flag", "warn"],
      ["DEBUG connecting to db", "debug"],
      ["TRACE entering function", "debug"],
      // logfmt
      ["time=2023-01-02T10:00:00Z level=error msg=\"failed to sync\"", "error"],
      ["ts=1 lvl=warn msg=slow", "warn"],
      ["level=\"debug\" msg=details", "debug"],
      ["severity=CRITICAL msg=boom", "error"],
      // JSON
      ["{\"level\":\"error\",\"msg\":\"failed\"}", "error"],
      ["{\"severity\": \"WARNING\", \"message\": \"slow\"}", "warn"],
      ["{\"level\":\"trace\",\"msg\":\"x\"}", "debug"],
      ["{\"level\":60,\"msg\":\"pino fatal\"}", "error"],
      ["{\"level\":40,\"msg\":\"pino warn\"}", "warn"],
      ["{\"level\":20,\"msg\":\"pino debug\"}", "debug"],
      // klog
      ["E0102 10:00:00.123456       1 controller.go:42] failed", "error"],
      ["W0102 10:00:00.123456       1 controller.go:42] retrying", "warn"],
    ])("given %j, detects %s", (message, level) => {
      expect(detectLogLevel(message)).toBe(level);
    });

    it.each([
      "INFO server started",
      "{\"level\":\"info\",\"msg\":\"ok\"}",
      "level=info msg=\"error count is 0\"",
      "I0102 10:00:00.123456       1 main.go:1] ERROR is not the level here",
      "{\"level\":30,\"msg\":\"ERROR\"}",
      "no errors were found",
      "ERR_CONNECTION_REFUSED is just a code",
      "plain line",
      "",
    ])("given %j, detects no highlighted level", (message) => {
      expect(detectLogLevel(message)).toBeUndefined();
    });

    it("uses the level which appears first", () => {
      expect(detectLogLevel("INFO request failed with ERROR")).toBeUndefined();
      expect(detectLogLevel("ERROR [info] something")).toBe("error");
    });
  });

  describe("getLogMessage()", () => {
    it("removes ANSI color codes", () => {
      expect(getLogMessage("\u001b[31mERROR\u001b[0m failed")).toBe("ERROR failed");
    });

    it("removes a leading timestamp", () => {
      expect(getLogMessage("2023-01-02T10:00:00+00:00 E0102 10:00:00.123456 1 a.go:1] x")).toBe("E0102 10:00:00.123456 1 a.go:1] x");
    });

    it("removes a container prefix when the line has one", () => {
      expect(getLogMessage("[debug] [warn] message", true)).toBe("[warn] message");
      expect(detectLogLevel(getLogMessage("2023-01-02T10:00:00+00:00 [debug] Warning: x", true))).toBe("warn");
    });

    it("keeps a bracketed prefix when the line has no container prefix", () => {
      expect(getLogMessage("[debug] message")).toBe("[debug] message");
    });
  });
});
