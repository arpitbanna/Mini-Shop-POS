'use client';

import { useEffect, useState } from 'react';
import { SaleItem } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

type FilterType = 'all' | 'paid' | 'partial' | 'unpaid';

export default function Payments() {
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  useEffect(() => {
    async function fetchSales() {
      try {
        const res = await fetch('/api/sales');
        const data = await res.json();
        if (Array.isArray(data)) {
          // Sort by date descending
          setSales(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        }
      } catch (err) {
        console.error('Failed to fetch sales data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSales();
  }, []);

  const filteredSales = sales.filter((sale) => {
    // 1. Status Filter
    let statusMatch = true;
    if (filter === 'paid') statusMatch = sale.remaining <= 0;
    else if (filter === 'partial') statusMatch = sale.remaining > 0 && sale.amountPaid > 0;
    else if (filter === 'unpaid') statusMatch = sale.amountPaid <= 0;
    
    // 2. Date Filter
    let dateMatch = true;
    if (dateFilter !== 'all') {
      const today = new Date();
      const offset = today.getTimezoneOffset();
      const localToday = new Date(today.getTime() - (offset * 60 * 1000));
      const todayStr = localToday.toISOString().split('T')[0];
      
      const weekAgo = new Date(localToday.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthAgo = new Date(localToday.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      if (dateFilter === 'today') dateMatch = sale.date.startsWith(todayStr);
      else if (dateFilter === 'week') dateMatch = sale.date >= weekAgo;
      else if (dateFilter === 'month') dateMatch = sale.date >= monthAgo;
    }

    return statusMatch && dateMatch;
  });

  const generateReport = () => {
    const totalRemaining = filteredSales.reduce((sum, item) => sum + Math.max(0, item.remaining), 0);
    return totalRemaining;
  };

  return (
    <div>
      <h1 className="mb-6">Payments & Udhaar</h1>

      <div className="glass-panel">
        <div className="flex-between mb-6">
          <div className="flex gap-2">
            <button 
              className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '8px 16px', fontSize: '14px' }}
              onClick={() => setFilter('all')}
            >
              All Sales
            </button>
            <button 
              className={`btn ${filter === 'paid' ? 'btn-success' : 'btn-outline'}`}
              style={{ padding: '8px 16px', fontSize: '14px' }}
              onClick={() => setFilter('paid')}
            >
              Paid
            </button>
            <button 
              className={`btn ${filter === 'partial' ? 'btn-warning' : 'btn-outline'}`}
              style={{ padding: '8px 16px', fontSize: '14px' }}
              onClick={() => setFilter('partial')}
            >
              Half Paid
            </button>
            <button 
              className={`btn ${filter === 'unpaid' ? 'btn-danger' : 'btn-outline'}`}
              style={{ padding: '8px 16px', fontSize: '14px' }}
              onClick={() => setFilter('unpaid')}
            >
              Not Paid
            </button>
          </div>

          <div className="flex gap-4 items-center">
            <select 
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month')}
              style={{ padding: '8px 12px', fontSize: '14px', marginBottom: 0, width: 'auto' }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            
            <div className="text-secondary" style={{ fontSize: '15px' }}>
              Outstanding in View: <span className="text-danger font-bold" style={{ fontSize: '18px' }}>₹{generateReport()}</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="table-container animate-pulse">
             <table>
               <thead>
                 <tr>
                   <th>Date</th>
                   <th>Item</th>
                   <th>Room No</th>
                   <th>Total Bill</th>
                   <th>Paid</th>
                   <th>Remaining</th>
                   <th>Status</th>
                 </tr>
               </thead>
               <tbody>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} style={{ height: '48px', backgroundColor: 'var(--glass-bg)', borderRadius: '4px', border: '1px solid var(--glass-border)' }}></td>
                    </tr>
                  ))}
               </tbody>
             </table>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="text-center py-8 text-secondary">No records found for this filter.</div>
        ) : (
          <div className="table-container">
             <table>
               <thead>
                 <tr>
                   <th>Date</th>
                   <th>Item</th>
                   <th>Room No</th>
                   <th>Total Bill</th>
                   <th>Paid</th>
                   <th>Remaining</th>
                   <th>Status</th>
                 </tr>
               </thead>
               <tbody>
                 {filteredSales.map((sale) => (
                   <tr key={sale.id}>
                     <td>{formatDateTime(sale.date)}</td>
                     <td>{sale.itemName} <span className="text-secondary" style={{fontSize: 12}}>x{sale.quantity}</span></td>
                     <td>{sale.roomNo ? `Room ${sale.roomNo}` : '-'}</td>
                     <td>₹{sale.total}</td>
                     <td className="text-success">₹{sale.amountPaid}</td>
                     <td className="text-danger font-bold">₹{Math.max(0, sale.remaining)}</td>
                     <td>
                       {sale.remaining <= 0 ? (
                         <span className="badge badge-success">Paid</span>
                       ) : sale.amountPaid <= 0 ? (
                         <span className="badge badge-danger">Not Paid</span>
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
  );
}
