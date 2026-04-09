import type { ReactNode } from 'react';
import { Fragment } from 'react';
import clsx from 'clsx';
import { Terminal } from 'lucide-react';
import { Highlight, themes } from 'prism-react-renderer';
import { HomeTerminalFrame } from '../HomeTerminalFrame';

type CliExampleProps = {
  title?: string;
  command: string;
  output?: string;
  caption?: ReactNode;
  className?: string;
};

const SECTION_FUCHSIA = new Set([
  'Project profile',
  'Commands',
  'Feature Flags',
  'Init wizard',
  'Command generator',
  'Event generator',
]);

const SECTION_AMBER = new Set(['Next steps', 'What you are getting', 'Command summary', 'Event summary']);

function formatOutputLine(line: string): ReactNode {
  const trimmed = line.trim();

  if (trimmed.length === 0) {
    return <span className="block min-h-[0.35em]" />;
  }

  // Banner / box drawing (matches Output.banner)
  if (/^[┌└│]/.test(trimmed)) {
    return <span className="block text-slate-500">{line}</span>;
  }

  // Subtitle under banner ("  Scaffolding …")
  if (/^\s{2,}[A-Za-z]/.test(line) && !trimmed.startsWith('•') && !trimmed.startsWith('│')) {
    if (trimmed.startsWith('Scaffolding') || trimmed.startsWith('Inspecting')) {
      return <span className="block text-slate-500">{line}</span>;
    }
  }

  // Hero line: ForgeLoop • …
  if (trimmed.startsWith('ForgeLoop')) {
    const idx = line.indexOf('ForgeLoop');
    const before = line.slice(0, idx);
    const after = line.slice(idx + 'ForgeLoop'.length);
    return (
      <span className="block">
        {before}
        <span className="font-semibold text-cyan-400">ForgeLoop</span>
        <span className="text-slate-500">{after}</span>
      </span>
    );
  }

  if (SECTION_FUCHSIA.has(trimmed)) {
    return <span className="mt-2 block font-medium text-fuchsia-300/90 first:mt-0">{line.trim()}</span>;
  }

  if (SECTION_AMBER.has(trimmed)) {
    return <span className="mt-2 block font-medium text-amber-200/90 first:mt-0">{line.trim()}</span>;
  }

  if (trimmed.startsWith('✓')) {
    return <span className="block text-emerald-400">{line}</span>;
  }

  if (trimmed.startsWith('x ')) {
    return <span className="block text-red-400">{line}</span>;
  }

  if (trimmed.startsWith('! ')) {
    return <span className="block text-amber-400">{line}</span>;
  }

  if (trimmed.startsWith('i ')) {
    return <span className="block text-cyan-400">{line}</span>;
  }

  if (/^\? /.test(trimmed) || trimmed.startsWith('select>')) {
    return <span className="mt-2 block font-medium text-cyan-400">{line}</span>;
  }

  if (/^> /.test(trimmed)) {
    return <span className="block text-slate-400">{line}</span>;
  }

  // Callout body lines: "  │ text"
  const pipeCallout = line.match(/^(\s*)│(\s*)(.*)$/);
  if (pipeCallout) {
    return (
      <span className="block">
        {pipeCallout[1]}
        <span className="text-slate-600">│</span>
        {pipeCallout[2]}
        <span className="text-slate-400">{pipeCallout[3]}</span>
      </span>
    );
  }

  // List items: "  • Label    value" (Output.item)
  const itemMatch = line.match(/^(\s*)(•)(\s+)(.+)$/);
  if (itemMatch) {
    const afterBullet = itemMatch[4];
    const split = afterBullet.split(/\s{2,}/u);
    const label = split[0]?.trim() ?? '';
    const value = split.slice(1).join('  ').trim();
    return (
      <span className="block">
        {itemMatch[1]}
        <span className="text-blue-400">{itemMatch[2]}</span>
        {itemMatch[3]}
        <span className="text-slate-400">{label}</span>
        {value ? (
          <>
            {' '}
            <span className="text-slate-500">{value}</span>
          </>
        ) : null}
      </span>
    );
  }

  return <span className="block text-slate-400">{line}</span>;
}

function ColoredCliOutput({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="mt-3 border-t border-white/10 pt-3 font-mono text-xs leading-relaxed sm:text-sm">
      {lines.map((line, i) => (
        <Fragment key={i}>{formatOutputLine(line)}</Fragment>
      ))}
    </div>
  );
}

export function CliExample({
  title,
  command,
  output,
  caption,
  className,
}: CliExampleProps) {
  const cmd = command.trimEnd();

  return (
    <figure className={clsx('forge-cli-example my-6', className)}>
      {title ? (
        <figcaption className="forge-cli-example__title mb-2 text-sm font-semibold text-[var(--ifm-color-content-secondary)]">
          {title}
        </figcaption>
      ) : null}
      <HomeTerminalFrame title="bash" Icon={Terminal} className="shadow-2xl">
        <div className="px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
          <Highlight theme={themes.dracula} code={cmd} language="bash">
            {({ className: prismClass, style, tokens, getLineProps, getTokenProps }) => (
              <pre
                className={clsx(
                  prismClass,
                  'forge-terminal-pre m-0 overflow-x-auto border-0 bg-transparent p-0 font-mono text-xs leading-relaxed sm:text-sm',
                )}
                style={{
                  ...style,
                  background: 'transparent',
                  margin: 0,
                }}
              >
                {tokens.map((line, lineIndex) => {
                  const lineProps = getLineProps({ line });
                  return (
                    <div
                      key={lineIndex}
                      {...lineProps}
                      className={clsx(lineProps.className, 'flex min-h-[1.35em] gap-1')}
                    >
                      <span className="shrink-0 select-none text-emerald-400" aria-hidden>
                        {lineIndex === 0 ? '$' : ' '}
                      </span>
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
          {output ? <ColoredCliOutput text={output} /> : null}
        </div>
      </HomeTerminalFrame>
      {caption ? (
        <figcaption className="forge-cli-example__caption mt-2 text-sm text-[var(--ifm-color-content-secondary)]">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
