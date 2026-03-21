'use client';

import { useSales, useInventory, usePurchases, useExpenses } from '@/hooks/useApi';
import { Activity, IndianRupee, TrendingUp, Package, ShoppingCart, Receipt, Wallet, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { formatDateTime } from '@/lib/utils';
import { useMemo } from 'react';
import {
  calculateAvailableQuantity,
  calculatePurseBalance,
  sumPendingAmount,
  sumProfit,
  sumRevenue,
  sumAmountReceived,
  sumItemsSold,
} from '@/lib/calculations';
import { getBusinessDate, getBusinessDateRange } from '@/lib/business-day';
import styles from './dashboard.module.css';

function DashboardSkeleton() {
  return (
    <div className={styles.skeletonContainer}>
      <div className={`${styles.skeletonHero} skeleton`} />
      <div className={styles.skeletonGrid3}>
        <div className={`${styles.skeletonCard} skeleton`} />
        <div className={`${styles.skeletonCard} skeleton`} />
        <div className={`${styles.skeletonCard} skeleton`} />
      </div>
      <div className={styles.skeletonGrid4}>
        <div className={`${styles.skeletonSmall} skeleton`} />
        <div className={`${styles.skeletonSmall} skeleton`} />
        <div className={`${styles.skeletonSmall} skeleton`} />
        <div className={`${styles.skeletonSmall} skeleton`} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: sales = [], isLoading: salesLoading } = useSales();
  const { data: inventory = [], isLoading: invLoading } = useInventory();
  const { data: purchases = [], isLoading: purLoading } = usePurchases();
  const { data: expenses = [], isLoading: expLoading } = useExpenses();

  const isLoading = salesLoading || invLoading || purLoading || expLoading;
  const recentSales = useMemo(
    () => [...sales].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [sales],
  );

  const stats = useMemo(() => {
    const totalProfit = sumProfit(sales);
    const totalRevenue = sumRevenue(sales);
    const totalItemsSold = sumItemsSold(sales);
    const totalPurchase = purchases.reduce((acc, p) => acc + p.amount, 0);
    const extraExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const amountReceived = sumAmountReceived(sales);
    const purseBalance = calculatePurseBalance(amountReceived, totalPurchase, extraExpenses);

    const todayBusinessDate = getBusinessDate();
    const salesToday = sales.filter((sale) => sale.businessDate === todayBusinessDate);

    const todaySalesCount = sumItemsSold(salesToday);
    const todayRevenue = salesToday.reduce((acc, sale) => acc + sale.totalAmount, 0);
    const pendingPaymentsAmount = sumPendingAmount(sales);
    
    const inventoryWithDynamicAvailable = inventory.map(item => ({
      ...item,
      available: calculateAvailableQuantity(item.quantityIn, item.quantityOut),
    }));
    const lowStockItems = inventoryWithDynamicAvailable.filter((item) => item.available < 5 && item.available > 0);
    const availableItems = inventoryWithDynamicAvailable.filter((item) => item.available > 0);
    
    const itemSalesCount = new Map<string, number>();
    sales.forEach(sale => {
      sale.items.forEach((item) => {
        itemSalesCount.set(item.name, (itemSalesCount.get(item.name) || 0) + item.quantity);
      });
    });
    const topItems = Array.from(itemSalesCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const last7BusinessDates = getBusinessDateRange(7);
    const last7Days = last7BusinessDates.map((businessDate) => {
      const localDay = new Date(`${businessDate}T00:00:00`);
      return localDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const profitByDay = last7Days.map(dateStr => ({
      date: dateStr,
      profit: sales
        .filter((s) => {
          const localDay = new Date(`${s.businessDate}T00:00:00`);
          return localDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) === dateStr;
        })
        .reduce((sum, s) => sum + s.profit, 0)
    }));
    const maxProfit = Math.max(...profitByDay.map(d => d.profit), 100);
    const hasChartData = profitByDay.some(d => d.profit > 0);

    return {
      totalProfit, totalRevenue, totalItemsSold, totalPurchase, extraExpenses, purseBalance,
      todaySalesCount, todayRevenue, pendingPaymentsAmount,
      lowStockItems, availableItems, topItems, last7Days, profitByDay, maxProfit, hasChartData
    };
  }, [sales, inventory, purchases, expenses]);

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard Overview</h1>
        <div className={styles.headerActions}>
          <Link href="/add-purchase" className={styles.btnOutline}>
            <ShoppingCart size={16} /> Add Purchase
          </Link>
          <Link href="/add-expense" className={styles.btnOutline}>
            <Receipt size={16} /> Add Expense
          </Link>
        </div>
      </div>

      {/* Hero Card - Purse Balance */}
      <div className={`${styles.glassCard} ${styles.heroCard}`}>
        <div className={styles.heroGlow}></div>
        <span className={styles.heroLabel}>
          <Wallet size={16} /> Purse Balance
        </span>
        <div className={`${styles.heroValue} ${stats.purseBalance >= 0 ? styles.heroValuePositive : styles.heroValueNegative}`}>
          {stats.purseBalance < 0 ? '-' : ''}₹{Math.abs(stats.purseBalance).toLocaleString('en-IN')}
        </div>
        <div className={styles.heroSub}>
          Revenue (₹{stats.totalRevenue.toLocaleString('en-IN')}) - Purchases (₹{stats.totalPurchase.toLocaleString('en-IN')}) - Expenses (₹{stats.extraExpenses.toLocaleString('en-IN')})
        </div>
      </div>

      {/* Secondary Cards */}
      <div className={styles.statsGrid3}>
        <div className={styles.statCard}>
          <div className={styles.statGlowSuccess}></div>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Total Profit</span>
            <div className={styles.statIconSuccess}><TrendingUp size={20} /></div>
          </div>
          <div className={styles.statValueSuccess}>₹{stats.totalProfit.toLocaleString('en-IN')}</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statGlowPrimary}></div>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Total Sales</span>
            <div className={styles.statIconPrimary}><IndianRupee size={20} /></div>
          </div>
          <div className={styles.statValuePrimary}>₹{stats.totalRevenue.toLocaleString('en-IN')}</div>
          <div className={styles.statSub}>{stats.totalItemsSold} items sold</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statGlowWarning}></div>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Total Purchase</span>
            <div className={styles.statIconWarning}><ShoppingCart size={20} /></div>
          </div>
          <div className={styles.statValueWarning}>₹{stats.totalPurchase.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Smaller Cards */}
      <div className={styles.statsGrid4}>
        <div className={styles.smallCard}>
           <div className={styles.smallCardHeader}>
            <span className={styles.smallCardLabel}>Today Sales</span>
            <Activity size={16} color="var(--success)" />
          </div>
          <div className={styles.smallCardValue}>₹{stats.todayRevenue.toLocaleString('en-IN')}</div>
          <div className={styles.smallCardSub}>{stats.todaySalesCount} items Today</div>
        </div>

        <div className={styles.smallCard}>
           <div className={styles.smallCardHeader}>
            <span className={styles.smallCardLabel}>Expenses</span>
            <Receipt size={16} color="var(--danger)" />
          </div>
          <div className={styles.smallCardValueDanger}>₹{stats.extraExpenses.toLocaleString('en-IN')}</div>
        </div>

        <div className={styles.smallCardDanger}>
           <div className={styles.smallCardHeader}>
            <span className={styles.smallCardLabelDanger}>Udhaar</span>
            <AlertCircle size={16} color="var(--danger)" />
          </div>
          <div className={styles.smallCardValueDanger}>₹{stats.pendingPaymentsAmount.toLocaleString('en-IN')}</div>
        </div>

        <div className={styles.smallCard}>
           <div className={styles.smallCardHeader}>
            <span className={styles.smallCardLabel}>Available Items</span>
            <Package size={16} color="#00c6ff" />
          </div>
          <div className={styles.smallCardValue}>{stats.availableItems.length}</div>
        </div>
      </div>

      <div className={styles.contentGrid}>
        {/* Empty State Handled 7-Day Profit Chart */}
        <div className={`${styles.glassCard} ${styles.span2} ${styles.chartContainer}`}>
          <h2 className={styles.sectionTitle}>
            <TrendingUp size={18} color="var(--success)" /> 7-Day Profit Trend
          </h2>
          {stats.hasChartData ? (
            <div className={styles.chartWrapper}>
              {stats.profitByDay.map((day, idx) => (
                <div key={idx} className={styles.chartBarGroup}>
                  <div className={styles.chartBarTrack}>
                    <div 
                      className={styles.chartBarFill}
                      style={{ height: `${Math.max((day.profit / stats.maxProfit) * 100, 2)}%` }}
                    ></div>
                    <div className={styles.chartTooltip}>
                      ₹{day.profit}
                    </div>
                  </div>
                  <span className={styles.chartLabel}>{day.date}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIconWrapper}>
                <TrendingUp size={32} opacity={0.5} />
              </div>
              <p>No data yet — start selling 🚀</p>
            </div>
          )}
        </div>

        {/* Low Stock Items */}
        <div className={styles.glassCard}>
          <h2 className={styles.sectionTitle}>
            <AlertCircle size={18} color="var(--warning)"/> Low Stock Alerts
          </h2>
          {stats.lowStockItems.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIconWrapperSuccess}>
                <Package size={24} color="var(--success)" />
              </div>
              <p>All items are sufficiently stocked!</p>
            </div>
          ) : (
            <div className={styles.scrollList}>
              {stats.lowStockItems.map((item) => (
                <div key={item.id} className={styles.listItem}>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{item.name}</span>
                    <span className={styles.itemStock}>Available: <span className={styles.itemStockValue}>{item.available}</span></span>
                  </div>
                  {item.available === 0 ? (
                    <span className={styles.badgeDanger}>Out of Stock</span>
                  ) : (
                    <span className={styles.badgeWarning}>Low</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Recent Sales Table */}
        <div className={`${styles.glassCard} ${styles.span3}`}>
          <div className={styles.tableHeader}>
            <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Recent Sales</h2>
            <Link href="/payments" className={styles.tableLink}>View All</Link>
          </div>
          {sales.length === 0 ? (
            <div className={styles.emptyState} style={{ minHeight: '120px', padding: '20px' }}>No sales recorded yet.</div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Date</th>
                    <th className={styles.th}>Item</th>
                    <th className={styles.th}>Total</th>
                    <th className={styles.th}>Amount Paid</th>
                    <th className={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.slice(0, 5).map((sale) => (
                    <tr key={sale.id} className={styles.tr}>
                      <td className={styles.td}>
                        <div className={styles.tableDate}>{formatDateTime(sale.createdAt)}</div>
                        <div className={styles.tableMeta}>Business Day: {sale.businessDate}</div>
                      </td>
                      <td className={styles.td}>
                        <div className={styles.tableItemName}>
                          {sale.items.length === 1 ? sale.items[0].name : `${sale.items.length} items`}
                        </div>
                        <div className={styles.tableItemDesc}>
                          {sale.items.map((item) => `${item.name} x${item.quantity}`).join(', ')}
                        </div>
                        <div className={styles.tableItemRoom}>
                          {sale.roomNo ? (sale.roomNo.match(/^\d+$/) ? `Room ${sale.roomNo}` : sale.roomNo) : '-'}
                        </div>
                      </td>
                      <td className={`${styles.td} ${styles.tableTotal}`}>₹{sale.totalAmount}</td>
                      <td className={`${styles.td} ${styles.tablePaid}`}>₹{sale.amountPaid}</td>
                      <td className={styles.td}>
                        {sale.remaining <= 0 ? (
                          <span className={styles.badgeSuccess}>Paid</span>
                        ) : sale.amountPaid <= 0 ? (
                          <span className={styles.badgeDangerOutline}>Udhaar</span>
                        ) : (
                          <span className={styles.badgeWarningOutline}>Partially</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
