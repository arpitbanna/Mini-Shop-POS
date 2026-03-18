'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInventory, useAddSale } from '@/hooks/useApi';
import { Save, Loader2, Plus, Trash2 } from 'lucide-react';
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

  const fieldClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all';

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
    <div className="max-w-6xl mx-auto pb-12 px-4">
      <h1 className="mb-6 text-xl font-semibold tracking-tight text-center">Record a Sale</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel space-y-6 border-white/10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="roomNo" className="text-sm text-gray-400 mb-2 block">Room No/Name (Optional)</label>
              <input
                id="roomNo"
                name="roomNo"
                type="text"
                value={transaction.roomNo}
                onChange={(e) => setTransaction((prev) => ({ ...prev, roomNo: e.target.value }))}
                className={fieldClass}
                placeholder="e.g. 306 or Lobby"
              />
            </div>
            <div>
              <label htmlFor="date" className="text-sm text-gray-400 mb-2 block">Date & Time</label>
              <input
                id="date"
                name="date"
                type="datetime-local"
                required
                value={transaction.date}
                onChange={(e) => setTransaction((prev) => ({ ...prev, date: e.target.value }))}
                className={fieldClass}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-4">
            <div>
              <label htmlFor="productId" className="text-sm text-gray-400 mb-2 block">Select Item</label>
              <select
                id="productId"
                name="productId"
                value={draftItem.productId}
                onChange={handleDraftChange}
                className={fieldClass}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="sellingPrice" className="text-sm text-gray-400 mb-2 block">Selling Price (₹)</label>
                <input
                  id="sellingPrice"
                  name="sellingPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={draftItem.sellingPrice}
                  onChange={handleDraftChange}
                  className={fieldClass}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label htmlFor="quantity" className="text-sm text-gray-400 mb-2 block">Quantity</label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  value={draftItem.quantity}
                  onChange={handleDraftChange}
                  className={fieldClass}
                  placeholder="1"
                />
              </div>
            </div>

            {selectedDraftInventory && (
              <p className="text-xs text-success">Cost Price: ₹{selectedDraftInventory.buyPrice} per unit</p>
            )}

            <button
              type="button"
              onClick={addItem}
              className="btn btn-outline w-full border-white/20 hover:bg-white/10"
            >
              <Plus size={16} /> Add Item
            </button>
          </div>

          <div>
            <label htmlFor="amountPaid" className="text-sm text-gray-400 mb-2 block">Amount Paid (₹)</label>
            <input
              id="amountPaid"
              name="amountPaid"
              type="number"
              min="0"
              step="0.01"
              value={transaction.amountPaid}
              onChange={(e) => setTransaction((prev) => ({ ...prev, amountPaid: e.target.value }))}
              className={fieldClass}
              placeholder="0.00"
            />
          </div>
        </div>

        <form onSubmit={submitSale} className="glass-panel flex flex-col border-primary/20">
          <h2 className="mb-4 text-lg font-semibold">Transaction Summary</h2>

          <div className="space-y-3 mb-4 max-h-72 overflow-y-auto pr-1">
            {itemRows.length === 0 ? (
              <div className="text-sm text-muted border border-dashed border-white/10 rounded-xl p-4 text-center">
                No items added yet.
              </div>
            ) : (
              itemRows.map((row, idx) => (
                <div key={`${row.productId}-${idx}`} className="p-3 rounded-xl bg-white/5 border border-white/10 flex-between gap-3">
                  <div>
                    <div className="font-medium text-white">{row.name}</div>
                    <div className="text-xs text-muted">Qty {row.quantity} x ₹{row.sellingPrice}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-blue-300">₹{row.lineTotal}</div>
                    <button type="button" onClick={() => removeItem(idx)} className="text-xs text-danger hover:text-red-300 mt-1 inline-flex items-center gap-1">
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2 text-sm border-t border-white/10 pt-4">
            <div className="flex-between"><span className="text-muted">Items</span><span>{totalQty}</span></div>
            <div className="flex-between"><span className="text-muted">Total Amount</span><span className="font-semibold">₹{totalAmount}</span></div>
            <div className="flex-between"><span className="text-muted">Amount Paid</span><span className="text-success">₹{amountPaid}</span></div>
            <div className="flex-between"><span className="text-muted">Remaining</span><span className={remaining > 0 ? 'text-danger font-semibold' : 'text-success font-semibold'}>₹{remaining}</span></div>
            <div className="flex-between"><span className="text-muted">Estimated Profit</span><span className="text-green-400 font-semibold">₹{totalProfit}</span></div>
            <div className="flex-between"><span className="text-muted">Business Date</span><span>{getBusinessDate(5, new Date(transaction.date))}</span></div>
          </div>

          <button
            type="submit"
            disabled={addSale.isPending || itemRows.length === 0}
            className="btn w-full mt-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50"
          >
            {addSale.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>{addSale.isPending ? 'Saving...' : 'Confirm Sale'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
