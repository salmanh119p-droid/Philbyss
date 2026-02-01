'use client';

import { useState } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';

interface ClientData {
  client: string;
  outstanding: number;
  paid: number;
  count: number;
}

interface InvoiceTableProps {
  data: ClientData[];
}

type SortKey = 'client' | 'outstanding' | 'paid' | 'count';
type SortDir = 'asc' | 'desc';

export default function InvoiceTable({ data }: InvoiceTableProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('outstanding');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filteredData = data
    .filter((item) =>
      item.client.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return null;
    return sortDir === 'asc' ? (
      <ChevronUp className="w-4 h-4 inline ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1" />
    );
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title mb-0">By Client / Agency</h3>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 py-2 text-sm w-64"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--color-bg-secondary)]">
              <th
                className="table-header table-cell cursor-pointer hover:text-[var(--color-text-primary)] transition-colors"
                onClick={() => handleSort('client')}
              >
                Client <SortIcon column="client" />
              </th>
              <th
                className="table-header table-cell text-right cursor-pointer hover:text-[var(--color-text-primary)] transition-colors"
                onClick={() => handleSort('outstanding')}
              >
                Outstanding <SortIcon column="outstanding" />
              </th>
              <th
                className="table-header table-cell text-right cursor-pointer hover:text-[var(--color-text-primary)] transition-colors"
                onClick={() => handleSort('paid')}
              >
                Paid <SortIcon column="paid" />
              </th>
              <th
                className="table-header table-cell text-right cursor-pointer hover:text-[var(--color-text-primary)] transition-colors"
                onClick={() => handleSort('count')}
              >
                Invoices <SortIcon column="count" />
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item, index) => (
              <tr
                key={item.client}
                className={clsx(
                  'border-t border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] transition-colors',
                  index % 2 === 0 && 'bg-[var(--color-bg-secondary)]/30'
                )}
              >
                <td className="table-cell font-medium">{item.client}</td>
                <td className="table-cell text-right">
                  <span className={item.outstanding > 0 ? 'text-red-400' : 'text-[var(--color-text-secondary)]'}>
                    {formatCurrency(item.outstanding)}
                  </span>
                </td>
                <td className="table-cell text-right">
                  <span className="text-emerald-400">{formatCurrency(item.paid)}</span>
                </td>
                <td className="table-cell text-right text-[var(--color-text-secondary)]">
                  {item.count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-8 text-[var(--color-text-muted)]">
          No clients found matching "{search}"
        </div>
      )}
    </div>
  );
}
