import React from "react";

export function renderInlineCode(text: string): React.ReactNode[] {
  if (!text) return [text];
  if (!text.includes("`")) return [text];

  const segments: React.ReactNode[] = [];
  let currentIndex = 0;
  let keyCounter = 0;

  while (currentIndex < text.length) {
    // Find the next backtick
    const startIndex = text.indexOf("`", currentIndex);

    if (startIndex === -1) {
      // No more backticks found, add remaining text
      segments.push(text.substring(currentIndex));
      break;
    }

    // Add text before the opening backtick
    if (startIndex > currentIndex) {
      segments.push(text.substring(currentIndex, startIndex));
    }

    // Look for closing backtick
    const endIndex = text.indexOf("`", startIndex + 1);

    if (endIndex === -1) {
      // Unmatched backtick - treat it as regular text
      segments.push(text.substring(currentIndex));
      break;
    }

    // Extract code content
    const codeContent = text.substring(startIndex + 1, endIndex);
    segments.push(
      <code
        key={keyCounter++}
        className="bg-gray-100 rounded px-1 font-mono text-[0.95em]"
      >
        {codeContent}
      </code>,
    );

    // Update current index to after the closing backtick
    currentIndex = endIndex + 1;
  }

  return segments;
}
