'use client';

import { useState } from 'react';
import { SaleItem } from '@/lib/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useSales, useUpdatePayment } from '@/hooks/useApi';
import { CheckCircle, X, Loader2, DollarSign } from 'lucide-react';
import { getBusinessDate, getBusinessDateRange } from '@/lib/business-day';
import { calculateTransactionProfit } from '@/lib/calculations';

type FilterType = 'all' | 'paid' | 'partial' | 'unpaid';

export default function Payments() {
  const { data: sales = [], isLoading } = useSales();
  const updatePayment = useUpdatePayment();
  
  const [filter, setFilter] = useState<FilterType>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  
  const [paymentModalData, setPaymentModalData] = useState<SaleItem | null>(null);
  const [newAmountPaid, setNewAmountPaid] = useState<number>(0);

  const sortedSales = [...sales].sort((a, b) => {
    const businessDateSort = b.businessDate.localeCompare(a.businessDate);
    if (businessDateSort !== 0) return businessDateSort;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const filteredSales = sortedSales.filter((sale) => {
    let statusMatch = true;
    if (filter === 'paid') statusMatch = sale.remaining <= 0;
    else if (filter === 'partial') statusMatch = sale.remaining > 0 && sale.amountPaid > 0;
    else if (filter === 'unpaid') statusMatch = sale.amountPaid <= 0;
    
    let dateMatch = true;
    if (dateFilter !== 'all') {
      const todayBusinessDate = getBusinessDate();
      if (dateFilter === 'today') {
        dateMatch = sale.businessDate === todayBusinessDate;
      } else {
        const days = dateFilter === 'week' ? 7 : 30;
        const allowed = new Set(getBusinessDateRange(days));
        dateMatch = allowed.has(sale.businessDate);
      }
    }

    return statusMatch && dateMatch;
  });

  const generateReport = () => {
    return filteredSales.reduce((sum, item) => sum + Math.max(0, item.remaining), 0);
  };

  const filteredTotals = {
    totalBill: filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0),
    totalProfit: filteredSales.reduce((sum, sale) => sum + calculateTransactionProfit(sale.items), 0),
  };

  const hasGroupedTransactions = filteredSales.some((sale) => sale.items.length > 1);

  const openPaymentModal = (sale: SaleItem) => {
    setPaymentModalData(sale);
    setNewAmountPaid(sale.totalAmount); 
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalData) return;
    
    updatePayment.mutate(
      { id: paymentModalData.id, amountPaid: newAmountPaid },
      { onSuccess: () => setPaymentModalData(null) }
    );
  };

  return (
    <div className="pb-12">
      <h1 className="mb-8 text-xl font-semibold tracking-tight">Payments & Udhaar</h1>

      <div className="glass-panel p-6 transition-all duration-200">
        <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.03] p-2">
            {[
              { id: 'all', label: 'All Sales', color: 'primary' },
              { id: 'paid', label: 'Paid', color: 'success' },
              { id: 'partial', label: 'Half Paid', color: 'warning' },
              { id: 'unpaid', label: 'Not Paid', color: 'danger' },
            ].map(f => (
               <button 
                key={f.id}
                className={`min-h-11 rounded-xl px-4 py-2 text-sm font-semibold tracking-wide transition-all duration-200 ${filter === f.id ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-[0_10px_22px_-16px_rgba(45,212,191,0.9)]' : 'border border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white'}`}
                onClick={() => setFilter(f.id as FilterType)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <select 
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month')}
              className="min-h-11 rounded-xl border border-white/15 bg-white/[0.045] px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:border-white/25 focus:border-teal-400/60 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            
            <div className="flex min-h-11 items-center gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-2 text-sm text-rose-100 shadow-lg shadow-rose-500/10">
              <span className="font-semibold text-slate-200">Outstanding:</span>
              <span className="text-lg font-bold leading-none text-rose-300">{formatCurrency(generateReport())}</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="table-container animate-pulse">
             <table className="w-full text-sm">
               <thead>
                 <tr className="border-b border-white/10">
                   {['Business Date', 'Date & Time', 'Item', 'Room No', 'Total Bill', 'Profit', 'Paid', 'Remaining', 'Status', 'Action'].map(h => <th key={h} className="pb-3 text-muted">{h}</th>)}
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {[...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={10} className="py-2"><div className="h-12 bg-white/5 rounded-lg w-full"></div></td>
                    </tr>
                  ))}
               </tbody>
             </table>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="text-center py-16 text-muted border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">No records found for this filter.</div>
        ) : (
          <div className="table-container">
             <table className="w-full text-sm">
               <thead>
                 <tr className="border-b border-white/10 text-xs">
                   <th className="font-semibold pb-3 text-muted">Business Date</th>
                   <th className="font-semibold pb-3 text-muted">Date & Time</th>
                   <th className="font-semibold pb-3 text-muted">Item</th>
                   <th className="font-semibold pb-3 text-muted">Room No</th>
                   <th className="font-semibold pb-3 text-muted">Total Bill</th>
                   <th className="font-semibold pb-3 text-muted">Profit</th>
                   <th className="font-semibold pb-3 text-muted">Paid</th>
                   <th className="font-semibold pb-3 text-muted">Remaining</th>
                   <th className="font-semibold pb-3 text-muted">Status</th>
                   <th className="font-semibold pb-3 text-right">Action</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                 {filteredSales.map((sale) => (
                   <tr key={sale.id} className="group hover:bg-white/[0.02] transition-all duration-200">
                     <td className="py-4 text-xs text-muted">{sale.businessDate}</td>
                     <td className="py-4 text-xs text-muted">{formatDateTime(sale.createdAt)}</td>
                     <td className="py-4 font-medium text-white">
                       {sale.items.length === 1 ? sale.items[0].name : `${sale.items.length} items`}
                       <div className="text-muted text-xs mt-1">{sale.items.map((item) => `${item.name} x${item.quantity}`).join(', ')}</div>
                     </td>
                     <td className="py-4 text-primary/80 text-xs">{sale.roomNo ? (sale.roomNo.match(/^\d+$/) ? `Room ${sale.roomNo}` : sale.roomNo) : '-'}</td>
                     <td className="py-4 font-semibold text-blue-400">{formatCurrency(sale.totalAmount)}</td>
                     <td className={`py-4 font-bold ${calculateTransactionProfit(sale.items) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                       {calculateTransactionProfit(sale.items) >= 0 ? '+' : '-'}{formatCurrency(Math.abs(calculateTransactionProfit(sale.items)))}
                     </td>
                     <td className="py-4 font-medium text-success">{formatCurrency(sale.amountPaid)}</td>
                     <td className="py-4 font-bold text-red-400">{formatCurrency(Math.max(0, sale.remaining))}</td>
                     <td className="py-4">
                       {sale.remaining <= 0 ? (
                         <span className="badge badge-success">Paid</span>
                       ) : sale.amountPaid <= 0 ? (
                         <span className="badge badge-danger">Not Paid</span>
                       ) : (
                         <span className="badge badge-warning text-black">Half Paid</span>
                       )}
                     </td>
                     <td className="py-4 text-right">
                        {sale.remaining > 0 ? (
                          <button 
                            onClick={() => openPaymentModal(sale)}
                            className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-3.5 py-2 rounded-lg text-xs font-semibold border border-blue-400/30 transition-all duration-200 hover:scale-105 hover:shadow-lg flex items-center gap-1 ml-auto"
                          >
                            <DollarSign size={14} /> Settle
                          </button>
                        ) : (
                          <span className="text-success text-xs font-medium flex items-center justify-end gap-1"><CheckCircle size={14}/> Settled</span>
                        )}
                     </td>
                   </tr>
                 ))}
                 {hasGroupedTransactions && (
                  <tr className="bg-white/[0.03] border-t border-white/10">
                    <td className="py-4 text-xs text-muted" colSpan={4}>Summary (filtered)</td>
                    <td className="py-4 font-bold text-blue-300">{formatCurrency(filteredTotals.totalBill)}</td>
                    <td className={`py-4 font-bold ${filteredTotals.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {filteredTotals.totalProfit >= 0 ? '+' : '-'}{formatCurrency(Math.abs(filteredTotals.totalProfit))}
                    </td>
                    <td className="py-4 text-muted" colSpan={4}></td>
                  </tr>
                 )}
               </tbody>
             </table>
          </div>
        )}
      </div>

      {paymentModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="glass-panel max-w-md w-full p-8 flex flex-col relative shadow-2xl border border-primary/20 scale-in-center rounded-2xl">
            <div className="flex-between mb-4 border-b border-white/10 pb-3">
              <h2 className="text-lg font-bold mb-0">Update Payment</h2>
              <button onClick={() => setPaymentModalData(null)} className="text-muted hover:text-white transition-colors"><X size={20}/></button>
            </div>
            
            <div className="mb-4 bg-white/5 p-3 rounded-xl border border-white/5 text-sm">
              <div className="flex-between mb-1"><span className="text-muted">Items:</span> <span className="font-semibold text-white text-right">{paymentModalData.items.map((item) => `${item.name} x${item.quantity}`).join(', ')}</span></div>
              <div className="flex-between mb-1"><span className="text-muted">Total Bill:</span> <span className="font-semibold text-white">{formatCurrency(paymentModalData.totalAmount)}</span></div>
              <div className="flex-between"><span className="text-muted">Current Paid:</span> <span className="font-semibold text-success">{formatCurrency(paymentModalData.amountPaid)}</span></div>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-6">
              <div className="mb-6">
                <label className="text-sm font-semibold text-slate-300 mb-3 block tracking-wide">New Total Amount Paid (₹)</label>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="number" 
                    step="0.01" min={0}
                    value={newAmountPaid} 
                    onChange={(e) => setNewAmountPaid(Number(e.target.value))} 
                    className="pl-12 w-full rounded-xl border border-white/15 bg-white/[0.045] py-3 text-lg font-bold text-white transition-all duration-200 focus:border-teal-400/60 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                    required
                  />
                </div>
                <button type="button" onClick={() => setNewAmountPaid(paymentModalData.totalAmount)} className="w-full bg-success/15 text-success py-2.5 mt-3 rounded-xl border border-success/40 text-sm font-semibold hover:bg-success/25 transition-all duration-200">
                  Full Settle ({formatCurrency(paymentModalData.totalAmount)})
                </button>
              </div>

              <div className="flex gap-3 justify-center pt-6 border-t border-white/10">
                <button type="button" onClick={() => setPaymentModalData(null)} className="btn btn-outline py-2 px-6 text-sm" disabled={updatePayment.isPending}>Cancel</button>
                <button type="submit" disabled={updatePayment.isPending} className="btn py-2 px-8 text-sm flex items-center gap-2">
                  {updatePayment.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} 
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
