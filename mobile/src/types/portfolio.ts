export type Exchange = "NYSE" | "NASDAQ" | "NSE";
export type Currency = "USD" | "INR";

export interface Holding {
  ticker: string;
  name: string;
  exchange: Exchange;
  currency: Currency;
  shares: number;
  avg_cost: number;       // price paid per share
  current_price: number;
  daily_change: number;
  daily_change_pct: number;
  // computed
  total_cost: number;
  total_value: number;
  profit: number;
  profit_pct: number;
  // ladder
  ladder_rung: number;    // current rung relative to avg_cost (can be negative)
  ladder_step_pp: number; // step size in percentage points, e.g. 2
  has_active_alert: boolean;
  alert_triggered: boolean;
  alert_triggered_at?: string;
}

export interface BuyPayload {
  ticker: string;
  name: string;
  exchange: Exchange;
  shares: number;
  price_per_share: number;
}

export interface SellPayload {
  ticker: string;
  shares: number;         // 0 = full sell
  price_per_share: number;
}

export interface HoldPayload {
  ticker: string;
}
