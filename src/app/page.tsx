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
} from '@/lib/calculations';

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse mt-4">
      <div className="h-44 bg-white/5 rounded-3xl border border-white/10" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-32 bg-white/5 rounded-2xl border border-white/10" />
        <div className="h-32 bg-white/5 rounded-2xl border border-white/10" />
        <div className="h-32 bg-white/5 rounded-2xl border border-white/10" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="h-28 bg-white/5 rounded-2xl border border-white/10" />
        <div className="h-28 bg-white/5 rounded-2xl border border-white/10" />
        <div className="h-28 bg-white/5 rounded-2xl border border-white/10" />
        <div className="h-28 bg-white/5 rounded-2xl border border-white/10" />
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

  const stats = useMemo(() => {
    const totalProfit = sumProfit(sales);
    const totalRevenue = sumRevenue(sales);
    const totalItemsSold = sales.reduce((acc, sale) => acc + sale.quantity, 0);
    const totalPurchase = purchases.reduce((acc, p) => acc + p.amount, 0);
    const extraExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const amountReceived = sumAmountReceived(sales);
    const purseBalance = calculatePurseBalance(amountReceived, totalPurchase, extraExpenses);

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0).getTime();
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime();

    const salesToday = sales.filter((sale) => {
      const saleDate = new Date(sale.date).getTime();
      return saleDate >= startOfToday && saleDate <= endOfToday;
    });

    const todaySalesCount = salesToday.reduce((acc, sale) => acc + sale.quantity, 0);
    const todayRevenue = salesToday.reduce((acc, sale) => acc + sale.total, 0);
    const pendingPaymentsAmount = sumPendingAmount(sales);
    
    const inventoryWithDynamicAvailable = inventory.map(item => ({
      ...item,
      available: calculateAvailableQuantity(item.quantityIn, item.quantityOut),
    }));
    const lowStockItems = inventoryWithDynamicAvailable.filter((item) => item.available < 5 && item.available > 0);
    const availableItems = inventoryWithDynamicAvailable.filter((item) => item.available > 0);
    
    const itemSalesCount = new Map<string, number>();
    sales.forEach(sale => {
      itemSalesCount.set(sale.itemName, (itemSalesCount.get(sale.itemName) || 0) + sale.quantity);
    });
    const topItems = Array.from(itemSalesCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }).reverse();

    const profitByDay = last7Days.map(dateStr => ({
      date: dateStr,
      profit: sales.filter(s => new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) === dateStr).reduce((sum, s) => sum + s.profit, 0)
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
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex-between">
        <h1 className="mb-0 text-xl font-semibold tracking-tight">Dashboard Overview</h1>
        <div className="flex gap-3">
          <Link href="/add-purchase" className="btn btn-outline hover:bg-white/5 active:scale-95 transition-all duration-200 text-sm py-2 px-3 rounded-xl border-white/10">
            <ShoppingCart size={16} /> Add Purchase
          </Link>
          <Link href="/add-expense" className="btn btn-outline hover:bg-white/5 active:scale-95 transition-all duration-200 text-sm py-2 px-3 rounded-xl border-white/10">
            <Receipt size={16} /> Add Expense
          </Link>
        </div>
      </div>

      {/* Hero Card - Purse Balance */}
      <div className="glass-panel relative overflow-hidden p-8 flex flex-col items-center justify-center border-primary/30 shadow-[0_0_40px_rgba(59,130,246,0.15)] hover:border-primary/50 group transition-all duration-200">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-32 bg-primary/20 blur-[100px] rounded-full pointer-events-none group-hover:bg-primary/30 transition-all duration-700"></div>
        <span className="text-sm font-semibold uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
          <Wallet size={16} /> Purse Balance
        </span>
        <div className={`text-6xl font-bold mb-3 tracking-tighter ${stats.purseBalance >= 0 ? 'text-green-400' : 'text-red-400'} drop-shadow-md`}>
          {stats.purseBalance < 0 ? '-' : ''}₹{Math.abs(stats.purseBalance).toLocaleString('en-IN')}
        </div>
        <div className="text-sm text-muted">
          Revenue (₹{stats.totalRevenue.toLocaleString('en-IN')}) - Purchases (₹{stats.totalPurchase.toLocaleString('en-IN')}) - Expenses (₹{stats.extraExpenses.toLocaleString('en-IN')})
        </div>
      </div>

      {/* Secondary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel flex flex-col gap-2 relative overflow-hidden group transition-all duration-200">
          <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-success/10 blur-3xl group-hover:bg-success/20 transition-all"></div>
          <div className="flex-between relative z-10">
            <span className="text-sm text-gray-400 font-medium uppercase tracking-wider">Total Profit</span>
            <div className="bg-success/20 p-2 rounded-full border border-success/30"><TrendingUp size={20} className="text-success" /></div>
          </div>
          <div className="text-3xl font-bold text-green-400 relative z-10 mt-2">₹{stats.totalProfit.toLocaleString('en-IN')}</div>
        </div>

        <div className="glass-panel flex flex-col gap-2 relative overflow-hidden group transition-all duration-200">
          <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-primary/10 blur-3xl group-hover:bg-primary/20 transition-all"></div>
          <div className="flex-between relative z-10">
            <span className="text-sm text-gray-400 font-medium uppercase tracking-wider">Total Sales</span>
            <div className="bg-primary/20 p-2 rounded-full border border-primary/30"><IndianRupee size={20} className="text-primary" /></div>
          </div>
          <div className="text-3xl font-bold text-blue-400 relative z-10 mt-2">₹{stats.totalRevenue.toLocaleString('en-IN')}</div>
          <div className="text-sm text-gray-400 mt-1 relative z-10">{stats.totalItemsSold} items sold</div>
        </div>

        <div className="glass-panel flex flex-col gap-2 relative overflow-hidden group transition-all duration-200">
          <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-warning/10 blur-3xl group-hover:bg-warning/20 transition-all"></div>
          <div className="flex-between relative z-10">
            <span className="text-sm text-gray-400 font-medium uppercase tracking-wider">Total Purchase</span>
            <div className="bg-warning/20 p-2 rounded-full border border-warning/30"><ShoppingCart size={20} className="text-warning" /></div>
          </div>
          <div className="text-3xl font-bold text-red-400 relative z-10 mt-2">₹{stats.totalPurchase.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Smaller Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 hover:bg-white/[0.08] transition-all duration-200">
           <div className="flex-between mb-2">
            <span className="text-sm text-gray-400 uppercase tracking-wider">Today Sales</span>
            <Activity size={16} className="text-success" />
          </div>
          <div className="text-2xl font-bold text-blue-400">₹{stats.todayRevenue.toLocaleString('en-IN')}</div>
          <div className="text-sm text-gray-400 mt-1">{stats.todaySalesCount} items Today</div>
        </div>

        <div className="glass-panel p-5 hover:bg-white/[0.08] transition-all duration-200">
           <div className="flex-between mb-2">
            <span className="text-sm text-gray-400 uppercase tracking-wider">Expenses</span>
            <Receipt size={16} className="text-danger" />
          </div>
          <div className="text-2xl font-bold text-red-400">₹{stats.extraExpenses.toLocaleString('en-IN')}</div>
        </div>

        <div className="glass-panel p-5 border-danger/30 hover:border-danger/50 shadow-[0_0_15px_rgba(239,68,68,0.05)] bg-danger/5 transition-all duration-200">
           <div className="flex-between mb-2">
            <span className="text-sm text-red-400 uppercase tracking-wider font-semibold">Udhaar</span>
            <AlertCircle size={16} className="text-danger" />
          </div>
          <div className="text-2xl font-bold text-red-400">₹{stats.pendingPaymentsAmount.toLocaleString('en-IN')}</div>
        </div>

        <div className="glass-panel p-5 hover:bg-white/[0.08] transition-all duration-200">
           <div className="flex-between mb-2">
            <span className="text-sm text-gray-400 uppercase tracking-wider">Available Items</span>
            <Package size={16} className="text-primary" />
          </div>
          <div className="text-2xl font-bold text-blue-400">{stats.availableItems.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Empty State Handled 7-Day Profit Chart */}
        <div className="glass-panel lg:col-span-2 flex flex-col">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-success" /> 7-Day Profit Trend
          </h2>
          {stats.hasChartData ? (
            <div className="flex items-end gap-3 h-48 mt-auto pt-4 relative border-b border-white/10 pb-2">
              {stats.profitByDay.map((day, idx) => (
                <div key={idx} className="flex flex-col flex-1 items-center gap-3 group relative h-full justify-end">
                  <div className="w-full rounded-t-xl bg-white/5 overflow-hidden flex flex-col justify-end" style={{ height: '100%' }}>
                    <div 
                      className="w-full rounded-t-xl bg-gradient-to-t from-success/50 to-success transition-all duration-700 ease-out relative shadow-[0_-5px_15px_rgba(16,185,129,0.3)]" 
                      style={{ height: `${Math.max((day.profit / stats.maxProfit) * 100, 2)}%` }}
                    ></div>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-black/80 backdrop-blur text-white px-3 py-1.5 rounded-lg text-xs transition-all z-10 text-center whitespace-nowrap shadow-xl -mt-8 font-medium border border-white/10">
                      ₹{day.profit}
                    </div>
                  </div>
                  <span className="text-muted text-[10px] font-medium uppercase tracking-wider">{day.date}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center gap-3 min-h-[220px] border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
              <div className="bg-white/5 p-4 rounded-full mb-2">
                <TrendingUp size={32} className="text-muted opacity-50" />
              </div>
              <p className="text-muted font-medium">No data yet — start selling 🚀</p>
            </div>
          )}
        </div>

        {/* Low Stock Items */}
        <div className="glass-panel flex flex-col">
          <h2 className="text-xl font-semibold mb-4 flex gap-2 items-center">
            <AlertCircle size={18} className="text-warning"/> Low Stock Alerts
          </h2>
          {stats.lowStockItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[220px] text-center gap-3">
              <div className="bg-success/10 p-4 rounded-full">
                <Package size={24} className="text-success opacity-80" />
              </div>
              <p className="text-sm text-muted">All items are sufficiently stocked!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 overflow-y-auto pr-1" style={{ maxHeight: '250px' }}>
              {stats.lowStockItems.map((item) => (
                <div key={item.id} className="flex-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm text-white">{item.name}</span>
                    <span className="text-sm text-gray-400 mt-1">Available: <span className="text-yellow-400 font-bold ml-1">{item.available}</span></span>
                  </div>
                  {item.available === 0 ? (
                    <span className="badge badge-danger">Out of Stock</span>
                  ) : (
                    <span className="badge badge-warning text-black">Low</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Recent Sales Table */}
        <div className="glass-panel lg:col-span-3">
          <div className="flex-between mb-4">
            <h2 className="text-xl font-semibold mb-0">Recent Sales</h2>
            <Link href="/payments" className="text-sm font-semibold text-primary hover:text-primary-hover transition-colors border border-primary/30 px-4 py-1.5 rounded-full bg-primary/10">View All</Link>
          </div>
          {sales.length === 0 ? (
            <div className="text-center py-10 text-muted font-medium border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">No sales recorded yet.</div>
          ) : (
            <div className="table-container">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs border-b border-white/10">
                    <th className="font-semibold pb-3 text-muted">Date</th>
                    <th className="font-semibold pb-3 text-muted">Item</th>
                    <th className="font-semibold pb-3 text-muted">Total</th>
                    <th className="font-semibold pb-3 text-muted">Amount Paid</th>
                    <th className="font-semibold pb-3 text-muted">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sales.slice(0, 5).map((sale) => (
                    <tr key={sale.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="py-4">
                        <div className="text-muted text-xs group-hover:text-white/80 transition-colors">{formatDateTime(sale.date)}</div>
                      </td>
                      <td className="py-4">
                        <div className="font-medium text-white">{sale.itemName} <span className="text-muted text-xs ml-1 bg-white/10 px-1.5 py-0.5 rounded">x{sale.quantity}</span></div>
                        <div className="text-xs text-primary/80 mt-1 font-medium">Room {sale.roomNo}</div>
                      </td>
                      <td className="py-4 font-bold text-blue-400">₹{sale.total}</td>
                      <td className="py-4 font-medium text-muted">₹{sale.amountPaid}</td>
                      <td className="py-4">
                        {sale.remaining <= 0 ? (
                          <span className="badge badge-success">Paid</span>
                        ) : sale.amountPaid <= 0 ? (
                          <span className="badge badge-danger">Udhaar</span>
                        ) : (
                          <span className="badge badge-warning text-black">Partially</span>
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
