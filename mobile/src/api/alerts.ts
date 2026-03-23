import { apiClient } from "./client";

export type AlertDirection = "above" | "below";
export type AlertStatus = "active" | "triggered" | "cancelled";

export interface Alert {
  id: number;
  ticker: string;
  target_price: number;
  direction: AlertDirection;
  status: AlertStatus;
  created_at?: string;
  triggered_at?: string;
}

export interface CreateAlertPayload {
  ticker: string;
  direction: AlertDirection;
  target_price: number;
}

export const alertsApi = {
  list: () => apiClient.get<Alert[]>("/alerts/").then((r) => r.data),

  create: (payload: CreateAlertPayload) =>
    apiClient.post<Alert>("/alerts/", payload).then((r) => r.data),

  delete: (id: number) => apiClient.delete(`/alerts/${id}`),
};
