import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  title: string;
  Icon: LucideIcon;
  children: ReactNode;
  className?: string;
};

/**
 * Matches the hero terminal chrome: dark shell, traffic lights, subtle title bar.
 */
export function HomeTerminalFrame({ title, Icon, children, className = '' }: Props) {
  return (
    <div
      className={`forge-home-terminal overflow-hidden rounded-xl border border-white/10 bg-[#0c0c0e] text-slate-400 shadow-2xl ${className}`}
    >
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/10 bg-white/[0.02] px-4">
        <div className="h-3 w-3 rounded-full border border-red-500/50 bg-red-500/20" />
        <div className="h-3 w-3 rounded-full border border-yellow-500/50 bg-yellow-500/20" />
        <div className="h-3 w-3 rounded-full border border-green-500/50 bg-green-500/20" />
        <div className="ml-2 flex items-center gap-2 text-xs font-medium text-slate-500">
          <Icon className="h-3 w-3" aria-hidden />
          {title}
        </div>
      </div>
      {children}
    </div>
  );
}
