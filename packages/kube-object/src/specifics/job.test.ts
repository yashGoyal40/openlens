/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Job } from "./job";

const jobWithConditions = (conditions: { type: string; status: string }[]) =>
  new Job({
    apiVersion: "batch/v1",
    kind: "Job",
    metadata: {
      name: "some-job",
      namespace: "some-namespace",
      resourceVersion: "1",
      uid: "some-uid",
      selfLink: "/apis/batch/v1/namespaces/some-namespace/jobs/some-job",
    },
    spec: { template: { spec: { containers: [] } } } as never,
    status: { conditions } as never,
  });

describe("Job", () => {
  describe("getCondition()", () => {
    it("gives the final condition when newer ones are set before it", () => {
      const job = jobWithConditions([
        { type: "SuccessCriteriaMet", status: "True" },
        { type: "Complete", status: "True" },
      ]);

      expect(job.getCondition()?.type).toBe("Complete");
    });

    it("gives a failure over its target", () => {
      const job = jobWithConditions([
        { type: "FailureTarget", status: "True" },
        { type: "Failed", status: "True" },
      ]);

      expect(job.getCondition()?.type).toBe("Failed");
    });

    it("falls back to the first true condition", () => {
      const job = jobWithConditions([
        { type: "Suspended", status: "False" },
        { type: "SuccessCriteriaMet", status: "True" },
      ]);

      expect(job.getCondition()?.type).toBe("SuccessCriteriaMet");
    });

    it("has none while running", () => {
      expect(jobWithConditions([]).getCondition()).toBeUndefined();
    });
  });
});
