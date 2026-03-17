'use client';

import { useEffect, useState, useMemo } from 'react';
import { InventoryItem } from '@/lib/types';
import Link from 'next/link';
import { PlusCircle, Search } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export default function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL');
  const [sortFilter, setSortFilter] = useState('date');

  useEffect(() => {
    async function fetchInventory() {
      try {
        const res = await fetch('/api/inventory');
        const data = await res.json();
        if (Array.isArray(data)) setInventory(data);
      } catch (error) {
        console.error('Failed to fetch inventory:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchInventory();
  }, []);

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
      if (sortFilter === 'date') {
        return new Date(b.dateAdded!).getTime() - new Date(a.dateAdded!).getTime();
      } else if (sortFilter === 'profit') {
        const profitA = (a.sellPrice || 0) - a.buyPrice;
        const profitB = (b.sellPrice || 0) - b.buyPrice;
        return profitB - profitA;
      } else if (sortFilter === 'stock') {
        return b.available - a.available;
      }
      return 0;
    });
  }, [inventoryWithAvailable, search, availabilityFilter, sortFilter]);

  return (
    <div>
      <div className="flex-between mb-6">
        <h1>Inventory Management</h1>
        <Link href="/add-stock" className="btn">
          <PlusCircle size={18} /> Add New Stock
        </Link>
      </div>

      <div className="glass-panel">
        <div className="mb-6 flex-between" style={{ gap: '16px' }}>
          <div className="flex gap-4" style={{ flex: 1 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                placeholder="Search items..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '40px', marginBottom: 0 }}
              />
            </div>
            <select 
              value={availabilityFilter} 
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              style={{ width: 'auto', marginBottom: 0 }}
            >
              <option value="ALL">All Items</option>
              <option value="IN_STOCK">In Stock (&gt; 0)</option>
              <option value="LOW">Low Stock (&lt; 5)</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
            <select 
              value={sortFilter} 
              onChange={(e) => setSortFilter(e.target.value)}
              style={{ width: 'auto', marginBottom: 0 }}
            >
              <option value="date">Sort by Date</option>
              <option value="profit">Sort by Profit</option>
              <option value="stock">Sort by Stock</option>
            </select>
          </div>
          <div className="text-secondary" style={{ fontSize: '14px' }}>
            Showing <strong>{filteredInventory.length}</strong> {filteredInventory.length === 1 ? 'item' : 'items'}
          </div>
        </div>

        {loading ? (
          <div className="table-container animate-pulse">
            <table>
              <thead>
                <tr>
                  <th>Date Added</th>
                  <th>Item Name</th>
                  <th>Buy Price</th>
                  <th>Sell Price</th>
                  <th>Profit / Item</th>
                  <th>Available</th>
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
        ) : filteredInventory.length === 0 ? (
          <div className="text-center py-8 text-secondary">No items found matching the filters.</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date Added</th>
                  <th>Item Name</th>
                  <th>Buy Price</th>
                  <th>Sell Price</th>
                  <th>Profit / Item</th>
                  <th>Stock In</th>
                  <th>Stock Out</th>
                  <th>Available</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => (
                  <tr key={item.id} style={{ transition: 'all 0.3s ease-in-out' }}>
                    <td><div className="text-secondary" style={{fontSize: 13, minWidth: '120px'}}>{formatDateTime(item.dateAdded!)}</div></td>
                    <td style={{ fontWeight: 600, color: item.available === 0 ? 'var(--danger)' : item.available < 5 ? 'var(--warning)' : 'var(--success)', transition: 'color 0.3s ease' }}>{item.name}</td>
                    <td>₹{item.buyPrice}</td>
                    <td>₹{item.sellPrice || 0}</td>
                    <td className="text-success font-bold">₹{(item.sellPrice || 0) - item.buyPrice}</td>
                    <td>{item.quantityIn}</td>
                    <td>{item.quantityOut}</td>
                    <td style={{ fontWeight: 600, color: item.available === 0 ? 'var(--danger)' : item.available < 5 ? 'var(--warning)' : 'var(--success)', transition: 'color 0.3s ease' }}>
                      {item.available}
                    </td>
                    <td>
                      {item.available === 0 ? (
                        <span className="badge badge-danger">Out of Stock</span>
                      ) : item.available < 5 ? (
                        <span className="badge badge-warning">Low Stock</span>
                      ) : (
                        <span className="badge badge-success">In Stock</span>
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
