import { apiClient } from "./client";

export interface MarketSearchResult {
  ticker: string;
  name: string;
  exchange: string;
  currency: string;
  current_price: number | null;
}

export interface MarketPrice {
  ticker: string;
  price: number;
  change: number;
  change_percent: number;
  currency: string;
  exchange: string;
}

export const marketApi = {
  search: (q: string, market: "US" | "NSE") =>
    apiClient
      .get<MarketSearchResult[]>("/market/search", { params: { q, market } })
      .then((r) => r.data),

  price: (ticker: string) =>
    apiClient.get<MarketPrice>(`/market/price/${ticker}`).then((r) => r.data),
};
