'use client';

import { useEffect, useState } from 'react';
import { InventoryItem, SaleItem } from '@/lib/types';
import { Activity, IndianRupee, TrendingUp, Package } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

function DashboardSkeleton() {
  return (
    <div>
      <h1 className="mb-6">Dashboard Overview</h1>
      <div className="grid grid-cols-5 mb-8 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="glass-panel stat-card animate-pulse" style={{ height: '90px' }}></div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-panel animate-pulse" style={{ height: '300px' }}></div>
        <div className="glass-panel animate-pulse" style={{ height: '300px' }}></div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [salesRes, invRes] = await Promise.all([
          fetch('/api/sales'),
          fetch('/api/inventory'),
        ]);
        const salesData = await salesRes.json();
        const invData = await invRes.json();
        
        // Make sure data is array
        if (Array.isArray(salesData)) setSales(salesData);
        if (Array.isArray(invData)) setInventory(invData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  // Calculate statistics
  const totalProfit = sales.reduce((acc, sale) => acc + sale.profit, 0);
  
  // Timezone safe today check using purely local date strings
  const today = new Date();
  const todayLocalString = today.toLocaleDateString();

  const salesToday = sales.filter((sale) => new Date(sale.date).toLocaleDateString() === todayLocalString);
  const todaySalesCount = salesToday.reduce((acc, sale) => acc + sale.quantity, 0);
  const todayRevenue = salesToday.reduce((acc, sale) => acc + sale.amountPaid, 0);

  // We keep lowStockItems for the data table rendering below, but removed the Top Card for it
  const pendingPaymentsAmount = sales.reduce((acc, sale) => acc + Math.max(0, sale.remaining), 0);
  
  const lowStockItems = inventory.filter((item) => item.available < 5 && item.available > 0);
  
  const availableItems = inventory.filter((item) => item.available > 0);
  const availableItemsCount = availableItems.length;
  // Get top 3 available items by quantity
  const top3Available = [...availableItems].sort((a,b) => b.available - a.available).slice(0, 3).map(i => i.name).join(', ');

  const itemSalesCount = new Map<string, number>();
  sales.forEach(sale => {
    itemSalesCount.set(sale.itemName, (itemSalesCount.get(sale.itemName) || 0) + sale.quantity);
  });
  const topItems = Array.from(itemSalesCount.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Daily Profit Chart Data
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }).reverse();

  const profitByDay = last7Days.map(dateStr => ({
    date: dateStr,
    profit: sales.filter(s => new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) === dateStr).reduce((sum, s) => sum + s.profit, 0)
  }));
  const maxProfit = Math.max(...profitByDay.map(d => d.profit), 100);

  return (
    <div>
      <h1 className="mb-6">Dashboard Overview</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-panel stat-card" style={{ borderRadius: '1.5rem' }}>
          <div className="flex-between">
            <span className="stat-label">Total Profit</span>
            <TrendingUp size={20} className="text-success" />
          </div>
          <div className="stat-value text-success">₹{totalProfit}</div>
        </div>
        
        <div className="glass-panel stat-card" style={{ borderRadius: '1.5rem' }}>
          <div className="flex-between">
            <span className="stat-label">Today Sales</span>
            <Activity size={20} className="text-primary" />
          </div>
          <div className="stat-value">{todaySalesCount} <span style={{fontSize: 14, fontWeight: 'normal'}}>items</span></div>
          <div style={{fontSize: 13, color: 'var(--text-secondary)'}}>Revenue: ₹{todayRevenue}</div>
        </div>

        <div className="glass-panel stat-card" style={{ borderRadius: '1.5rem' }}>
          <div className="flex-between">
            <span className="stat-label">Pending Payments</span>
            <IndianRupee size={20} className="text-warning" />
          </div>
          <div className="stat-value text-warning">₹{pendingPaymentsAmount}</div>
        </div>

        <div className="glass-panel stat-card" style={{ borderRadius: '1.5rem' }}>
          <div className="flex-between">
            <span className="stat-label">Available Items</span>
            <Package size={20} className="text-secondary" />
          </div>
          <div className="stat-value text-secondary">{availableItemsCount}</div>
          <div style={{fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
            {top3Available || 'None'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-panel">
          <h2>Low Stock Items</h2>
          {lowStockItems.length === 0 ? (
            <p>All items in stock!</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Alert Level</th>
                    <th>Available</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>
                        {item.available === 0 ? (
                          <span className="badge badge-danger">Out of Stock</span>
                        ) : (
                          <span className="badge badge-warning">Low</span>
                        )}
                      </td>
                      <td className="text-danger font-bold">{item.available}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Top Selling Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel relative overflow-hidden">
              <h2 className="mb-4">Top Selling Items</h2>
              {topItems.length === 0 ? (
                <p className="text-secondary">No sales data yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {topItems.map((item, idx) => (
                     <div key={idx} className="flex-between pb-2" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                       <span className="font-bold">{idx + 1}. {item.name}</span>
                       <span className="text-primary">{item.count} units sold</span>
                     </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel">
            <h2 className="mb-4">7-Day Profit Trend</h2>
            <div className="flex items-end gap-2 h-32 mt-4 pt-4">
              {profitByDay.map((day, idx) => (
                <div key={idx} className="flex flex-col flex-1 items-center gap-2 group relative">
                  <div className="w-full rounded-t-md relative flex-1" style={{ height: '100px', backgroundColor: 'var(--glass-bg)', overflow: 'hidden' }}>
                    <div 
                      className="absolute bottom-0 w-full rounded-t-sm transition-all duration-500 ease-out" 
                      style={{ height: `${(day.profit / maxProfit) * 100}%`, backgroundColor: 'var(--success)', opacity: 0.8 }}
                    ></div>
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-[var(--glass-border)] text-white px-2 py-1 rounded text-xs transition-opacity z-10 text-center whitespace-nowrap">
                      ₹{day.profit}
                    </div>
                  </div>
                  <span className="text-secondary" style={{ fontSize: '11px' }}>{day.date}</span>
                </div>
              ))}
            </div>
          </div>
        
          <div className="glass-panel">
          <h2>Recent Sales</h2>
          {sales.length === 0 ? (
            <p>No sales recorded yet.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Item</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.slice(0, 5).map((sale) => (
                    <tr key={sale.id}>
                      <td>
                        <div className="text-secondary" style={{fontSize: 13}}>{formatDateTime(sale.date)}</div>
                      </td>
                      <td>
                        <div>{sale.itemName} <span className="text-secondary" style={{fontSize: 12}}>x{sale.quantity}</span></div>
                        <div style={{fontSize: 12, color: 'var(--text-secondary)'}}>Room {sale.roomNo}</div>
                      </td>
                      <td>₹{sale.total}</td>
                      <td>
                        {sale.remaining <= 0 ? (
                          <span className="badge badge-success">Paid</span>
                        ) : sale.amountPaid <= 0 ? (
                          <span className="badge badge-danger">Udhaar</span>
                        ) : (
                          <span className="badge badge-warning">Half Paid</span>
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
    </div>
  );
}
