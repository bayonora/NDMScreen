import { lazy, Suspense } from "react";
import type { Components } from "react-markdown";

// The markdown parser is fairly heavy, so it's loaded the first time some markdown is shown.
const MarkdownImpl = lazy(() => import("./MarkdownImpl"));

/**
 * Renders markdown (GFM + single line breaks). Shows the raw text until the parser loads.
 * `units` adds the metric equivalent after measurements ("30 pies (9 m)"); use it for rules text.
 * `dice` marks dice notation ("1d20+5") as `<span class="dice-roll" data-dice>` for a custom `span`.
 */
export function Markdown({ children, components, units, dice }: { children: string; components?: Components; units?: boolean; dice?: boolean }) {
  return (
    <Suspense fallback={<div className="whitespace-pre-wrap">{children}</div>}>
      <MarkdownImpl components={components} units={units} dice={dice}>{children}</MarkdownImpl>
    </Suspense>
  );
}
