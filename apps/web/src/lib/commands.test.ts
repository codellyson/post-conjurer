import { describe, expect, it } from "vitest";
import { errorHint, isCommandError } from "./commands";

describe("errorHint", () => {
  it("turns a tagged CommandError into an actionable line", () => {
    expect(errorHint({ kind: "invalid_input", message: "name must not be empty" })).toBe(
      "Check your input — name must not be empty",
    );
    expect(errorHint({ kind: "not_found", message: "no such board" })).toBe("no such board");
  });

  it("falls back to the message for a plain Error", () => {
    expect(errorHint(new Error("boom"))).toBe("boom");
  });
});

describe("isCommandError", () => {
  it("recognizes the { kind, message } shape", () => {
    expect(isCommandError({ kind: "internal", message: "x" })).toBe(true);
    expect(isCommandError(new Error("x"))).toBe(false);
    expect(isCommandError(null)).toBe(false);
  });
});
