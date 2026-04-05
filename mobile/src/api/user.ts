import { getAuthenticatedClient } from "./client";

export interface UserProfile {
  id: number;
  name: string | null;
  email: string;
  push_enabled: boolean;
  email_enabled: boolean;
  expo_push_token: string | null;
}

export const userApi = {
  get: () => getAuthenticatedClient().get<UserProfile>("/user").then((r) => r.data),

  update: (payload: { name?: string; email?: string }) =>
    getAuthenticatedClient().put<UserProfile>("/user", payload).then((r) => r.data),

  updateNotifications: (payload: {
    push_enabled?: boolean;
    email_enabled?: boolean;
    expo_push_token?: string;
  }) =>
    getAuthenticatedClient()
      .put<UserProfile>("/user/notifications", payload)
      .then((r) => r.data),

  changePassword: (payload: { current_password: string; new_password: string }) =>
    getAuthenticatedClient().put("/user/password", payload).then((r) => r.data),
};
