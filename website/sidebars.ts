import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    'install',
    'quickstart',
    'concepts',
    {
      type: 'category',
      label: 'Workflows',
      collapsed: false,
      items: [
        'workflows/add-command',
        'workflows/add-event',
        'workflows/sync-commands',
        'workflows/doctor',
        'workflows/info',
      ],
    },
    {
      type: 'category',
      label: 'Command reference',
      items: [
        'commands/init',
        'commands/add',
        'commands/commands',
        'commands/remove',
        'commands/doctor',
        'commands/info',
        'commands/docs',
        'commands/help',
      ],
    },
    'generated/layout',
    {
      type: 'category',
      label: 'Guides',
      items: ['guides/database', 'guides/tooling', 'guides/discord-js-bot-template'],
    },
    'troubleshooting',
  ],
};

export default sidebars;
