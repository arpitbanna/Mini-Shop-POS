'use client';

import { useState } from 'react';
import { useHistory } from '@/hooks/useApi';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { getBusinessDate, getBusinessDateRange } from '@/lib/business-day';
import { History, Search, Loader2, ArrowUpRight, ArrowDownRight, Package, ShoppingCart, ArchiveX } from 'lucide-react';
import styles from './history.module.css';

export default function HistoryPage() {
  const { data: history = [], isLoading } = useHistory();
  const [filter, setFilter] = useState<'All' | 'Stock In' | 'Sale' | 'Purchase' | 'Expense'>('All');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [search, setSearch] = useState('');

  const filteredHistory = history.filter((item) => {
    if (filter !== 'All' && item.type !== filter) return false;
    
    if (dateFilter !== 'all') {
      const bDate = getBusinessDate(5, new Date(item.date));
      const today = getBusinessDate();
      if (dateFilter === 'today' && bDate !== today) return false;
      if (dateFilter === 'week' || dateFilter === 'month') {
        const days = dateFilter === 'week' ? 7 : 30;
        const allowed = new Set(getBusinessDateRange(days));
        if (!allowed.has(bDate)) return false;
      }
    }

    if (search) {
      const q = search.toLowerCase();
      if (!item.title.toLowerCase().includes(q) && !item.extraInfo.toLowerCase().includes(q)) return false;
    }

    return true;
  });

  const getIconClass = (type: string) => {
    switch (type) {
      case 'Sale': return styles.iconSale;
      case 'Expense': return styles.iconExpense;
      case 'Stock In': return styles.iconStock;
      case 'Purchase': return styles.iconPurchase;
      default: return '';
    }
  };

  const getPillClass = (type: string) => {
    switch (type) {
      case 'Sale': return styles.pillSale;
      case 'Expense': return styles.pillExpense;
      case 'Stock In': return styles.pillStock;
      case 'Purchase': return styles.pillPurchase;
      default: return '';
    }
  };

  const getIconElement = (type: string) => {
    switch (type) {
      case 'Sale': return <ArrowUpRight size={20} />;
      case 'Expense': return <ArrowDownRight size={20} />;
      case 'Stock In': return <Package size={20} />;
      case 'Purchase': return <ShoppingCart size={20} />;
      default: return null;
    }
  };

  const getAmountColor = (type: string) => {
    switch (type) {
      case 'Sale': return styles.amountPositive;
      case 'Expense': return styles.amountNegative;
      default: return styles.amountNeutral;
    }
  };

  const getAmountPrefix = (type: string) => {
    if (type === 'Sale') return '+';
    if (type === 'Expense') return '-';
    return '';
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerIcon}>
          <History size={26} strokeWidth={2.5} />
        </div>
        <h1 className={styles.headerTitle}>Unified Ledger</h1>
      </header>

      <section className={styles.mainPanel}>
        <div className={styles.controlsContainer}>
          <div className={styles.filterPills}>
             {['All', 'Stock In', 'Sale', 'Purchase', 'Expense'].map(f => (
               <button 
                key={f}
                className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ''}`}
                onClick={() => setFilter(f as typeof filter)}
              >
                {f}
              </button>
             ))}
          </div>

          <div className={styles.searchGroup}>
            <div className={styles.searchInputWrapper}>
              <Search className={styles.searchIcon} size={16} />
              <input
                type="text"
                placeholder="Search events..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            
            <select 
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
              className={styles.dateSelect}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className={styles.listContainer}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`${styles.rowCard} skeleton`} style={{ height: '80px' }} />
            ))}
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className={styles.emptyState}>
            <ArchiveX size={48} className={styles.emptyStateIcon} strokeWidth={1.5} />
            <div className={styles.emptyStateText}>No transactions found</div>
          </div>
        ) : (
          <div className={styles.listContainer}>
            {filteredHistory.map((item, i) => (
              <div key={item.id} className={styles.rowCard} style={{ animationDelay: `${i * 0.05}s` }}>
                
                <div className={styles.rowLeft}>
                  <div className={`${styles.iconCircle} ${getIconClass(item.type)}`}>
                    {getIconElement(item.type)}
                  </div>
                  
                  <div className={styles.infoBlock}>
                    <div className={styles.headerRow}>
                      <h3 className={styles.itemName}>{item.title}</h3>
                      <span className={`${styles.pillBadge} ${getPillClass(item.type)}`}>
                        {item.type}
                      </span>
                    </div>
                    
                    <div className={styles.metaData}>
                       <span>{formatDateTime(item.date)}</span>
                       {item.extraInfo && (
                         <>
                           <span className={styles.dotSeparator}></span>
                           <span className={styles.extraInfo}>{item.extraInfo}</span>
                         </>
                       )}
                    </div>
                  </div>
                </div>

                <div className={styles.rowRight}>
                  <div className={`${styles.amountText} ${getAmountColor(item.type)}`}>
                    {getAmountPrefix(item.type)}{formatCurrency(item.amount)}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
