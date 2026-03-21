import axios from "axios";
import { authApi } from "@/api/auth";
import { apiClient } from "@/api/client";

jest.mock("@/api/client", () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

const mockPost = apiClient.post as jest.Mock;
const mockGet = apiClient.get as jest.Mock;
const mockPatch = apiClient.patch as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("authApi.register", () => {
  it("posts to /auth/register and returns access_token", async () => {
    mockPost.mockResolvedValueOnce({ data: { access_token: "tok123", token_type: "bearer" } });
    const result = await authApi.register("a@b.com", "pass");
    expect(mockPost).toHaveBeenCalledWith("/auth/register", { email: "a@b.com", password: "pass" });
    expect(result.access_token).toBe("tok123");
  });

  it("propagates network errors", async () => {
    mockPost.mockRejectedValueOnce(new Error("Network Error"));
    await expect(authApi.register("a@b.com", "pass")).rejects.toThrow("Network Error");
  });
});

describe("authApi.login", () => {
  it("posts to /auth/login and returns access_token", async () => {
    mockPost.mockResolvedValueOnce({ data: { access_token: "loginTok", token_type: "bearer" } });
    const result = await authApi.login("a@b.com", "pass");
    expect(mockPost).toHaveBeenCalledWith("/auth/login", { email: "a@b.com", password: "pass" });
    expect(result.access_token).toBe("loginTok");
  });

  it("propagates 401 errors from server", async () => {
    const err = { response: { status: 401, data: { detail: "Incorrect email or password" } } };
    mockPost.mockRejectedValueOnce(err);
    await expect(authApi.login("x@y.com", "wrong")).rejects.toMatchObject({
      response: { status: 401 },
    });
  });
});

describe("authApi.me", () => {
  it("gets /auth/me and returns user", async () => {
    const user = { id: 1, email: "a@b.com", expo_push_token: null };
    mockGet.mockResolvedValueOnce({ data: user });
    const result = await authApi.me();
    expect(mockGet).toHaveBeenCalledWith("/auth/me");
    expect(result).toEqual(user);
  });
});

describe("authApi.updatePushToken", () => {
  it("patches /auth/me/push-token", async () => {
    mockPatch.mockResolvedValueOnce({ data: {} });
    await authApi.updatePushToken("ExponentPushToken[abc]");
    expect(mockPatch).toHaveBeenCalledWith("/auth/me/push-token", {
      expo_push_token: "ExponentPushToken[abc]",
    });
  });
});
