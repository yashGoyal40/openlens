/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { Job } from "@k8slens/kube-object";
import { getJobDuration, getJobState } from "./job-history";

const job = (status: object) => new Job({
  apiVersion: "batch/v1",
  kind: "Job",
  metadata: {
    name: "some-job",
    namespace: "some-namespace",
    uid: "some-uid",
    resourceVersion: "1",
    selfLink: "/apis/batch/v1/namespaces/some-namespace/jobs/some-job",
  },
  spec: { template: { spec: { containers: [] }}} as never,
  status: status as never,
});

describe("job history", () => {
  it("measures a finished job from start to completion", () => {
    const finished = job({
      startTime: "2026-10-28T10:00:00Z",
      completionTime: "2026-10-28T10:00:06Z",
      conditions: [{ type: "Complete", status: "True" }],
    });

    expect(getJobDuration(finished, Date.parse("2026-10-28T12:00:00Z"))).toBe(6000);
    expect(getJobState(finished)).toBe("complete");
  });

  it("finds the final condition among newer ones", () => {
    const finished = job({
      conditions: [
        { type: "SuccessCriteriaMet", status: "True" },
        { type: "Complete", status: "True" },
      ],
    });
    const failed = job({
      conditions: [
        { type: "FailureTarget", status: "True" },
        { type: "Failed", status: "True" },
      ],
    });

    expect(getJobState(finished)).toBe("complete");
    expect(getJobState(failed)).toBe("failed");
  });

  it("measures a running job until now", () => {
    const running = job({ startTime: "2026-10-28T10:00:00Z" });

    expect(getJobDuration(running, Date.parse("2026-10-28T10:01:00Z"))).toBe(60_000);
    expect(getJobState(running)).toBe("running");
  });

  it("has no duration before it starts", () => {
    expect(getJobDuration(job({}), Date.now())).toBeUndefined();
  });
});
