'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useInventory, useAddSale } from '@/hooks/useApi';
import { Save, Loader2, Plus, Trash2, IndianRupee, User, Calendar, Box, PackageOpen } from 'lucide-react';
import styles from '@/styles/form.module.css';
import { getLocalDatetimeStr } from '@/lib/utils';
import { getBusinessDate } from '@/lib/business-day';
import { toast } from 'sonner';

type SaleDraftItem = {
  productId: string;
  quantity: string;
  sellingPrice: string;
};

export default function AddSale() {
  const router = useRouter();
  const { data: inventory = [], isLoading: invLoading } = useInventory();
  const addSale = useAddSale();

  const [draftItem, setDraftItem] = useState<SaleDraftItem>({
    productId: '',
    quantity: '1',
    sellingPrice: '',
  });

  const [transaction, setTransaction] = useState({
    roomNo: '',
    date: getLocalDatetimeStr(),
    amountPaid: '',
  });

  const [items, setItems] = useState<SaleDraftItem[]>([]);
  const [isManualPaid, setIsManualPaid] = useState(false);

  const fieldClass =
    'w-full bg-white/[0.045] border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-400/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-teal-500/30 transition-all duration-200';

  const availableInventory = inventory.filter((item) => item.available > 0);

  const selectedDraftInventory = useMemo(
    () => availableInventory.find((item) => item.id === draftItem.productId),
    [availableInventory, draftItem.productId],
  );

  const itemRows = useMemo(() => {
    return items
      .map((entry) => {
        const product = availableInventory.find((item) => item.id === entry.productId);
        if (!product) return null;

        const quantity = Number(entry.quantity || 0);
        const sellingPrice = Number(entry.sellingPrice || 0);
        const lineTotal = quantity * sellingPrice;
        const lineProfit = (sellingPrice - product.buyPrice) * quantity;

        return {
          ...entry,
          name: product.name,
          costPrice: product.buyPrice,
          available: product.available,
          quantity,
          sellingPrice,
          lineTotal,
          lineProfit,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }, [availableInventory, items]);

  const totalAmount = itemRows.reduce((acc, row) => acc + row.lineTotal, 0);
  const totalProfit = itemRows.reduce((acc, row) => acc + row.lineProfit, 0);
  const totalQty = itemRows.reduce((acc, row) => acc + row.quantity, 0);
  const amountPaid = Number(transaction.amountPaid || 0);
  const remaining = Math.max(0, totalAmount - amountPaid);

  useEffect(() => {
    if (!isManualPaid) {
      if (totalAmount > 0) {
        setTransaction((prev) => ({ ...prev, amountPaid: String(totalAmount) }));
      } else if (totalAmount === 0) {
        setTransaction((prev) => ({ ...prev, amountPaid: '' }));
      }
    }
  }, [totalAmount, isManualPaid]);

  const usedQtyByProduct = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((entry) => {
      map.set(entry.productId, (map.get(entry.productId) || 0) + Number(entry.quantity || 0));
    });
    return map;
  }, [items]);

  const handleDraftChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const next = { ...draftItem, [e.target.name]: e.target.value };

    if (e.target.name === 'productId') {
      const selected = availableInventory.find((item) => item.id === e.target.value);
      next.sellingPrice = selected ? String(selected.sellPrice) : '';
      next.quantity = '1';
    }

    setDraftItem(next);
  };

  const addItem = () => {
    if (!draftItem.productId) {
      toast.error('Select an item first');
      return;
    }

    const quantity = Number(draftItem.quantity || 0);
    const sellingPrice = Number(draftItem.sellingPrice || 0);
    const selected = availableInventory.find((item) => item.id === draftItem.productId);

    if (!selected) {
      toast.error('Item not available in inventory');
      return;
    }
    if (quantity <= 0) {
      toast.error('Quantity must be at least 1');
      return;
    }
    if (sellingPrice < 0) {
      toast.error('Selling price cannot be negative');
      return;
    }

    const alreadyUsed = usedQtyByProduct.get(draftItem.productId) || 0;
    if (alreadyUsed + quantity > selected.available) {
      toast.error(`Only ${selected.available - alreadyUsed} more units available for ${selected.name}`);
      return;
    }

    setItems((prev) => [...prev, draftItem]);
    setDraftItem({ productId: '', quantity: '1', sellingPrice: '' });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const submitSale = (e: React.FormEvent) => {
    e.preventDefault();

    if (itemRows.length === 0) {
      toast.error('Add at least one item');
      return;
    }

    const createdAt = new Date(transaction.date).toISOString();
    const businessDate = getBusinessDate(5, new Date(transaction.date));

    addSale.mutate(
      {
        roomNo: transaction.roomNo.trim(),
        createdAt,
        businessDate,
        amountPaid,
        items: itemRows.map((row) => ({
          productId: row.productId,
          name: row.name,
          quantity: row.quantity,
          sellingPrice: row.sellingPrice,
          costPrice: row.costPrice,
        })),
      },
      {
        onSuccess: () => {
          toast.success('Sale transaction saved');
          router.push('/payments');
        },
      },
    );
  };

  return (
    <div className={styles.pageContainer}>
      <h1 className={styles.pageTitle}>Record a Sale</h1>

      <div className={styles.gridContainer}>
        {/* Left Side: Input Form */}
        <div className={styles.card}>
          <div className={styles.twoColumnGrid}>
            <div className={styles.inputGroup}>
              <label htmlFor="roomNo" className={styles.label}>Room No / Name</label>
              <div className={styles.inputWrapper}>
                <User size={16} className={styles.inputIcon} />
                <input
                  id="roomNo"
                  name="roomNo"
                  type="text"
                  value={transaction.roomNo}
                  onChange={(e) => setTransaction((prev) => ({ ...prev, roomNo: e.target.value }))}
                  className={`${styles.input} ${styles.inputWithIcon}`}
                  placeholder="e.g. 306 or Lobby"
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
                  value={transaction.date}
                  onChange={(e) => setTransaction((prev) => ({ ...prev, date: e.target.value }))}
                  className={`${styles.input} ${styles.inputWithIcon}`}
                />
              </div>
            </div>
          </div>

          <div className={styles.card} style={{ padding: '20px', background: 'rgba(255,255,255,0.015)', boxShadow: 'none' }}>
            <div className={styles.inputGroup}>
              <label htmlFor="productId" className={styles.label}>Select Item</label>
              <div className={styles.inputWrapper}>
                <Box size={16} className={styles.inputIcon} />
                <select
                  id="productId"
                  name="productId"
                  value={draftItem.productId}
                  onChange={handleDraftChange}
                  className={`${styles.input} ${styles.inputWithIcon}`}
                  disabled={invLoading}
                >
                  <option value="">-- {invLoading ? 'Loading inventory...' : 'Select item'} --</option>
                  {availableInventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.available} in stock)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.twoColumnGrid}>
              <div className={styles.inputGroup}>
                <label htmlFor="sellingPrice" className={styles.label}>Selling Price</label>
                <div className={styles.inputWrapper}>
                  <IndianRupee size={16} className={styles.inputIcon} />
                  <input
                    id="sellingPrice"
                    name="sellingPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={draftItem.sellingPrice}
                    onChange={handleDraftChange}
                    className={`${styles.input} ${styles.inputWithIcon}`}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="quantity" className={styles.label}>Quantity</label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  value={draftItem.quantity}
                  onChange={handleDraftChange}
                  className={styles.input}
                  placeholder="1"
                />
              </div>
            </div>

            {selectedDraftInventory && (
              <p className="text-xs text-green-400 opacity-80 mt-[-10px]">Cost Price: ₹{selectedDraftInventory.buyPrice} per unit</p>
            )}

            <button
              type="button"
              onClick={addItem}
              className={styles.btnSecondary}
            >
              <Plus size={16} /> Add Item
            </button>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="amountPaid" className={styles.label}>Amount Paid</label>
            <div className={styles.inputWrapper}>
              <IndianRupee size={16} className={styles.inputIcon} />
              <input
                id="amountPaid"
                name="amountPaid"
                type="number"
                min="0"
                step="0.01"
                value={transaction.amountPaid}
                onChange={(e) => {
                  setIsManualPaid(true);
                  setTransaction((prev) => ({ ...prev, amountPaid: e.target.value }));
                }}
                className={`${styles.input} ${styles.inputWithIcon}`}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Right Side: Summary Card */}
        <form onSubmit={submitSale} className={styles.card}>
          <h2 className={styles.summaryHeader}>Transaction Summary</h2>

          <div className={styles.summaryList}>
            {itemRows.length === 0 ? (
              <div className={styles.emptyStateContainer}>
                 <PackageOpen size={32} opacity={0.5}/>
                 <span style={{ fontSize: '14px', fontWeight: 500 }}>No items added yet</span>
              </div>
            ) : (
              itemRows.map((row, idx) => (
                <div key={`${row.productId}-${idx}`} className={styles.summaryItem}>
                  <div>
                    <div className={styles.summaryItemTitle}>{row.name}</div>
                    <div className={styles.summaryItemMeta}>Qty {row.quantity} x ₹{row.sellingPrice}</div>
                  </div>
                  <div className={styles.summaryItemRight}>
                    <div className={styles.summaryItemPrice}>₹{row.lineTotal}</div>
                    <button type="button" onClick={() => removeItem(idx)} className={styles.removeBtn}>
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={styles.totalsSpacedBlock}>
            <div className={styles.summaryRow}>
               <span className={styles.summaryRowLabel}>Items</span>
               <span className={styles.summaryRowValue}>{totalQty}</span>
            </div>
            <div className={styles.summaryRow}>
               <span className={styles.summaryRowLabel}>Total Amount</span>
               <span className={styles.summaryTotalAmount}>₹{totalAmount}</span>
            </div>
            <div className={styles.summaryRow}>
               <span className={styles.summaryRowLabel}>Amount Paid</span>
               <span className={`${styles.summaryRowValue} ${styles.textProfit}`}>₹{amountPaid}</span>
            </div>
            <div className={styles.summaryRow}>
               <span className={styles.summaryRowLabel}>Remaining</span>
               <span className={`${styles.summaryRowValue} ${remaining > 0 ? styles.textRemaining : styles.textProfit}`}>₹{remaining}</span>
            </div>
            <div className={styles.summaryRow}>
               <span className={styles.summaryRowLabel}>Status</span>
               <span className={`${styles.statusBadge} ${amountPaid === 0 ? styles.badgeNone : amountPaid < totalAmount ? styles.badgeHalf : styles.badgePaid}`}>
                  {amountPaid === 0 ? 'Not Paid' : amountPaid < totalAmount ? 'Half Paid' : 'Paid'}
               </span>
            </div>
            <div className={styles.summaryRow}>
               <span className={styles.summaryRowLabel}>Estimated Profit</span>
               <span className={`${styles.summaryRowValue} ${styles.textProfit}`}>₹{totalProfit}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={addSale.isPending || itemRows.length === 0}
            className={styles.btnPrimary}
          >
            {addSale.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>{addSale.isPending ? 'Saving...' : 'Confirm Sale'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
