import React from "react";
import { splitMeasures } from "../../lib/units";

/** Plain text with the metric equivalent shown, small and muted, after each measurement: "30 pies (9 m)". */
export function Measured({ text }: { text?: string | null }) {
  if (!text) return null;
  const parts = splitMeasures(text);
  return (
    <>
      {parts.map((p, i) =>
        typeof p === "string" ? (
          <React.Fragment key={i}>{p}</React.Fragment>
        ) : (
          <React.Fragment key={i}>
            {p.text}
            <span className="unit-metric"> ({p.metric})</span>
          </React.Fragment>
        )
      )}
    </>
  );
}
