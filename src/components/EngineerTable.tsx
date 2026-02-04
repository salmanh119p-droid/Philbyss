'use client';

import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, Clock, Briefcase, Banknote, AlertTriangle, Car, Edit2, Check, X, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { EngineerSummary, EngineerJob } from '@/types';

interface EngineerTableProps {
  data: EngineerSummary[];
  payPeriodStart: string;
  payPeriodEnd: string;
}

type SortKey = 'name' | 'totalJobs' | 'totalHours' | 'totalCost' | 'totalFines';
type SortDir = 'asc' | 'desc';

// Get hour flag status
function getHourFlag(hoursDecimal: number): 'none' | 'yellow' | 'red' {
  if (hoursDecimal >= 8) return 'red';
  if (hoursDecimal >= 5) return 'yellow';
  return 'none';
}

export default function EngineerTable({ data, payPeriodStart, payPeriodEnd }: EngineerTableProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('totalCost');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedEngineer, setExpandedEngineer] = useState<string | null>(null);
  const [editingJob, setEditingJob] = useState<{ engineerName: string; jobId: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

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
      // Handle various date formats
      let date: Date;
      if (dateStr.includes('-')) {
        date = new Date(dateStr.split(' ')[0]);
      } else if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      } else {
        return dateStr;
      }
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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

  const startEditing = (engineerName: string, job: EngineerJob) => {
    setEditingJob({ engineerName, jobId: job.jobId });
    setEditValue(job.cost.toString());
  };

  const cancelEditing = () => {
    setEditingJob(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!editingJob) return;
    
    const newCost = parseFloat(editValue);
    if (isNaN(newCost) || newCost < 0) {
      alert('Please enter a valid cost');
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch('/api/update-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engineerName: editingJob.engineerName,
          jobId: editingJob.jobId,
          newCost,
        }),
      });

      const result = await res.json();
      
      if (result.success) {
        // Refresh the page to get updated data
        window.location.reload();
      } else {
        alert(`Failed to update: ${result.error}`);
      }
    } catch (error) {
      alert('Failed to update job cost');
    } finally {
      setIsUpdating(false);
      setEditingJob(null);
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

  const renderJobItem = (job: EngineerJob, engineerName: string) => {
    const isEditing = editingJob?.engineerName === engineerName && editingJob?.jobId === job.jobId;
    const hourFlag = getHourFlag(job.hoursDecimal);
    
    return (
      <div
        key={job.jobId}
        className={clsx(
          "flex items-center justify-between p-3 rounded-lg text-sm",
          hourFlag === 'red' ? 'bg-red-500/20 border border-red-500/40' :
          hourFlag === 'yellow' ? 'bg-amber-500/20 border border-amber-500/40' :
          'bg-[var(--color-bg-card)]'
        )}
      >
        <div className="flex items-center gap-3">
          {/* Hour warning icon */}
          {hourFlag !== 'none' && (
            <div className={clsx(
              "p-1 rounded",
              hourFlag === 'red' ? 'text-red-400' : 'text-amber-400'
            )}>
              <AlertCircle className="w-4 h-4" />
            </div>
          )}
          
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[var(--color-text-muted)]">
                #{job.jobId}
              </span>
              <span className="text-[var(--color-text-secondary)]">
                {formatDate(job.date)}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className={clsx(
                hourFlag === 'red' ? 'text-red-400 font-medium' :
                hourFlag === 'yellow' ? 'text-amber-400 font-medium' :
                'text-[var(--color-text-muted)]'
              )}>
                {job.hours} ({job.hoursDecimal.toFixed(1)}h)
              </span>
              {hourFlag !== 'none' && (
                <span className={clsx(
                  "text-xs px-1 rounded",
                  hourFlag === 'red' ? 'bg-red-500/30 text-red-300' : 'bg-amber-500/30 text-amber-300'
                )}>
                  {hourFlag === 'red' ? '⚠️ Check hours!' : '⚠️ Long job'}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-20 px-2 py-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded text-right text-emerald-400"
                autoFocus
                disabled={isUpdating}
              />
              <button
                onClick={saveEdit}
                disabled={isUpdating}
                className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={cancelEditing}
                disabled={isUpdating}
                className="p-1 text-red-400 hover:bg-red-500/20 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <span className="text-emerald-400 font-medium">
                {formatCurrency(job.cost)}
              </span>
              <button
                onClick={() => startEditing(engineerName, job)}
                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] rounded"
                title="Edit cost"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>
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

      {/* Legend for hour flags */}
      <div className="flex items-center gap-4 mb-4 text-xs text-[var(--color-text-muted)]">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-500/30"></div>
          <span>5+ hours (check)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500/30"></div>
          <span>8+ hours (likely error)</span>
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
                      {engineer.recentJobs.length}
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
                        {/* Recent Jobs - Current Pay Period */}
                        <div className="mb-4">
                          <p className="text-sm text-[var(--color-text-secondary)] mb-3 flex items-center gap-2">
                            <Briefcase className="w-4 h-4" />
                            Jobs This Pay Period ({engineer.recentJobs.length})
                            <span className="text-xs text-[var(--color-text-muted)]">
                              • Click ✏️ to edit cost
                            </span>
                          </p>
                          {engineer.recentJobs.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {engineer.recentJobs.map((job) => renderJobItem(job, engineer.name))}
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
                                    {formatCurrency(ticket.totalAmount || ticket.fineAmount)}
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
