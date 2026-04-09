import { Highlight, themes } from 'prism-react-renderer';

/**
 * Single-line or short bash snippets with Prism (dracula) inside a dark panel,
 * consistent with {@link HomeTerminalFrame} / {@link CliExample} command rows.
 */
export function DocsBashSnippet({ code }: { code: string }) {
  return (
    <div className="docs-bash-snippet mt-2 overflow-hidden rounded-lg border border-white/10 bg-[#0c0c0e] px-3 py-3 shadow-lg shadow-black/20">
      <Highlight theme={themes.dracula} code={code.trim()} language="bash">
        {({ className: prismClass, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={`${prismClass} forge-terminal-pre m-0 overflow-x-auto border-0 p-0 font-mono text-xs leading-relaxed sm:text-sm`}
            style={{
              ...style,
              background: 'transparent',
              margin: 0,
            }}
          >
            {tokens.map((line, lineIndex) => {
              const lineProps = getLineProps({ line });
              return (
                <div key={lineIndex} {...lineProps} className={`${lineProps.className ?? ''} min-h-[1.35em]`.trim()}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              );
            })}
          </pre>
        )}
      </Highlight>
    </div>
  );
}
