'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2, ArrowLeft, Box, IndianRupee, Calendar } from 'lucide-react';
import { getLocalDatetimeStr } from '@/lib/utils';
import { useAddPurchase } from '@/hooks/useApi';
import styles from '@/styles/form.module.css';

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
    <div className={styles.pageContainer}>
      <div className={styles.headerContext} style={{ marginBottom: '40px' }}>
        <button onClick={() => router.back()} className={styles.backBtn}>
          <ArrowLeft size={24} />
        </button>
        <h1 className={styles.pageTitle} style={{ marginBottom: 0 }}>Add Purchase</h1>
      </div>
      
      <form onSubmit={handleSubmit} className={styles.formCard}>
        <div className={styles.inputGroup}>
          <label htmlFor="name" className={styles.label}>Purchase Item / Supplier</label>
          <div className={styles.inputWrapper}>
            <Box size={16} className={styles.inputIcon} />
            <input 
              id="name"
              name="name" 
              type="text" 
              required 
              placeholder="e.g. 50 kg Flour from Supplier X"
              value={formData.name}
              onChange={handleChange}
              className={`${styles.input} ${styles.inputWithIcon}`}
              autoComplete="off"
            />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="amount" className={styles.label}>Amount Paid (₹)</label>
          <div className={styles.inputWrapper}>
            <IndianRupee size={16} className={styles.inputIcon} />
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
              className={`${styles.input} ${styles.inputWithIcon}`}
            />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="date" className={styles.label}>Date & Time</label>
          <div className={styles.inputWrapper}>
            <Calendar size={16} className={styles.inputIcon} />
            <input 
              id="date"
              name="date" 
              type="datetime-local" 
              required 
              value={formData.date}
              onChange={handleChange}
              className={`${styles.input} ${styles.inputWithIcon}`}
            />
          </div>
        </div>

        <div style={{ paddingTop: '8px' }}>
          <button 
            type="submit" 
            className={styles.buttonPrimary} 
            disabled={addPurchase.isPending}
          >
            {addPurchase.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>{addPurchase.isPending ? 'Saving...' : 'Save Purchase'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
