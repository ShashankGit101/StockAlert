import { apiClient } from "./client";

export type AlertDirection = "above" | "below";

export interface Alert {
  id: number;
  ticker: string;
  target_price: number;
  direction: AlertDirection;
  status: string;
}

export const alertsApi = {
  list: () => apiClient.get<Alert[]>("/alerts/").then((r) => r.data),

  create: (payload: Omit<Alert, "id" | "status">) =>
    apiClient.post<Alert>("/alerts/", payload).then((r) => r.data),

  delete: (id: number) => apiClient.delete(`/alerts/${id}`),
};
