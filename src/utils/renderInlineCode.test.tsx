import { describe, it, expect } from "vitest";
import { renderInlineCode } from "./renderInlineCode";
import React from "react";

describe("renderInlineCode", () => {
  it("should return plain text when no backticks are present", () => {
    const text = "This is plain text without any code";
    const result = renderInlineCode(text);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(text);
  });

  it("should wrap content in code tags when backticks are present", () => {
    const text = "This has some `inline code` in it";
    const result = renderInlineCode(text);

    expect(result).toHaveLength(3);
    expect(result[0]).toBe("This has some ");

    // Check the code element
    const codeElement = result[1] as React.ReactElement;
    expect(codeElement.type).toBe("code");
    expect(codeElement.props.className).toContain("bg-gray-100");
    expect(codeElement.props.children).toBe("inline code");

    expect(result[2]).toBe(" in it");
  });

  it("should handle multiple code segments correctly", () => {
    const text = "Start `code1` middle `code2` end";
    const result = renderInlineCode(text);

    expect(result).toHaveLength(5);

    // Check the first code element
    const codeElement1 = result[1] as React.ReactElement;
    expect(codeElement1.type).toBe("code");
    expect(codeElement1.props.children).toBe("code1");

    expect(result[2]).toBe(" middle ");

    // Check the second code element
    const codeElement2 = result[3] as React.ReactElement;
    expect(codeElement2.type).toBe("code");
    expect(codeElement2.props.children).toBe("code2");

    expect(result[4]).toBe(" end");
  });

  it("should handle unmatched backticks gracefully", () => {
    const text = "Text with `unmatched backtick";
    const result = renderInlineCode(text);

    // Should just return the entire string as-is
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(text);
  });
});
