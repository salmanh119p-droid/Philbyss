'use client';

import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, Clock, Briefcase, Banknote, AlertTriangle, Car } from 'lucide-react';
import { clsx } from 'clsx';
import { EngineerSummary } from '@/types';

interface EngineerTableProps {
  data: EngineerSummary[];
  payPeriodStart: string;
  payPeriodEnd: string;
}

type SortKey = 'name' | 'totalJobs' | 'totalHours' | 'totalCost' | 'totalFines';
type SortDir = 'asc' | 'desc';

export default function EngineerTable({ data, payPeriodStart, payPeriodEnd }: EngineerTableProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('totalCost');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedEngineer, setExpandedEngineer] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } catch {
      return dateStr;
    }
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
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.displayName.toLowerCase().includes(search.toLowerCase())
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
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="section-title mb-1">Engineer Breakdown</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Pay period: {formatDate(payPeriodStart)} - {formatDate(payPeriodEnd)}
          </p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search engineers..."
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
                onClick={() => handleSort('name')}
              >
                Engineer <SortIcon column="name" />
              </th>
              <th
                className="table-header table-cell text-right cursor-pointer hover:text-[var(--color-text-primary)] transition-colors"
                onClick={() => handleSort('totalJobs')}
              >
                Jobs <SortIcon column="totalJobs" />
              </th>
              <th
                className="table-header table-cell text-right cursor-pointer hover:text-[var(--color-text-primary)] transition-colors"
                onClick={() => handleSort('totalHours')}
              >
                Hours <SortIcon column="totalHours" />
              </th>
              <th
                className="table-header table-cell text-right cursor-pointer hover:text-[var(--color-text-primary)] transition-colors"
                onClick={() => handleSort('totalCost')}
              >
                Total Pay <SortIcon column="totalCost" />
              </th>
              <th
                className="table-header table-cell text-right cursor-pointer hover:text-[var(--color-text-primary)] transition-colors"
                onClick={() => handleSort('totalFines')}
              >
                Fines <SortIcon column="totalFines" />
              </th>
              <th className="table-header table-cell text-right">
                Avg/Job
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((engineer, index) => (
              <>
                <tr
                  key={engineer.name}
                  className={clsx(
                    'border-t border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer',
                    index % 2 === 0 && 'bg-[var(--color-bg-secondary)]/30',
                    expandedEngineer === engineer.name && 'bg-[var(--color-bg-hover)]'
                  )}
                  onClick={() =>
                    setExpandedEngineer(
                      expandedEngineer === engineer.name ? null : engineer.name
                    )
                  }
                >
                  <td className="table-cell font-medium">
                    <div className="flex items-center gap-2">
                      <ChevronDown
                        className={clsx(
                          'w-4 h-4 transition-transform',
                          expandedEngineer === engineer.name && 'rotate-180'
                        )}
                      />
                      {engineer.displayName}
                      {engineer.tickets.length > 0 && (
                        <span className="badge badge-danger">
                          <Car className="w-3 h-3 mr-1" />
                          {engineer.tickets.length}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="table-cell text-right">
                    <span className="inline-flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-[var(--color-text-muted)]" />
                      {engineer.totalJobs}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[var(--color-text-muted)]" />
                      {formatHours(engineer.totalHours)}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <span className="text-emerald-400 font-medium">
                      {formatCurrency(engineer.totalCost)}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <span className={engineer.totalFines > 0 ? 'text-red-400 font-medium' : 'text-[var(--color-text-secondary)]'}>
                      {formatCurrency(engineer.totalFines)}
                    </span>
                  </td>
                  <td className="table-cell text-right text-[var(--color-text-secondary)]">
                    {formatCurrency(engineer.averageCostPerJob)}
                  </td>
                </tr>
                {expandedEngineer === engineer.name && (
                  <tr>
                    <td colSpan={6} className="p-0">
                      <div className="bg-[var(--color-bg-secondary)] p-4 border-t border-[var(--color-border)]">
                        {/* Recent Jobs - Last 2 Weeks */}
                        <div className="mb-4">
                          <p className="text-sm text-[var(--color-text-secondary)] mb-3 flex items-center gap-2">
                            <Briefcase className="w-4 h-4" />
                            Jobs This Pay Period ({engineer.recentJobs.length})
                          </p>
                          {engineer.recentJobs.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {engineer.recentJobs.map((job) => (
                                <div
                                  key={job.jobId}
                                  className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-bg-card)] text-sm"
                                >
                                  <div>
                                    <span className="font-mono text-[var(--color-text-muted)]">
                                      #{job.jobId}
                                    </span>
                                    <span className="text-[var(--color-text-secondary)] ml-2">
                                      {formatDate(job.date)}
                                    </span>
                                  </div>
                                  <span className="text-emerald-400">
                                    {formatCurrency(job.cost)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-[var(--color-text-muted)]">No jobs in this pay period</p>
                          )}
                        </div>

                        {/* Tickets/Fines */}
                        {engineer.tickets.length > 0 && (
                          <div>
                            <p className="text-sm text-[var(--color-text-secondary)] mb-3 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                              Fines & Tickets ({engineer.tickets.length})
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {engineer.tickets.map((ticket, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm"
                                >
                                  <div>
                                    <span className="font-mono text-[var(--color-text-muted)]">
                                      {ticket.vehicleReg}
                                    </span>
                                    <span className="text-[var(--color-text-secondary)] ml-2">
                                      {ticket.fineIssuedDate}
                                    </span>
                                  </div>
                                  <span className="text-red-400">
                                    {formatCurrency(ticket.fineAmount + ticket.adminFee)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-8 text-[var(--color-text-muted)]">
          No engineers found matching "{search}"
        </div>
      )}
    </div>
  );
}
