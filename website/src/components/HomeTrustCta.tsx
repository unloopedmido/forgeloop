import React, { useState } from 'react';
import Link from '@docusaurus/Link';
import { motion } from 'motion/react';
import { ArrowRight, Copy, Check } from 'lucide-react';

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export function HomeTrustCta() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('npm create forgeloop@latest');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-24 pt-12 md:pb-32 md:pt-20">
      <div className="mb-10 h-px w-full bg-linear-to-r from-transparent via-[var(--fh-separator)] to-transparent" />

      <div className="forge-home-cta-card px-8 py-10 md:px-10 md:py-12 lg:px-12 lg:py-14">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-end lg:gap-10">
          <div className="lg:col-span-7">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-fh-faint"
            >
              Ready for production
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-4xl font-bold tracking-tight text-fh-heading sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]"
            >
              Build bots.
              <br />
              <span className="text-fh-muted">Not boilerplate.</span>
            </motion.h2>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-3 lg:col-span-5"
          >
            <Link to="/docs/intro" className="forge-cta-docs-link group">
              <span>Read the Docs</span>
              <ArrowRight
                className="h-5 w-5 shrink-0 opacity-70 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:opacity-100"
                strokeWidth={2}
              />
            </Link>

            <button
              type="button"
              onClick={handleCopy}
              className="forge-cta-install group"
              aria-label={copied ? 'Copied to clipboard' : 'Copy npm create forgeloop@latest'}
            >
              <span className="forge-hero-install-accent" aria-hidden />
              <span className="forge-hero-install-code text-left">
                <span className="text-[var(--fh-hero-cmd-keyword)]">npm</span>{' '}
                <span className="text-[var(--fh-hero-cmd-keyword)]">create</span>{' '}
                <span className="text-[var(--fh-hero-cmd-pkg)]">forgeloop@latest</span>
              </span>
              <span className="forge-cta-install-squircle" aria-hidden>
                {copied ? (
                  <Check className="h-4 w-4 text-[var(--fh-hero-cmd-accent)]" strokeWidth={2.25} />
                ) : (
                  <Copy className="h-4 w-4" strokeWidth={2} />
                )}
              </span>
            </button>

            <div
              className="mt-5 flex items-center gap-2 border-t border-fh-edge2 pt-6 font-mono text-[0.7rem] uppercase tracking-wider text-fh-muted"
              role="note"
            >
              <GitHubIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
              <span>MIT licensed · Open source</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
