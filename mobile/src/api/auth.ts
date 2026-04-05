import { getAuthenticatedClient } from "./client";

export interface User {
  id: number;
  email: string;
  expo_push_token: string | null;
}

export const authApi = {
  register: (email: string, password: string) =>
    getAuthenticatedClient()
      .post<{ access_token: string }>("/auth/register", { email, password })
      .then((r) => r.data),

  login: (email: string, password: string) =>
    getAuthenticatedClient()
      .post<{ access_token: string }>("/auth/login", { email, password })
      .then((r) => r.data),

  me: () => getAuthenticatedClient().get<User>("/auth/me").then((r) => r.data),

  updatePushToken: (expo_push_token: string) =>
    getAuthenticatedClient().patch("/auth/me/push-token", { expo_push_token }),
};
