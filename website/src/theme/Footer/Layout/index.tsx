import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {ThemeClassNames} from '@docusaurus/theme-common';
import type {Props} from '@theme/Footer/Layout';

export default function FooterLayout({
  style,
  links,
  logo: _logo,
  copyright,
}: Props): ReactNode {
  const {
    siteConfig: {title},
  } = useDocusaurusContext();
  return (
    <footer
      className={clsx(
        ThemeClassNames.layout.footer.container,
        'relative mt-20 border-t border-[var(--ifm-toc-border-color)] bg-[var(--ifm-background-color)] text-[var(--ifm-footer-color)] font-sans selection:bg-blue-500/20 selection:text-[var(--ifm-heading-color)] overflow-hidden',
      )}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="site-footer-grid absolute inset-0 opacity-[0.85]" />
        <div className="site-footer-glow absolute inset-0" />
      </div>
      
      <div className="container relative z-10 mx-auto max-w-6xl px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
          
          {/* Brand/Identity side (spans 5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between items-start">
            <div className="space-y-6">
              <Link to="/" className="footer-brand-wordmark">
                {title}
              </Link>
              <p className="font-sans text-sm leading-relaxed max-w-[320px] balance-text m-0 text-[var(--ifm-footer-color)]">
                Maintenance-first scaffolding for Discord.js bots.<br/>
                Start modular, build for scale, and craft with absolute precision.
              </p>
            </div>
          </div>

          {/* Links (spans 7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between h-full">
            {links && (
              <div className="w-full lg:pl-12">
                 {links}
              </div>
            )}
            
            {/* Copyright block */}
            <div className="w-full lg:pl-12 pt-16 lg:pt-0 lg:mt-auto flex justify-start lg:justify-end">
               {copyright && (
                  <div className="text-xs font-sans font-medium tracking-wide text-[var(--ifm-footer-color)]">
                    {copyright}
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}