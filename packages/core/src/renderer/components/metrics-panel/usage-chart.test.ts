/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { formatUsage } from "./usage-chart";

describe("formatUsage", () => {
  it("keeps small CPU values apart", () => {
    expect(formatUsage(0.0015, "cores")).toBe("0.0015");
    expect(formatUsage(0.001, "cores")).toBe("0.001");
    expect(formatUsage(1.5, "cores")).toBe("1.5");
    expect(formatUsage(123.456, "cores")).toBe("123.5");
  });

  it("shows zero as 0", () => {
    expect(formatUsage(0, "bytes")).toBe("0");
    expect(formatUsage(0, "cores")).toBe("0");
  });

  it("uses units for bytes and whole numbers for counts", () => {
    expect(formatUsage(64 * 1024 * 1024, "bytes")).toBe("64.0MiB");
    expect(formatUsage(12.4, "count")).toBe("12");
  });
});
