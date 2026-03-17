'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { InventoryItem } from '@/lib/types';
import { Save, Loader2, CheckCircle, HelpCircle, XCircle } from 'lucide-react';
import { getLocalDatetimeStr } from '@/lib/utils';

export default function AddSale() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    itemId: '',
    sellPrice: '',
    quantity: '1',
    roomNo: '',
    amountPaid: '',
    date: getLocalDatetimeStr(),
  });

  useEffect(() => {
    async function fetchInventory() {
      try {
        const res = await fetch('/api/inventory');
        const data = await res.json();
        if (Array.isArray(data)) {
          setInventory(data.filter((item) => item.available > 0));
        }
      } catch (err) {
        console.error('Failed to fetch inventory:', err);
      }
    }
    fetchInventory();
  }, []);

  const selectedItem = inventory.find((i) => i.id === formData.itemId);

  const quantityNum = Number(formData.quantity) || 0;
  const sellPriceNum = Number(formData.sellPrice) || 0;
  
  const total = sellPriceNum * quantityNum;
  const buyPrice = selectedItem ? selectedItem.buyPrice : 0;
  const profit = total - (buyPrice * quantityNum);
  const remaining = total - Number(formData.amountPaid || 0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const newFormData = { ...formData, [e.target.name]: e.target.value };
    
    let currentQty = quantityNum;
    let currentPrice = sellPriceNum;

    if (e.target.name === 'itemId') {
      const newlySelected = inventory.find((i) => i.id === e.target.value);
      if (newlySelected) {
        newFormData.sellPrice = newlySelected.sellPrice.toString();
        currentPrice = newlySelected.sellPrice;
      }
    } else if (e.target.name === 'quantity') {
      currentQty = Number(e.target.value) || 0;
    } else if (e.target.name === 'sellPrice') {
      currentPrice = Number(e.target.value) || 0;
    }

    // Auto-calculate default "Paid Full" amount when price, quantity, or item changes
    if (['itemId', 'quantity', 'sellPrice'].includes(e.target.name)) {
      newFormData.amountPaid = (currentQty * currentPrice).toString();
    }
    
    setFormData(newFormData);
  };

  const setAmountPaid = (amount: number) => {
    setFormData({ ...formData, amountPaid: amount.toString() });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemId) {
      setError('Please select an item');
      return;
    }
    if (quantityNum > (selectedItem?.available || 0)) {
       setError(`Only ${selectedItem?.available} items available in stock`);
       return;
    }
    
    setLoading(true);
    setError('');

    try {
      const payload = {
        itemId: formData.itemId,
        sellPrice: sellPriceNum,
        quantity: quantityNum,
        roomNo: Number(formData.roomNo),
        amountPaid: Number(formData.amountPaid || 0),
        date: new Date(formData.date).toISOString()
      };

      const res = await fetch('/api/stock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add sale');
      }

      router.push('/payments');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="mb-6">Record a Sale</h1>
      
      <div className="grid grid-cols-2" style={{ gap: '32px' }}>
        <div className="glass-panel">
          {error && (
            <div className="badge badge-danger mb-6" style={{ width: '100%', padding: '12px', fontSize: '14px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} id="sale-form">
            <div className="mb-4">
              <label htmlFor="itemId">Select Item</label>
              <select 
                id="itemId"
                name="itemId" 
                required 
                value={formData.itemId}
                onChange={handleChange}
              >
                <option value="" disabled>-- Select an item from inventory --</option>
                {inventory.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.available} in stock)
                  </option>
                ))}
              </select>
            </div>

            {selectedItem && (
               <div className="mb-4 text-secondary" style={{ fontSize: '14px' }}>
                 Cost Price: ₹{selectedItem.buyPrice} / unit
               </div>
            )}

            <div className="grid grid-cols-2 mb-4 gap-4">
              <div>
                <label htmlFor="sellPrice">Selling Price (₹)</label>
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
                  max={selectedItem?.available || undefined}
                  required 
                  placeholder="1"
                  value={formData.quantity}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 mb-4 gap-4">
              <div>
                <label htmlFor="roomNo">Room No (Optional)</label>
                <input 
                  id="roomNo"
                  name="roomNo" 
                  type="number" 
                  placeholder="e.g. 306"
                  value={formData.roomNo}
                  onChange={handleChange}
                />
              </div>
              <div>
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
            </div>

            <div className="mb-6">
              <label>Quick Payment Options</label>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  type="button" 
                  className="btn btn-success" 
                  style={{ padding: '8px 12px', fontSize: '13px' }}
                  onClick={() => setAmountPaid(total)}
                >
                  <CheckCircle size={14} /> Paid Full
                </button>
                <button 
                  type="button" 
                  className="btn btn-warning"
                  style={{ padding: '8px 12px', fontSize: '13px' }}
                  onClick={() => setAmountPaid(total / 2)}
                >
                  <HelpCircle size={14} /> Half Paid
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  style={{ padding: '8px 12px', fontSize: '13px' }}
                  onClick={() => setAmountPaid(0)}
                >
                  <XCircle size={14} /> Udhaar (₹0)
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="amountPaid">Amount Paid By Customer (₹)</label>
              <input 
                id="amountPaid"
                name="amountPaid" 
                type="number" 
                min="0"
                step="0.01" 
                required 
                value={formData.amountPaid}
                onChange={handleChange}
              />
            </div>
          </form>
        </div>

        {/* Live Calculation Panel */}
        <div className="glass-panel" style={{ height: 'fit-content' }}>
          <h2 className="mb-6">Transaction Summary</h2>
          
          <div className="flex-between mb-4">
            <span className="text-secondary">Total Value:</span>
            <span className="stat-value" style={{ fontSize: '24px' }}>₹{total}</span>
          </div>
          
          <div className="flex-between mb-4">
            <span className="text-secondary">Amount Paid:</span>
            <span className="text-success" style={{ fontSize: '18px', fontWeight: 'bold' }}>
              ₹{formData.amountPaid || '0'}
            </span>
          </div>

          <div className="flex-between mb-6 pb-6" style={{ borderBottom: '1px solid var(--glass-border)' }}>
            <span className="text-secondary">Remaining (Udhaar):</span>
            <span className="text-danger" style={{ fontSize: '18px', fontWeight: 'bold' }}>
              ₹{Math.max(0, remaining)}
            </span>
          </div>

          <div className="flex-between mb-8">
            <span className="text-secondary">Estimated Profit:</span>
            <span className="text-primary" style={{ fontSize: '18px', fontWeight: 'bold' }}>
              ₹{profit}
            </span>
          </div>

          <button 
            type="submit" 
            form="sale-form"
            className="btn" 
            style={{ width: '100%', padding: '16px' }}
            disabled={loading}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>Confirm Sale</span>
          </button>
        </div>
      </div>
    </div>
  );
}
