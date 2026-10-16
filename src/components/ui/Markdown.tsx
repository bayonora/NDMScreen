import { lazy, Suspense } from "react";
import type { Components } from "react-markdown";

// The markdown parser is fairly heavy, so it's loaded the first time some markdown is shown.
const MarkdownImpl = lazy(() => import("./MarkdownImpl"));

/** Renders markdown (GFM + single line breaks). Shows the raw text until the parser loads. */
export function Markdown({ children, components }: { children: string; components?: Components }) {
  return (
    <Suspense fallback={<div className="whitespace-pre-wrap">{children}</div>}>
      <MarkdownImpl components={components}>{children}</MarkdownImpl>
    </Suspense>
  );
}
