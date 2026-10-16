import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

const PLUGINS = [remarkGfm, remarkBreaks];

export default function MarkdownImpl({ children, components }: { children: string; components?: Components }) {
  return (
    <ReactMarkdown remarkPlugins={PLUGINS} components={components}>
      {children}
    </ReactMarkdown>
  );
}
