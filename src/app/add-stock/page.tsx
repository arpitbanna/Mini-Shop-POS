'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInventory, useAddInventory } from '@/hooks/useApi';
import { Save, Loader2, ArrowLeft, Plus, Trash2 } from 'lucide-react';
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
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all';

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
    <div className="w-full flex justify-center pb-12 px-4">
      <div className="w-full max-w-4xl">
        <div className="relative flex items-center justify-center mb-8">
          <button
            onClick={() => router.back()}
            className="absolute left-0 p-2 hover:bg-white/10 rounded-full transition-colors text-muted hover:text-white"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="mb-0 text-2xl font-semibold tracking-tight text-center">Add New Stock</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel p-6 space-y-6 rounded-2xl">
            <div>
              <label htmlFor="date" className="text-sm text-gray-400 mb-2 block">Date & Time</label>
              <input
                id="date"
                name="date"
                type="datetime-local"
                required
                value={entryMeta.date}
                onChange={(e) => setEntryMeta({ date: e.target.value })}
                className={fieldClass}
              />
              <p className="text-xs text-muted mt-2">Business Date: {getBusinessDate(5, new Date(entryMeta.date))}</p>
            </div>

            <div className="border border-white/10 rounded-xl p-4 bg-white/5 space-y-4">
              <div>
                <label htmlFor="name" className="text-sm text-gray-400 mb-2 block">Item Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  list="inventory-suggestions"
                  placeholder="e.g. Maggi"
                  value={draft.name}
                  onChange={handleDraftChange}
                  className={fieldClass}
                />
                <datalist id="inventory-suggestions">
                  {uniqueItems.map((item, idx) => (
                    <option key={idx} value={item.name} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="buyPrice" className="text-sm text-gray-400 mb-2 block">Buy (₹)</label>
                  <input
                    id="buyPrice"
                    name="buyPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.buyPrice}
                    onChange={handleDraftChange}
                    className={fieldClass}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label htmlFor="sellPrice" className="text-sm text-gray-400 mb-2 block">Sell (₹)</label>
                  <input
                    id="sellPrice"
                    name="sellPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.sellPrice}
                    onChange={handleDraftChange}
                    className={fieldClass}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label htmlFor="quantity" className="text-sm text-gray-400 mb-2 block">Qty</label>
                  <input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="1"
                    value={draft.quantity}
                    onChange={handleDraftChange}
                    className={fieldClass}
                    placeholder="1"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={addItem}
                className="btn btn-outline w-full border-white/20 hover:bg-white/10"
              >
                <Plus size={16} /> Add Item
              </button>
            </div>
          </div>

          <form onSubmit={submitStock} className="glass-panel p-6 rounded-2xl flex flex-col">
            <h2 className="mb-4 text-lg font-semibold">Stock Entry Summary</h2>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {items.length === 0 ? (
                <div className="text-sm text-muted border border-dashed border-white/10 rounded-xl p-4 text-center">
                  No stock items added yet.
                </div>
              ) : (
                items.map((item, idx) => (
                  <div key={`${item.name}-${idx}`} className="p-3 rounded-xl bg-white/5 border border-white/10 flex-between gap-3">
                    <div>
                      <div className="font-medium text-white">{item.name}</div>
                      <div className="text-xs text-muted">Qty {item.quantity}, Buy ₹{item.buyPrice}, Sell ₹{item.sellPrice}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-xs text-danger hover:text-red-300 inline-flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 text-sm space-y-2">
              <div className="flex-between"><span className="text-muted">Total Items</span><span>{items.length}</span></div>
              <div className="flex-between"><span className="text-muted">Total Quantity</span><span>{summary.totalQty}</span></div>
              <div className="flex-between"><span className="text-muted">Estimated Sell Value</span><span>₹{summary.estimatedValue}</span></div>
            </div>

            <button
              type="submit"
              className="btn mt-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 py-3.5"
              disabled={addInventory.isPending || items.length === 0}
            >
              {addInventory.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{addInventory.isPending ? 'Saving...' : 'Save Stock Entry'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
