import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  SectionList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { alertsApi, type AlertHistory, type AlertType } from "@/api/alerts";
import { stocksApi, type Stock } from "@/api/stocks";
import BuySheet from "@/components/BuySheet";
import SellSheet from "@/components/SellSheet";
import { colors, mono, spacing } from "@/theme";

// ── Helpers ───────────────────────────────────────────────────────────────────

function alertTagColor(type: AlertType): string {
  if (type === "threshold" || type === "profit_up") return colors.green;
  if (type === "profit_down") return colors.amber;
  if (type === "loss") return colors.red;
  if (type === "recovery") return colors.blue;
  return colors.grey; // breakeven
}

function alertTagLabel(type: AlertType, rung: number | null): string {
  if (type === "threshold") return "Threshold hit · first alert";
  if (type === "profit_up") return `Ladder up · +${Math.abs(rung ?? 2)}pp`;
  if (type === "profit_down") return `Ladder down · -${Math.abs(rung ?? 2)}pp`;
  if (type === "loss") return `Loss · -${Math.abs(rung ?? 2)}pp`;
  if (type === "recovery") return `Recovery · +${Math.abs(rung ?? 2)}pp`;
  return "Back to breakeven";
}

function alertMessage(alert: AlertHistory): string {
  const p = (alert.profit_pct ?? 0).toFixed(1);
  const price = alert.closing_price ? `$${alert.closing_price.toFixed(2)}` : "";
  if (alert.alert_type === "threshold") return `${alert.ticker} hit your profit threshold at ${p}% · ${price}`;
  if (alert.alert_type === "profit_up") return `${alert.ticker} climbed to ${p}% profit · ${price}`;
  if (alert.alert_type === "profit_down") return `${alert.ticker} pulled back to ${p}% · ${price}`;
  if (alert.alert_type === "loss") return `${alert.ticker} is down ${p}% from your cost · ${price}`;
  if (alert.alert_type === "recovery") return `${alert.ticker} recovering, now at ${p}% · ${price}`;
  return `${alert.ticker} is back to breakeven · ${price}`;
}

function badgeColorForAlert(alert: AlertHistory): string {
  const p = alert.profit_pct ?? 0;
  const type = alert.alert_type;
  if (type === "loss" || p < 0) return colors.red;
  if (type === "profit_down") return colors.amber;
  if (type === "breakeven") return colors.grey;
  return colors.green;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (days === 0) return `${timeStr} · Today`;
  if (days === 1) return `${timeStr} · Yesterday`;
  return `${timeStr} · ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function groupAlertsByDate(alerts: AlertHistory[]): { title: string; data: AlertHistory[] }[] {
  const groups = new Map<string, AlertHistory[]>();
  for (const a of alerts) {
    const d = new Date(a.triggered_at);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    const key =
      diff === 0
        ? "Today"
        : diff === 1
        ? "Yesterday"
        : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }
  return Array.from(groups.entries()).map(([title, data]) => ({ title, data }));
}

// ── Alert card ────────────────────────────────────────────────────────────────

function AlertCard({
  alert,
  onRefresh,
  onBuyPress,
  onSellPress,
}: {
  alert: AlertHistory;
  onRefresh: () => void;
  onBuyPress: () => void;
  onSellPress: () => void;
}) {
  const [actioned, setActioned] = useState(!!alert.user_action);
  const p = alert.profit_pct ?? 0;
  const bc = badgeColorForAlert(alert);
  const tagColor = alertTagColor(alert.alert_type);
  const sevenDaysPassed = Date.now() - new Date(alert.triggered_at).getTime() > 7 * 24 * 60 * 60 * 1000;

  async function handleHold() {
    try {
      await alertsApi.action(alert.id, "hold");
      setActioned(true);
      onRefresh();
    } catch {}
  }

  return (
    <View style={styles.alertCard}>
      {/* Row 1 */}
      <View style={styles.row}>
        <Text style={styles.alertHeader}>
          {alert.ticker} · {alert.alert_type.replace("_", " ")}
        </Text>
        <View style={[styles.profitBadge, { backgroundColor: bc + "25" }]}>
          <Text style={[styles.profitBadgeText, { color: bc }]}>
            {p >= 0 ? "+" : ""}{p.toFixed(1)}%
          </Text>
        </View>
      </View>
      {/* Row 2: timestamp */}
      <Text style={styles.timestamp}>{formatTimestamp(alert.triggered_at)}</Text>
      {/* Row 3: message */}
      <Text style={styles.message}>{alertMessage(alert)}</Text>
      {/* Row 4: tag */}
      <View style={[styles.tag, { backgroundColor: tagColor + "22" }]}>
        <Text style={[styles.tagText, { color: tagColor }]}>
          {alertTagLabel(alert.alert_type, alert.rung_pct)}
        </Text>
      </View>
      {/* Row 5: action */}
      {alert.is_actionable && !actioned && !sevenDaysPassed && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.red }]}
            onPress={onSellPress}
          >
            <Text style={styles.actionBtnText}>Sell</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.green }]}
            onPress={onBuyPress}
          >
            <Text style={styles.actionBtnText}>Buy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.grey }]}
            onPress={handleHold}
          >
            <Text style={styles.actionBtnText}>Hold</Text>
          </TouchableOpacity>
        </View>
      )}
      {(actioned || alert.user_action) && (
        <Text style={styles.actionedText}>
          {(alert.user_action ?? "hold").charAt(0).toUpperCase() +
            (alert.user_action ?? "hold").slice(1).replace("_", " ")}{" "}
          · logged{" "}
          {alert.action_taken_at
            ? new Date(alert.action_taken_at).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })
            : ""}
        </Text>
      )}
      {sevenDaysPassed && !alert.user_action && !actioned && (
        <Text style={styles.expiredText}>No action taken</Text>
      )}
    </View>
  );
}

// ── Alerts screen ─────────────────────────────────────────────────────────────

export default function AlertsScreen() {
  const router = useRouter();
  const { token, hydrated } = useAuthStore();
  const [alerts, setAlerts] = useState<AlertHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buyTarget, setBuyTarget] = useState<{ stock: Stock; alertId: number } | null>(null);
  const [sellTarget, setSellTarget] = useState<{ stock: Stock; alertId: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await alertsApi.list();
      setAlerts(data);
    } catch {}
  }, []);

  async function initialLoad() {
    setLoading(true);
    await load();
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function openBuySheet(alert: AlertHistory) {
    try {
      const stock = await stocksApi.get(alert.stock_id);
      setBuyTarget({ stock, alertId: alert.id });
    } catch {}
  }

  async function openSellSheet(alert: AlertHistory) {
    try {
      const stock = await stocksApi.get(alert.stock_id);
      setSellTarget({ stock, alertId: alert.id });
    } catch {}
  }

  useEffect(() => {
    if (hydrated && token) {
      initialLoad();
    }
  }, [hydrated, token]);

  const today = alerts.filter((a) => {
    const diff = Date.now() - new Date(a.triggered_at).getTime();
    return diff < 24 * 60 * 60 * 1000;
  }).length;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (alerts.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>🔔</Text>
        <Text style={styles.emptyTitle}>No alerts yet</Text>
        <Text style={styles.emptySubtitle}>
          Alerts appear here once your stock holds above threshold for 2 consecutive closing days.
        </Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push("/(tabs)/add")}>
          <Text style={styles.addBtnText}>Add a stock to get started</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sections = groupAlertsByDate(alerts);

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(a) => String(a.id)}
        renderItem={({ item }) => (
          <AlertCard
            alert={item}
            onRefresh={load}
            onBuyPress={() => openBuySheet(item)}
            onSellPress={() => openSellSheet(item)}
          />
        )}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.pageTitle}>Alerts</Text>
            <Text style={styles.pageSubtitle}>
              {today} new alert{today !== 1 ? "s" : ""} today
            </Text>
          </View>
        }
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      />

      {/* Buy bottom sheet */}
      <Modal
        visible={buyTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setBuyTarget(null)}
      >
        <View style={styles.sheetOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <ScrollView style={styles.sheetContainer} keyboardShouldPersistTaps="handled">
              {buyTarget && (
                <BuySheet
                  stock={buyTarget.stock}
                  source="alert"
                  doneLabel="Back to alerts"
                  onClose={() => setBuyTarget(null)}
                  onDone={() => { setBuyTarget(null); load(); }}
                  onAfterConfirm={async () => {
                    try {
                      await alertsApi.action(buyTarget!.alertId, "buy_more");
                    } catch {}
                  }}
                />
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Sell bottom sheet */}
      <Modal
        visible={sellTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSellTarget(null)}
      >
        <View style={styles.sheetOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <ScrollView style={styles.sheetContainer} keyboardShouldPersistTaps="handled">
              {sellTarget && (
                <SellSheet
                  stock={sellTarget.stock}
                  source="alert"
                  doneLabel="Back to alerts"
                  onClose={() => setSellTarget(null)}
                  onDone={() => { setSellTarget(null); load(); }}
                  onAfterConfirm={async (sellType) => {
                    try {
                      await alertsApi.action(
                        sellTarget!.alertId,
                        sellType === "full" ? "sell_full" : "sell_partial"
                      );
                    } catch {}
                  }}
                />
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { marginBottom: spacing.md },
  pageTitle: { color: colors.text, fontSize: 26, fontWeight: "800" },
  pageSubtitle: { color: colors.muted, fontSize: 13, marginTop: 2 },
  sectionHeader: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  alertCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  alertHeader: { color: colors.text, fontSize: 13, fontWeight: "700" },
  profitBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  profitBadgeText: { fontSize: 11, fontWeight: "700", fontFamily: mono },
  timestamp: { color: colors.muted, fontSize: 11, marginTop: 2 },
  message: { color: colors.text, fontSize: 13, marginTop: 6, lineHeight: 18 },
  tag: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: spacing.sm,
  },
  tagText: { fontSize: 11, fontWeight: "700" },
  actionRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: { flex: 1, borderRadius: 8, paddingVertical: 9, alignItems: "center" },
  actionBtnText: { color: colors.white, fontWeight: "700", fontSize: 13 },
  actionedText: { color: colors.muted, fontSize: 12, marginTop: spacing.sm, fontStyle: "italic" },
  expiredText: { color: colors.muted, fontSize: 12, marginTop: spacing.sm },
  // Empty state
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: "800", marginBottom: spacing.sm, textAlign: "center" },
  emptySubtitle: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  addBtnText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  // Bottom sheet
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheetContainer: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
});
