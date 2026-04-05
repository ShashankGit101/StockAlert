import { getAuthenticatedClient } from "./client";

export interface Stock {
  id: number;
  ticker: string;
  company_name: string;
  market: string;
  currency: string;
  original_cost: number;
  avg_cost: number;
  quantity: number;
  purchase_date: string;
  threshold_pct: number;
  threshold_profit_price: number;
  status: string;
  created_at: string;
  // live data
  current_price: number | null;
  daily_change: number | null;
  daily_change_pct: number | null;
  profit_pct: number | null;
  zone: string | null;
  current_rung_pct: number | null;
}

export interface CreateStockPayload {
  ticker: string;
  company_name: string;
  market: string;
  currency: string;
  buy_price: number;
  quantity: number;
  purchase_date: string;
  threshold_pct: number;
}

export interface BuyPayload {
  shares: number;
  price: number;
  source?: string;
}

export interface SellPayload {
  sell_type: "full" | "partial";
  shares?: number;
  price: number;
  source?: string;
}

export interface PricePoint {
  date: string;
  close: number;
}

export const stocksApi = {
  list: () => getAuthenticatedClient().get<Stock[]>("/stocks/").then((r) => r.data),

  get: (id: number) =>
    getAuthenticatedClient().get<Stock>(`/stocks/${id}`).then((r) => r.data),

  create: (payload: CreateStockPayload) =>
    getAuthenticatedClient().post<Stock>("/stocks/", payload).then((r) => r.data),
   // getAuthenticatedClient().post<Stock>("/portfolio/", payload).then((r) => r.data),

  //delete: (id: number) => getAuthenticatedClient().delete(`/stocks/${id}`), //Shashank
  //delete: (id: number) => getAuthenticatedClient().delete(`/portfolio/${id}`).then((r) => r.data),
    delete: (id: number) => getAuthenticatedClient().delete(`/stocks/${id}`).then((r) => r.data),

  buy: (id: number, payload: BuyPayload) =>
    getAuthenticatedClient().post(`/stocks/${id}/buy`, payload).then((r) => r.data),

  sell: (id: number, payload: SellPayload) =>
    getAuthenticatedClient().post(`/stocks/${id}/sell`, payload).then((r) => r.data),

  history: (id: number) =>
    getAuthenticatedClient()
      .get<{ ticker: string; history: PricePoint[] }>(`/stocks/${id}/history`)
      .then((r) => r.data),

};
