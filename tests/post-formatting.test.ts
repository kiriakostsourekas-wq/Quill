import { describe, expect, it } from "vitest";
import { formatLinkedInPostSpacing } from "@/lib/post-formatting";

function compactWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

describe("formatLinkedInPostSpacing", () => {
  it("turns a dense paragraph into LinkedIn-style idea blocks", () => {
    const input =
      "Most founders do not have a content problem. They have a clarity problem. Once the idea is clear, distribution gets much easier.";

    expect(formatLinkedInPostSpacing(input)).toBe(
      [
        "Most founders do not have a content problem.",
        "They have a clarity problem.",
        "Once the idea is clear, distribution gets much easier.",
      ].join("\n\n")
    );
  });

  it("preserves existing intentional paragraph spacing", () => {
    const input =
      "Hook line.\n\nThis paragraph already has a deliberate break.\nStill part of the same thought.\n\nFinal line.";

    expect(formatLinkedInPostSpacing(input)).toBe(input);
  });

  it("preserves bullet lists as lists", () => {
    const input = "Here is what changed:\n- Better hooks\n- Cleaner drafts\n- Faster review";

    expect(formatLinkedInPostSpacing(input)).toBe(
      ["Here is what changed:", "- Better hooks\n- Cleaner drafts\n- Faster review"].join("\n\n")
    );
  });

  it("preserves numbered lists as lists", () => {
    const input = "The workflow is simple:\n1. Draft the post\n2. Format the spacing\n3. Publish it";

    expect(formatLinkedInPostSpacing(input)).toBe(
      ["The workflow is simple:", "1. Draft the post\n2. Format the spacing\n3. Publish it"].join(
        "\n\n"
      )
    );
  });

  it("leaves a short one-sentence post unchanged", () => {
    const input = "Launch day is a forcing function.";

    expect(formatLinkedInPostSpacing(input)).toBe(input);
  });

  it("does not mutate wording in longer posts", () => {
    const input =
      "A good post earns the next line. That starts with a sharp hook. Then it needs a specific observation. Finally, it should end with a practical takeaway.";
    const output = formatLinkedInPostSpacing(input);

    expect(output).toContain("\n\n");
    expect(compactWhitespace(output)).toBe(compactWhitespace(input));
  });
});
