'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Users,
  RefreshCw,
  LogOut,
  PoundSterling,
  Clock,
  AlertCircle,
  CheckCircle,
  Briefcase,
  TrendingUp,
  Car,
  AlertTriangle,
  Search,
} from 'lucide-react';
import { clsx } from 'clsx';
import StatCard from '@/components/StatCard';
import InvoiceTable from '@/components/InvoiceTable';
import EngineerTable from '@/components/EngineerTable';
import {
  InvoicePieChart,
  DirectorChart,
  PMChart,
  PayrollTimelineChart,
  TopEngineersChart,
} from '@/components/Charts';
import { DashboardData } from '@/types';
import MaterialSearch from '@/components/MaterialSearch';

type TabType = 'overview' | 'invoices' | 'payroll' | 'materials';

export default function DashboardClient() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const fetchData = useCallback(async (showRefreshing = false, forceRefresh = false) => {
    if (showRefreshing) setIsRefreshing(true);
    
    try {
      const url = forceRefresh ? '/api/data?refresh=true' : '/api/data';
      const res = await fetch(url);
      const result = await res.json();

      if (result.success) {
        setData(result.data);
        setLastRefresh(new Date());
        setError(null);
      } else {
        if (res.status === 401) {
          router.push('/');
          return;
        }
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();

    // Auto-refresh every 1 hour (3600000ms)
    const interval = setInterval(() => fetchData(false), 3600000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: LayoutDashboard },
    { id: 'invoices' as TabType, label: 'Invoices', icon: FileText },
    { id: 'payroll' as TabType, label: 'Payroll', icon: Users },
    { id: 'materials' as TabType, label: 'Material Search', icon: Search },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-[var(--color-text-secondary)]">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center card max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
          <p className="text-[var(--color-text-secondary)] mb-4">{error}</p>
          <button onClick={() => fetchData(true)} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--color-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <span className="text-lg font-bold text-white">P</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold">Philbys Dashboard</h1>
                <p className="text-xs text-[var(--color-text-muted)]">Operations & Finance</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {lastRefresh && (
                <span className="text-xs text-[var(--color-text-muted)] hidden sm:block">
                  Updated {lastRefresh.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={() => fetchData(true, true)}
                disabled={isRefreshing}
                className="btn btn-secondary p-2"
                title="Refresh data"
              >
                <RefreshCw className={clsx('w-5 h-5', isRefreshing && 'animate-spin')} />
              </button>
              <button
                onClick={handleLogout}
                className="btn btn-secondary p-2"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex gap-1 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'nav-link flex items-center gap-2 pb-3 border-b-2 rounded-none',
                  activeTab === tab.id
                    ? 'border-blue-500 text-[var(--color-text-primary)]'
                    : 'border-transparent'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && data && (
          <div className="space-y-6 animate-fade-in">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Outstanding Invoices"
                value={formatCurrency(data.invoices.totalOutstanding)}
                subtitle={`${data.invoices.countOutstanding} invoices`}
                icon={AlertCircle}
                color="red"
                delay={0}
              />
              <StatCard
                title="Paid Invoices"
                value={formatCurrency(data.invoices.totalPaid)}
                subtitle={`${data.invoices.countPaid} invoices`}
                icon={CheckCircle}
                color="green"
                delay={1}
              />
              <StatCard
                title="Total Payroll"
                value={formatCurrency(data.payroll.totalCost)}
                subtitle={`${data.payroll.engineerCount} engineers`}
                icon={PoundSterling}
                color="blue"
                delay={2}
              />
              <StatCard
                title="Total Jobs"
                value={data.payroll.totalJobs.toLocaleString()}
                subtitle={`${data.payroll.totalHours.toFixed(0)}h worked`}
                icon={Briefcase}
                color="purple"
                delay={3}
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <InvoicePieChart
                paid={data.invoices.totalPaid}
                outstanding={data.invoices.totalOutstanding}
              />
              <PMChart data={data.invoices.byPM} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PayrollTimelineChart data={data.payroll.byDate} />
              <TopEngineersChart data={data.payroll.engineers} />
            </div>
          </div>
        )}

        {activeTab === 'invoices' && data && (
          <div className="space-y-6 animate-fade-in">
            {/* Invoice Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Outstanding"
                value={formatCurrency(data.invoices.totalOutstanding)}
                subtitle="Needs chasing"
                icon={AlertCircle}
                color="red"
                delay={0}
              />
              <StatCard
                title="Total Paid"
                value={formatCurrency(data.invoices.totalPaid)}
                subtitle="Collected"
                icon={CheckCircle}
                color="green"
                delay={1}
              />
              <StatCard
                title="Total Invoices"
                value={(data.invoices.countOutstanding + data.invoices.countPaid).toLocaleString()}
                subtitle={`${data.invoices.byClient.length} clients`}
                icon={FileText}
                color="blue"
                delay={2}
              />
              <StatCard
                title="Collection Rate"
                value={`${Math.round((data.invoices.countPaid / (data.invoices.countOutstanding + data.invoices.countPaid)) * 100)}%`}
                subtitle="Paid / Total"
                icon={TrendingUp}
                color="purple"
                delay={3}
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <InvoicePieChart
                paid={data.invoices.totalPaid}
                outstanding={data.invoices.totalOutstanding}
              />
              <PMChart data={data.invoices.byPM} />
            </div>

            {/* Client Table */}
            <InvoiceTable data={data.invoices.byClient} />
          </div>
        )}

        {activeTab === 'payroll' && data && (
          <div className="space-y-6 animate-fade-in">
            {/* Payroll Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard
                title="Total Payroll"
                value={formatCurrency(data.payroll.totalCost)}
                subtitle="All engineers"
                icon={PoundSterling}
                color="green"
                delay={0}
              />
              <StatCard
                title="Total Jobs"
                value={data.payroll.totalJobs.toLocaleString()}
                subtitle="Completed"
                icon={Briefcase}
                color="blue"
                delay={1}
              />
              <StatCard
                title="Total Hours"
                value={`${data.payroll.totalHours.toFixed(0)}h`}
                subtitle="All engineers"
                icon={Clock}
                color="amber"
                delay={2}
              />
              <StatCard
                title="Engineers"
                value={data.payroll.engineerCount.toString()}
                subtitle="Active"
                icon={Users}
                color="purple"
                delay={3}
              />
              <StatCard
                title="Total Fines"
                value={formatCurrency(data.payroll.totalFines)}
                subtitle={`${data.payroll.totalTickets} tickets`}
                icon={Car}
                color="red"
                delay={4}
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PayrollTimelineChart data={data.payroll.byDate} />
              <TopEngineersChart data={data.payroll.engineers} />
            </div>

            {/* Engineer Table */}
            <EngineerTable
              data={data.payroll.engineers}
              payPeriodStart={data.payroll.payPeriodStart}
              payPeriodEnd={data.payroll.payPeriodEnd}
            />
          </div>
        )}

        {activeTab === 'materials' && (
          <MaterialSearch />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)]">
            <p>© 2026 Philbys Group Ltd. All rights reserved.</p>
            <p>Data refreshes automatically every hour</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
