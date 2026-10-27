/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

export interface PodContainerTarget {
  podName: string;
  namespace: string;
  containerName: string;
}

/**
 * Kubernetes object names are DNS labels/subdomains, but quote anyway so a
 * hand-crafted name can never be interpreted by the local shell.
 */
export const quoteShellArgument = (value: string) => (
  /^[A-Za-z0-9._:/=-]+$/.test(value)
    ? value
    : `'${value.replace(/'/g, `'\\''`)}'`
);

const joinCommand = (parts: string[]) => parts.map(quoteShellArgument).join(" ");

/**
 * On non-Windows hosts the local shell is replaced (`exec`) so that the dock tab
 * closes when the remote session ends
 */
const replaceLocalShell = (command: string, isWindowsHost: boolean) => (
  isWindowsHost
    ? command
    : `exec ${command}`
);

export const getPodShellCommand = (
  { podName, namespace, containerName }: PodContainerTarget,
  { isWindowsHost, isWindowsPod }: { isWindowsHost: boolean; isWindowsPod: boolean },
) => {
  const kubectlExec = joinCommand(["kubectl", "exec", "-i", "-t", "-n", namespace, podName, "-c", containerName, "--"]);
  const remoteShell = isWindowsPod
    ? "powershell"
    : `sh -c "clear; (bash || ash || sh)"`;

  return replaceLocalShell(`${kubectlExec} ${remoteShell}`, isWindowsHost);
};

export const getPodAttachCommand = (
  { podName, namespace, containerName }: PodContainerTarget,
  { isWindowsHost }: { isWindowsHost: boolean },
) => replaceLocalShell(
  joinCommand(["kubectl", "attach", "-i", "-t", "-n", namespace, podName, "-c", containerName]),
  isWindowsHost,
);

export const getNodeDrainCommand = (nodeName: string) => joinCommand([
  "kubectl", "drain", nodeName,
  "--delete-emptydir-data",
  "--ignore-daemonsets",
  "--force",
]);
