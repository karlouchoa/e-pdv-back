export interface CashierReportPermissions {
  canViewSensitiveTotals: boolean;
  restrictedColumnsHidden: boolean;
}

export interface CashierReportMeta {
  tenant: string;
  companyId: number;
  companyName: string;
  cashierId: number;
  cashierUserCode: string;
  openedAt: Date | null;
  closedAt: Date | null;
  generatedAt: Date;
  referenceDate: Date;
  monthStart: Date;
  monthEnd: Date;
}

export interface CashierSyntheticRow {
  cdtpg: number;
  paymentType: string;
  totalCashier: number;
  totalUntilPreviousDay: number | null;
  totalToday: number;
  totalAccumulated: number | null;
}

export interface CashierSyntheticFooter {
  sumTotalCashier: number;
  sumTotalUntilPreviousDay: number | null;
  sumTotalToday: number;
  sumTotalAccumulated: number | null;
  openingBalance: number;
  withdrawalsTotal: number;
  suppliesTotal: number;
  cashSalesTotal: number;
  cashInDrawerTotal: number;
  totalSales: number;
  closingBalance: number;
}

export interface CashierSyntheticReportData {
  meta: CashierReportMeta;
  permissions: CashierReportPermissions;
  rows: CashierSyntheticRow[];
  footer: CashierSyntheticFooter;
}

export interface CashierAnalyticPaymentRow {
  cdtpg: number;
  paymentType: string;
  value: number;
}

export interface CashierAnalyticOrderRow {
  nrven: number;
  saleId: string | null;
  issuedAt: Date | null;
  saleHour: string | null;
  customerName: string | null;
  totalSale: number;
  totalPaid: number;
  payments: CashierAnalyticPaymentRow[];
}

export interface CashierAnalyticSummary {
  ordersCount: number;
  totalSale: number;
  totalPaid: number;
}

export interface CashierAnalyticReportData {
  meta: CashierReportMeta;
  summary: CashierAnalyticSummary;
  orders: CashierAnalyticOrderRow[];
}
