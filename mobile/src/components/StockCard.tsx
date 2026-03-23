import { useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import LadderBar from "@/components/LadderBar";
import { colors, mono, spacing } from "@/theme";
import type { Holding } from "@/types/portfolio";

interface StockCardProps {
  holding: Holding;
  onBuyMore?: () => void;
  onSell?: () => void;
  onHold?: () => void;
  onRefresh?: () => void;
}

function fmtPrice(price: number, currency: "USD" | "INR"): string {
  if (currency === "INR") {
    return "₹" + price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return "$" + price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtChange(change: number, changePct: number, currency: "USD" | "INR"): string {
  const sign = change >= 0 ? "+" : "";
  const sym = currency === "INR" ? "₹" : "$";
  const arrow = change >= 0 ? "▲" : "▼";
  return `${sign}${sym}${Math.abs(change).toFixed(2)} (${sign}${changePct.toFixed(2)}%) ${arrow} today`;
}

function exchangeBadgeColor(exchange: string): string {
  if (exchange === "NSE") return colors.amber;
  if (exchange === "NASDAQ") return "#a855f7";
  return colors.primary; // NYSE
}

export default function StockCard({ holding, onBuyMore, onSell, onHold, onRefresh }: StockCardProps) {
  const router = useRouter();
  const [alertActioned, setAlertActioned] = useState(false);

  const profitColor = holding.profit_pct >= 0 ? colors.green : colors.red;
  const changeColor = holding.daily_change_pct >= 0 ? colors.green : colors.red;
  const showAlertBanner = holding.alert_triggered && !alertActioned;

  // Determine if alert banner has expired (7 days)
  const alertExpired = (() => {
    if (!holding.alert_triggered_at) return false;
    const triggered = new Date(holding.alert_triggered_at).getTime();
    return Date.now() - triggered > 7 * 24 * 60 * 60 * 1000;
  })();

  function openMenu() {
    const options = ["Buy More", "Sell", "View Detail", "Cancel"];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 3 },
        (idx) => {
          if (idx === 0) onBuyMore?.();
          else if (idx === 1) onSell?.();
          else if (idx === 2) router.push(`/stock/${holding.ticker}`);
        }
      );
    } else {
      Alert.alert(holding.ticker, "Choose action", [
        { text: "Buy More", onPress: onBuyMore },
        { text: "Sell", onPress: onSell },
        { text: "View Detail", onPress: () => router.push(`/stock/${holding.ticker}`) },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  }

  function handleSell() {
    setAlertActioned(true);
    onSell?.();
  }

  function handleBuyMore() {
    setAlertActioned(true);
    onBuyMore?.();
  }

  function handleHold() {
    setAlertActioned(true);
    onHold?.();
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.ticker}>{holding.ticker}</Text>
          <View style={[styles.exchangeBadge, { backgroundColor: exchangeBadgeColor(holding.exchange) + "22" }]}>
            <Text style={[styles.exchangeText, { color: exchangeBadgeColor(holding.exchange) }]}>
              {holding.exchange}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={openMenu} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.menuDots}>•••</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.companyName} numberOfLines={1}>{holding.name}</Text>

      {/* Price row */}
      <View style={styles.priceRow}>
        <Text style={styles.price}>{fmtPrice(holding.current_price, holding.currency)}</Text>
        <View style={[styles.profitBadge, { backgroundColor: profitColor + "22" }]}>
          <Text style={[styles.profitText, { color: profitColor }]}>
            {holding.profit_pct >= 0 ? "+" : ""}{holding.profit_pct.toFixed(2)}%
          </Text>
        </View>
      </View>

      <Text style={[styles.dailyChange, { color: changeColor }]}>
        {fmtChange(holding.daily_change, holding.daily_change_pct, holding.currency)}
      </Text>

      {/* Ladder bar */}
      <LadderBar rung={holding.ladder_rung} stepPp={holding.ladder_step_pp} />

      {/* Alert banner */}
      {showAlertBanner && !alertExpired && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertBannerText}>
            🔔 Alert triggered — what do you want to do?
          </Text>
          <View style={styles.alertActions}>
            <TouchableOpacity style={[styles.actionBtn, styles.actionSell]} onPress={handleSell}>
              <Text style={styles.actionBtnText}>Sell</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBuy]} onPress={handleBuyMore}>
              <Text style={styles.actionBtnText}>Buy More</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionHold]} onPress={handleHold}>
              <Text style={styles.actionBtnText}>Hold</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  ticker: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  exchangeBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  exchangeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  menuDots: {
    color: colors.muted,
    fontSize: 16,
    letterSpacing: 2,
  },
  companyName: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  price: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    fontFamily: mono,
  },
  profitBadge: {
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  profitText: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: mono,
  },
  dailyChange: {
    fontSize: 12,
    fontFamily: mono,
    marginTop: 2,
  },
  alertBanner: {
    marginTop: spacing.md,
    backgroundColor: colors.amber + "18",
    borderColor: colors.amber + "44",
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.sm,
  },
  alertBannerText: {
    color: colors.amber,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  alertActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  actionSell: {
    backgroundColor: colors.red,
  },
  actionBuy: {
    backgroundColor: colors.green,
  },
  actionHold: {
    backgroundColor: colors.border,
  },
  actionBtnText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 13,
  },
});
