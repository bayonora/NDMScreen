import { lazy, Suspense } from "react";
import type { Components } from "react-markdown";

// The markdown parser is fairly heavy, so it's loaded the first time some markdown is shown.
const MarkdownImpl = lazy(() => import("./MarkdownImpl"));

/**
 * Renders markdown (GFM + single line breaks). Shows the raw text until the parser loads.
 * `units` adds the metric equivalent after measurements ("30 pies (9 m)"); use it for rules text.
 */
export function Markdown({ children, components, units }: { children: string; components?: Components; units?: boolean }) {
  return (
    <Suspense fallback={<div className="whitespace-pre-wrap">{children}</div>}>
      <MarkdownImpl components={components} units={units}>{children}</MarkdownImpl>
    </Suspense>
  );
}
