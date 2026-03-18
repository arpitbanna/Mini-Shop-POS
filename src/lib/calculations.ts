import type { SaleItem, SaleTransactionItem } from '@/types';

export function calculateAvailableQuantity(quantityIn: number, quantityOut: number): number {
  return quantityIn - quantityOut;
}

export function calculateSaleTotals(
  sellPrice: number,
  buyPrice: number,
  quantity: number,
  amountPaid: number,
) {
  const total = sellPrice * quantity;
  const profit = calculateProfit(sellPrice, buyPrice, quantity);
  const remaining = Math.max(0, total - amountPaid);

  return { total, profit, remaining };
}

export function calculateProfit(sellingPrice: number, costPrice: number, quantity: number): number {
  return (sellingPrice - costPrice) * quantity;
}

export function calculateTransactionProfit(items: SaleTransactionItem[]): number {
  return items.reduce(
    (sum, item) => sum + calculateProfit(item.sellingPrice, item.costPrice, item.quantity),
    0,
  );
}

export function calculatePurseBalance(
  totalRevenue: number,
  totalPurchase: number,
  totalExpenses: number,
): number {
  return totalRevenue - totalPurchase - totalExpenses;
}

export function sumRevenue(sales: SaleItem[]): number {
  return sales.filter(sale => sale.remaining === 0).reduce((acc, sale) => acc + sale.totalAmount, 0);
}

export function sumProfit(sales: SaleItem[]): number {
  return sales.filter(sale => sale.remaining === 0).reduce((acc, sale) => acc + sale.profit, 0);
}

export function sumPendingAmount(sales: SaleItem[]): number {
  return sales.reduce((acc, sale) => acc + Math.max(0, sale.remaining), 0);
}

export function sumAmountReceived(sales: SaleItem[]): number {
  return sales.reduce((acc, sale) => acc + sale.amountPaid, 0);
}

export function sumItemsSold(sales: SaleItem[]): number {
  return sales.reduce(
    (acc, sale) => acc + sale.items.reduce((itemCount, item) => itemCount + item.quantity, 0),
    0,
  );
}
