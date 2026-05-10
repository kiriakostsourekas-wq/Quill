import { describe, expect, it } from "vitest";
import { splitIntoThread } from "@/lib/twitter";

describe("splitIntoThread", () => {
  it("keeps short text as a single tweet", () => {
    expect(splitIntoThread("Short update", 280)).toEqual(["Short update"]);
  });

  it("packs sentence chunks without exceeding the limit", () => {
    expect(splitIntoThread("Alpha. Beta gamma. Delta.", 18)).toEqual([
      "Alpha. Beta gamma.",
      "Delta.",
    ]);
  });

  it("splits long sentences by word boundaries", () => {
    const chunks = splitIntoThread("alpha beta gamma delta", 10);

    expect(chunks).toEqual(["alpha beta", "gamma", "delta"]);
    expect(chunks.every((chunk) => chunk.length <= 10)).toBe(true);
  });

  it("does not drop a single overlong word", () => {
    expect(splitIntoThread("abcdefghijkl", 5)).toEqual(["abcde", "fghij", "kl"]);
  });
});
