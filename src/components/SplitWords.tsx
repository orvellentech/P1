import { Fragment } from "react";

/**
 * Renders text as one inline-block span per word (spaces stay real text
 * nodes, so copy/paste and screen readers read it naturally).
 */
export default function SplitWords({ text, className, wordClassName }: { text: string; className?: string; wordClassName?: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <span className={className}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className={wordClassName} data-word="">
            {w}
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  );
}
