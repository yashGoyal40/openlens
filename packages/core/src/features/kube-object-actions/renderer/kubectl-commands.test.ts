/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getNodeDrainCommand, getPodAttachCommand, getPodShellCommand, quoteShellArgument } from "./kubectl-commands";

const target = {
  podName: "web-7d9f",
  namespace: "shop",
  containerName: "app",
};

describe("kubectl commands for kube object actions", () => {
  it("execs a shell that falls back from bash to ash to sh and replaces the local shell", () => {
    expect(getPodShellCommand(target, { isWindowsHost: false, isWindowsPod: false })).toBe(
      `exec kubectl exec -i -t -n shop web-7d9f -c app -- sh -c "clear; (bash || ash || sh)"`,
    );
  });

  it("uses powershell for windows pods and does not exec on windows hosts", () => {
    expect(getPodShellCommand(target, { isWindowsHost: true, isWindowsPod: true })).toBe(
      "kubectl exec -i -t -n shop web-7d9f -c app -- powershell",
    );
  });

  it("attaches to the selected container", () => {
    expect(getPodAttachCommand(target, { isWindowsHost: false })).toBe(
      "exec kubectl attach -i -t -n shop web-7d9f -c app",
    );
  });

  it("drains a node while ignoring daemonsets", () => {
    expect(getNodeDrainCommand("ip-10-0-0-1.ec2.internal")).toBe(
      "kubectl drain ip-10-0-0-1.ec2.internal --delete-emptydir-data --ignore-daemonsets --force",
    );
  });

  it("quotes arguments that the local shell could interpret", () => {
    expect(quoteShellArgument("a; rm -rf ~")).toBe(`'a; rm -rf ~'`);
    expect(quoteShellArgument("it's")).toBe(`'it'\\''s'`);
    expect(quoteShellArgument("plain-name.1")).toBe("plain-name.1");
  });
});
