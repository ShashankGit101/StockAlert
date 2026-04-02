import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { marketApi, type MarketSearchResult } from "@/api/market";
import { stocksApi } from "@/api/stocks";
import { colors, mono, spacing } from "@/theme";

type Market = "US" | "NSE";

export default function AddStockScreen() {
  const router = useRouter();
  const [market, setMarket] = useState<Market>("US");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<MarketSearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Form fields
  const [buyPrice, setBuyPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [thresholdPct, setThresholdPct] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    setSearchResult(null);
    try {
      const results = await marketApi.search(query.trim(), market);
      if (results.length === 0) {
        setSearchError(`No ${market} stocks found for "${query}"`);
      } else {
        setSearchResult(results[0]);
        if (results[0].current_price) {
          setBuyPrice(results[0].current_price.toFixed(2));
        }
      }
    } catch {
      setSearchError("Search failed. Check your connection.");
    } finally {
      setSearching(false);
    }
  }

  const sym = market === "NSE" ? "₹" : "$";
  const buyPriceNum = parseFloat(buyPrice) || 0;
  const thresholdNum = parseFloat(thresholdPct) || 0;
  const alertPrice = buyPriceNum > 0 && thresholdNum > 0
    ? buyPriceNum * (1 + thresholdNum / 100)
    : null;

  async function handleSubmit() {
    if (!searchResult) return;
    const bp = parseFloat(buyPrice);
    const qty = parseFloat(quantity);
    const tp = parseFloat(thresholdPct);
    if (!bp || !qty || !tp || !purchaseDate) {
      setSubmitError("Please fill in all fields.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await stocksApi.create({
        ticker: searchResult.ticker,
        company_name: searchResult.name,
        market: searchResult.exchange === "NSE" ? "NSE" : "US",
        currency: searchResult.currency,
        buy_price: bp,
        quantity: qty,
        purchase_date: purchaseDate,
        threshold_pct: tp,
      });
      router.replace("/(tabs)");
    } catch (e: any) {
      setSubmitError(e?.response?.data?.detail ?? "Failed to add stock.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Add stock</Text>
          <Text style={styles.pageSubtitle}>Track a new position</Text>
        </View>

        {/* Market selector */}
        <View style={styles.marketRow}>
          {(["US", "NSE"] as Market[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.marketBtn, market === m && styles.marketBtnActive]}
              onPress={() => { setMarket(m); setSearchResult(null); setQuery(""); }}
            >
              <Text style={[styles.marketBtnText, market === m && styles.marketBtnTextActive]}>
                {m === "US" ? "US · NYSE/NASDAQ" : "India · NSE"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Ticker search */}
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder={market === "US" ? "e.g. AAPL" : "e.g. RELIANCE"}
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searching}>
            {searching ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.searchBtnText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>

        {searchError && <Text style={styles.errorText}>{searchError}</Text>}

        {/* Search result card */}
        {searchResult && (
          <View style={styles.resultCard}>
            <View style={styles.resultRow}>
              <View>
                <Text style={styles.resultTicker}>{searchResult.ticker}</Text>
                <Text style={styles.resultName}>{searchResult.name}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.resultExchange}>{searchResult.exchange}</Text>
                {searchResult.current_price && (
                  <Text style={styles.resultPrice}>
                    {sym}{searchResult.current_price.toFixed(2)}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Form fields (only shown after search result) */}
        {searchResult && (
          <>
            <Text style={styles.fieldLabel}>Buy price per share ({sym})</Text>
            <TextInput
              style={styles.input}
              placeholder={`${sym}0.00`}
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              value={buyPrice}
              onChangeText={setBuyPrice}
            />

            <Text style={styles.fieldLabel}>Quantity (number of shares)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 10"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              value={quantity}
              onChangeText={setQuantity}
            />

            <Text style={styles.fieldLabel}>Purchase date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.muted}
              value={purchaseDate}
              onChangeText={setPurchaseDate}
            />

            <Text style={styles.fieldLabel}>Profit threshold %</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 15"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              value={thresholdPct}
              onChangeText={setThresholdPct}
            />

            {alertPrice !== null && (
              <View style={styles.alertPreview}>
                <Text style={styles.alertPreviewText}>
                  Alert will fire when price reaches {sym}{alertPrice.toFixed(2)}
                </Text>
              </View>
            )}

            {submitError && <Text style={styles.errorText}>{submitError}</Text>}

            <TouchableOpacity
              style={[styles.submitBtn, { opacity: submitting ? 0.6 : 1 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.submitBtnText}>Add to portfolio</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { marginBottom: spacing.lg },
  pageTitle: { color: colors.text, fontSize: 26, fontWeight: "800" },
  pageSubtitle: { color: colors.muted, fontSize: 13, marginTop: 2 },
  marketRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  marketBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.card,
  },
  marketBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  marketBtnText: { color: colors.muted, fontWeight: "700", fontSize: 13 },
  marketBtnTextActive: { color: colors.white },
  searchRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    fontFamily: mono,
    marginBottom: spacing.sm,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 80,
  },
  searchBtnText: { color: colors.white, fontWeight: "700", fontSize: 14 },
  errorText: { color: colors.red, fontSize: 13, marginBottom: spacing.sm },
  resultCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.green + "44",
  },
  resultRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resultTicker: { color: colors.text, fontSize: 16, fontWeight: "800" },
  resultName: { color: colors.muted, fontSize: 12, marginTop: 2 },
  resultExchange: { color: colors.muted, fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  resultPrice: { color: colors.text, fontSize: 15, fontFamily: mono, fontWeight: "700", marginTop: 2 },
  fieldLabel: { color: colors.muted, fontSize: 12, fontWeight: "700", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 },
  alertPreview: {
    backgroundColor: colors.green + "18",
    borderColor: colors.green + "44",
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  alertPreviewText: { color: colors.green, fontSize: 13, fontWeight: "600", fontFamily: mono },
  submitBtn: {
    backgroundColor: colors.text,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  submitBtnText: { color: colors.bg, fontWeight: "800", fontSize: 16 },
});
