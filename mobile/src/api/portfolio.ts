import { apiClient } from "./client";
import type { BuyPayload, SellPayload } from "@/types/portfolio";

export interface BuyRecord {
  id: number;
  ticker: string;
  shares: number;
  price_per_share: number;
  total_amount: number;
  purchased_at: string;
}

export interface SellRecord {
  id: number;
  ticker: string;
  shares: number;
  price_per_share: number;
  total_amount: number;
  sold_at: string;
}

export const portfolioApi = {
  buyHistory: () =>
    apiClient.get<BuyRecord[]>("/portfolio/buy-history").then((r) => r.data),

  sellHistory: () =>
    apiClient.get<SellRecord[]>("/portfolio/sell-history").then((r) => r.data),

  buy: (payload: BuyPayload) =>
    apiClient.post<BuyRecord>("/portfolio/buy", {
      ticker: payload.ticker,
      shares: payload.shares,
      price_per_share: payload.price_per_share,
      total_amount: payload.shares * payload.price_per_share,
    }).then((r) => r.data),

  sell: (payload: SellPayload) =>
    apiClient.post<SellRecord>("/portfolio/sell", {
      ticker: payload.ticker,
      shares: payload.shares,
      price_per_share: payload.price_per_share,
      total_amount: payload.shares * payload.price_per_share,
    }).then((r) => r.data),
};
