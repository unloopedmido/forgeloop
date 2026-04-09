import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import {ThemeClassNames} from '@docusaurus/theme-common';
import LinkItem from '@theme/Footer/LinkItem';
import type {Props} from '@theme/Footer/Links/MultiColumn';
import { motion } from 'motion/react';

type ColumnType = Props['columns'][number];
type ColumnItemType = ColumnType['items'][number];

function ColumnLinkItem({item}: {item: ColumnItemType}) {
  return item.html ? (
    <li
      className={clsx('mb-3', item.className)}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{__html: item.html}}
    />
  ) : (
    <li key={item.href ?? item.to} className="mb-3">
      <motion.div className="group/link flex items-center" whileHover={{ x: 2 }}>
        <LinkItem
          item={{
            ...item,
            className: clsx(
              'text-[var(--ifm-footer-link-color)] hover:text-[var(--ifm-color-primary)] font-sans text-sm block',
              item.className,
            ),
          }}
        />
      </motion.div>
    </li>
  );
}

function Column({column}: {column: ColumnType}) {
  return (
    <div
      className={clsx(
        ThemeClassNames.layout.footer.column,
        'flex flex-col',
        column.className,
      )}>
      <div className="text-[var(--ifm-footer-title-color)] font-sans font-medium tracking-widest uppercase text-xs mb-6">
        {column.title}
      </div>
      <ul className="clean-list m-0 p-0 list-none">
        {column.items.map((item, i) => (
          <ColumnLinkItem key={i} item={item} />
        ))}
      </ul>
    </div>
  );
}

export default function FooterLinksMultiColumn({columns}: Props): ReactNode {
  return (
    <div className="flex flex-wrap gap-16 lg:gap-24 justify-start">
      {columns.map((column, i) => (
        <Column key={i} column={column} />
      ))}
    </div>
  );
}