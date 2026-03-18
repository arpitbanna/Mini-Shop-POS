'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2, ArrowLeft } from 'lucide-react';
import { getLocalDatetimeStr } from '@/lib/utils';
import { useAddPurchase } from '@/hooks/useApi';

export default function AddPurchase() {
  const router = useRouter();
  const addPurchase = useAddPurchase();
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    date: getLocalDatetimeStr(),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    addPurchase.mutate({
        name: formData.name,
        amount: Number(formData.amount),
        date: new Date(formData.date).toISOString()
    }, {
        onSuccess: () => router.push('/')
    });
  };

  return (
    <div className="max-w-xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full transition-colors text-muted hover:text-white">
          <ArrowLeft size={24} />
        </button>
        <h1 className="mb-0 text-3xl font-bold tracking-tight">Add Purchase</h1>
      </div>
      
      <div className="glass-panel p-8 relative overflow-hidden group">
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-warning/10 rounded-full blur-3xl pointer-events-none group-hover:bg-warning/20 transition-colors"></div>

        <form onSubmit={handleSubmit} className="relative z-10">
          <div className="mb-6">
            <label htmlFor="name" className="text-sm text-muted mb-2 block">Purchase Description</label>
            <input 
              id="name"
              name="name" 
              type="text" 
              required 
              placeholder="e.g. Snack Resupply"
              value={formData.name}
              onChange={handleChange}
              className="input-glass"
              autoComplete="off"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="amount" className="text-sm text-muted mb-2 block">Total Amount (₹)</label>
            <input 
              id="amount"
              name="amount" 
              type="number" 
              min="0" 
              step="0.01" 
              required 
              placeholder="0.00"
              value={formData.amount}
              onChange={handleChange}
              className="input-glass"
            />
          </div>

          <div className="mb-8">
            <label htmlFor="date" className="text-sm text-muted mb-2 block">Date & Time</label>
            <input 
              id="date"
              name="date" 
              type="datetime-local" 
              required 
              value={formData.date}
              onChange={handleChange}
              className="input-glass"
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-white/10 mt-6">
            <button 
              type="submit" 
              className="btn bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 py-3 px-8 text-sm hover:scale-105 hover:shadow-lg text-white" 
              disabled={addPurchase.isPending}
            >
              {addPurchase.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{addPurchase.isPending ? 'Saving...' : 'Save Purchase'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
