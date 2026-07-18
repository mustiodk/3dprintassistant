import { describe, expect, it } from "vitest";

import {
  ContractError,
  parseRegistration,
  parseUnregistration,
  readBoundedJson,
} from "./contracts.js";

const validRegistration = {
  schema_version: 1,
  token: "00aa11",
  environment: "development",
  topics: ["new_printers"],
  app_version: "1.1.0",
  build_number: "202607181200",
};

describe("push registration contracts", () => {
  it("maps the two allowed topics to a stable bit mask", () => {
    expect(parseRegistration(validRegistration).topicsMask).toBe(1);
    expect(
      parseRegistration({
        ...validRegistration,
        topics: ["new_printers", "app_updates"],
      }).topicsMask,
    ).toBe(3);
    expect(
      parseRegistration({ ...validRegistration, topics: ["app_updates"] })
        .topicsMask,
    ).toBe(2);
  });

  it("accepts any non-empty even lowercase hex token length", () => {
    expect(parseRegistration({ ...validRegistration, token: "00" }).tokenHex)
      .toBe("00");
    expect(
      parseRegistration({ ...validRegistration, token: "ab".repeat(128) })
        .tokenHex,
    ).toHaveLength(256);
  });

  it.each([
    [{ ...validRegistration, schema_version: 2 }, "schema_version"],
    [{ ...validRegistration, token: "ABC0" }, "token"],
    [{ ...validRegistration, token: "abc" }, "token"],
    [{ ...validRegistration, environment: "sandbox" }, "environment"],
    [{ ...validRegistration, topics: [] }, "topics"],
    [{ ...validRegistration, topics: ["promotions"] }, "topics"],
    [{ ...validRegistration, topics: ["new_printers", "new_printers"] }, "topics"],
    [{ ...validRegistration, app_version: "1".repeat(33) }, "app_version"],
    [{ ...validRegistration, build_number: "x" }, "build_number"],
    [{ ...validRegistration, build_number: "1".repeat(33) }, "build_number"],
    [{ ...validRegistration, extra: true }, "extra"],
  ])("rejects invalid registration input %#", (body, field) => {
    expect(() => parseRegistration(body)).toThrowError(ContractError);
    expect(() => parseRegistration(body)).toThrow(field);
  });

  it("normalizes an optional previous token for atomic rotation", () => {
    expect(
      parseRegistration({ ...validRegistration, previous_token: "1122" }),
    ).toMatchObject({ previousTokenHex: "1122" });
    expect(parseRegistration(validRegistration).previousTokenHex).toBeUndefined();
  });

  it("parses the exact unregister schema", () => {
    expect(
      parseUnregistration({
        schema_version: 1,
        token: "aabb",
        environment: "production",
      }),
    ).toEqual({ tokenHex: "aabb", environment: "production" });
    expect(() =>
      parseUnregistration({
        schema_version: 1,
        token: "aabb",
        environment: "production",
        topics: [],
      }),
    ).toThrow("topics");
  });

  it("enforces the 4 KiB raw request-body limit", async () => {
    const atLimit = new Request("https://example.test", {
      method: "POST",
      body: `{"value":"${"a".repeat(4084)}"}`,
    });
    await expect(readBoundedJson(atLimit)).resolves.toHaveProperty("value");

    const overLimit = new Request("https://example.test", {
      method: "POST",
      body: `{"value":"${"a".repeat(4085)}"}`,
    });
    await expect(readBoundedJson(overLimit)).rejects.toThrow("4096");
  });
});
