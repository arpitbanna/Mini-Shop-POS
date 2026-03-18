'use client';

import { useState, useMemo } from 'react';
import { InventoryItem } from '@/lib/types';
import Link from 'next/link';
import { PlusCircle, Search, Edit2, Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useInventory, useDeleteInventory, useDeleteOutOfStockInventory, useUpdateInventory } from '@/hooks/useApi';

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
    <div className="pb-12">
      <div className="flex-between mb-8">
        <h1 className="mb-0 text-xl font-semibold tracking-tight">Inventory Management</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowDeleteOutOfStockModal(true)}
            className="btn btn-danger py-2.5 px-4"
            disabled={deleteOutOfStockMutation.isPending}
          >
            {deleteOutOfStockMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Delete All Out of Stock
          </button>
          <Link href="/add-stock" className="btn btn-outline hover:bg-white/5 bg-white/[0.02] border-white/10 py-2.5">
            <PlusCircle size={18} className="text-primary" /> Add New Stock
          </Link>
        </div>
      </div>

      <div className="glass-panel p-6 transition-all duration-200">
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px_200px_auto] gap-4 items-stretch xl:items-center">
          <div className="relative min-w-0 md:col-span-2 xl:col-span-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Search size={20} /></span>
            <input 
              type="text" 
              placeholder="Search items..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 pr-4 w-full min-w-0 mb-0 rounded-xl border border-white/15 bg-white/[0.045] h-12 text-base transition-all duration-200 focus:border-teal-400/60 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>
          <select 
            value={availabilityFilter} 
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            className="w-full min-w-0 mb-0 rounded-xl border border-white/15 bg-white/[0.045] h-12 px-4 text-sm cursor-pointer transition-all duration-200 focus:border-teal-400/60 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          >
            <option value="ALL">All Items</option>
            <option value="IN_STOCK">In Stock (&gt; 0)</option>
            <option value="LOW">Low Stock (&lt; 5)</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
          <select 
            value={sortFilter} 
            onChange={(e) => setSortFilter(e.target.value)}
            className="w-full min-w-0 mb-0 rounded-xl border border-white/15 bg-white/[0.045] h-12 px-4 text-sm cursor-pointer transition-all duration-200 focus:border-teal-400/60 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          >
            <option value="date">Sort by Date</option>
            <option value="profit">Sort by Profit</option>
            <option value="stock">Sort by Stock</option>
          </select>
          <div className="text-secondary text-sm whitespace-nowrap bg-white/5 px-4 py-2 rounded-lg border border-white/5 self-start xl:self-center md:col-span-2 xl:col-span-1 xl:justify-self-end">
            Showing <strong>{filteredInventory.length}</strong> items
          </div>
        </div>

        {isLoading ? (
          <div className="table-container animate-pulse">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {['Date Added', 'Item Name', 'Buy Price', 'Sell Price', 'Profit', 'Stock', 'Available', 'Status', 'Actions'].map(h => <th key={h} className="pb-3 text-muted">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={9} className="py-2"><div className="h-12 bg-white/5 rounded-lg w-full"></div></td>
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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs">
                  <th className="font-semibold pb-3 text-muted">Date Added</th>
                  <th className="font-semibold pb-3 text-muted">Item Name</th>
                  <th className="font-semibold pb-3 text-muted">Cost Price</th>
                  <th className="font-semibold pb-3 text-muted">Selling Price</th>
                  <th className="font-semibold pb-3 text-green-400">Profit</th>
                  <th className="font-semibold pb-3 text-muted" title="Stock In / Out">In/Out</th>
                  <th className="font-semibold pb-3 text-muted">Available</th>
                  <th className="font-semibold pb-3 text-muted">Status</th>
                  <th className="font-semibold pb-3 text-muted text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="group hover:bg-white/[0.02] transition-all duration-200">
                    <td className="py-4">
                      <div className="text-muted text-xs group-hover:text-white/80 transition-colors">{formatDateTime(item.dateAdded!)}</div>
                    </td>
                    <td className="py-4 font-semibold text-white">{item.name}</td>
                    <td className="py-4 text-muted">{formatCurrency(item.buyPrice)}</td>
                    <td className="py-4 text-white">{formatCurrency(item.sellPrice || 0)}</td>
                    <td className={`py-4 font-bold ${((item.sellPrice || 0) - item.buyPrice) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {((item.sellPrice || 0) - item.buyPrice) >= 0 ? '+' : '-'}{formatCurrency(Math.abs((item.sellPrice || 0) - item.buyPrice))}
                    </td>
                    <td className="py-4 text-xs text-muted">
                      <span className="text-white">{item.quantityIn}</span> / <span className="opacity-70">{item.quantityOut}</span>
                    </td>
                    <td className="py-4">
                      <span className={`font-bold ${item.available === 0 ? 'text-danger' : item.available < 5 ? 'text-warning' : 'text-success'}`}>
                        {item.available}
                      </span>
                    </td>
                    <td className="py-4">
                      {item.available === 0 ? (
                        <span className="badge badge-danger">Out of Stock</span>
                      ) : item.available < 5 ? (
                        <span className="badge badge-warning text-black">Low Stock</span>
                      ) : (
                        <span className="badge badge-success">In Stock</span>
                      )}
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-70 hover:opacity-100 transition-all duration-200">
                        <button 
                          onClick={() => setEditItem(item)}
                          className="p-1.5 rounded-lg bg-white/5 text-blue-400 hover:bg-white/10 transition-all duration-200 border border-white/10"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => setDeleteItem(item)}
                          className="p-1.5 rounded-lg bg-white/5 text-red-400 hover:bg-white/10 transition-all duration-200 border border-white/10"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="glass-panel max-w-md w-full p-6 flex flex-col relative shadow-2xl border-white/20 scale-in-center">
            <div className="flex-between mb-6 border-b border-white/10 pb-4">
              <h2 className="text-xl font-bold mb-0">Edit Item</h2>
              <button onClick={() => setEditItem(null)} className="text-muted hover:text-white transition-colors"><X size={20}/></button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="mb-4">
                <label className="text-sm text-muted mb-2 block">Item Name</label>
                <input 
                  type="text" 
                  value={editItem.name} 
                  onChange={(e) => setEditItem({...editItem, name: e.target.value})} 
                  className="input-glass"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm text-muted mb-2 block">Buy Price (₹)</label>
                  <input 
                    type="number" step="0.01" 
                    value={editItem.buyPrice} 
                    onChange={(e) => setEditItem({...editItem, buyPrice: Number(e.target.value)})} 
                    className="input-glass"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-muted mb-2 block">Sell Price (₹)</label>
                  <input 
                    type="number" step="0.01" 
                    value={editItem.sellPrice} 
                    onChange={(e) => setEditItem({...editItem, sellPrice: Number(e.target.value)})} 
                    className="input-glass"
                    required
                  />
                </div>
              </div>
              <div className="mb-6">
                <label className="text-sm text-muted mb-2 block">Total Stock In</label>
                <input 
                  type="number" 
                  value={editItem.quantityIn} 
                  onChange={(e) => setEditItem({...editItem, quantityIn: Number(e.target.value)})} 
                  className="input-glass"
                  required
                />
                <p className="text-xs text-muted mt-2">Note: Changing Total Stock In affects the calculated Available quantity ({editItem.quantityIn - editItem.quantityOut}).</p>
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
                <button type="button" onClick={() => setEditItem(null)} className="btn btn-outline py-2 px-4 text-sm">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="btn py-2 px-6 text-sm">
                  {updateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="glass-panel max-w-sm w-full p-6 flex flex-col relative shadow-2xl border-danger/20 scale-in-center">
            
            <div className="text-center mb-6 mt-2 relative z-10">
              <div className="bg-danger/20 p-4 rounded-full w-fit mx-auto mb-4 border border-danger/30">
                <AlertTriangle size={32} className="text-danger" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Delete Item?</h2>
              <p className="text-sm text-muted">Are you sure you want to delete <strong className="text-white">{deleteItem.name}</strong>? This action will archive it in Notion.</p>
            </div>

            <div className="flex gap-3 relative z-10 mt-2">
              <button onClick={() => setDeleteItem(null)} className="flex-1 btn btn-outline py-2 border-white/20 hover:bg-white/10 text-sm" disabled={deleteMutation.isPending}>
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} className="flex-1 btn btn-danger py-2 shadow-lg shadow-danger/20 text-sm" disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Yes, Delete'}
              </button>
            </div>
            
            {/* Background warning glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-danger/5 blur-3xl rounded-full z-0 pointer-events-none"></div>
          </div>
        </div>
      )}

      {/* Bulk Delete Out-of-Stock Confirmation Modal */}
      {showDeleteOutOfStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="glass-panel max-w-sm w-full p-6 flex flex-col relative shadow-2xl border-danger/20 scale-in-center">
            <div className="text-center mb-6 mt-2 relative z-10">
              <div className="bg-danger/20 p-4 rounded-full w-fit mx-auto mb-4 border border-danger/30">
                <AlertTriangle size={32} className="text-danger" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Delete All Out of Stock?</h2>
              <p className="text-sm text-muted">Are you sure? This will remove all out-of-stock items.</p>
            </div>

            <div className="flex gap-3 relative z-10 mt-2">
              <button
                onClick={() => setShowDeleteOutOfStockModal(false)}
                className="flex-1 btn btn-outline py-2 border-white/20 hover:bg-white/10 text-sm"
                disabled={deleteOutOfStockMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOutOfStock}
                className="flex-1 btn btn-danger py-2 shadow-lg shadow-danger/20 text-sm"
                disabled={deleteOutOfStockMutation.isPending}
              >
                {deleteOutOfStockMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Yes, Delete'}
              </button>
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-danger/5 blur-3xl rounded-full z-0 pointer-events-none"></div>
          </div>
        </div>
      )}
    </div>
  );
}
