import type { ReactNode } from 'react';

export type FlagRow = {
  flag: string;
  type: string;
  defaultValue?: string;
  description: ReactNode;
};

type FlagTableProps = {
  rows: FlagRow[];
};

export function FlagTable({ rows }: FlagTableProps) {
  return (
    <div className="forge-flag-table-wrap">
      <table className="forge-flag-table">
        <thead>
          <tr>
            <th scope="col">Flag</th>
            <th scope="col">Type</th>
            <th scope="col">Default</th>
            <th scope="col">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.flag}>
              <td>
                <code className="forge-flag-table__flag">{row.flag}</code>
              </td>
              <td>
                <code>{row.type}</code>
              </td>
              <td>{row.defaultValue ? <code>{row.defaultValue}</code> : '—'}</td>
              <td>{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
