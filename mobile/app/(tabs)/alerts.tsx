import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { alertsApi, type Alert } from "@/api/alerts";
import { colors, mono, spacing } from "@/theme";

function formatPrice(price: number): string {
  return "$" + price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface AlertRowProps {
  alert: Alert;
  highlighted: boolean;
  onDelete: (id: number) => void;
}

function AlertRow({ alert, highlighted, onDelete }: AlertRowProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!highlighted) return;
    anim.setValue(1);
    const t = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 1200, useNativeDriver: false }).start();
    }, 1000);
    return () => clearTimeout(t);
  }, [highlighted]);

  const borderColor = anim.interpolate({ inputRange: [0, 1], outputRange: ["transparent", colors.primary] });

  const isAbove = alert.direction === "above";
  const isTriggered = alert.status === "triggered";
  const isCancelled = alert.status === "cancelled";

  const dirColor = isAbove ? colors.green : colors.red;
  const statusColor = isTriggered ? colors.green : isCancelled ? colors.muted : colors.primary;
  const statusLabel = isTriggered ? "Triggered" : isCancelled ? "Cancelled" : "Active";
  const dirLabel = isAbove ? "↑ Above" : "↓ Below";

  return (
    <Animated.View style={[styles.row, { borderWidth: 1.5, borderColor }]}>
      <View style={styles.rowLeft}>
        <View style={styles.rowHeader}>
          <Text style={styles.ticker}>{alert.ticker}</Text>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: dirColor + "22" }]}>
              <Text style={[styles.badgeText, { color: dirColor }]}>{dirLabel}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusColor + "22", marginLeft: 6 }]}>
              <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.targetPrice}>Target: {formatPrice(alert.target_price)}</Text>
        {isTriggered && alert.triggered_at && (
          <Text style={styles.triggeredAt}>Triggered {timeAgo(alert.triggered_at)}</Text>
        )}
      </View>
      <View style={styles.rowRight}>
        {!isCancelled && (
          <TouchableOpacity
            onPress={() => onDelete(alert.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.deleteIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

function sortAlerts(alerts: Alert[]): Alert[] {
  const order: Record<string, number> = { active: 0, triggered: 1, cancelled: 2 };
  return [...alerts].sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3));
}

export default function AlertsScreen() {
  const { highlightId } = useLocalSearchParams<{ highlightId?: string }>();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<Alert>>(null);

  async function load(onLoaded?: (data: Alert[]) => void) {
    try {
      setError(null);
      const data = sortAlerts(await alertsApi.list());
      setAlerts(data);
      onLoaded?.(data);
    } catch {
      setError("Failed to load alerts. Pull to refresh.");
    }
  }

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

  async function handleDelete(id: number) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    try { await alertsApi.delete(id); } catch { load(); }
  }

  useEffect(() => { initialLoad(); }, []);

  useEffect(() => {
    if (!highlightId) return;
    const num = Number(highlightId);
    load((loaded) => {
      const idx = loaded.findIndex((a) => a.id === num);
      if (idx >= 0) setTimeout(() => listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.3 }), 300);
    });
  }, [highlightId]);

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  const active = alerts.filter((a) => a.status === "active").length;
  const triggered = alerts.filter((a) => a.status === "triggered").length;

  return (
    <View style={styles.container}>
      {alerts.length > 0 && (
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{active}</Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, triggered > 0 && { color: colors.green }]}>{triggered}</Text>
            <Text style={styles.summaryLabel}>Triggered</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{alerts.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
        </View>
      )}

      <FlatList
        ref={listRef}
        data={alerts}
        keyExtractor={(a) => String(a.id)}
        renderItem={({ item }) => (
          <AlertRow
            alert={item}
            highlighted={highlightId != null && item.id === Number(highlightId)}
            onDelete={handleDelete}
          />
        )}
        contentContainerStyle={[styles.list, alerts.length === 0 && styles.listEmpty]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          error ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>⚠️</Text>
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={initialLoad}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyTitle}>No alerts yet</Text>
              <Text style={styles.emptyText}>Add a stock and set ladder alerts to get notified when prices move.</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  summary: {
    flexDirection: "row",
    backgroundColor: colors.card,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: 12,
    padding: spacing.md,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryNum: { color: colors.text, fontSize: 22, fontWeight: "800", fontFamily: mono },
  summaryLabel: { color: colors.muted, fontSize: 11, fontWeight: "600", textTransform: "uppercase", marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: colors.border },
  list: { padding: spacing.md },
  listEmpty: { flexGrow: 1 },
  row: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  rowLeft: { flex: 1 },
  rowRight: { marginLeft: spacing.sm },
  rowHeader: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm, marginBottom: 4 },
  ticker: { color: colors.text, fontSize: 16, fontWeight: "800" },
  badges: { flexDirection: "row" },
  badge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  targetPrice: { color: colors.muted, fontSize: 13, fontFamily: mono, marginTop: 2 },
  triggeredAt: { color: colors.green, fontSize: 11, marginTop: 4 },
  deleteIcon: { color: colors.muted, fontSize: 16, padding: 4 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, paddingHorizontal: spacing.lg },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: spacing.sm },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 22 },
  retryBtn: { marginTop: spacing.md, backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  retryText: { color: colors.white, fontWeight: "700" },
});
