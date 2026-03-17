'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2 } from 'lucide-react';
import { getLocalDatetimeStr } from '@/lib/utils';

export default function AddStock() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    buyPrice: '',
    sellPrice: '',
    quantity: '',
    date: getLocalDatetimeStr(),
  });
  const [error, setError] = useState('');
  const [inventoryList, setInventoryList] = useState<{name: string, buyPrice: number, sellPrice: number}[]>([]);


  useEffect(() => {
    async function fetchInventory() {
      try {
        const res = await fetch('/api/inventory');
        const data = await res.json();
        if (Array.isArray(data)) {
          // get unique items by name to serve as suggestions
          const uniqueItems: any[] = [];
          const seen = new Set();
          for (const item of data) {
            if (!seen.has(item.name)) {
              seen.add(item.name);
              uniqueItems.push({ name: item.name, buyPrice: item.buyPrice, sellPrice: item.sellPrice || 0 });
            }
          }
          setInventoryList(uniqueItems);
        }
      } catch (err) {
        console.error('Failed to fetch inventory:', err);
      }
    }
    fetchInventory();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newFormData = { ...formData, [e.target.name]: e.target.value };
    
    // Auto-fill prices if name matches an existing inventory item
    if (e.target.name === 'name') {
      const matchedItem = inventoryList.find(i => i.name.toLowerCase() === e.target.value.toLowerCase());
      if (matchedItem) {
        newFormData.buyPrice = matchedItem.buyPrice.toString();
        newFormData.sellPrice = matchedItem.sellPrice.toString();
      }
    }
    
    setFormData(newFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        ...formData,
        date: new Date(formData.date).toISOString()
      };

      const res = await fetch('/api/stock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add stock');
      }

      router.push('/inventory');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1 className="mb-6">Add New Stock</h1>
      
      <div className="glass-panel">
        {error && (
          <div className="badge badge-danger mb-6" style={{ width: '100%', padding: '12px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name">Item Name</label>
            <input 
              id="name"
              name="name" 
              type="text" 
              required 
              list="inventory-suggestions"
              placeholder="e.g. Maggi Normal"
              value={formData.name}
              onChange={handleChange}
            />
            <datalist id="inventory-suggestions">
              {inventoryList.map((item, idx) => (
                <option key={idx} value={item.name} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-3 mb-4 gap-4">
            <div>
              <label htmlFor="buyPrice">Buy Price (₹)</label>
              <input 
                id="buyPrice"
                name="buyPrice" 
                type="number" 
                min="0" 
                step="0.01" 
                required 
                placeholder="0.00"
                value={formData.buyPrice}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="sellPrice">Sell Price (₹)</label>
              <input 
                id="sellPrice"
                name="sellPrice" 
                type="number" 
                min="0" 
                step="0.01" 
                required 
                placeholder="0.00"
                value={formData.sellPrice}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="quantity">Quantity</label>
              <input 
                id="quantity"
                name="quantity" 
                type="number" 
                min="1" 
                required 
                placeholder="1"
                value={formData.quantity}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="date">Date & Time</label>
            <input 
              id="date"
              name="date" 
              type="datetime-local" 
              required 
              value={formData.date}
              onChange={handleChange}
            />
          </div>

          <div className="flex-between mt-8">
            <button 
              type="button" 
              className="btn btn-outline" 
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-success" 
              disabled={loading}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>Save Stock</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
