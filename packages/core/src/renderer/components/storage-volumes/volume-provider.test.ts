/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getProviderRows } from "./volume-provider";

describe("getProviderRows", () => {
  it("names flat fields and adds a row per attribute", () => {
    expect(getProviderRows({
      driver: "ebs.csi.aws.com",
      fsType: "ext4",
      readOnly: false,
      volumeAttributes: { "storage.kubernetes.io/csiProvisionerIdentity": "some-identity" },
    })).toEqual([
      ["Driver", "ebs.csi.aws.com"],
      ["FS Type", "ext4"],
      ["Read Only", "false"],
      ["storage.kubernetes.io/csiProvisionerIdentity", "some-identity"],
    ]);
  });

  it("leaves out nested objects that are not plain maps", () => {
    expect(getProviderRows({
      path: "/data",
      nodePublishSecretRef: { name: "some-secret", nested: { deep: true }},
      monitors: ["a", "b"],
    })).toEqual([["Path", "/data"]]);
  });
});
