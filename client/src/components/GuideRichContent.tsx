import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import { Fragment, type ReactNode } from "react";

function isSafeInternalUrl(value: string) {
  return value.startsWith("/manus-storage/") || value.startsWith("/");
}

function inline(text: string): ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^\s)]+\))/g).filter(Boolean);
  return tokens.map((token, index) => {
    if (token.startsWith("**") && token.endsWith("**")) return <strong key={index}>{token.slice(2, -2)}</strong>;
    if (token.startsWith("*") && token.endsWith("*")) return <em key={index}>{token.slice(1, -1)}</em>;
    if (token.startsWith("`") && token.endsWith("`")) return <code key={index} className="rounded bg-secondary px-1 py-0.5 text-[0.9em]">{token.slice(1, -1)}</code>;
    const link = token.match(/^\[([^\]]+)\]\(([^\s)]+)\)$/);
    if (link && isSafeInternalUrl(link[2])) return <a key={index} href={link[2]} className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2 hover:text-primary/80">{link[1]}<ExternalLink className="h-3 w-3" /></a>;
    return <Fragment key={index}>{token}</Fragment>;
  });
}

export default function GuideRichContent({ value, className }: { value: string; className?: string }) {
  const lines = value.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];
  const flushList = () => {
    if (!listItems.length) return;
    blocks.push(<ul key={`list-${blocks.length}`} className="my-3 space-y-1.5 pl-5 text-sm text-muted-foreground">{listItems.map((item, index) => <li key={index} className="list-disc pl-1">{inline(item)}</li>)}</ul>);
    listItems = [];
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    const image = line.match(/^!\[([^\]]*)\]\(([^\s)]+)\)$/);
    if (line.startsWith("- ")) { listItems.push(line.slice(2)); return; }
    flushList();
    if (!line) return;
    if (image && image[2].startsWith("/manus-storage/")) {
      blocks.push(<figure key={`image-${index}`} className="my-4 overflow-hidden rounded-lg border border-border bg-secondary/20"><img src={image[2]} alt={image[1] || "Imagen del tutorial"} className="max-h-96 w-full object-contain" loading="lazy" /><figcaption className="px-3 py-2 text-xs text-muted-foreground">{image[1] || "Imagen del tutorial"}</figcaption></figure>);
      return;
    }
    if (line.startsWith("### ")) { blocks.push(<h4 key={index} className="mt-4 text-base font-semibold">{inline(line.slice(4))}</h4>); return; }
    if (line.startsWith("## ")) { blocks.push(<h3 key={index} className="mt-5 text-lg font-bold">{inline(line.slice(3))}</h3>); return; }
    if (line.startsWith("# ")) { blocks.push(<h2 key={index} className="mt-5 text-xl font-bold">{inline(line.slice(2))}</h2>); return; }
    blocks.push(<p key={index} className="mt-2 text-sm leading-6 text-muted-foreground">{inline(line)}</p>);
  });
  flushList();
  return <div className={cn("guide-rich-content", className)}>{blocks}</div>;
}
