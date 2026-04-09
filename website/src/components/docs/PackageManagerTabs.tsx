import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import { DocsBashSnippet } from './DocsBashSnippet';

type PackageManagerTabsProps = {
  /** Snippet for create / scaffold (shown per package manager) */
  create: {
    npm: string;
    pnpm: string;
    yarn: string;
  };
};

export function PackageManagerCreateTabs({ create }: PackageManagerTabsProps) {
  return (
    <Tabs groupId="package-manager" queryString>
      <TabItem value="npm" label="npm">
        <DocsBashSnippet code={create.npm} />
      </TabItem>
      <TabItem value="pnpm" label="pnpm">
        <DocsBashSnippet code={create.pnpm} />
      </TabItem>
      <TabItem value="yarn" label="yarn">
        <DocsBashSnippet code={create.yarn} />
      </TabItem>
    </Tabs>
  );
}

type ForgeloopCommandTabsProps = {
  command: string;
  /** Text after the package manager invocation, e.g. "add command ping" */
  forgeloopArgs: string;
};

/**
 * Matches {@link packageManagerCliCommand} in the CLI: npx / pnpm / yarn forgeloop …
 */
export function ForgeloopInvokeTabs({ command, forgeloopArgs }: ForgeloopCommandTabsProps) {
  const lines: Record<string, string> = {
    npm: `${command} npx forgeloop ${forgeloopArgs}`,
    pnpm: `${command} pnpm forgeloop ${forgeloopArgs}`,
    yarn: `${command} yarn forgeloop ${forgeloopArgs}`,
  };

  return (
    <Tabs groupId="package-manager" queryString>
      <TabItem value="npm" label="npm">
        <DocsBashSnippet code={lines.npm} />
      </TabItem>
      <TabItem value="pnpm" label="pnpm">
        <DocsBashSnippet code={lines.pnpm} />
      </TabItem>
      <TabItem value="yarn" label="yarn">
        <DocsBashSnippet code={lines.yarn} />
      </TabItem>
    </Tabs>
  );
}
