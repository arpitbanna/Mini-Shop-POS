'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInventory, useAddInventory } from '@/hooks/useApi';
import { Save, Loader2, Plus, Trash2, ArrowLeft, Box, IndianRupee, Hash, PackageOpen, Calendar } from 'lucide-react';
import styles from '@/styles/form.module.css';
import { getLocalDatetimeStr } from '@/lib/utils';
import { getBusinessDate } from '@/lib/business-day';
import { toast } from 'sonner';

type StockDraftItem = {
  name: string;
  buyPrice: string;
  sellPrice: string;
  quantity: string;
};

export default function AddStock() {
  const router = useRouter();
  const { data: inventory = [] } = useInventory();
  const addInventory = useAddInventory();

  const [entryMeta, setEntryMeta] = useState({
    date: getLocalDatetimeStr(),
  });

  const [draft, setDraft] = useState<StockDraftItem>({
    name: '',
    buyPrice: '',
    sellPrice: '',
    quantity: '1',
  });

  const [items, setItems] = useState<StockDraftItem[]>([]);

  const fieldClass =
    'w-full rounded-xl border border-white/15 bg-white/[0.045] px-4 py-3 text-base text-white transition-all duration-200 focus:border-teal-400/70 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-teal-500/40';

  const uniqueItems = Array.from(new Set(inventory.map((item) => item.name))).map((name) => {
    const existing = inventory.find((item) => item.name === name);
    return {
      name,
      buyPrice: existing?.buyPrice || 0,
      sellPrice: existing?.sellPrice || 0,
    };
  });

  const summary = useMemo(() => {
    const totalQty = items.reduce((acc, item) => acc + Number(item.quantity || 0), 0);
    const estimatedValue = items.reduce((acc, item) => acc + Number(item.sellPrice || 0) * Number(item.quantity || 0), 0);
    return { totalQty, estimatedValue };
  }, [items]);

  const handleDraftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = { ...draft, [e.target.name]: e.target.value };

    if (e.target.name === 'name') {
      const matched = uniqueItems.find((item) => item.name.toLowerCase() === e.target.value.toLowerCase());
      if (matched) {
        next.buyPrice = String(matched.buyPrice);
        next.sellPrice = String(matched.sellPrice);
      }
    }

    setDraft(next);
  };

  const addItem = () => {
    const qty = Number(draft.quantity || 0);
    const buyPrice = Number(draft.buyPrice || 0);
    const sellPrice = Number(draft.sellPrice || 0);

    if (!draft.name.trim()) {
      toast.error('Item name is required');
      return;
    }
    if (qty <= 0) {
      toast.error('Quantity must be at least 1');
      return;
    }
    if (buyPrice < 0 || sellPrice < 0) {
      toast.error('Prices cannot be negative');
      return;
    }

    setItems((prev) => [...prev, draft]);
    setDraft({ name: '', buyPrice: '', sellPrice: '', quantity: '1' });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const submitStock = (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      toast.error('Add at least one stock item');
      return;
    }

    const createdAt = new Date(entryMeta.date).toISOString();
    const businessDate = getBusinessDate(5, new Date(entryMeta.date));

    addInventory.mutate(
      {
        createdAt,
        businessDate,
        items: items.map((item) => ({
          name: item.name.trim(),
          buyPrice: Number(item.buyPrice || 0),
          sellPrice: Number(item.sellPrice || 0),
          quantity: Number(item.quantity || 0),
        })),
      },
      {
        onSuccess: () => {
          toast.success('Stock entry saved');
          router.push('/inventory');
        },
      },
    );
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.headerContext} style={{ marginBottom: '40px' }}>
        <button
          onClick={() => router.back()}
          className={styles.backBtn}
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className={styles.pageTitle} style={{ marginBottom: 0 }}>Add New Stock</h1>
      </div>

      <div className={styles.gridContainer}>
        <div className={styles.card}>
          <div className={styles.inputGroup}>
            <label htmlFor="date" className={styles.label}>Date & Time</label>
            <div className={styles.inputWrapper}>
              <Calendar size={16} className={styles.inputIcon} />
              <input
                id="date"
                name="date"
                type="datetime-local"
                required
                value={entryMeta.date}
                onChange={(e) => setEntryMeta({ date: e.target.value })}
                className={`${styles.input} ${styles.inputWithIcon}`}
              />
            </div>
            <p className="mt-1 text-xs text-white opacity-50 block mb-0 mt-2">Business Date: {getBusinessDate(5, new Date(entryMeta.date))}</p>
          </div>

          <div className={styles.card} style={{ padding: '20px', background: 'rgba(255,255,255,0.015)', boxShadow: 'none' }}>
            <div className={styles.inputGroup}>
              <label htmlFor="name" className={styles.label}>Item Name</label>
              <div className={styles.inputWrapper}>
                <Box size={16} className={styles.inputIcon} />
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  list="inventory-suggestions"
                  placeholder="e.g. Maggi"
                  value={draft.name}
                  onChange={handleDraftChange}
                  className={`${styles.input} ${styles.inputWithIcon}`}
                />
                <datalist id="inventory-suggestions">
                  {uniqueItems.map((item, idx) => (
                    <option key={idx} value={item.name} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className={styles.threeColumnGrid}>
              <div className={styles.inputGroup}>
                <label htmlFor="buyPrice" className={styles.label}>Buy Price</label>
                <div className={styles.inputWrapper}>
                  <IndianRupee size={16} className={styles.inputIcon} />
                  <input
                    id="buyPrice"
                    name="buyPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.buyPrice}
                    onChange={handleDraftChange}
                    className={`${styles.input} ${styles.inputWithIcon}`}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="sellPrice" className={styles.label}>Sell Price</label>
                <div className={styles.inputWrapper}>
                  <IndianRupee size={16} className={styles.inputIcon} />
                  <input
                    id="sellPrice"
                    name="sellPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.sellPrice}
                    onChange={handleDraftChange}
                    className={`${styles.input} ${styles.inputWithIcon}`}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="quantity" className={styles.label}>Qty</label>
                <div className={styles.inputWrapper}>
                  <Hash size={16} className={styles.inputIcon} />
                  <input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="1"
                    value={draft.quantity}
                    onChange={handleDraftChange}
                    className={`${styles.input} ${styles.inputWithIcon}`}
                    placeholder="1"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={addItem}
              className={styles.btnSecondary}
            >
              <Plus size={16} /> Add Item
            </button>
          </div>
        </div>

        <form onSubmit={submitStock} className={styles.card}>
          <h2 className={styles.summaryHeader}>Stock Entry Summary</h2>

          <div className={styles.summaryList}>
            {items.length === 0 ? (
              <div className={styles.emptyStateContainer}>
                 <PackageOpen size={32} opacity={0.5}/>
                 <span style={{ fontSize: '14px', fontWeight: 500 }}>No stock items added yet</span>
              </div>
            ) : (
              items.map((item, idx) => (
                <div key={`${item.name}-${idx}`} className={styles.summaryItem}>
                  <div>
                    <div className={styles.summaryItemTitle}>{item.name}</div>
                    <div className={styles.summaryItemMeta}>Qty {item.quantity}, Buy ₹{item.buyPrice}, Sell ₹{item.sellPrice}</div>
                  </div>
                  <div className={styles.summaryItemRight}>
                    <button type="button" onClick={() => removeItem(idx)} className={styles.removeBtn} style={{ marginTop: 0 }}>
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={styles.totalsSpacedBlock}>
            <div className={styles.summaryRow}>
               <span className={styles.summaryRowLabel}>Total Items</span>
               <span className={styles.summaryRowValue}>{items.length}</span>
            </div>
            <div className={styles.summaryRow}>
               <span className={styles.summaryRowLabel}>Total Quantity</span>
               <span className={styles.summaryRowValue}>{summary.totalQty}</span>
            </div>
            <div className={styles.summaryRow}>
               <span className={styles.summaryRowLabel}>Estimated Sell Value</span>
               <span className={styles.summaryTotalAmount}>₹{summary.estimatedValue}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={addInventory.isPending || items.length === 0}
            className={styles.btnPrimary}
          >
            {addInventory.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>{addInventory.isPending ? 'Saving...' : 'Save Stock Entry'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
