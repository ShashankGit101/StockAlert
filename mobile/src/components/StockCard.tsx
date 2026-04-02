import { Alert } from "react-native"; // Shashank 
// Add stocksApi here Shashak
import { stocksApi, type Stock } from "@/api/stocks"; 
import { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { colors, mono, spacing } from "@/theme";
// import type { Stock } from "@/api/stocks"; old_Shashank

const LADDER_STEP_PP = 2;

type Scenario = "pre_threshold" | "profit_up" | "profit_dropping" | "loss";

function getScenario(stock: Stock): Scenario {
  const p = stock.profit_pct ?? 0;
  const zone = stock.zone ?? "pre_threshold";
  if (zone === "loss" || p < 0) return "loss";
  if (zone === "pre_threshold") return "pre_threshold";
  const rung = stock.current_rung_pct ?? 0;
  return p >= rung ? "profit_up" : "profit_dropping";
}

function badgeColor(scenario: Scenario): string {
  if (scenario === "loss") return colors.red;
  if (scenario === "profit_up") return colors.green;
  if (scenario === "profit_dropping") return colors.amber;
  return colors.grey;
}

function exchangeBadgeColor(market: string): string {
  return market === "NSE" ? colors.orange : colors.blue;
}

function currencySymbol(currency: string): string {
  return currency === "INR" ? "₹" : "$";
}

function fmtPrice(price: number, currency: string): string {
  const sym = currencySymbol(currency);
  return sym + price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function progressFill(stock: Stock, scenario: Scenario): number {
  const p = stock.profit_pct ?? 0;
  const threshold = stock.threshold_pct;
  const rung = stock.current_rung_pct ?? 0;

  if (scenario === "pre_threshold") {
    return threshold > 0 ? Math.min(Math.max(p, 0) / threshold, 1) : 0;
  }
  if (scenario === "profit_up") {
    const base = threshold;
    const next = rung + LADDER_STEP_PP;
    const range = next - base;
    return range > 0 ? Math.min((p - base) / range, 1) : 1;
  }
  if (scenario === "profit_dropping") {
    const base = threshold;
    const range = (rung + LADDER_STEP_PP) - base;
    return range > 0 ? Math.min((p - base) / range, 1) : 0.5;
  }
  // loss — returns how deep (fills R→L from outside)
  const lossRung = rung; // negative number
  return lossRung < 0 ? Math.min(Math.abs(p) / (Math.abs(lossRung) + LADDER_STEP_PP), 1) : Math.min(Math.abs(p) / LADDER_STEP_PP, 1);
}

function label1(stock: Stock, scenario: Scenario): string {
  const p = (stock.profit_pct ?? 0).toFixed(1);
  const t = stock.threshold_pct.toFixed(0);
  const rung = (stock.current_rung_pct ?? 0).toFixed(0);
  const next = ((stock.current_rung_pct ?? 0) + LADDER_STEP_PP).toFixed(0);
  if (scenario === "pre_threshold") return `Profit achieved ${p}% · Threshold set ${t}%`;
  if (scenario === "profit_up") return `Target achieved ${rung}% · Next target ${next}%`;
  if (scenario === "profit_dropping") return `Profit dropping · now at ${p}%`;
  return `Loss ${p}% · Threshold set ${t}%`;
}

function label2(stock: Stock, scenario: Scenario): string {
  const t = stock.threshold_pct.toFixed(0);
  const rung = (stock.current_rung_pct ?? 0).toFixed(0);
  if (scenario === "pre_threshold") return "Watching for threshold to fire";
  if (scenario === "profit_up") return `Threshold set ${t}%`;
  if (scenario === "profit_dropping") return `Last alerted ${rung}% · Threshold set ${t}%`;
  return "Target not yet reached";
}

// ── Three-dots menu ───────────────────────────────────────────────────────────

function ThreeDotsMenu({
  ticker,
  stockId,
  onBuy,
  onSell,
  onClose,
  onRefresh, // Shashank
}: {
  ticker: string;
  stockId: number;
  onBuy: () => void;
  onSell: () => void;
  onClose: () => void;
  onRefresh: () => void;  // Shashank 
}) {
  const router = useRouter();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={menuStyles.overlay} activeOpacity={1} onPress={onClose}>
       <TouchableOpacity activeOpacity={1} style={menuStyles.sheet} onPress={() => {}}>
          <TouchableOpacity style={menuStyles.closeBtn} onPress={onClose} >
            <Text style={menuStyles.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={menuStyles.title}>{ticker}</Text>
          {[
            { label: "Buy", action: () => { onClose(); onBuy(); } },
            { label: "Sell", action: () => { onClose(); onSell(); } },
            {
              label: "View detail",
              action: () => { onClose(); router.push(`/stock/${stockId}`); },
            },
            {
              label: "Remove", // <--- What the user sees in the menu
              action: () => {
                Alert.alert(
                  "Remove Stock", // <--- The title of the popup
                  "Are you sure you want to remove this stock?",
                  [
                    { text: "Cancel", style: "cancel" },
                    { 
                      text: "Remove", // <--- The red confirm button
                      onPress: async () => {
                        // "stocksApi.delete" is the technical function name 
                        // defined in your stocks.ts file.
                        await stocksApi.delete(stockId); 
                        onRefresh(); 
                      } 
                    }
                  ]
                );
              }
          }
          ].map(({ label, action }) => (
            <TouchableOpacity key={label} style={menuStyles.option} onPress={action}>
              <Text style={menuStyles.optionText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </TouchableOpacity> 
      </TouchableOpacity>
    </Modal>
  );
}

const menuStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xl + spacing.lg,
  },
  closeBtn: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { color: colors.muted, fontSize: 18, fontWeight: "700" },
  title: { color: colors.text, fontSize: 16, fontWeight: "800", marginBottom: spacing.md },
  option: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionText: { color: colors.text, fontSize: 16 },
});

// ── Main component ────────────────────────────────────────────────────────────

interface StockCardProps {
  stock: Stock;
  isActionable?: boolean;
  onBuy?: () => void;
  onSell?: () => void;
  onHold?: () => void;
  onRefresh?: () => void;  // Shashank 
}

export default function StockCard({ stock, isActionable, onBuy, onSell, onHold, onRefresh }: StockCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const scenario = getScenario(stock);
  const bc = badgeColor(scenario);
  const fill = progressFill(stock, scenario);
  const p = stock.profit_pct ?? 0;
  const dc = stock.daily_change ?? 0;
  const dcp = stock.daily_change_pct ?? 0;
  const dcColor = dcp >= 0 ? colors.green : colors.red;
  const exchangeColor = exchangeBadgeColor(stock.market);
  const sym = currencySymbol(stock.currency);

  return (
    <View style={styles.card}>
      {/* Row 1: Ticker + Exchange badge + Three dots */}
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <Text style={styles.ticker}>{stock.ticker}</Text>
          <View style={[styles.exchangeBadge, { backgroundColor: exchangeColor + "25" }]}>
            <Text style={[styles.exchangeText, { color: exchangeColor }]}>{stock.market}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setMenuOpen(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.dots}>⋯</Text>
        </TouchableOpacity>
      </View>

      {/* Row 2: Company name */}
      <Text style={styles.companyName} numberOfLines={1}>{stock.company_name}</Text>

      {/* Row 3: Price + daily change */}
      <View style={styles.row}>
        <Text style={styles.price}>
          {stock.current_price != null ? fmtPrice(stock.current_price, stock.currency) : "—"}
        </Text>
        <Text style={[styles.dailyChange, { color: dcColor }]}>
          {dc >= 0 ? "+" : ""}{sym}{Math.abs(dc).toFixed(2)} ({dcp >= 0 ? "+" : ""}{dcp.toFixed(2)}%) {dcp >= 0 ? "▲" : "▼"} today
        </Text>
      </View>
      <View style={styles.divider} />

      {/* Row 4: Progress bar + badge */}
      <View style={[styles.row, { marginTop: spacing.sm }]}>
        <View style={styles.barTrack}>
          {scenario === "loss" ? (
            // Loss: fills RIGHT to LEFT
            <View style={[styles.barFill, { width: `${Math.round(fill * 100)}%`, backgroundColor: bc, alignSelf: "flex-end" }]} />
          ) : (
            <View style={[styles.barFill, { width: `${Math.round(fill * 100)}%`, backgroundColor: bc }]} />
          )}
        </View>
        <View style={[styles.badge, { backgroundColor: bc + "25" }]}>
          <Text style={[styles.badgeText, { color: bc }]}>
            {p >= 0 ? "+" : ""}{p.toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* Row 5: Labels */}
      <Text style={[styles.label1, { color: bc }]} numberOfLines={1}>{label1(stock, scenario)}</Text>
      <Text style={styles.label2} numberOfLines={1}>{label2(stock, scenario)}</Text>

      {/* Row 6: Action buttons (only when actionable) */}
      {isActionable && (
        <>
          <View style={styles.divider} />
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.red }]} onPress={onSell}>
              <Text style={styles.actionBtnText}>Sell</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.green }]} onPress={onBuy}>
              <Text style={styles.actionBtnText}>Buy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.grey }]} onPress={onHold}>
              <Text style={styles.actionBtnText}>Hold</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {menuOpen && (
        <ThreeDotsMenu
          ticker={stock.ticker}
          stockId={stock.id}
          onBuy={() => onBuy?.()}
          onSell={() => onSell?.()}
          onClose={() => setMenuOpen(false)}
          onRefresh={() => onRefresh?.()} // Shashank Add this line!
        />
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  ticker: { color: colors.text, fontSize: 14, fontWeight: "700", letterSpacing: 0.3 },
  exchangeBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  exchangeText: { fontSize: 10, fontWeight: "700" },
  dots: { color: colors.muted, fontSize: 20, letterSpacing: 1, paddingBottom: 4 },
  companyName: { color: colors.muted, fontSize: 12, marginBottom: spacing.sm },
  price: { color: colors.text, fontSize: 15, fontWeight: "700", fontFamily: mono },
  dailyChange: { fontSize: 12, fontFamily: mono },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: "hidden",
    marginRight: spacing.sm,
    flexDirection: "row",
  },
  barFill: { height: 6, borderRadius: 3 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "700", fontFamily: mono },
  label1: { fontSize: 10, fontWeight: "700", marginTop: 4 },
  label2: { fontSize: 9, color: colors.muted, marginTop: 2 },
  actionRow: { flexDirection: "row", gap: spacing.sm },
  actionBtn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  actionBtnText: { color: colors.white, fontWeight: "700", fontSize: 13 },
});
