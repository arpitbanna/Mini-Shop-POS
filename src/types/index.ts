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

export interface SaleItem {
  id: string;
  itemId: string;
  itemName: string;
  date: string;
  sellPrice: number;
  buyPrice: number;
  quantity: number;
  total: number;
  profit: number;
  roomNo: number;
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
  itemId: string;
  sellPrice: number;
  quantity: number;
  roomNo: number;
  amountPaid: number;
  date: string;
}

export interface UpdatePaymentPayload {
  id: string;
  amountPaid: number;
}

export interface AddStockPayload {
  name: string;
  buyPrice: string | number;
  sellPrice: string | number;
  quantity: string | number;
  date: string;
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
