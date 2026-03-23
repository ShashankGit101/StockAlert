import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { holdingsApi } from "@/api/holdings";
import { stocksApi, type SearchResult } from "@/api/stocks";
import { colors, mono, spacing } from "@/theme";
import type { Exchange } from "@/types/portfolio";

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

// ── AddStockModal ─────────────────────────────────────────────────────────────

interface AddStockModalProps {
  result: SearchResult;
  onClose: () => void;
  onAdded: () => void;
}

function AddStockModal({ result, onClose, onAdded }: AddStockModalProps) {
  const [purchasePrice, setPurchasePrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayISO());
  const [thresholdPct, setThresholdPct] = useState("15");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exchange: Exchange = result.ticker.includes(".NS") ? "NSE" : "NYSE";
  const market: "US" | "NSE" = exchange === "NSE" ? "NSE" : "US";
  const currency = exchange === "NSE" ? "INR" : "USD";
  const sym = currency === "INR" ? "₹" : "$";

  // Live-calculated threshold price = purchase_price × (1 + threshold/100)
  const thresholdPrice = useMemo(() => {
    const p = parseFloat(purchasePrice);
    const t = parseFloat(thresholdPct);
    if (isNaN(p) || p <= 0 || isNaN(t) || t <= 0) return null;
    return p * (1 + t / 100);
  }, [purchasePrice, thresholdPct]);

  async function handleAdd() {
    const price = parseFloat(purchasePrice);
    const qty = parseFloat(quantity);
    const pct = parseFloat(thresholdPct);

    if (isNaN(price) || price <= 0) { setError("Enter a valid purchase price."); return; }
    if (isNaN(qty) || qty <= 0)     { setError("Enter a valid quantity."); return; }
    if (!isValidDate(purchaseDate)) { setError("Enter date as YYYY-MM-DD (e.g. 2025-01-15)."); return; }
    if (isNaN(pct) || pct <= 0)     { setError("Enter a valid profit threshold %."); return; }

    setError(null);
    setLoading(true);
    try {
      await holdingsApi.create({
        ticker: result.ticker,
        company_name: result.name,
        market,
        currency: currency as "USD" | "INR",
        original_cost: price,
        quantity: qty,
        purchase_date: purchaseDate,
        threshold_pct: pct,
      });
      onAdded();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to add stock.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheet}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTicker}>{result.ticker}</Text>
            <View style={[styles.exchangeBadge, exchange === "NSE" ? styles.nse : styles.us]}>
              <Text style={[styles.exchangeText, { color: exchange === "NSE" ? colors.amber : colors.primary }]}>
                {exchange}
              </Text>
            </View>
          </View>
          <Text style={styles.sheetName}>{result.name}</Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Field 2: Purchase price */}
          <Text style={styles.label}>Purchase price per share ({sym})</Text>
          <TextInput
            style={styles.input}
            placeholder={`e.g. ${sym}150.00`}
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            value={purchasePrice}
            onChangeText={setPurchasePrice}
            editable={!loading}
          />

          {/* Field 3: Quantity */}
          <Text style={styles.label}>Quantity (number of shares)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 10"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            value={quantity}
            onChangeText={setQuantity}
            editable={!loading}
          />

          {/* Field 4: Purchase date */}
          <Text style={styles.label}>Purchase date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.muted}
            keyboardType="numbers-and-punctuation"
            value={purchaseDate}
            onChangeText={setPurchaseDate}
            editable={!loading}
            maxLength={10}
          />

          {/* Field 5: Profit threshold % */}
          <Text style={styles.label}>Profit threshold %</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 15"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            value={thresholdPct}
            onChangeText={setThresholdPct}
            editable={!loading}
          />

          {/* Field 6: Calculated threshold profit price */}
          <View style={styles.thresholdCard}>
            {thresholdPrice !== null ? (
              <Text style={styles.thresholdText}>
                Alert will fire when price reaches{" "}
                <Text style={styles.thresholdPrice}>
                  {sym}{thresholdPrice.toFixed(2)}
                </Text>
              </Text>
            ) : (
              <Text style={styles.thresholdMuted}>
                Enter purchase price &amp; threshold % to see alert trigger price
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.addBtn, loading && styles.btnDisabled]}
            onPress={handleAdd}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.addBtnText}>Add to Portfolio</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AddStockScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [added, setAdded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); setSearching(false); return; }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        setResults(await stocksApi.search(query.trim()));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search ticker or company (e.g. AAPL, Reliance)"
          placeholderTextColor={colors.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {added && (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>✓  Stock added to your portfolio</Text>
        </View>
      )}

      {searching && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />}

      {!searching && query.trim() === "" && (
        <View style={styles.hint}>
          <Text style={styles.hintIcon}>📈</Text>
          <Text style={styles.hintTitle}>Add stocks to your portfolio</Text>
          <Text style={styles.hintText}>
            Search for US stocks (NYSE/NASDAQ) or Indian stocks (NSE).{"\n"}
            Enter your purchase details to track P&L and set profit alerts.
          </Text>
          <View style={styles.marketRow}>
            <View style={[styles.marketBadge, { backgroundColor: colors.primary + "22" }]}>
              <Text style={[styles.marketBadgeText, { color: colors.primary }]}>NYSE · NASDAQ · USD</Text>
            </View>
            <View style={[styles.marketBadge, { backgroundColor: colors.amber + "22" }]}>
              <Text style={[styles.marketBadgeText, { color: colors.amber }]}>NSE · INR</Text>
            </View>
          </View>
        </View>
      )}

      {!searching && query.trim() !== "" && results.length === 0 && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>No results for "{query}"</Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(r) => r.ticker}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const exchange: Exchange = item.ticker.includes(".NS") ? "NSE" : "NYSE";
          return (
            <TouchableOpacity
              style={styles.resultRow}
              onPress={() => { setSelected(item); setAdded(false); }}
              activeOpacity={0.7}
            >
              <View style={styles.resultLeft}>
                <Text style={styles.resultTicker}>{item.ticker}</Text>
                <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
              </View>
              <View style={[styles.exchangeBadge, exchange === "NSE" ? styles.nse : styles.us]}>
                <Text style={[styles.exchangeText, { color: exchange === "NSE" ? colors.amber : colors.primary }]}>
                  {exchange}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.list}
      />

      {selected && (
        <AddStockModal
          result={selected}
          onClose={() => setSelected(null)}
          onAdded={() => { setSelected(null); setAdded(true); setQuery(""); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 13 },
  clearText: { color: colors.muted, fontSize: 15 },
  successBanner: {
    backgroundColor: colors.green + "22",
    borderRadius: 8,
    marginHorizontal: spacing.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  successText: { color: colors.green, fontWeight: "600" },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  resultRow: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultLeft: { flex: 1 },
  resultTicker: { color: colors.text, fontWeight: "800", fontSize: 16, marginBottom: 2 },
  resultName: { color: colors.muted, fontSize: 13 },
  exchangeBadge: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3 },
  us: { backgroundColor: colors.primary + "22" },
  nse: { backgroundColor: colors.amber + "22" },
  exchangeText: { fontSize: 11, fontWeight: "700" },
  hint: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  hintIcon: { fontSize: 48, marginBottom: spacing.md },
  hintTitle: { color: colors.text, fontSize: 17, fontWeight: "700", marginBottom: spacing.sm },
  hintText: { color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 22 },
  marketRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  marketBadge: { borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  marketBadgeText: { fontSize: 12, fontWeight: "700" },
  // ── Modal ──────────────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheetScroll: { maxHeight: "90%" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xl + spacing.lg,
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 4 },
  sheetTicker: { color: colors.text, fontSize: 24, fontWeight: "800" },
  sheetName: { color: colors.muted, fontSize: 13, marginBottom: spacing.md },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.bg,
    color: colors.text,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: mono,
    marginBottom: spacing.sm,
  },
  thresholdCard: {
    backgroundColor: colors.green + "18",
    borderColor: colors.green + "44",
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  thresholdText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  thresholdPrice: {
    color: colors.green,
    fontWeight: "700",
    fontFamily: mono,
  },
  thresholdMuted: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  errorBox: { backgroundColor: colors.red + "22", borderRadius: 8, padding: spacing.sm, marginBottom: spacing.sm },
  errorText: { color: colors.red, fontSize: 13 },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, padding: 14, alignItems: "center", marginBottom: spacing.sm },
  addBtnText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  btnDisabled: { opacity: 0.6 },
  cancelBtn: { padding: 14, alignItems: "center" },
  cancelBtnText: { color: colors.muted, fontWeight: "600" },
});
