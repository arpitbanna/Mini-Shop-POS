'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Receipt } from 'lucide-react';

export default function AddExpense() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error('Failed to add expense');
      }

      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Receipt size={28} className="text-secondary" />
        <h1 className="mb-0">Add New Expense</h1>
      </div>

      <div className="glass-panel">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)] text-[var(--danger)]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-group">
              <label htmlFor="name">Expense Name</label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Rent, Electricity"
              />
            </div>

            <div className="form-group">
              <label htmlFor="amount">Amount (₹)</label>
              <input
                type="number"
                id="amount"
                required
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="date">Date</label>
              <input
                type="date"
                id="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-4 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <button
              type="button"
              className="btn flex-1 md:flex-none"
              style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn flex-1 md:flex-none"
              disabled={loading}
              style={{ background: 'var(--primary)', color: 'white' }}
            >
              {loading ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
