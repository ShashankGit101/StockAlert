import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { alertsApi, type Alert } from "@/api/alerts";
import AlertCard from "@/components/AlertCard";
import { colors, spacing } from "@/theme";

function sortAlerts(alerts: Alert[]): Alert[] {
  const order: Record<string, number> = { active: 0, triggered: 1, cancelled: 2 };
  return [...alerts].sort(
    (a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3)
  );
}

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAlerts() {
    try {
      setError(null);
      const data = await alertsApi.list();
      setAlerts(sortAlerts(data));
    } catch (err: any) {
      setError("Failed to load alerts. Please try again.");
    }
  }

  async function initialLoad() {
    setLoading(true);
    await loadAlerts();
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  }

  async function handleDelete(id: number) {
    // Optimistic update: remove immediately
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    try {
      await alertsApi.delete(id);
    } catch {
      // Revert on failure by reloading
      loadAlerts();
    }
  }

  useEffect(() => {
    initialLoad();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error != null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={initialLoad}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={alerts}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <AlertCard alert={item} onDelete={handleDelete} />
        )}
        contentContainerStyle={[
          styles.list,
          alerts.length === 0 && styles.listEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No alerts yet</Text>
            <Text style={styles.emptySubText}>
              Use the Search tab to find stocks and create alerts.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  list: {
    padding: spacing.md,
  },
  listEmpty: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  emptyText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  emptySubText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
  },
  errorText: {
    color: colors.red,
    fontSize: 15,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
});
