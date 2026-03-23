import { apiClient } from "./client";

export interface HoldingRecord {
  id: number;
  ticker: string;
  company_name: string;
  market: "US" | "NSE";
  currency: "USD" | "INR";
  original_cost: number;
  avg_cost: number;
  quantity: number;
  purchase_date: string;   // ISO date "YYYY-MM-DD"
  threshold_pct: number;
  threshold_profit_price: number;
  status: string;
  created_at: string;
}

export interface CreateHoldingPayload {
  ticker: string;
  company_name: string;
  market: "US" | "NSE";
  currency: "USD" | "INR";
  original_cost: number;
  quantity: number;
  purchase_date: string;   // "YYYY-MM-DD"
  threshold_pct: number;
}

export const holdingsApi = {
  list: () =>
    apiClient.get<HoldingRecord[]>("/holdings/").then((r) => r.data),

  create: (payload: CreateHoldingPayload) =>
    apiClient.post<HoldingRecord>("/holdings/", payload).then((r) => r.data),

  delete: (id: number) => apiClient.delete(`/holdings/${id}`),
};
