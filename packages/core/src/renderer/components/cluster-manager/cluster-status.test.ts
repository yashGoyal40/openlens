/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { mergeProblems, toStepTitle, withoutLogPrefix } from "./cluster-status";

describe("cluster connection status", () => {
  it("shows progress messages as step titles", () => {
    expect(toStepTitle("Refreshing connection status ...")).toBe("Refreshing connection status");
    expect(toStepTitle("Authentication proxy started")).toBe("Authentication proxy started");
  });

  it("drops the log prefix of proxy errors", () => {
    expect(withoutLogPrefix("E1028 13:19:48.727846   85154 proxy_server.go:147] Error while proxying request: x509: certificate is not valid"))
      .toBe("Error while proxying request: x509: certificate is not valid");
  });

  it("merges repeated errors from retries and skips progress messages", () => {
    expect(mergeProblems([
      { level: "info", message: "Starting connection ..." },
      { level: "error", message: "E1028 13:19:48.727846   85154 proxy_server.go:147] Error while proxying request: x509" },
      { level: "error", message: "Failed to get /version: Internal Server Error" },
      { level: "error", message: "E1028 13:20:17.702121   85154 proxy_server.go:147] Error while proxying request: x509" },
      { level: "warning", message: "Kube APIs under \"/apis/example.com\" may not be displayed" },
    ])).toEqual([
      { level: "error", message: "Error while proxying request: x509", count: 2 },
      { level: "error", message: "Failed to get /version: Internal Server Error", count: 1 },
      { level: "warning", message: "Kube APIs under \"/apis/example.com\" may not be displayed", count: 1 },
    ]);
  });
});
