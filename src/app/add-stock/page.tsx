'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInventory, useAddInventory } from '@/hooks/useApi';
import { Save, Loader2, ArrowLeft } from 'lucide-react';
import { getLocalDatetimeStr } from '@/lib/utils';
import { toast } from 'sonner';

export default function AddStock() {
  const router = useRouter();
  const { data: inventory = [] } = useInventory();
  const addInventory = useAddInventory();

  const [formData, setFormData] = useState({
    name: '',
    buyPrice: '',
    sellPrice: '',
    quantity: '',
    date: getLocalDatetimeStr(),
  });

  const fieldClass = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all';

  const uniqueItems = Array.from(new Set(inventory.map(item => item.name)))
    .map(name => {
      const item = inventory.find(i => i.name === name);
      return { name, buyPrice: item?.buyPrice || 0, sellPrice: item?.sellPrice || 0 };
    });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFormData = { ...formData, [e.target.name]: e.target.value };
    
    // Auto-fill prices if name matches an existing inventory item
    if (e.target.name === 'name') {
      const matchedItem = uniqueItems.find(i => i.name.toLowerCase() === e.target.value.toLowerCase());
      if (matchedItem) {
        newFormData.buyPrice = matchedItem.buyPrice.toString();
        newFormData.sellPrice = matchedItem.sellPrice.toString();
      }
    }
    
    setFormData(newFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    addInventory.mutate(
      {
        ...formData,
        date: new Date(formData.date).toISOString()
      },
      {
        onSuccess: () => {
          toast.success('Stock added successfully');
          router.push('/inventory');
        }
      }
    );
  };

  return (
    <div className="w-full flex justify-center pb-12 px-4">
      <div className="w-full max-w-2xl">
        <div className="relative flex items-center justify-center mb-8">
          <button onClick={() => router.back()} className="absolute left-0 p-2 hover:bg-white/10 rounded-full transition-colors text-muted hover:text-white">
          <ArrowLeft size={24} />
        </button>
          <h1 className="mb-0 text-2xl font-semibold tracking-tight text-center">Add New Stock</h1>
        </div>
        
      <div className="glass-panel p-8 relative overflow-hidden group transition-all duration-200 rounded-2xl">
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/20 transition-colors"></div>

        <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
          <div>
            <label htmlFor="name" className="text-sm text-gray-400 mb-2 block">Item Name</label>
            <input 
              id="name"
              name="name" 
              type="text" 
              required 
              list="inventory-suggestions"
              placeholder="e.g. Maggi Normal"
              value={formData.name}
              onChange={handleChange}
              className={fieldClass}
              autoComplete="off"
            />
            <datalist id="inventory-suggestions">
              {uniqueItems.map((item, idx) => (
                <option key={idx} value={item.name} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="buyPrice" className="text-sm text-gray-400 mb-2 block">Buy Price (₹)</label>
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
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="sellPrice" className="text-sm text-gray-400 mb-2 block">Sell Price (₹)</label>
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
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="quantity" className="text-sm text-gray-400 mb-2 block">Quantity (Units)</label>
              <input 
                id="quantity"
                name="quantity" 
                type="number" 
                min="1" 
                required 
                placeholder="1"
                value={formData.quantity}
                onChange={handleChange}
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="date" className="text-sm text-gray-400 mb-2 block">Date & Time</label>
            <input 
              id="date"
              name="date" 
              type="datetime-local" 
              required 
              value={formData.date}
              onChange={handleChange}
              className={fieldClass}
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-white/10">
            <button 
              type="submit" 
              className="btn bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 py-3.5 px-8 text-sm rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg" 
              disabled={addInventory.isPending}
            >
              {addInventory.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{addInventory.isPending ? 'Saving...' : 'Save Stock'}</span>
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}
