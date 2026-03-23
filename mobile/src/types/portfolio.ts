export type Exchange = "NYSE" | "NASDAQ" | "NSE";
export type Currency = "USD" | "INR";

export interface Holding {
  // from DB
  id: number;
  ticker: string;
  name: string;           // company_name
  exchange: Exchange;
  currency: Currency;
  quantity: number;
  original_cost: number;  // purchase price per share, never changes
  avg_cost: number;       // may change on buy-more
  purchase_date: string;
  threshold_pct: number;
  threshold_profit_price: number;
  // live quote enrichment
  current_price: number;
  daily_change: number;
  daily_change_pct: number;
  // computed
  total_cost: number;     // avg_cost * quantity
  total_value: number;    // current_price * quantity
  profit: number;         // total_value - total_cost
  profit_pct: number;     // (profit / total_cost) * 100
  // ladder
  ladder_rung: number;
  ladder_step_pp: number;
  // alert state
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
