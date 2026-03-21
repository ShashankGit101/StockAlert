import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import StockRow from "@/components/StockRow";

describe("StockRow", () => {
  it("renders ticker", () => {
    const { getByText } = render(
      <StockRow ticker="AAPL" price={175.5} change_percent={1.23} />
    );
    expect(getByText("AAPL")).toBeTruthy();
  });

  it("renders formatted price", () => {
    const { getByText } = render(
      <StockRow ticker="AAPL" price={1234.56} change_percent={0.5} />
    );
    expect(getByText("$1,234.56")).toBeTruthy();
  });

  it("renders positive change percent in green with + prefix", () => {
    const { getByText } = render(
      <StockRow ticker="AAPL" price={100} change_percent={2.5} />
    );
    const pctEl = getByText("+2.50%");
    expect(pctEl).toBeTruthy();
  });

  it("renders negative change percent with - prefix", () => {
    const { getByText } = render(
      <StockRow ticker="AAPL" price={100} change_percent={-1.75} />
    );
    expect(getByText("-1.75%")).toBeTruthy();
  });

  it("renders loading placeholder when price is null", () => {
    const { queryByText } = render(
      <StockRow ticker="AAPL" price={null} change_percent={null} loading />
    );
    expect(queryByText("$")).toBeNull();
  });

  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <StockRow ticker="TSLA" price={200} change_percent={3.0} onPress={onPress} />
    );
    fireEvent.press(getByText("TSLA"));
    expect(onPress).toHaveBeenCalled();
  });
});
