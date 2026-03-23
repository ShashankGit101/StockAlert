import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { alertsApi } from "@/api/alerts";
import { stocksApi, type SearchResult } from "@/api/stocks";
import { colors, mono, spacing } from "@/theme";
import type { Exchange } from "@/types/portfolio";

interface AddStockModalProps {
  result: SearchResult;
  onClose: () => void;
  onAdded: () => void;
}

function AddStockModal({ result, onClose, onAdded }: AddStockModalProps) {
  const [shares, setShares] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    const s = parseFloat(shares);
    const c = parseFloat(avgCost);
    if (isNaN(s) || s <= 0) { setError("Enter a valid number of shares."); return; }
    if (isNaN(c) || c <= 0) { setError("Enter a valid average cost."); return; }

    setError(null);
    setLoading(true);
    try {
      // Create a ladder alert at avg cost as the baseline
      await alertsApi.create({
        ticker: result.ticker,
        direction: "above",
        target_price: c,
      });
      onAdded();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to add stock.");
    } finally {
      setLoading(false);
    }
  }

  const exchange: Exchange = result.ticker.includes(".NS") ? "NSE" : "NYSE";
  const currency = exchange === "NSE" ? "INR" : "USD";
  const sym = currency === "INR" ? "₹" : "$";

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTicker}>{result.ticker}</Text>
            <View style={[styles.exchangeBadge, exchange === "NSE" ? styles.nse : styles.us]}>
              <Text style={styles.exchangeText}>{exchange}</Text>
            </View>
          </View>
          <Text style={styles.sheetName}>{result.name}</Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>Shares owned</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 10"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            value={shares}
            onChangeText={setShares}
            editable={!loading}
          />

          <Text style={styles.label}>Average cost per share ({sym})</Text>
          <TextInput
            style={styles.input}
            placeholder={`e.g. ${sym}150.00`}
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            value={avgCost}
            onChangeText={setAvgCost}
            editable={!loading}
          />

          <View style={styles.ladderInfo}>
            <Text style={styles.ladderInfoText}>
              🪜  Ladder alerts will trigger every 2% above/below your avg cost
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.addBtn, loading && styles.btnDisabled]}
            onPress={handleAdd}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.addBtnText}>Add to Portfolio</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

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
            Enter your shares and avg cost to track P&L and ladder alerts.
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
                <Text style={styles.exchangeText}>{exchange}</Text>
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
  successBanner: { backgroundColor: colors.green + "22", borderRadius: 8, marginHorizontal: spacing.md, padding: spacing.sm, marginBottom: spacing.sm },
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
  exchangeText: { fontSize: 11, fontWeight: "700", color: colors.primary },
  hint: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  hintIcon: { fontSize: 48, marginBottom: spacing.md },
  hintTitle: { color: colors.text, fontSize: 17, fontWeight: "700", marginBottom: spacing.sm },
  hintText: { color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 22 },
  marketRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  marketBadge: { borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  marketBadgeText: { fontSize: 12, fontWeight: "700" },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, paddingBottom: spacing.xl + spacing.lg },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 4 },
  sheetTicker: { color: colors.text, fontSize: 24, fontWeight: "800" },
  sheetName: { color: colors.muted, fontSize: 13, marginBottom: spacing.md },
  label: { color: colors.muted, fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, marginTop: spacing.sm },
  input: { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, fontFamily: mono, marginBottom: spacing.sm },
  ladderInfo: { backgroundColor: colors.primary + "18", borderRadius: 8, padding: spacing.sm, marginBottom: spacing.md },
  ladderInfoText: { color: colors.primary, fontSize: 12 },
  errorBox: { backgroundColor: colors.red + "22", borderRadius: 8, padding: spacing.sm, marginBottom: spacing.sm },
  errorText: { color: colors.red, fontSize: 13 },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, padding: 14, alignItems: "center", marginBottom: spacing.sm },
  addBtnText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  btnDisabled: { opacity: 0.6 },
  cancelBtn: { padding: 14, alignItems: "center" },
  cancelBtnText: { color: colors.muted, fontWeight: "600" },
});
