/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import React from "react";
import type { RenderResult } from "@testing-library/react";
import { fireEvent, waitFor } from "@testing-library/react";
import type { DiContainer } from "@ogre-tools/injectable";
import { Deployment, Node, Pod } from "@k8slens/kube-object";
import { podApiInjectable, nodeApiInjectable } from "@k8slens/kube-api-specifics";
import { showCheckedErrorNotificationInjectable, showInfoNotificationInjectable, showSuccessNotificationInjectable } from "@k8slens/notifications";
import { getDiForUnitTesting } from "../../../renderer/getDiForUnitTesting";
import type { DiRender } from "../../../renderer/components/test-utils/renderFor";
import { renderFor } from "../../../renderer/components/test-utils/renderFor";
import { MenuContext } from "../../../renderer/components/menu";
import createTerminalTabInjectable from "../../../renderer/components/dock/terminal/create-terminal-tab.injectable";
import sendCommandInjectable from "../../../renderer/components/dock/terminal/send-command.injectable";
import createPodLogsTabInjectable from "../../../renderer/components/dock/logs/create-pod-logs-tab.injectable";
import createLogsTabInjectable from "../../../renderer/components/dock/logs/create-logs-tab.injectable";
import openConfirmDialogInjectable from "../../../renderer/components/confirm-dialog/open.injectable";
import type { ConfirmDialogParams } from "../../../renderer/components/confirm-dialog/confirm-dialog";
import isWindowsInjectable from "../../../common/vars/is-windows.injectable";
import hideDetailsInjectable from "../../../renderer/components/kube-detail-params/hide-details.injectable";
import { PodActions } from "./pod-actions";
import { NodeActions } from "./node-actions";
import { WorkloadLogsAction } from "./workload-logs-action";
import { JsonApiErrorParsed } from "@k8slens/json-api";

const createPod = (containerNames: string[], runningContainerNames = containerNames) => new Pod({
  apiVersion: "v1",
  kind: "Pod",
  metadata: {
    name: "web-7d9f",
    namespace: "shop",
    uid: "pod-uid",
    resourceVersion: "1",
    selfLink: "/api/v1/namespaces/shop/pods/web-7d9f",
    ownerReferences: [{ apiVersion: "apps/v1", kind: "ReplicaSet", name: "web-5c4", uid: "rs-uid", controller: true }],
  },
  spec: {
    containers: containerNames.map(name => ({ name, image: `${name}:1` })),
  },
  status: {
    phase: "Running",
    conditions: [],
    hostIP: "10.0.0.1",
    podIP: "10.1.0.1",
    startTime: "2026-01-01T00:00:00Z",
    containerStatuses: containerNames.map(name => ({
      name,
      image: `${name}:1`,
      imageID: "",
      ready: runningContainerNames.includes(name),
      restartCount: 0,
      state: runningContainerNames.includes(name)
        ? { running: { startedAt: "2026-01-01T00:00:00Z" }}
        : { waiting: { reason: "CrashLoopBackOff", message: "back-off restarting failed container" }},
    })),
  },
});

const createNode = (unschedulable?: boolean) => new Node({
  apiVersion: "v1",
  kind: "Node",
  metadata: {
    name: "ip-10-0-0-1",
    uid: "node-uid",
    resourceVersion: "1",
    selfLink: "/api/v1/nodes/ip-10-0-0-1",
  },
  spec: { unschedulable },
});

describe("kube object actions", () => {
  let di: DiContainer;
  let render: DiRender;
  let createTerminalTab: jest.Mock;
  let sendCommand: jest.Mock;
  let createPodLogsTab: jest.Mock;
  let createLogsTab: jest.Mock;
  let openConfirmDialog: jest.Mock;
  let showInfoNotification: jest.Mock;
  let hideDetails: jest.Mock;
  let podApi: { evict: jest.Mock; list: jest.Mock };
  let showSuccessNotification: jest.Mock;
  let showCheckedErrorNotification: jest.Mock;
  let nodeApi: { patch: jest.Mock };

  const renderInMenu = (ui: React.ReactElement): RenderResult => render(
    <MenuContext.Provider value={{ props: { closeOnClickItem: false }, close: () => {} } as any}>
      <ul>{ui}</ul>
    </MenuContext.Provider>,
  );

  beforeEach(() => {
    di = getDiForUnitTesting();

    createTerminalTab = jest.fn(() => ({ id: "some-terminal-tab" }));
    sendCommand = jest.fn(async () => {});
    createPodLogsTab = jest.fn(() => "some-logs-tab");
    createLogsTab = jest.fn(() => "some-logs-tab");
    openConfirmDialog = jest.fn();
    showInfoNotification = jest.fn();
    hideDetails = jest.fn();
    podApi = { evict: jest.fn(async () => "evicted"), list: jest.fn() };
    nodeApi = { patch: jest.fn(async () => null) };

    di.override(createTerminalTabInjectable, () => createTerminalTab);
    di.override(sendCommandInjectable, () => sendCommand);
    di.override(createPodLogsTabInjectable, () => createPodLogsTab);
    di.override(createLogsTabInjectable, () => createLogsTab);
    di.override(openConfirmDialogInjectable, () => openConfirmDialog);
    di.override(podApiInjectable, () => podApi as any);
    di.override(nodeApiInjectable, () => nodeApi as any);
    di.override(isWindowsInjectable, () => false);
    di.override(hideDetailsInjectable, () => hideDetails);
    di.override(showInfoNotificationInjectable, () => showInfoNotification);
    showSuccessNotification = jest.fn();
    showCheckedErrorNotification = jest.fn();
    di.override(showSuccessNotificationInjectable, () => showSuccessNotification);
    di.override(showCheckedErrorNotificationInjectable, () => showCheckedErrorNotification);

    render = renderFor(di);
  });

  describe("for a pod with a single running container", () => {
    let result: RenderResult;
    let pod: Pod;

    beforeEach(() => {
      pod = createPod(["app"]);
      result = renderInMenu(<PodActions object={pod} />);
    });

    it("opens a shell into the container in a new terminal tab", () => {
      fireEvent.click(result.getByTestId("pod-action-shell"));

      expect(createTerminalTab).toHaveBeenCalledWith({ title: "Pod: web-7d9f (namespace: shop)" });
      expect(sendCommand).toHaveBeenCalledWith(
        `exec kubectl exec -i -t -n shop web-7d9f -c app -- sh -c "clear; (bash || ash || sh)"`,
        { enter: true, tabId: "some-terminal-tab" },
      );
    });

    it("closes the details drawer so the terminal is not hidden behind it", () => {
      fireEvent.click(result.getByTestId("pod-action-shell"));

      expect(hideDetails).toHaveBeenCalled();
    });

    it("attaches to the container in a new terminal tab", () => {
      fireEvent.click(result.getByTestId("pod-action-attach"));

      expect(sendCommand).toHaveBeenCalledWith(
        "exec kubectl attach -i -t -n shop web-7d9f -c app",
        { enter: true, tabId: "some-terminal-tab" },
      );
    });

    it("opens the logs of the container", () => {
      fireEvent.click(result.getByTestId("pod-action-logs"));

      expect(createPodLogsTab).toHaveBeenCalledWith({
        selectedPod: pod,
        selectedContainer: expect.objectContaining({ name: "app" }),
      });
      expect(hideDetails).toHaveBeenCalled();
    });

    it("evicts the pod only after confirmation", async () => {
      fireEvent.click(result.getByTestId("pod-action-evict"));

      expect(podApi.evict).not.toHaveBeenCalled();

      const [[params]] = openConfirmDialog.mock.calls as [[ConfirmDialogParams]];

      await params.ok?.();

      expect(podApi.evict).toHaveBeenCalledWith({ name: "web-7d9f", namespace: "shop" });
      expect(showSuccessNotification).toHaveBeenCalledWith("Pod web-7d9f was evicted");
    });

    it("does not claim success when the eviction is refused", async () => {
      // like a 403, which the request layer already shows as a notification
      const refused = new JsonApiErrorParsed({ message: "forbidden" }, ["forbidden"]);

      refused.isUsedForNotification = true;
      podApi.evict.mockRejectedValue(refused);

      fireEvent.click(result.getByTestId("pod-action-evict"));

      const [[params]] = openConfirmDialog.mock.calls as [[ConfirmDialogParams]];

      await params.ok?.();

      expect(showSuccessNotification).not.toHaveBeenCalled();
      expect(showCheckedErrorNotification).not.toHaveBeenCalled();
      expect(hideDetails).not.toHaveBeenCalled();
    });

    it("shows other eviction failures", async () => {
      podApi.evict.mockRejectedValue("Cannot evict pod as it would violate the pod's disruption budget.");

      fireEvent.click(result.getByTestId("pod-action-evict"));

      const [[params]] = openConfirmDialog.mock.calls as [[ConfirmDialogParams]];

      await params.ok?.();

      expect(showSuccessNotification).not.toHaveBeenCalled();
      expect(showCheckedErrorNotification).toHaveBeenCalledWith(
        "Cannot evict pod as it would violate the pod's disruption budget.",
        expect.any(String),
      );
    });
  });

  describe("for a pod with several containers", () => {
    let result: RenderResult;

    beforeEach(() => {
      result = renderInMenu(<PodActions object={createPod(["app", "sidecar", "crashing"], ["app", "sidecar"])} />);
    });

    it("lets the user pick which running container to open a shell in", () => {
      expect(result.queryByTestId("pod-action-shell-crashing")).not.toBeInTheDocument();

      fireEvent.click(result.getByTestId("pod-action-shell-sidecar"));

      expect(sendCommand).toHaveBeenCalledWith(
        expect.stringContaining("-c sidecar --"),
        { enter: true, tabId: "some-terminal-tab" },
      );
    });

    it("offers logs for every container, including ones not running", () => {
      fireEvent.click(result.getByTestId("pod-action-logs-crashing"));

      expect(createPodLogsTab).toHaveBeenCalledWith(expect.objectContaining({
        selectedContainer: expect.objectContaining({ name: "crashing" }),
      }));
    });
  });

  it("disables shell for a pod without running containers", () => {
    const result = renderInMenu(<PodActions object={createPod(["app"], [])} />);

    expect(result.getByTestId("pod-action-shell")).toHaveClass("disabled");
  });

  describe("for a schedulable node", () => {
    let result: RenderResult;

    beforeEach(() => {
      result = renderInMenu(<NodeActions object={createNode()} />);
    });

    it("opens a node shell tab", () => {
      fireEvent.click(result.getByTestId("node-action-shell"));

      expect(createTerminalTab).toHaveBeenCalledWith({ title: "Node: ip-10-0-0-1", node: "ip-10-0-0-1" });
      expect(hideDetails).toHaveBeenCalled();
    });

    it("cordons the node", () => {
      fireEvent.click(result.getByTestId("node-action-cordon"));

      expect(nodeApi.patch).toHaveBeenCalledWith({ name: "ip-10-0-0-1" }, { spec: { unschedulable: true }}, "strategic");
      expect(hideDetails).not.toHaveBeenCalled();
    });

    it("drains the node in a terminal only after confirmation", () => {
      fireEvent.click(result.getByTestId("node-action-drain"));

      expect(sendCommand).not.toHaveBeenCalled();

      const [[params]] = openConfirmDialog.mock.calls as [[ConfirmDialogParams]];

      void params.ok?.();

      expect(sendCommand).toHaveBeenCalledWith(
        "kubectl drain ip-10-0-0-1 --delete-emptydir-data --ignore-daemonsets --force",
        { enter: true, tabId: "some-terminal-tab" },
      );
      expect(hideDetails).toHaveBeenCalled();
    });
  });

  it("uncordons a cordoned node", () => {
    const result = renderInMenu(<NodeActions object={createNode(true)} />);

    fireEvent.click(result.getByTestId("node-action-uncordon"));

    expect(nodeApi.patch).toHaveBeenCalledWith({ name: "ip-10-0-0-1" }, { spec: { unschedulable: false }}, "strategic");
  });

  describe("logs for a deployment", () => {
    const deployment = new Deployment({
      apiVersion: "apps/v1",
      kind: "Deployment",
      metadata: {
        name: "web",
        namespace: "shop",
        uid: "deployment-uid",
        resourceVersion: "1",
        selfLink: "/apis/apps/v1/namespaces/shop/deployments/web",
      },
      spec: {
        selector: { matchLabels: { app: "web" }},
        template: { metadata: {}, spec: { containers: [] }},
      } as any,
    });

    it("opens the logs of a pod selected by the deployment, owned by its replica set", async () => {
      podApi.list.mockResolvedValue([createPod(["app"])]);

      const result = renderInMenu(<WorkloadLogsAction object={deployment} />);

      fireEvent.click(result.getByTestId("workload-action-logs"));

      await waitFor(() => expect(createLogsTab).toHaveBeenCalled());

      expect(podApi.list).toHaveBeenCalledWith({ namespace: "shop" }, { labelSelector: ["app=web"] });
      expect(createLogsTab).toHaveBeenCalledWith("Deployment web", {
        owner: expect.objectContaining({ kind: "ReplicaSet", uid: "rs-uid" }),
        namespace: "shop",
        selectedPodId: "pod-uid",
        selectedContainer: "app",
      });
      expect(hideDetails).toHaveBeenCalled();
    });

    it("tells the user when there are no pods", async () => {
      podApi.list.mockResolvedValue([]);

      const result = renderInMenu(<WorkloadLogsAction object={deployment} />);

      fireEvent.click(result.getByTestId("workload-action-logs"));

      await waitFor(() => expect(showInfoNotification).toHaveBeenCalledWith("Deployment web has no pods to show logs for"));
      expect(createLogsTab).not.toHaveBeenCalled();
      expect(hideDetails).not.toHaveBeenCalled();
    });
  });
});
