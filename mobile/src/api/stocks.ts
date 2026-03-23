import { apiClient } from "./client";

export interface Quote {
  ticker: string;
  price: number;
  change: number;
  change_percent: number;
  currency: string;
  exchange: string;
}

export interface SearchResult {
  ticker: string;
  name: string;
  exchange: string;
  currency: string;
}

export const stocksApi = {
  quote: (ticker: string) =>
    apiClient.get<Quote>(`/stocks/quote/${ticker}`).then((r) => r.data),

  search: (q: string) =>
    apiClient
      .get<SearchResult[]>("/stocks/search", { params: { q } })
      .then((r) => r.data),
};
