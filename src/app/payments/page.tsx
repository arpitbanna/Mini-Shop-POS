'use client';

import { useState } from 'react';
import { SaleItem } from '@/lib/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { usePaginatedSales, useUpdatePayment } from '@/hooks/useApi';
import { CheckCircle, X, Loader2, DollarSign, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { calculateTransactionProfit } from '@/lib/calculations';
import styles from './payments.module.css';

type FilterType = 'all' | 'paid' | 'partial' | 'unpaid';

export default function Payments() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterType>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const { data: response, isLoading } = usePaginatedSales(page, 50, filter, dateFilter);
  const updatePayment = useUpdatePayment();
  
  const sales = response?.data || [];
  const totalPages = response?.totalPages || 1;
  const totals = response?.totals || { totalBill: 0, totalProfit: 0, outstanding: 0 };
  
  const [paymentModalData, setPaymentModalData] = useState<SaleItem | null>(null);
  const [newAmountPaid, setNewAmountPaid] = useState<number>(0);

  const handleFilterChange = (val: FilterType) => {
    setFilter(val);
    setPage(1);
  };

  const handleDateFilterChange = (val: 'all' | 'today' | 'week' | 'month') => {
    setDateFilter(val);
    setPage(1);
  };

  const hasGroupedTransactions = sales.some((sale) => sale.items.length > 1);

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
    <div className={styles.container}>
      <h1 className={styles.title}>Payments & Udhaar</h1>

      <div className={styles.glassPanel}>
        <div className={styles.headerRow}>
          <div className={styles.filterGroup}>
            {[
              { id: 'all', label: 'All Sales', color: 'primary' },
              { id: 'paid', label: 'Paid', color: 'success' },
              { id: 'partial', label: 'Half Paid', color: 'warning' },
              { id: 'unpaid', label: 'Not Paid', color: 'danger' },
            ].map(f => (
               <button 
                key={f.id}
                className={`${styles.filterBtn} ${filter === f.id ? styles.filterBtnActive : ''}`}
                onClick={() => handleFilterChange(f.id as FilterType)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className={styles.controlsGroup}>
            <select 
              value={dateFilter} 
              onChange={(e) => handleDateFilterChange(e.target.value as 'all' | 'today' | 'week' | 'month')}
              className={styles.dateSelect}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            
            <div className={styles.outstandingCard}>
              <span className={styles.outstandingCardLabel}>Outstanding:</span>
              <span className={styles.outstandingCardValue}>{formatCurrency(totals.outstanding)}</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                   {['Date', 'Room', 'Total', 'Profit', 'Status', 'Paid', 'Remaining', 'Actions'].map(h => <th key={h} className={styles.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className={styles.tr}>
                      <td colSpan={10} style={{ padding: '8px' }}>
                        <div className="skeleton" style={{ height: '48px', width: '100%' }}></div>
                      </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : sales.length === 0 ? (
          <div className={styles.emptyState}>No records found for this filter.</div>
        ) : (
          <div className={styles.tableContainer}>
             <table className={styles.table}>
               <thead>
                 <tr>
                   <th className={styles.th}>Business Date</th>
                   <th className={styles.th}>Date & Time</th>
                   <th className={styles.th}>Item</th>
                   <th className={styles.th}>Room No</th>
                   <th className={styles.th}>Total Bill</th>
                   <th className={styles.th}>Profit</th>
                   <th className={styles.th}>Paid</th>
                   <th className={styles.th}>Remaining</th>
                   <th className={styles.th}>Status</th>
                   <th className={styles.thRight}>Action</th>
                 </tr>
               </thead>
               <tbody>
                 {sales.map((sale) => (
                   <tr key={sale.id} className={styles.tr}>
                     <td className={styles.tdMuted}>{sale.businessDate}</td>
                     <td className={styles.tdMuted}>{formatDateTime(sale.createdAt)}</td>
                     <td className={styles.td}>
                       <div className={styles.tdItems}>{sale.items.length === 1 ? sale.items[0].name : `${sale.items.length} items`}</div>
                       <div className={styles.tdItemsSub}>{sale.items.map((item) => `${item.name} x${item.quantity}`).join(', ')}</div>
                     </td>
                     <td className={styles.td} style={{ opacity: 0.8 }}>{sale.roomNo ? (sale.roomNo.match(/^\d+$/) ? `Room ${sale.roomNo}` : sale.roomNo) : '-'}</td>
                     <td className={styles.td} style={{ color: '#60a5fa', fontWeight: 600 }}>{formatCurrency(sale.totalAmount)}</td>
                     <td className={styles.td} style={{ color: calculateTransactionProfit(sale.items) >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                       {calculateTransactionProfit(sale.items) >= 0 ? '+' : '-'}{formatCurrency(Math.abs(calculateTransactionProfit(sale.items)))}
                     </td>
                     <td className={styles.td} style={{ color: 'var(--success)', fontWeight: 500 }}>{formatCurrency(sale.amountPaid)}</td>
                     <td className={styles.td} style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{formatCurrency(Math.max(0, sale.remaining))}</td>
                     <td className={styles.td}>
                       {sale.remaining <= 0 ? (
                         <span className={styles.badgeSuccess}>Paid</span>
                       ) : sale.amountPaid <= 0 ? (
                         <span className={styles.badgeDanger}>Not Paid</span>
                       ) : (
                         <span className={styles.badgeWarning}>Half Paid</span>
                       )}
                     </td>
                     <td className={styles.tdRight}>
                        {sale.remaining > 0 ? (
                          <button 
                            onClick={() => openPaymentModal(sale)}
                            className={styles.settleBtn}
                          >
                            <DollarSign size={14} /> Settle
                          </button>
                        ) : (
                          <span className={styles.settledText}><CheckCircle size={14}/> Settled</span>
                        )}
                     </td>
                   </tr>
                 ))}
                 {hasGroupedTransactions && (
                  <tr>
                    <td className={styles.tdSummary} colSpan={4}>Summary (filtered)</td>
                    <td className={styles.tdSummary} style={{ color: '#93c5fd', fontWeight: 'bold' }}>{formatCurrency(totals.totalBill)}</td>
                    <td className={styles.tdSummary} style={{ color: totals.totalProfit >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                      {totals.totalProfit >= 0 ? '+' : '-'}{formatCurrency(Math.abs(totals.totalProfit))}
                    </td>
                    <td className={styles.tdSummary} colSpan={4}></td>
                  </tr>
                 )}
               </tbody>
             </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <span className={styles.pageInfo}>
              Showing page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>
            <div className={styles.pageControls}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                className={styles.pageBtn}
              >
                <ChevronLeft size={16} />
              </button>
              
              {(() => {
                const delta = 1;
                const range = [];
                for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) {
                  range.push(i);
                }
                if (page - delta > 2) range.unshift('...');
                if (page + delta < totalPages - 1) range.push('...');
                range.unshift(1);
                if (totalPages > 1 && !range.includes(totalPages)) range.push(totalPages);
                
                return range.map((p, i) => (
                  <button
                    key={`${p}-${i}`}
                    onClick={() => typeof p === 'number' && setPage(p)}
                    disabled={typeof p !== 'number'}
                    className={`${styles.pageNumber} ${page === p ? styles.pageNumberActive : ''} ${typeof p !== 'number' ? styles.pageEllipsis : ''}`}
                  >
                    {typeof p === 'number' ? p : <MoreHorizontal size={14} />}
                  </button>
                ));
              })()}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || isLoading}
                className={styles.pageBtn}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {paymentModalData && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Update Payment</h2>
              <button onClick={() => setPaymentModalData(null)} className={styles.closeBtn}><X size={20}/></button>
            </div>
            
            <div className={styles.modalSummaryTable}>
              <div className={styles.summaryRow}><span className={styles.summaryLabel}>Items:</span> <span className={styles.summaryVal}>{paymentModalData.items.map((item) => `${item.name} x${item.quantity}`).join(', ')}</span></div>
              <div className={styles.summaryRow}><span className={styles.summaryLabel}>Total Bill:</span> <span className={styles.summaryVal}>{formatCurrency(paymentModalData.totalAmount)}</span></div>
              <div className={styles.summaryRow}><span className={styles.summaryLabel}>Current Paid:</span> <span className={styles.summaryValSuccess}>{formatCurrency(paymentModalData.amountPaid)}</span></div>
            </div>

            <form onSubmit={handlePaymentSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>New Total Amount Paid (₹)</label>
                <div className={styles.inputWrap}>
                  <DollarSign size={16} className={styles.inputIcon} />
                  <input 
                    type="number" 
                    step="0.01" min={0}
                    value={newAmountPaid} 
                    onChange={(e) => setNewAmountPaid(Number(e.target.value))} 
                    className={styles.formInput}
                    required
                  />
                </div>
                <button type="button" onClick={() => setNewAmountPaid(paymentModalData.totalAmount)} className={styles.fullSettleBtn}>
                  Full Settle ({formatCurrency(paymentModalData.totalAmount)})
                </button>
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={() => setPaymentModalData(null)} className={styles.btnOutline} disabled={updatePayment.isPending}>Cancel</button>
                <button type="submit" disabled={updatePayment.isPending} className={styles.submitBtn}>
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
