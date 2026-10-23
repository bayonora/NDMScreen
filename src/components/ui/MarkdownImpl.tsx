import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { rehypeUnits } from "../../lib/units";
import { rehypeDice } from "../../lib/dice";

const PLUGINS = [remarkGfm, remarkBreaks];

export default function MarkdownImpl({ children, components, units, dice }: { children: string; components?: Components; units?: boolean; dice?: boolean }) {
  const rehype = [units && rehypeUnits, dice && rehypeDice].filter(Boolean) as (() => any)[];
  return (
    <ReactMarkdown remarkPlugins={PLUGINS} rehypePlugins={rehype.length ? rehype : undefined} components={components}>
      {children}
    </ReactMarkdown>
  );
}
