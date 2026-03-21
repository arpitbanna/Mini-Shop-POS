export interface InventoryItem {
  id: string;
  name: string;
  buyPrice: number;
  sellPrice: number;
  quantityIn: number;
  quantityOut: number;
  available: number;
  dateAdded: string;
}

export interface SaleTransactionItem {
  productId: string;
  name: string;
  quantity: number;
  sellingPrice: number;
  costPrice: number;
  total: number;
}

export interface SaleItem {
  id: string;
  roomNo: string;
  createdAt: string;
  businessDate: string;
  items: SaleTransactionItem[];
  totalAmount: number;
  profit: number;
  amountPaid: number;
  remaining: number;
}

export interface PurchaseItem {
  id: string;
  name: string;
  amount: number;
  date: string;
}

export interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
  date: string;
}

export interface AddSalePayload {
  createdAt: string;
  businessDate: string;
  roomNo: string;
  items: Array<{
    productId: string;
    quantity: number;
    sellingPrice: number;
    costPrice: number;
    name: string;
  }>;
  amountPaid: number;
}

export interface UpdatePaymentPayload {
  id: string;
  amountPaid: number;
}

export interface StockEntryItemPayload {
  name: string;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
}

export interface AddStockPayload {
  createdAt: string;
  businessDate: string;
  items: StockEntryItemPayload[];
}

export interface AddNamedAmountPayload {
  name: string;
  amount: number;
  date: string;
}

export interface InventoryUpdatePayload {
  id: string;
  name?: string;
  buyPrice?: number;
  sellPrice?: number;
  quantityIn?: number;
}

export interface ApiSuccessResponse {
  success: true;
  id?: string;
}

export interface ApiErrorResponse {
  error: string;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string; // Stored as HTML string
  createdAt: string;
  updatedAt: string;
}
