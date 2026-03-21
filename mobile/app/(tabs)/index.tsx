import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { alertsApi } from "@/api/alerts";
import { stocksApi, type Quote } from "@/api/stocks";
import StockRow from "@/components/StockRow";
import { colors, spacing } from "@/theme";

interface WatchlistEntry {
  ticker: string;
  price: number | null;
  change_percent: number | null;
}

export default function WatchlistScreen() {
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadWatchlist() {
    try {
      setError(null);
      const alerts = await alertsApi.list();

      // Extract unique tickers from active alerts
      const tickers = Array.from(
        new Set(
          alerts.filter((a) => a.status === "active").map((a) => a.ticker)
        )
      );

      if (tickers.length === 0) {
        setEntries([]);
        return;
      }

      // Fetch quotes in parallel
      const quoteResults = await Promise.allSettled(
        tickers.map((ticker) => stocksApi.quote(ticker))
      );

      const newEntries: WatchlistEntry[] = tickers.map((ticker, index) => {
        const result = quoteResults[index];
        if (result.status === "fulfilled") {
          const quote: Quote = result.value;
          return {
            ticker,
            price: quote.price,
            change_percent: quote.change_percent,
          };
        }
        return { ticker, price: null, change_percent: null };
      });

      setEntries(newEntries);
    } catch (err: any) {
      setError("Failed to load watchlist. Please try again.");
    }
  }

  async function initialLoad() {
    setLoading(true);
    await loadWatchlist();
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadWatchlist();
    setRefreshing(false);
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
        data={entries}
        keyExtractor={(item) => item.ticker}
        renderItem={({ item }) => (
          <StockRow
            ticker={item.ticker}
            price={item.price}
            change_percent={item.change_percent}
          />
        )}
        contentContainerStyle={[
          styles.list,
          entries.length === 0 && styles.listEmpty,
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
            <Text style={styles.emptyText}>
              {"No active alerts yet.\nSearch for stocks to set your first alert."}
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
    color: colors.muted,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 24,
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
