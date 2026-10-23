import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { rehypeUnits } from "../../lib/units";

const PLUGINS = [remarkGfm, remarkBreaks];
const UNIT_PLUGINS = [rehypeUnits];

export default function MarkdownImpl({ children, components, units }: { children: string; components?: Components; units?: boolean }) {
  return (
    <ReactMarkdown remarkPlugins={PLUGINS} rehypePlugins={units ? UNIT_PLUGINS : undefined} components={components}>
      {children}
    </ReactMarkdown>
  );
}
