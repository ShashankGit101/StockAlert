import { apiClient } from "./client";

export type AlertType =
  | "threshold"
  | "profit_up"
  | "profit_down"
  | "loss"
  | "recovery"
  | "breakeven";

export type UserAction = "hold" | "buy_more" | "sell_full" | "sell_partial";

export interface AlertHistory {
  id: number;
  stock_id: number;
  ticker: string;
  company_name: string;
  alert_type: AlertType;
  rung_pct: number | null;
  closing_price: number | null;
  profit_pct: number | null;
  user_action: UserAction | null;
  action_taken_at: string | null;
  is_actionable: boolean;
  triggered_at: string;
}

export const alertsApi = {
  list: () => apiClient.get<AlertHistory[]>("/alerts").then((r) => r.data),

  get: (id: number) =>
    apiClient.get<AlertHistory>(`/alerts/${id}`).then((r) => r.data),

  action: (id: number, action: UserAction) =>
    apiClient.put(`/alerts/${id}/action`, { action }).then((r) => r.data),
};
