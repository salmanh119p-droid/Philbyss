'use client';

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-3 shadow-xl">
        {label && (
          <p className="text-[var(--color-text-secondary)] text-sm mb-1">{label}</p>
        )}
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' 
              ? new Intl.NumberFormat('en-GB', {
                  style: 'currency',
                  currency: 'GBP',
                  minimumFractionDigits: 0,
                }).format(entry.value)
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Invoice Status Pie Chart
interface InvoicePieChartProps {
  paid: number;
  outstanding: number;
}

export function InvoicePieChart({ paid, outstanding }: InvoicePieChartProps) {
  const data = [
    { name: 'Paid', value: paid, color: '#10b981' },
    { name: 'Outstanding', value: outstanding, color: '#ef4444' },
  ];

  const total = paid + outstanding;

  return (
    <div className="card h-80">
      <h3 className="section-title">Payment Status</h3>
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={4}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value, entry: any) => (
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {value} ({total > 0 ? Math.round((entry.payload.value / total) * 100) : 0}%)
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// Director Bar Chart
interface DirectorChartProps {
  data: { director: string; outstanding: number; count: number }[];
}

export function DirectorChart({ data }: DirectorChartProps) {
  const chartData = data.slice(0, 8).map((d) => ({
    name: d.director.split(' ')[0] || 'Unknown', // First name only
    amount: d.outstanding,
    invoices: d.count,
  }));

  return (
    <div className="card h-80">
      <h3 className="section-title">Outstanding by Director</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
          <XAxis 
            type="number" 
            stroke="var(--color-text-muted)"
            tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
          />
          <YAxis 
            type="category" 
            dataKey="name" 
            stroke="var(--color-text-muted)"
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="amount" name="Outstanding" fill="#f59e0b" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Payroll Timeline Chart
interface PayrollTimelineProps {
  data: { date: string; cost: number; jobs: number }[];
}

export function PayrollTimelineChart({ data }: PayrollTimelineProps) {
  // Group by week or show last 14 days
  const chartData = data.slice(-14).map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    cost: d.cost,
    jobs: d.jobs,
  }));

  return (
    <div className="card h-80">
      <h3 className="section-title">Payroll Over Time</h3>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="date" stroke="var(--color-text-muted)" />
          <YAxis 
            stroke="var(--color-text-muted)"
            tickFormatter={(value) => `£${value}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="cost"
            name="Cost"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Top Engineers Bar Chart
interface TopEngineersChartProps {
  data: { name: string; displayName: string; totalCost: number; totalJobs: number }[];
}

export function TopEngineersChart({ data }: TopEngineersChartProps) {
  const chartData = data.slice(0, 10).map((d) => ({
    name: d.displayName, // Use display name (second word)
    cost: d.totalCost,
    jobs: d.totalJobs,
  }));

  return (
    <div className="card h-80">
      <h3 className="section-title">Top Engineers by Pay</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="name" stroke="var(--color-text-muted)" />
          <YAxis 
            stroke="var(--color-text-muted)"
            tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="cost" name="Total Pay" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
