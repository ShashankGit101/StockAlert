import { authApi } from "@/api/auth";

const mockClient = {
  post: jest.fn(),
  get: jest.fn(),
  patch: jest.fn(),
};

jest.mock("@/api/client", () => ({
  getAuthenticatedClient: () => mockClient,
}));

beforeEach(() => jest.clearAllMocks());

describe("authApi.register", () => {
  it("posts to /auth/register and returns access_token", async () => {
    mockClient.post.mockResolvedValueOnce({ data: { access_token: "tok123", token_type: "bearer" } });
    const result = await authApi.register("a@b.com", "pass");
    expect(mockClient.post).toHaveBeenCalledWith("/auth/register", { email: "a@b.com", password: "pass" });
    expect(result.access_token).toBe("tok123");
  });

  it("propagates network errors", async () => {
    mockClient.post.mockRejectedValueOnce(new Error("Network Error"));
    await expect(authApi.register("a@b.com", "pass")).rejects.toThrow("Network Error");
  });
});

describe("authApi.login", () => {
  it("posts to /auth/login and returns access_token", async () => {
    mockClient.post.mockResolvedValueOnce({ data: { access_token: "loginTok", token_type: "bearer" } });
    const result = await authApi.login("a@b.com", "pass");
    expect(mockClient.post).toHaveBeenCalledWith("/auth/login", { email: "a@b.com", password: "pass" });
    expect(result.access_token).toBe("loginTok");
  });

  it("propagates 401 errors from server", async () => {
    const err = { response: { status: 401, data: { detail: "Incorrect email or password" } } };
    mockClient.post.mockRejectedValueOnce(err);
    await expect(authApi.login("x@y.com", "wrong")).rejects.toMatchObject({
      response: { status: 401 },
    });
  });
});

describe("authApi.me", () => {
  it("gets /auth/me and returns user", async () => {
    const user = { id: 1, email: "a@b.com", expo_push_token: null };
    mockClient.get.mockResolvedValueOnce({ data: user });
    const result = await authApi.me();
    expect(mockClient.get).toHaveBeenCalledWith("/auth/me");
    expect(result).toEqual(user);
  });
});

describe("authApi.updatePushToken", () => {
  it("patches /auth/me/push-token", async () => {
    mockClient.patch.mockResolvedValueOnce({ data: {} });
    await authApi.updatePushToken("ExponentPushToken[abc]");
    expect(mockClient.patch).toHaveBeenCalledWith("/auth/me/push-token", {
      expo_push_token: "ExponentPushToken[abc]",
    });
  });
});
