import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import AlertCard from "@/components/AlertCard";
import type { Alert } from "@/api/alerts";

const BASE_ALERT: Alert = {
  id: 1,
  ticker: "AAPL",
  target_price: 200,
  direction: "above",
  status: "active",
  created_at: "2026-01-01T00:00:00Z",
  triggered_at: null,
};

describe("AlertCard", () => {
  it("renders ticker", () => {
    const { getByText } = render(<AlertCard alert={BASE_ALERT} />);
    expect(getByText("AAPL")).toBeTruthy();
  });

  it("renders Above direction badge for above alerts", () => {
    const { getByText } = render(<AlertCard alert={BASE_ALERT} />);
    expect(getByText("↑ Above")).toBeTruthy();
  });

  it("renders Below direction badge for below alerts", () => {
    const { getByText } = render(
      <AlertCard alert={{ ...BASE_ALERT, direction: "below" }} />
    );
    expect(getByText("↓ Below")).toBeTruthy();
  });

  it("renders formatted target price", () => {
    const { getByText } = render(<AlertCard alert={BASE_ALERT} />);
    expect(getByText("$200.00")).toBeTruthy();
  });

  it("renders Active status badge for active alert", () => {
    const { getByText } = render(<AlertCard alert={BASE_ALERT} />);
    expect(getByText("Active")).toBeTruthy();
  });

  it("renders Triggered status badge", () => {
    const { getByText } = render(
      <AlertCard alert={{ ...BASE_ALERT, status: "triggered" }} />
    );
    expect(getByText("Triggered")).toBeTruthy();
  });

  it("renders Cancelled status badge", () => {
    const { getByText } = render(
      <AlertCard alert={{ ...BASE_ALERT, status: "cancelled" }} />
    );
    expect(getByText("Cancelled")).toBeTruthy();
  });

  it("shows delete button for active alert when onDelete provided", () => {
    const { getByText } = render(
      <AlertCard alert={BASE_ALERT} onDelete={jest.fn()} />
    );
    expect(getByText("🗑")).toBeTruthy();
  });

  it("hides delete button for triggered alert", () => {
    const { queryByText } = render(
      <AlertCard alert={{ ...BASE_ALERT, status: "triggered" }} onDelete={jest.fn()} />
    );
    expect(queryByText("🗑")).toBeNull();
  });

  it("hides delete button when onDelete not provided", () => {
    const { queryByText } = render(<AlertCard alert={BASE_ALERT} />);
    expect(queryByText("🗑")).toBeNull();
  });

  it("calls onDelete with alert id when delete is pressed", () => {
    const onDelete = jest.fn();
    const { getByText } = render(<AlertCard alert={BASE_ALERT} onDelete={onDelete} />);
    fireEvent.press(getByText("🗑"));
    expect(onDelete).toHaveBeenCalledWith(1);
  });
});
