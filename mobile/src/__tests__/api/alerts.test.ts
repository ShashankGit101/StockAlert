import { alertsApi } from "@/api/alerts";

const mockClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

jest.mock("@/api/client", () => ({
  getAuthenticatedClient: () => mockClient,
}));

const ALERT = {
  id: 1,
  stock_id: 1,
  ticker: "AAPL",
  company_name: "Apple Inc.",
  alert_type: "threshold" as const,
  rung_pct: null,
  closing_price: null,
  profit_pct: null,
  user_action: null,
  action_taken_at: null,
  is_actionable: false,
  triggered_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => jest.clearAllMocks());

describe("alertsApi.list", () => {
  it("gets /alerts and returns array", async () => {
    mockClient.get.mockResolvedValueOnce({ data: [ALERT] });
    const result = await alertsApi.list();
    expect(mockClient.get).toHaveBeenCalledWith("/alerts");
    expect(result).toHaveLength(1);
    expect(result[0].ticker).toBe("AAPL");
  });

  it("returns empty array when no alerts", async () => {
    mockClient.get.mockResolvedValueOnce({ data: [] });
    const result = await alertsApi.list();
    expect(result).toEqual([]);
  });
});

describe("alertsApi.get", () => {
  it("gets /alerts/:id and returns alert", async () => {
    mockClient.get.mockResolvedValueOnce({ data: ALERT });
    const result = await alertsApi.get(1);
    expect(mockClient.get).toHaveBeenCalledWith("/alerts/1");
    expect(result.id).toBe(1);
  });
});

describe("alertsApi.action", () => {
  it("puts to /alerts/:id/action with action", async () => {
    mockClient.put.mockResolvedValueOnce({ data: {} });
    await alertsApi.action(1, "hold");
    expect(mockClient.put).toHaveBeenCalledWith("/alerts/1/action", { action: "hold" });
  });

  it("propagates 404 errors", async () => {
    const err = { response: { status: 404, data: { detail: "Alert not found" } } };
    mockClient.put.mockRejectedValueOnce(err);
    await expect(alertsApi.action(99, "hold")).rejects.toMatchObject({ response: { status: 404 } });
  });
});
