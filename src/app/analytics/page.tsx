'use client';

import { useMemo, useState } from 'react';
import { useSales } from '@/hooks/useApi';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, Legend
} from 'recharts';
import { TrendingUp, Package, Activity } from 'lucide-react';

import { getBusinessDateRange } from '@/lib/business-day';
import styles from './analytics.module.css';

function AnalyticsSkeleton() {
  return (
    <div className={styles.skeletonContainer}>
      <div className={`${styles.skeletonHeader} skeleton`} />
      <div className={styles.grid2}>
        <div className={`${styles.skeletonCard} skeleton`} />
        <div className={`${styles.skeletonCard} skeleton`} />
      </div>
      <div className={`${styles.skeletonCard} skeleton`} />
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean, payload?: Record<string, unknown>[], label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.customTooltip}>
        <p className={styles.tooltipTitle}>{label}</p>
        {payload.map((entry: Record<string, unknown>, index: number) => (
          <p key={`item-${index}`} style={{ color: entry.color as string }} className={styles.tooltipRow}>
            <span>{entry.name as string}:</span>
            <span>₹{(entry.value as number).toLocaleString('en-IN')}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const { data: sales = [], isLoading: salesLoading } = useSales();
  
  const [timeRange, setTimeRange] = useState('7D'); // '7D' | '30D'

  const isLoading = salesLoading;

  const chartData = useMemo(() => {
    const daysCount = timeRange === '7D' ? 7 : 30;

    const businessDates = getBusinessDateRange(daysCount);

    return businessDates.map((businessDate) => {
      const localDay = new Date(`${businessDate}T00:00:00`);
      const dateStr = localDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const daySales = sales.filter((s) => s.businessDate === businessDate);

      return {
        date: dateStr,
        Revenue: daySales.reduce((sum, s) => sum + s.totalAmount, 0),
        Profit: daySales.reduce((sum, s) => sum + s.profit, 0),
        ItemsSold: daySales.reduce(
          (sum, s) => sum + s.items.reduce((itemAcc, item) => itemAcc + item.quantity, 0),
          0,
        ),
      };
    });
  }, [sales, timeRange]);

  const topSellingData = useMemo(() => {
    const itemSalesCount = new Map<string, { count: number, revenue: number, profit: number }>();
    sales.forEach(sale => {
      sale.items.forEach((item) => {
        const existing = itemSalesCount.get(item.name) || { count: 0, revenue: 0, profit: 0 };
        itemSalesCount.set(item.name, {
          count: existing.count + item.quantity,
          revenue: existing.revenue + item.total,
          profit: existing.profit + (item.sellingPrice - item.costPrice) * item.quantity,
        });
      });
    });
    
    return Array.from(itemSalesCount.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 7); // Top 7
  }, [sales]);

  if (isLoading) return <AnalyticsSkeleton />;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Analytics & Reports</h1>
        <div className={styles.toggleGroup}>
          <button
            type="button"
            className={`${styles.toggleBtn} ${timeRange === '7D' ? styles.toggleBtnActive : ''}`}
            onClick={() => setTimeRange('7D')}
            aria-pressed={timeRange === '7D'}
          >
            Last 7 Days
          </button>
          <button
            type="button"
            className={`${styles.toggleBtn} ${timeRange === '30D' ? styles.toggleBtnActive : ''}`}
            onClick={() => setTimeRange('30D')}
            aria-pressed={timeRange === '30D'}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      <div className={styles.grid2}>
        {/* Revenue vs Profit Chart */}
        <div className={styles.glassCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <TrendingUp size={18} color="#00c6ff" /> Revenue vs Profit
            </h2>
            <p className={styles.cardSub}>Daily breakdown of total revenue and estimated profit.</p>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00c6ff" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00c6ff" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--success)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={12} tickMargin={10} axisLine={false} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="Revenue" stroke="#00c6ff" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="Profit" stroke="var(--success)" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Selling Items (Revenue) */}
        <div className={styles.glassCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <Package size={18} color="var(--warning)" /> Top Performing Items
            </h2>
            <p className={styles.cardSub}>Based on total revenue generated.</p>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSellingData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={12} tickFormatter={(value) => `₹${value}`} />
                <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.6)" fontSize={12} width={100} tick={{fill: 'rgba(255,255,255,0.8)'}} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="revenue" name="Revenue" fill="var(--warning)" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Daily Volume Trend */}
      <div className={`${styles.glassCard} ${styles.glassCardAccent}`}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <Activity size={18} color="#00c6ff" /> Sales Volume Trend
          </h2>
          <p className={styles.cardSub}>Number of total items sold per day.</p>
        </div>
        <div className={styles.chartContainerSmall}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={12} tickMargin={10} axisLine={false} tickLine={false} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="ItemsSold" name="Items Sold" stroke="var(--text-primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--background)', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#00c6ff' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
    </div>
  );
}
