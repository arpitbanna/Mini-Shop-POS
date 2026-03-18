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
    <div className="flex w-full justify-center px-4 pb-14 pt-2">
      <div className="w-full max-w-[980px]">
        <div className="relative mb-10 flex items-center justify-center">
          <button
            onClick={() => router.back()}
            className="absolute left-0 rounded-full p-2 text-muted transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="mb-0 text-center text-4xl font-bold tracking-tight text-white md:text-5xl">Add New Stock</h1>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="glass-panel rounded-2xl border border-white/20 bg-gradient-to-b from-white/[0.08] via-white/[0.04] to-white/[0.02] p-6 shadow-[0_14px_34px_-20px_rgba(0,0,0,0.85)] transition-all duration-200 hover:-translate-y-0.5">
            <div className="space-y-5">
              <div>
                <label htmlFor="date" className="mb-2.5 block text-base font-semibold tracking-wide text-slate-300">Date & Time</label>
                <input
                  id="date"
                  name="date"
                  type="datetime-local"
                  required
                  value={entryMeta.date}
                  onChange={(e) => setEntryMeta({ date: e.target.value })}
                  className={fieldClass}
                />
                <p className="mt-2 text-sm text-slate-400">Business Date: {getBusinessDate(5, new Date(entryMeta.date))}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="mb-2.5 block text-base font-semibold tracking-wide text-slate-300">Item Name</label>
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

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label htmlFor="buyPrice" className="mb-2.5 block text-sm font-semibold tracking-wide text-slate-300">Buy Price (₹)</label>
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
                    <label htmlFor="sellPrice" className="mb-2.5 block text-sm font-semibold tracking-wide text-slate-300">Sell Price (₹)</label>
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
                    <label htmlFor="quantity" className="mb-2.5 block text-sm font-semibold tracking-wide text-slate-300">Qty</label>
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
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-lime-400 px-5 py-3 text-lg font-semibold text-white shadow-[0_12px_26px_-14px_rgba(74,222,128,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105"
                >
                  <Plus size={20} /> Add Item
                </button>
              </div>
            </div>
          </div>

          <form onSubmit={submitStock} className="glass-panel flex flex-col rounded-2xl border border-white/20 bg-gradient-to-b from-white/[0.08] via-white/[0.04] to-white/[0.02] p-6 shadow-[0_14px_34px_-20px_rgba(0,0,0,0.85)] transition-all duration-200 hover:-translate-y-0.5">
            <h2 className="mb-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">Stock Entry Summary</h2>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/20 bg-white/[0.02] px-4 py-3 text-center text-lg text-slate-300/80 md:text-xl">
                  No stock items added yet
                </div>
              ) : (
                items.map((item, idx) => (
                  <div key={`${item.name}-${idx}`} className="flex-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <div>
                      <div className="text-lg font-medium text-white">{item.name}</div>
                      <div className="text-sm text-muted">Qty {item.quantity}, Buy ₹{item.buyPrice}, Sell ₹{item.sellPrice}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="inline-flex items-center gap-1 text-sm text-danger hover:text-red-300"
                    >
                      <Trash2 size={16} /> Remove
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-base">
              <div className="flex-between"><span className="text-muted">Total Items</span><span className="font-semibold text-white">{items.length}</span></div>
              <div className="flex-between"><span className="text-muted">Total Quantity</span><span className="font-semibold text-white">{summary.totalQty}</span></div>
              <div className="flex-between"><span className="text-muted">Estimated Sell Value</span><span className="font-semibold text-white">₹{summary.estimatedValue}</span></div>
            </div>

            <button
              type="submit"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-lime-400 px-5 py-3 text-lg font-semibold text-white shadow-[0_12px_26px_-14px_rgba(74,222,128,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={addInventory.isPending || items.length === 0}
            >
              {addInventory.isPending ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
              <span>{addInventory.isPending ? 'Saving...' : 'Save Stock Entry'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
