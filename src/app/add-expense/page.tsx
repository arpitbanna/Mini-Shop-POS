'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2, ArrowLeft } from 'lucide-react';
import { getLocalDatetimeStr } from '@/lib/utils';
import { useAddExpense } from '@/hooks/useApi';

export default function AddExpense() {
  const router = useRouter();
  const addExpense = useAddExpense();
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
    addExpense.mutate({
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
        <h1 className="mb-0 text-3xl font-bold tracking-tight">Add Expense</h1>
      </div>
      
      <div className="glass-panel p-8 relative overflow-hidden group">
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-danger/10 rounded-full blur-3xl pointer-events-none group-hover:bg-danger/20 transition-colors"></div>

        <form onSubmit={handleSubmit} className="relative z-10">
          <div className="mb-6">
            <label htmlFor="name" className="text-sm font-semibold text-slate-300 mb-2.5 block tracking-wide">Expense Description</label>
            <input 
              id="name"
              name="name" 
              type="text" 
              required 
              placeholder="e.g. Cleaning Supplies"
              value={formData.name}
              onChange={handleChange}
              className="w-full rounded-xl border border-white/15 bg-white/[0.045] px-4 py-3 text-white transition-all focus:border-teal-400/60 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              autoComplete="off"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="amount" className="text-sm font-semibold text-slate-300 mb-2.5 block tracking-wide">Amount (₹)</label>
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
              className="w-full rounded-xl border border-white/15 bg-white/[0.045] px-4 py-3 text-white transition-all focus:border-teal-400/60 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>

          <div className="mb-8">
            <label htmlFor="date" className="text-sm font-semibold text-slate-300 mb-2.5 block tracking-wide">Date & Time</label>
            <input 
              id="date"
              name="date" 
              type="datetime-local" 
              required 
              value={formData.date}
              onChange={handleChange}
              className="w-full rounded-xl border border-white/15 bg-white/[0.045] px-4 py-3 text-white transition-all focus:border-teal-400/60 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-white/10 mt-6">
            <button 
              type="submit" 
              className="btn bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 py-3 px-8 text-sm hover:scale-105 hover:shadow-lg text-white" 
              disabled={addExpense.isPending}
            >
              {addExpense.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{addExpense.isPending ? 'Saving...' : 'Save Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
