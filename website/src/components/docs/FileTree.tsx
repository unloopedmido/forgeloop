type FileTreeProps = {
  /** Lines using tree characters, e.g. "├── src/" */
  lines: string[];
  caption?: string;
};

export function FileTree({ lines, caption }: FileTreeProps) {
  return (
    <figure className="forge-file-tree">
      <pre className="forge-terminal-pre forge-file-tree__pre">
        <code>{lines.join('\n')}</code>
      </pre>
      {caption ? (
        <figcaption className="forge-file-tree__caption">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
