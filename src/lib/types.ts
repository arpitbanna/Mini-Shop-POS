export interface InventoryItem {
  id: string; // Notion page ID
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
  itemId: string; // Relation to Stock In
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
