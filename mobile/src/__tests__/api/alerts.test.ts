import { alertsApi } from "@/api/alerts";
import { apiClient } from "@/api/client";

jest.mock("@/api/client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;
const mockDelete = apiClient.delete as jest.Mock;

const ALERT = {
  id: 1,
  ticker: "AAPL",
  target_price: 200,
  direction: "above" as const,
  status: "active",
  created_at: "2026-01-01T00:00:00Z",
  triggered_at: null,
};

beforeEach(() => jest.clearAllMocks());

describe("alertsApi.list", () => {
  it("gets /alerts/ and returns array", async () => {
    mockGet.mockResolvedValueOnce({ data: [ALERT] });
    const result = await alertsApi.list();
    expect(mockGet).toHaveBeenCalledWith("/alerts/");
    expect(result).toHaveLength(1);
    expect(result[0].ticker).toBe("AAPL");
  });

  it("returns empty array when no alerts", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    const result = await alertsApi.list();
    expect(result).toEqual([]);
  });
});

describe("alertsApi.create", () => {
  it("posts to /alerts/ with payload", async () => {
    mockPost.mockResolvedValueOnce({ data: ALERT });
    const result = await alertsApi.create({
      ticker: "AAPL",
      target_price: 200,
      direction: "above",
    });
    expect(mockPost).toHaveBeenCalledWith("/alerts/", {
      ticker: "AAPL",
      target_price: 200,
      direction: "above",
    });
    expect(result.id).toBe(1);
  });

  it("propagates 422 validation errors", async () => {
    const err = { response: { status: 422, data: { detail: "target_price must be > 0" } } };
    mockPost.mockRejectedValueOnce(err);
    await expect(
      alertsApi.create({ ticker: "AAPL", target_price: 0, direction: "above" })
    ).rejects.toMatchObject({ response: { status: 422 } });
  });
});

describe("alertsApi.delete", () => {
  it("sends DELETE to /alerts/:id", async () => {
    mockDelete.mockResolvedValueOnce({ data: {} });
    await alertsApi.delete(42);
    expect(mockDelete).toHaveBeenCalledWith("/alerts/42");
  });

  it("propagates 404 errors", async () => {
    const err = { response: { status: 404, data: { detail: "Alert not found" } } };
    mockDelete.mockRejectedValueOnce(err);
    await expect(alertsApi.delete(99)).rejects.toMatchObject({ response: { status: 404 } });
  });
});
