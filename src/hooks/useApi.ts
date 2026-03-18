import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store';
import {
  InventoryItem,
  SaleItem,
  PurchaseItem,
  ExpenseItem,
  AddSalePayload,
  UpdatePaymentPayload,
  AddNamedAmountPayload,
  AddStockPayload,
  InventoryUpdatePayload,
  ApiSuccessResponse,
  ApiErrorResponse,
} from '@/types';
import { queryConfig, queryKeys } from '@/config/queryKeys';
import { toast } from 'sonner';

// MOCK DATA for Guest Mode
const MOCK_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Maggi', buyPrice: 10, sellPrice: 15, quantityIn: 100, quantityOut: 20, available: 80, dateAdded: new Date().toISOString() },
  { id: '2', name: 'Coke 250ml', buyPrice: 15, sellPrice: 20, quantityIn: 50, quantityOut: 48, available: 2, dateAdded: new Date().toISOString() },
  { id: '3', name: 'Lays Magic Masala', buyPrice: 8, sellPrice: 10, quantityIn: 30, quantityOut: 30, available: 0, dateAdded: new Date().toISOString() },
];

const MOCK_SALES: SaleItem[] = [
  { id: 's1', itemId: '1', itemName: 'Maggi', date: new Date().toISOString(), sellPrice: 15, buyPrice: 10, quantity: 2, total: 30, profit: 10, roomNo: 101, amountPaid: 30, remaining: 0 },
  { id: 's2', itemId: '2', itemName: 'Coke 250ml', date: new Date().toISOString(), sellPrice: 20, buyPrice: 15, quantity: 1, total: 20, profit: 5, roomNo: 102, amountPaid: 10, remaining: 10 },
  { id: 's3', itemId: '3', itemName: 'Lays Magic Masala', date: new Date().toISOString(), sellPrice: 10, buyPrice: 8, quantity: 5, total: 50, profit: 10, roomNo: 204, amountPaid: 0, remaining: 50 },
];

const MOCK_PURCHASES: PurchaseItem[] = [
  { id: 'p1', name: 'Restock Snacks', amount: 500, date: new Date().toISOString() }
];

const MOCK_EXPENSES: ExpenseItem[] = [
  { id: 'e1', name: 'Cleaning Supplies', amount: 150, date: new Date().toISOString() }
];

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const errorBody = (await res.json().catch(() => null)) as ApiErrorResponse | null;
    throw new Error(errorBody?.error || 'Request failed');
  }
  return (await res.json()) as T;
}

export function useSales() {
  const { isGuest } = useAuthStore();
  const mode = isGuest ? 'guest' : 'live';

  return useQuery<SaleItem[]>({
    queryKey: [...queryKeys.sales.all, mode],
    queryFn: () => (isGuest ? Promise.resolve(MOCK_SALES) : fetcher<SaleItem[]>('/api/sales')),
    staleTime: queryConfig.staleTimeMs,
    refetchOnWindowFocus: queryConfig.refetchOnWindowFocus,
  });
}

export function useInventory() {
  const { isGuest } = useAuthStore();
  const mode = isGuest ? 'guest' : 'live';

  return useQuery<InventoryItem[]>({
    queryKey: [...queryKeys.inventory.all, mode],
    queryFn: () => (isGuest ? Promise.resolve(MOCK_INVENTORY) : fetcher<InventoryItem[]>('/api/inventory')),
    staleTime: queryConfig.staleTimeMs,
    refetchOnWindowFocus: queryConfig.refetchOnWindowFocus,
  });
}

export function usePurchases() {
  const { isGuest } = useAuthStore();
  const mode = isGuest ? 'guest' : 'live';

  return useQuery<PurchaseItem[]>({
    queryKey: [...queryKeys.purchases.all, mode],
    queryFn: () => (isGuest ? Promise.resolve(MOCK_PURCHASES) : fetcher<PurchaseItem[]>('/api/purchases')),
    staleTime: queryConfig.staleTimeMs,
    refetchOnWindowFocus: queryConfig.refetchOnWindowFocus,
  });
}

export function useExpenses() {
  const { isGuest } = useAuthStore();
  const mode = isGuest ? 'guest' : 'live';

  return useQuery<ExpenseItem[]>({
    queryKey: [...queryKeys.expenses.all, mode],
    queryFn: () => (isGuest ? Promise.resolve(MOCK_EXPENSES) : fetcher<ExpenseItem[]>('/api/expenses')),
    staleTime: queryConfig.staleTimeMs,
    refetchOnWindowFocus: queryConfig.refetchOnWindowFocus,
  });
}

export function useAddSale() {
  const { isGuest } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleData: AddSalePayload) => {
      if (isGuest) {
        toast.info('Guest Mode: Action simulated.');
        return Promise.resolve({ success: true, id: 'guest-id' } as ApiSuccessResponse);
      }
      const res = await fetch('/api/stock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData),
      });
      if (!res.ok) {
        const errorBody = (await res.json().catch(() => null)) as ApiErrorResponse | null;
        throw new Error(errorBody?.error || 'Failed to add sale');
      }
      return (await res.json()) as ApiSuccessResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to save sale');
    },
  });
}

export function useUpdatePayment() {
  const { isGuest } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, amountPaid }: UpdatePaymentPayload) => {
      if (isGuest) {
        toast.info('Guest Mode: Action simulated.');
        return Promise.resolve();
      }
      const res = await fetch('/api/stock-out', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, amountPaid }),
      });
      if (!res.ok) {
        const errorBody = (await res.json().catch(() => null)) as ApiErrorResponse | null;
        throw new Error(errorBody?.error || 'Failed to update payment');
      }
      return (await res.json()) as ApiSuccessResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.all });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to update payment');
    },
  });
}

export function useAddExpense() {
  const { isGuest } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddNamedAmountPayload) => {
      if (isGuest) {
        toast.info('Guest Mode: Action simulated.');
        return Promise.resolve({ success: true } as ApiSuccessResponse);
      }
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorBody = (await res.json().catch(() => null)) as ApiErrorResponse | null;
        throw new Error(errorBody?.error || 'Failed to add expense');
      }
      return (await res.json()) as ApiSuccessResponse;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all }),
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to add expense');
    },
  });
}

export function useAddPurchase() {
  const { isGuest } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddNamedAmountPayload) => {
      if (isGuest) {
        toast.info('Guest Mode: Action simulated.');
        return Promise.resolve({ success: true } as ApiSuccessResponse);
      }
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorBody = (await res.json().catch(() => null)) as ApiErrorResponse | null;
        throw new Error(errorBody?.error || 'Failed to add purchase');
      }
      return (await res.json()) as ApiSuccessResponse;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all }),
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to add purchase');
    },
  });
}

export function useAddInventory() {
  const { isGuest } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddStockPayload) => {
      if (isGuest) {
        toast.info('Guest Mode: Action simulated.');
        return Promise.resolve({ success: true } as ApiSuccessResponse);
      }
      const res = await fetch('/api/stock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorBody = (await res.json().catch(() => null)) as ApiErrorResponse | null;
        throw new Error(errorBody?.error || 'Failed to add inventory');
      }
      return (await res.json()) as ApiSuccessResponse;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to add stock');
    },
  });
}

export function useUpdateInventory() {
  const { isGuest } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InventoryUpdatePayload) => {
      if (isGuest) {
        toast.info('Guest Mode: Action simulated.');
        return Promise.resolve();
      }
      const res = await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorBody = (await res.json().catch(() => null)) as ApiErrorResponse | null;
        throw new Error(errorBody?.error || 'Failed to update inventory');
      }
      return (await res.json()) as ApiSuccessResponse;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to update inventory');
    },
  });
}

export function useDeleteInventory() {
  const { isGuest } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isGuest) {
        toast.info('Guest Mode: Action simulated.');
        return Promise.resolve();
      }
      const res = await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorBody = (await res.json().catch(() => null)) as ApiErrorResponse | null;
        throw new Error(errorBody?.error || 'Failed to delete item');
      }
      return (await res.json()) as ApiSuccessResponse;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to delete inventory item');
    },
  });
}
