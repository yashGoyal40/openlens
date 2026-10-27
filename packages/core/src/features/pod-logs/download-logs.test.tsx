/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { RenderResult } from "@testing-library/react";
import { act, fireEvent, waitFor } from "@testing-library/react";
import getPodByIdInjectable from "../../renderer/components/workloads-pods/get-pod-by-id.injectable";
import getPodsByOwnerIdInjectable from "../../renderer/components/workloads-pods/get-pods-by-owner-id.injectable";
import openSaveFileDialogInjectable from "../../renderer/utils/save-file.injectable";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import dockStoreInjectable from "../../renderer/components/dock/dock/store.injectable";
import areLogsPresentInjectable from "../../renderer/components/dock/logs/are-logs-present.injectable";
import type { CallForLogs } from "../../renderer/components/dock/logs/call-for-logs.injectable";
import callForLogsInjectable from "../../renderer/components/dock/logs/call-for-logs.injectable";
import createPodLogsTabInjectable from "../../renderer/components/dock/logs/create-pod-logs-tab.injectable";
import getLogTabDataInjectable from "../../renderer/components/dock/logs/get-log-tab-data.injectable";
import getLogsWithoutTimestampsInjectable from "../../renderer/components/dock/logs/get-logs-without-timestamps.injectable";
import getLogsInjectable from "../../renderer/components/dock/logs/get-logs.injectable";
import getRandomIdForPodLogsTabInjectable from "../../renderer/components/dock/logs/get-random-id-for-pod-logs-tab.injectable";
import getTimestampSplitLogsInjectable from "../../renderer/components/dock/logs/get-timestamp-split-logs.injectable";
import loadLogsInjectable from "../../renderer/components/dock/logs/load-logs.injectable";
import reloadLogsInjectable from "../../renderer/components/dock/logs/reload-logs.injectable";
import setLogTabDataInjectable from "../../renderer/components/dock/logs/set-log-tab-data.injectable";
import stopLoadingLogsInjectable from "../../renderer/components/dock/logs/stop-loading-logs.injectable";
import { dockerPod } from "../../renderer/components/dock/logs/__test__/pod.mock";
import { showErrorNotificationInjectable } from "@k8slens/notifications";
import type { DiContainer } from "@ogre-tools/injectable";
import assert from "assert";
import type { Container } from "@k8slens/kube-object";
import type { LogTabData } from "../../renderer/components/dock/logs/tab-store";

describe("download logs options in logs dock tab", () => {
  let windowDi: DiContainer;
  let rendered: RenderResult;
  let builder: ApplicationBuilder;
  let openSaveFileDialogMock: jest.MockedFunction<() => void>;
  let callForLogsMock: jest.MockedFunction<CallForLogs>;
  let getLogsMock: jest.Mock;
  let getSplitLogsMock: jest.Mock;
  let showErrorNotificationMock: jest.Mock;
  let logTabData: LogTabData;
  const logs = new Map([["timestamp", "some-logs"]]);
  const pod = dockerPod;

  const container: Container = {
    name: "docker-exporter",
    image: "docker.io/prom/node-exporter:v1.0.0-rc.0",
  };

  beforeEach(() => {
    const selectedPod = dockerPod;

    builder = getApplicationBuilder();
    logTabData = {
      selectedPodId: selectedPod.getId(),
      selectedContainer: selectedPod.getContainers()[0].name,
      namespace: "default",
      showPrevious: true,
      showTimestamps: false,
    };

    builder.setEnvironmentToClusterFrame();

    callForLogsMock = jest.fn();
    getLogsMock = jest.fn();
    getSplitLogsMock = jest.fn();

    builder.beforeWindowStart(({ windowDi }) => {
      windowDi.override(callForLogsInjectable, () => callForLogsMock);

      // Overriding internals of logsViewModelInjectable
      windowDi.override(getLogsInjectable, () => getLogsMock);
      windowDi.override(getLogsWithoutTimestampsInjectable, () => getLogsMock);
      windowDi.override(getTimestampSplitLogsInjectable, () => getSplitLogsMock);
      windowDi.override(reloadLogsInjectable, () => jest.fn());
      windowDi.override(getLogTabDataInjectable, () => () => logTabData);
      windowDi.override(setLogTabDataInjectable, () => jest.fn());
      windowDi.override(loadLogsInjectable, () => jest.fn());
      windowDi.override(stopLoadingLogsInjectable, () => jest.fn());
      windowDi.override(areLogsPresentInjectable, () => jest.fn());
      windowDi.override(getPodByIdInjectable, () => (id) => {
        if (id === selectedPod.getId()) {
          return selectedPod;
        }

        return undefined;
      });
      windowDi.override(getPodsByOwnerIdInjectable, () => jest.fn());

      windowDi.override(getRandomIdForPodLogsTabInjectable, () => jest.fn(() => "some-irrelevant-random-id"));

      openSaveFileDialogMock = jest.fn();
      windowDi.override(openSaveFileDialogInjectable, () => openSaveFileDialogMock);

      showErrorNotificationMock = jest.fn();
      windowDi.override(showErrorNotificationInjectable, () => showErrorNotificationMock);
    });
  });

  describe("opening pod logs", () => {
    beforeEach(async () => {
      rendered = await builder.render();
      windowDi = builder.applicationWindow.only.di;

      const dockStore = windowDi.inject(dockStoreInjectable);

      dockStore.closeTab("terminal");
    });

    describe("when logs not available", () => {
      beforeEach(() => {
        const createLogsTab = windowDi.inject(createPodLogsTabInjectable);

        getLogsMock.mockReturnValue([]);
        getSplitLogsMock.mockReturnValue([]);

        createLogsTab({
          selectedPod: pod,
          selectedContainer: container,
        });
      });

      it("renders", () => {
        expect(rendered.baseElement).toMatchSnapshot();
      });

      it("dropdown being disabled", () => {
        const downloadButton = rendered.getByTestId("download-logs-dropdown");

        expect(downloadButton).toBeDisabled();
      });
    });

    describe("when logs available, showing only lines matching the search and a 'since' is selected", () => {
      beforeEach(() => {
        const createLogsTab = windowDi.inject(createPodLogsTabInjectable);

        logTabData = {
          ...logTabData,
          showOnlyMatching: true,
          sinceSeconds: 3600,
        };
        getLogsMock.mockReturnValue(["some-logs", "other-line", "more-logs"]);
        getSplitLogsMock.mockReturnValue([["timestamp", "some-logs"], ["timestamp", "other-line"], ["timestamp", "more-logs"]]);

        createLogsTab({
          selectedPod: pod,
          selectedContainer: container,
        });
      });

      describe("when searching", () => {
        beforeEach(() => {
          const searchInput = rendered.baseElement.querySelector(".LogSearch input");

          assert(searchInput);
          fireEvent.change(searchInput, { target: { value: "logs" }});
        });

        it("shows only the matching lines", () => {
          const rows = [...rendered.baseElement.querySelectorAll(".LogList .LogRow")].map(row => row.textContent);

          expect(rows).toEqual(["some-logs", "more-logs"]);
        });

        describe("when clicking on dropdown", () => {
          beforeEach(() => {
            act(() => rendered.getByTestId("download-logs-dropdown").click());
          });

          it("shows option to download filtered logs", () => {
            expect(rendered.getByTestId("download-filtered-logs")).toBeInTheDocument();
          });

          it("when selected 'download filtered logs', shows save dialog with only the matching lines", () => {
            rendered.getByTestId("download-filtered-logs").click();

            expect(openSaveFileDialogMock).toHaveBeenCalledWith("dockerExporter-filtered.log", "some-logs\nmore-logs", "text/plain");
          });

          it("when selected 'download visible logs', shows save dialog with all loaded lines", () => {
            rendered.getByTestId("download-visible-logs").click();

            expect(openSaveFileDialogMock).toHaveBeenCalledWith("dockerExporter.log", "some-logs\nother-line\nmore-logs", "text/plain");
          });

          it("when selected 'download all logs', requests logs of the selected time range", async () => {
            callForLogsMock.mockResolvedValue("all-logs");

            await act(async () => rendered.getByTestId("download-all-logs").click());

            expect(callForLogsMock).toHaveBeenCalledWith(
              { name: "dockerExporter", namespace: "default" },
              { previous: true, timestamps: false, container: "docker-exporter", sinceSeconds: 3600 },
            );
          });
        });
      });
    });

    describe("when logs available", () => {
      beforeEach(() => {
        const createLogsTab = windowDi.inject(createPodLogsTabInjectable);

        getLogsMock.mockReturnValue(["some-logs"]);
        getSplitLogsMock.mockReturnValue([...logs]);

        createLogsTab({
          selectedPod: pod,
          selectedContainer: container,
        });
      });

      it("renders", () => {
        expect(rendered.baseElement).toMatchSnapshot();
      });

      it("contains download dropdown button", () =>  {
        expect(rendered.getByTestId("download-logs-dropdown")).toBeInTheDocument();
      });

      it("dropdown is enabled", () => {
        expect(rendered.getByTestId("download-logs-dropdown")).not.toHaveAttribute("disabled");
      });

      describe("when clicking on dropdown", () => {
        beforeEach(() => {
          const button = rendered.getByTestId("download-logs-dropdown");

          act(() => button.click());
        });

        describe("when selected 'download visible logs'", () => {
          beforeEach(() => {
            const button = rendered.getByTestId("download-visible-logs");

            button.click();
          });

          it("shows save dialog with proper attributes", () => {
            expect(openSaveFileDialogMock).toHaveBeenCalledWith("dockerExporter.log", "some-logs", "text/plain");
          });
        });

        describe("when call for all logs resolves with logs", () => {
          beforeEach(() => {
            callForLogsMock.mockResolvedValue("all-logs");
          });

          describe("when selected 'download all logs'", () => {
            beforeEach(() => {
              act(() => {
                const button = rendered.getByTestId("download-all-logs");

                button.click();
              });
            });

            it("logs have been called with query", () => {
              expect(callForLogsMock).toHaveBeenCalledWith(
                { name: "dockerExporter", namespace: "default" },
                { "previous": true, "timestamps": false, container: "docker-exporter" },
              );
            });

            it("shows save dialog with proper attributes", () => {
              expect(openSaveFileDialogMock).toHaveBeenCalledWith("docker-exporter.log", "all-logs", "text/plain");
            });

            it("doesn't block download dropdown for interaction after click", () => {
              expect(rendered.getByTestId("download-logs-dropdown")).not.toHaveAttribute("disabled");
            });
          });

          describe("blocking user interaction after menu item click", () => {
            it("block download dropdown for interaction when selected 'download all logs'", async () => {
              const downloadMenuItem = rendered.getByTestId("download-all-logs");

              act(() => downloadMenuItem.click());

              await waitFor(() => {
                expect(rendered.getByTestId("download-logs-dropdown")).toHaveAttribute("disabled");
              });
            });

            it("doesn't block dropdown for interaction when selected 'download visible logs'", () => {
              const downloadMenuItem = rendered.getByTestId("download-visible-logs");

              act(() => downloadMenuItem.click());

              expect(rendered.getByTestId("download-logs-dropdown")).not.toHaveAttribute("disabled");
            });
          });
        });

        it("doesn't show option to download filtered logs", () => {
          expect(rendered.queryByTestId("download-filtered-logs")).not.toBeInTheDocument();
        });

        describe("when call for logs resolves with no logs", () => {
          beforeEach(() => {
            callForLogsMock.mockResolvedValue("");
          });

          describe("when selected 'download all logs'", () => {
            beforeEach(() => {
              act(() => {
                const button = rendered.getByTestId("download-all-logs");

                button.click();
              });
            });

            it("doesn't show save dialog", () => {
              expect(openSaveFileDialogMock).not.toHaveBeenCalled();
            });

            it("shows error notification", () => {
              expect(showErrorNotificationMock).toHaveBeenCalled();
            });
          });
        });

        describe("when call for logs rejects", () => {
          beforeEach(() => {
            callForLogsMock.mockRejectedValue("error");
          });

          describe("when selected 'download all logs'", () => {
            beforeEach(() => {
              act(() => {
                const button = rendered.getByTestId("download-all-logs");

                button.click();
              });
            });

            it("logs have been called", () => {
              expect(callForLogsMock).toHaveBeenCalledWith(
                { name: "dockerExporter", namespace: "default" },
                { "previous": true, "timestamps": false, container: "docker-exporter" },
              );
            });

            it("doesn't show save dialog", () => {
              expect(openSaveFileDialogMock).not.toHaveBeenCalled();
            });
          });
        });
      });
    });
  });
});
