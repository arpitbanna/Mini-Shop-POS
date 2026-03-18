'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInventory, useAddSale } from '@/hooks/useApi';
import { Save, Loader2, CheckCircle, HelpCircle, XCircle } from 'lucide-react';
import { getLocalDatetimeStr } from '@/lib/utils';
import { toast } from 'sonner';

export default function AddSale() {
  const router = useRouter();
  const { data: inventory = [], isLoading: invLoading } = useInventory();
  const addSale = useAddSale();
  
  const [showReceipt, setShowReceipt] = useState(false);
  type LatestSaleItem = { itemName?: string, quantity: number, total: number, amountPaid: number, remaining: number };
  const [latestSale, setLatestSale] = useState<LatestSaleItem | null>(null);

  const [formData, setFormData] = useState({
    itemId: '',
    sellPrice: '',
    quantity: '1',
    roomNo: '',
    amountPaid: '',
    date: getLocalDatetimeStr(),
  });

  const fieldClass = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all';

  const availableInventory = inventory.filter((item) => item.available > 0);
  const selectedItem = availableInventory.find((i) => i.id === formData.itemId);

  const quantityNum = Number(formData.quantity) || 0;
  const sellPriceNum = Number(formData.sellPrice) || 0;
  
  const total = sellPriceNum * quantityNum;
  const buyPrice = selectedItem ? selectedItem.buyPrice : 0;
  const profit = total - (buyPrice * quantityNum);
  const remaining = total - Number(formData.amountPaid || 0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const newFormData = { ...formData, [e.target.name]: e.target.value };
    
    let currentQty = quantityNum;
    let currentPrice = sellPriceNum;

    if (e.target.name === 'itemId') {
      const newlySelected = availableInventory.find((i) => i.id === e.target.value);
      if (newlySelected) {
        newFormData.sellPrice = newlySelected.sellPrice.toString();
        currentPrice = newlySelected.sellPrice;
      }
    } else if (e.target.name === 'quantity') {
      currentQty = Number(e.target.value) || 0;
    } else if (e.target.name === 'sellPrice') {
      currentPrice = Number(e.target.value) || 0;
    }

    if (['itemId', 'quantity', 'sellPrice'].includes(e.target.name)) {
      newFormData.amountPaid = (currentQty * currentPrice).toString();
    }
    
    setFormData(newFormData);
  };

  const setAmountPaid = (amount: number) => {
    setFormData({ ...formData, amountPaid: amount.toString() });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemId) {
      toast.error('Please select an item');
      return;
    }
    if (quantityNum > (selectedItem?.available || 0)) {
       toast.error(`Only ${selectedItem?.available} items available in stock`);
       return;
    }

    addSale.mutate(
      {
        itemId: formData.itemId,
        sellPrice: sellPriceNum,
        quantity: quantityNum,
        roomNo: Number(formData.roomNo),
        amountPaid: Number(formData.amountPaid || 0),
        date: new Date(formData.date).toISOString()
      },
      {
        onSuccess: () => {
          setLatestSale({
            itemName: selectedItem?.name,
            quantity: quantityNum,
            total,
            amountPaid: Number(formData.amountPaid || 0),
            remaining: Math.max(0, remaining),
          });
          setShowReceipt(true);
        }
      }
    );
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    router.push('/payments');
  };

  const handleNewSale = () => {
    setShowReceipt(false);
    setFormData({
      itemId: '',
      sellPrice: '',
      quantity: '1',
      roomNo: '',
      amountPaid: '',
      date: getLocalDatetimeStr(),
    });
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 px-4">
      <h1 className="mb-6 text-xl font-semibold tracking-tight text-center">Record a Sale</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
        <div className="glass-panel relative overflow-hidden group border-white/10 hover:border-white/20 transition-all duration-200">
          <div className="absolute -left-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-colors"></div>
          
          <form onSubmit={handleSubmit} id="sale-form" className="relative z-10 space-y-6">
            <div>
              <label htmlFor="itemId" className="text-sm text-gray-400 mb-2 block">Select Item</label>
              <select 
                id="itemId"
                name="itemId" 
                required 
                value={formData.itemId}
                onChange={handleChange}
                className={fieldClass}
                disabled={invLoading}
              >
                <option value="" disabled>-- {invLoading ? 'Loading Inventory...' : 'Select an item'} --</option>
                {availableInventory.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.available} in stock)
                  </option>
                ))}
              </select>
            </div>

            {selectedItem && (
               <div className="text-success bg-success/10 px-3 py-2 rounded-lg border border-success/20 inline-block text-xs font-semibold uppercase tracking-wider">
                 Cost Price: ₹{selectedItem.buyPrice} / unit
               </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="sellPrice" className="text-sm text-gray-400 mb-2 block">Selling Price (₹)</label>
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
                <label htmlFor="quantity" className="text-sm text-gray-400 mb-2 block">Quantity</label>
                <input 
                  id="quantity"
                  name="quantity" 
                  type="number" 
                  min="1" 
                  max={selectedItem?.available || undefined}
                  required 
                  placeholder="1"
                  value={formData.quantity}
                  onChange={handleChange}
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="roomNo" className="text-sm text-gray-400 mb-2 block">Room No/Name (Optional)</label>
                <input 
                  id="roomNo"
                  name="roomNo" 
                  type="text" 
                  placeholder="e.g. 306 or Room A"
                  value={formData.roomNo}
                  onChange={handleChange}
                  className={fieldClass}
                />
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
            </div>

            <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-md transition-all duration-200">
              <label className="text-sm text-gray-400 font-semibold mb-3 border-b border-white/10 pb-2 block">Quick Payment Options</label>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <button 
                  type="button" 
                  className="flex flex-col items-center justify-center gap-1 bg-success/10 hover:bg-success/20 border border-success/30 text-success py-2 rounded-xl transition-all hover:scale-105 hover:shadow-lg active:scale-95" 
                  onClick={() => setAmountPaid(total)}
                >
                  <CheckCircle size={18} />
                  <span className="text-xs font-bold">Paid Full</span>
                </button>
                <button 
                  type="button" 
                  className="flex flex-col items-center justify-center gap-1 bg-warning/10 hover:bg-warning/20 border border-warning/30 text-warning py-2 rounded-xl transition-all hover:scale-105 hover:shadow-lg active:scale-95"
                  onClick={() => setAmountPaid(total / 2)}
                >
                  <HelpCircle size={18} />
                  <span className="text-xs font-bold font-sans">Half</span>
                </button>
                <button 
                  type="button" 
                  className="flex flex-col items-center justify-center gap-1 bg-danger/10 hover:bg-danger/20 border border-danger/30 text-danger py-2 rounded-xl transition-all hover:scale-105 hover:shadow-lg active:scale-95"
                  onClick={() => setAmountPaid(0)}
                >
                  <XCircle size={18} />
                  <span className="text-xs font-bold font-sans">Udhaar</span>
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="amountPaid" className="text-sm text-gray-400 mb-2 block">Amount Paid By Customer (₹)</label>
              <input 
                id="amountPaid"
                name="amountPaid" 
                type="number" 
                min="0"
                step="0.01" 
                required 
                value={formData.amountPaid}
                onChange={handleChange}
                className={`${fieldClass} border-primary/50 bg-primary/5 text-xl font-bold`}
              />
            </div>
          </form>
        </div>

        {/* Live Calculation Panel */}
        <div className="glass-panel flex flex-col h-fit sticky top-24 border-primary/20 shadow-[0_0_30px_rgba(59,130,246,0.1)] transition-all duration-200">
          <h2 className="mb-6 pb-4 border-b border-white/10 flex items-center gap-2 text-xl font-semibold">
             Transaction Summary
          </h2>
          
          <div className="flex-between mb-4">
            <span className="text-sm text-gray-400 font-medium">Total Value:</span>
            <span className="text-3xl font-bold">₹{total}</span>
          </div>
          
          <div className="flex-between mb-4">
            <span className="text-sm text-gray-400 font-medium">Amount Paid:</span>
            <span className="text-success text-xl font-bold">
              ₹{formData.amountPaid || '0'}
            </span>
          </div>

          <div className="flex-between mb-6 pb-6 border-b border-white/10">
            <span className="text-sm text-gray-400 font-medium">Remaining (Udhaar):</span>
            <div className="text-right">
              <span className={`text-xl font-bold ${remaining > 0 ? 'text-danger' : 'text-success'}`}>
                ₹{Math.max(0, remaining)}
              </span>
              {remaining > 0 && <div className="text-xs text-danger mt-1 font-medium">Pending Balance</div>}
            </div>
          </div>

          <div className="flex-between mb-8 bg-white/5 p-4 rounded-xl border border-white/5 shadow-inner">
            <span className="text-sm text-gray-400 font-medium">Estimated Profit:</span>
            <span className="text-green-400 text-xl font-bold">
              +₹{profit}
            </span>
          </div>

          <button 
            type="submit" 
            form="sale-form"
            className="btn w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none" 
            disabled={addSale.isPending}
          >
            {addSale.isPending ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            <span>{addSale.isPending ? 'Processing...' : 'Confirm Sale'}</span>
          </button>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && latestSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="glass-panel max-w-sm w-full p-6 flex flex-col relative shadow-2xl border-white/20 scale-in-center overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-success/50 to-success"></div>
            
            <div className="text-center mb-6 mt-2">
              <div className="bg-success/20 p-3 rounded-full w-fit mx-auto mb-3 border border-success/30">
                <CheckCircle size={32} className="text-success" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Sale Successful!</h2>
              <p className="text-sm text-muted font-medium tracking-wide uppercase">Receipt Generated</p>
            </div>

            <div className="bg-white/5 rounded-xl border border-white/10 p-5 mb-6 shadow-inner">
              <div className="flex-between border-b border-white/10 pb-3 mb-3">
                <span className="text-sm text-muted">Item</span>
                <span className="font-semibold text-right">{latestSale.itemName} <span className="text-muted font-normal text-xs ml-1 bg-white/10 px-1.5 py-0.5 rounded">x{latestSale.quantity}</span></span>
              </div>
              <div className="flex-between mb-2">
                <span className="text-sm text-muted">Total Amount</span>
                <span className="font-semibold">₹{latestSale.total}</span>
              </div>
              <div className="flex-between mb-2">
                <span className="text-sm text-muted">Amount Paid</span>
                <span className="font-semibold text-success">₹{latestSale.amountPaid}</span>
              </div>
              <div className="flex-between border-t border-white/10 pt-3 mt-3">
                <span className="text-sm font-semibold uppercase tracking-wider">Remaining</span>
                <span className={`font-bold ${latestSale.remaining > 0 ? 'text-danger' : 'text-success'}`}>₹{latestSale.remaining}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleNewSale} className="flex-1 btn btn-outline py-3 border-white/20 hover:bg-white/10 text-sm">
                New Sale
              </button>
              <button onClick={handleCloseReceipt} className="flex-1 btn py-3 shadow-lg shadow-primary/20 text-sm">
                Done & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
