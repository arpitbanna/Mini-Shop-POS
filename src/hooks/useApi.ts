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
import { getBusinessDate } from '@/lib/business-day';

// MOCK DATA for Guest Mode
const MOCK_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Maggi', buyPrice: 10, sellPrice: 15, quantityIn: 100, quantityOut: 20, available: 80, dateAdded: new Date().toISOString() },
  { id: '2', name: 'Coke 250ml', buyPrice: 15, sellPrice: 20, quantityIn: 50, quantityOut: 48, available: 2, dateAdded: new Date().toISOString() },
  { id: '3', name: 'Lays Magic Masala', buyPrice: 8, sellPrice: 10, quantityIn: 30, quantityOut: 30, available: 0, dateAdded: new Date().toISOString() },
];

const MOCK_SALES: SaleItem[] = [
  {
    id: 's1',
    roomNo: '101',
    createdAt: new Date().toISOString(),
    businessDate: getBusinessDate(),
    items: [
      { productId: '1', name: 'Maggi', quantity: 2, sellingPrice: 15, costPrice: 10, total: 30 },
    ],
    totalAmount: 30,
    profit: 10,
    amountPaid: 30,
    remaining: 0,
  },
  {
    id: 's2',
    roomNo: '102',
    createdAt: new Date().toISOString(),
    businessDate: getBusinessDate(),
    items: [
      { productId: '2', name: 'Coke 250ml', quantity: 1, sellingPrice: 20, costPrice: 15, total: 20 },
    ],
    totalAmount: 20,
    profit: 5,
    amountPaid: 10,
    remaining: 10,
  },
  {
    id: 's3',
    roomNo: '204',
    createdAt: new Date().toISOString(),
    businessDate: getBusinessDate(),
    items: [
      { productId: '3', name: 'Lays Magic Masala', quantity: 5, sellingPrice: 10, costPrice: 8, total: 50 },
    ],
    totalAmount: 50,
    profit: 10,
    amountPaid: 0,
    remaining: 50,
  },
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
    const errorBody = (await res.json().catch(() => null));
    throw new Error(errorBody?.message || errorBody?.error || 'Request failed');
  }
  const json = await res.json();
  if (json.success !== undefined && json.data !== undefined) {
    return json.data as T;
  }
  return json as T;
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

export interface PaginatedSalesResponse {
  data: SaleItem[];
  total: number;
  page: number;
  totalPages: number;
  totals: {
    totalBill: number;
    totalProfit: number;
    outstanding: number;
  };
}

export function usePaginatedSales(page: number, limit: number, filter: string, dateFilter: string) {
  const { isGuest } = useAuthStore();
  const mode = isGuest ? 'guest' : 'live';

  return useQuery<PaginatedSalesResponse>({
    queryKey: [...queryKeys.sales.all, mode, 'paginated', page, limit, filter, dateFilter],
    queryFn: async () => {
      if (isGuest) {
        const totals = { totalBill: 0, totalProfit: 0, outstanding: 0 };
        return { data: MOCK_SALES, total: MOCK_SALES.length, page: 1, totalPages: 1, totals };
      }
      return fetcher<PaginatedSalesResponse>(`/api/sales?page=${page}&limit=${limit}&filter=${filter}&dateFilter=${dateFilter}`);
    },
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

export interface HistoryItem {
  id: string;
  type: 'Stock In' | 'Sale' | 'Purchase' | 'Expense';
  title: string;
  amount: number;
  date: string;
  extraInfo: string;
}

export function useHistory() {
  const { isGuest } = useAuthStore();
  const mode = isGuest ? 'guest' : 'live';

  return useQuery<HistoryItem[]>({
    queryKey: ['history', mode],
    queryFn: async () => {
      if (isGuest) {
        return Promise.resolve([]);
      }
      return fetcher<HistoryItem[]>('/api/history');
    },
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
        const errorBody = (await res.json().catch(() => null));
        throw new Error(errorBody?.message || errorBody?.error || 'Failed to add sale');
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
        const errorBody = (await res.json().catch(() => null));
        throw new Error(errorBody?.message || errorBody?.error || 'Failed to update payment');
      }
      const json = await res.json();
      return (json.data || json) as ApiSuccessResponse;
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
        const errorBody = (await res.json().catch(() => null));
        throw new Error(errorBody?.message || errorBody?.error || 'Failed to add expense');
      }
      const json = await res.json();
      return (json.data || json) as ApiSuccessResponse;
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
        const errorBody = (await res.json().catch(() => null));
        throw new Error(errorBody?.message || errorBody?.error || 'Failed to add purchase');
      }
      const json = await res.json();
      return (json.data || json) as ApiSuccessResponse;
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
        const errorBody = (await res.json().catch(() => null));
        throw new Error(errorBody?.message || errorBody?.error || 'Failed to add inventory');
      }
      const json = await res.json();
      return (json.data || json) as ApiSuccessResponse;
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
        const errorBody = (await res.json().catch(() => null));
        throw new Error(errorBody?.message || errorBody?.error || 'Failed to update inventory');
      }
      const json = await res.json();
      return (json.data || json) as ApiSuccessResponse;
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
        const errorBody = (await res.json().catch(() => null));
        throw new Error(errorBody?.message || errorBody?.error || 'Failed to delete item');
      }
      const json = await res.json();
      return (json.data || json) as ApiSuccessResponse;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to delete inventory item');
    },
  });
}

export function useDeleteOutOfStockInventory() {
  const { isGuest } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (isGuest) {
        toast.info('Guest Mode: Action simulated.');
        return Promise.resolve({ success: true, deletedCount: 0 });
      }
      const res = await fetch('/api/inventory?mode=out-of-stock', { method: 'DELETE' });
      if (!res.ok) {
        const errorBody = (await res.json().catch(() => null));
        throw new Error(errorBody?.message || errorBody?.error || 'Failed to delete out-of-stock items');
      }
      const json = await res.json();
      return (json.data ? { ...json, ...json.data } : json) as ApiSuccessResponse & { deletedCount?: number };
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.inventory.all });
      const previousInventory = queryClient.getQueriesData<InventoryItem[]>({ queryKey: queryKeys.inventory.all });

      queryClient.setQueriesData<InventoryItem[]>({ queryKey: queryKeys.inventory.all }, (current) => {
        if (!current) return current;
        return current.filter((item) => item.available > 0);
      });

      return { previousInventory };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      const deletedCount = data.deletedCount || 0;
      toast.success(
        deletedCount > 0
          ? `${deletedCount} out-of-stock item${deletedCount > 1 ? 's' : ''} deleted`
          : 'No out-of-stock items to delete',
      );
    },
    onError: (error: unknown, _variables, context) => {
      context?.previousInventory?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast.error(error instanceof Error ? error.message : 'Unable to delete out-of-stock items');
    },
  });
}
