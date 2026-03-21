'use client';

import { useState, useMemo } from 'react';
import { InventoryItem } from '@/lib/types';
import Link from 'next/link';
import { PlusCircle, Search, Edit2, Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useInventory, useDeleteInventory, useDeleteOutOfStockInventory, useUpdateInventory } from '@/hooks/useApi';
import styles from './inventory.module.css';

export default function Inventory() {
  const { data: inventory = [], isLoading } = useInventory();
  const deleteMutation = useDeleteInventory();
  const deleteOutOfStockMutation = useDeleteOutOfStockInventory();
  const updateMutation = useUpdateInventory();

  const [search, setSearch] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL');
  const [sortFilter, setSortFilter] = useState('date');

  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);
  const [showDeleteOutOfStockModal, setShowDeleteOutOfStockModal] = useState(false);

  const inventoryWithAvailable = useMemo(() => {
    return inventory.map((item) => ({
      ...item,
      available: item.quantityIn - item.quantityOut
    }));
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    return inventoryWithAvailable.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      
      if (availabilityFilter === 'IN_STOCK') return item.available > 0;
      if (availabilityFilter === 'LOW') return item.available > 0 && item.available < 5;
      if (availabilityFilter === 'OUT_OF_STOCK') return item.available === 0;
      return true;
    }).sort((a, b) => {
      if (sortFilter === 'date') return new Date(b.dateAdded!).getTime() - new Date(a.dateAdded!).getTime();
      if (sortFilter === 'profit') return ((b.sellPrice || 0) - b.buyPrice) - ((a.sellPrice || 0) - a.buyPrice);
      if (sortFilter === 'stock') return b.available - a.available;
      return 0;
    });
  }, [inventoryWithAvailable, search, availabilityFilter, sortFilter]);

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editItem) return;
    updateMutation.mutate(
      {
        id: editItem.id,
        name: editItem.name,
        buyPrice: editItem.buyPrice,
        sellPrice: editItem.sellPrice,
        quantityIn: editItem.quantityIn,
      },
      {
        onSuccess: () => setEditItem(null)
      }
    );
  };

  const handleDeleteConfirm = () => {
    if (!deleteItem) return;
    deleteMutation.mutate(deleteItem.id, {
      onSuccess: () => setDeleteItem(null)
    });
  };

  const handleDeleteOutOfStock = () => {
    deleteOutOfStockMutation.mutate(undefined, {
      onSuccess: () => setShowDeleteOutOfStockModal(false),
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Inventory Management</h1>
        <div className={styles.headerActions}>
          <button
            onClick={() => setShowDeleteOutOfStockModal(true)}
            className={styles.btnDanger}
            disabled={deleteOutOfStockMutation.isPending}
          >
            {deleteOutOfStockMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Delete All Out of Stock
          </button>
          <Link href="/add-stock" className={styles.btnOutline}>
            <PlusCircle size={18} color="#00c6ff" /> Add New Stock
          </Link>
        </div>
      </div>

      <div className={styles.glassPanel}>
        <div className={styles.filterBar}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}><Search size={20} /></span>
            <input 
              type="text" 
              placeholder="Search items..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <select 
            value={availabilityFilter} 
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            className={styles.selectInput}
          >
            <option value="ALL">All Items</option>
            <option value="IN_STOCK">In Stock (&gt; 0)</option>
            <option value="LOW">Low Stock (&lt; 5)</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
          <select 
            value={sortFilter} 
            onChange={(e) => setSortFilter(e.target.value)}
            className={styles.selectInput}
          >
            <option value="date">Sort by Date</option>
            <option value="profit">Sort by Profit</option>
            <option value="stock">Sort by Stock</option>
          </select>
          <div className={styles.filterStatus}>
            Showing <strong>{filteredInventory.length}</strong> items
          </div>
        </div>

        {isLoading ? (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {['Date Added', 'Item Name', 'Buy Price', 'Sell Price', 'Profit', 'Stock', 'Available', 'Status', 'Actions'].map(h => <th key={h} className={styles.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className={styles.tr}>
                    <td colSpan={9} className={styles.td}>
                      <div className="skeleton" style={{ height: '48px', width: '100%' }}></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="text-center py-16 text-muted border border-dashed border-white/10 rounded-2xl bg-white/[0.02] flex flex-col items-center justify-center gap-3">
            <Search size={32} className="opacity-50" />
            <p className="font-medium">No items found matching the filters.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Date Added</th>
                  <th className={styles.th}>Item Name</th>
                  <th className={styles.th}>Cost Price</th>
                  <th className={styles.th}>Selling Price</th>
                  <th className={styles.th}>Profit</th>
                  <th className={styles.th} title="Stock In / Out">In/Out</th>
                  <th className={styles.th}>Available</th>
                  <th className={styles.th}>Status</th>
                  <th className={`${styles.th} ${styles.thRight}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => (
                  <tr key={item.id} className={styles.tr}>
                    <td className={styles.td}>
                      {formatDateTime(item.dateAdded!)}
                    </td>
                    <td className={`${styles.td} ${styles.tdBold}`}>{item.name}</td>
                    <td className={styles.td}>{formatCurrency(item.buyPrice)}</td>
                    <td className={styles.td}>{formatCurrency(item.sellPrice || 0)}</td>
                    <td className={styles.td} style={{ color: ((item.sellPrice || 0) - item.buyPrice) >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                      {((item.sellPrice || 0) - item.buyPrice) >= 0 ? '+' : '-'}{formatCurrency(Math.abs((item.sellPrice || 0) - item.buyPrice))}
                    </td>
                    <td className={styles.td}>
                      {item.quantityIn} / <span className={styles.tdDim}>{item.quantityOut}</span>
                    </td>
                    <td className={styles.td}>
                      <span style={{ color: item.available === 0 ? 'var(--danger)' : item.available < 5 ? 'var(--warning)' : 'var(--success)', fontWeight: 'bold' }}>
                        {item.available}
                      </span>
                    </td>
                    <td className={styles.td}>
                      {item.available === 0 ? (
                        <span className={styles.badgeDanger}>Out of Stock</span>
                      ) : item.available < 5 ? (
                        <span className={styles.badgeWarning}>Low Stock</span>
                      ) : (
                        <span className={styles.badgeSuccess}>In Stock</span>
                      )}
                    </td>
                    <td className={`${styles.td} ${styles.tdRight}`}>
                      <div className={styles.actionsGroup}>
                        <button 
                          onClick={() => setEditItem(item)}
                          className={styles.actionBtn}
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => setDeleteItem(item)}
                          className={`${styles.actionBtn} ${styles.textDanger}`}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editItem && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Edit Item</h2>
              <button onClick={() => setEditItem(null)} className={styles.closeBtn}><X size={20}/></button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Item Name</label>
                <input 
                  type="text" 
                  value={editItem.name} 
                  onChange={(e) => setEditItem({...editItem, name: e.target.value})} 
                  className={styles.formInput}
                  required
                />
              </div>
              <div className={styles.grid2Modal}>
                <div>
                  <label className={styles.formLabel}>Buy Price (₹)</label>
                  <input 
                    type="number" step="0.01" 
                    value={editItem.buyPrice} 
                    onChange={(e) => setEditItem({...editItem, buyPrice: Number(e.target.value)})} 
                    className={styles.formInput}
                    required
                  />
                </div>
                <div>
                  <label className={styles.formLabel}>Sell Price (₹)</label>
                  <input 
                    type="number" step="0.01" 
                    value={editItem.sellPrice} 
                    onChange={(e) => setEditItem({...editItem, sellPrice: Number(e.target.value)})} 
                    className={styles.formInput}
                    required
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Total Stock In</label>
                <input 
                  type="number" 
                  value={editItem.quantityIn} 
                  onChange={(e) => setEditItem({...editItem, quantityIn: Number(e.target.value)})} 
                  className={styles.formInput}
                  required
                />
                <p className={`${styles.formLabel} ${styles.textSecondary}`}>Note: Changing Total Stock In affects the calculated Available quantity ({editItem.quantityIn - editItem.quantityOut}).</p>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setEditItem(null)} className={styles.btnOutline}>Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className={styles.btnPrimary}>
                  {updateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteItem && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalDangerAlert}>
              <div className={styles.modalIconWarning}>
                <AlertTriangle size={32} />
              </div>
              <h2 className={styles.modalTitle}>Delete Item?</h2>
              <p className={styles.formLabel}>Are you sure you want to delete <strong className={styles.textPrimary}>{deleteItem.name}</strong>? This action will archive it in Notion.</p>
            </div>

            <div className={styles.modalConfirmBtns}>
              <button onClick={() => setDeleteItem(null)} className={styles.btnOutline} disabled={deleteMutation.isPending}>
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} className={styles.btnDanger} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Out-of-Stock Confirmation Modal */}
      {showDeleteOutOfStockModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalDangerAlert}>
              <div className={styles.modalIconWarning}>
                <AlertTriangle size={32} />
              </div>
              <h2 className={styles.modalTitle}>Delete All Out of Stock?</h2>
              <p className={styles.formLabel}>Are you sure? This will remove all out-of-stock items.</p>
            </div>

            <div className={styles.modalConfirmBtns}>
              <button
                onClick={() => setShowDeleteOutOfStockModal(false)}
                className={styles.btnOutline}
                disabled={deleteOutOfStockMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOutOfStock}
                className={styles.btnDanger}
                disabled={deleteOutOfStockMutation.isPending}
              >
                {deleteOutOfStockMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
