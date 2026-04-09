import React from 'react';
import { useColorMode } from '@docusaurus/theme-common';
import { Highlight, themes } from 'prism-react-renderer';

export type HomeHighlightLanguage = 'typescript' | 'javascript' | 'tsx';

type Props = {
  code: string;
  language: HomeHighlightLanguage;
  /** Show gutter line numbers (default true). */
  showLineNumbers?: boolean;
  /** Optional per-line class (e.g. highlight a specific row). */
  getLineClassName?: (lineIndex: number) => string | undefined;
  className?: string;
  /**
   * Use dark syntax colors on the hero-style terminal panel (always dracula),
   * instead of following the global light/dark toggle.
   */
  syntaxOnDarkPanel?: boolean;
};

/** Prism theme follows the site color toggle (github / dracula in docusaurus.config). */
export function HomeHighlightedCode({
  code,
  language,
  showLineNumbers = true,
  getLineClassName,
  className = '',
  syntaxOnDarkPanel = false,
}: Props) {
  const { colorMode } = useColorMode();
  const prismTheme =
    syntaxOnDarkPanel || colorMode === 'dark' ? themes.dracula : themes.github;

  return (
    <Highlight theme={prismTheme} code={code} language={language}>
      {({ className: prismPreClass, style, tokens, getLineProps, getTokenProps }) => (
        <pre
          className={`home-prism ${prismPreClass} m-0 overflow-x-auto p-0 font-mono text-[13px] leading-relaxed md:text-[0.9375rem] ${className}`}
          style={{
            ...style,
            background: 'transparent',
            margin: 0,
            padding: 0,
          }}
        >
          {tokens.map((line, lineIndex) => {
            const extra = getLineClassName?.(lineIndex);
            const lineProps = getLineProps({ line });
            return (
              <div
                key={lineIndex}
                {...lineProps}
                className={`${lineProps.className ?? ''} flex min-h-[1.35em] gap-3 ${extra ?? ''}`.trim()}
              >
                {showLineNumbers ? (
                  <span
                    className={`w-7 shrink-0 select-none text-right tabular-nums md:w-8 ${
                      syntaxOnDarkPanel ? 'text-slate-600' : 'text-fh-gutter'
                    }`}
                  >
                    {lineIndex + 1}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1 whitespace-pre">
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </span>
              </div>
            );
          })}
        </pre>
      )}
    </Highlight>
  );
}
