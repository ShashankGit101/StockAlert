import { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { alertsApi } from "@/api/alerts";
import { stocksApi, type SearchResult } from "@/api/stocks";
import { colors, mono, spacing } from "@/theme";

export default function FirstStockScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [shares, setShares] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearch(text: string) {
    setQuery(text);
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { setResults([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try { setResults(await stocksApi.search(text.trim())); }
      catch { setResults([]); }
      finally { setSearching(false); }
    }, 400);
  }

  async function handleAdd() {
    if (!selected) return;
    const s = parseFloat(shares);
    const c = parseFloat(avgCost);
    if (isNaN(s) || s <= 0) { setError("Enter valid shares."); return; }
    if (isNaN(c) || c <= 0) { setError("Enter valid avg cost."); return; }
    setError(null);
    setLoading(true);
    try {
      await alertsApi.create({ ticker: selected.ticker, direction: "above", target_price: c });
      router.push("/onboarding/all-set");
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to add stock.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.step}>Step 3 of 4</Text>
          <Text style={styles.title}>Add your first stock</Text>
          <Text style={styles.subtitle}>Search for a stock and enter your position.</Text>
        </View>

        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search ticker or company..."
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            value={query}
            onChangeText={handleSearch}
          />
          {searching && <ActivityIndicator color={colors.primary} size="small" />}
        </View>

        {!selected && results.length > 0 && (
          <FlatList
            data={results.slice(0, 5)}
            keyExtractor={(r) => r.ticker}
            keyboardShouldPersistTaps="handled"
            style={styles.resultsList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultRow}
                onPress={() => { setSelected(item); setResults([]); setQuery(`${item.ticker} — ${item.name}`); }}
              >
                <Text style={styles.resultTicker}>{item.ticker}</Text>
                <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        )}

        {selected && (
          <View style={styles.form}>
            {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
            <Text style={styles.label}>Shares owned</Text>
            <TextInput style={styles.input} placeholder="e.g. 10" placeholderTextColor={colors.muted} keyboardType="decimal-pad" value={shares} onChangeText={setShares} />
            <Text style={styles.label}>Average cost per share</Text>
            <TextInput style={styles.input} placeholder="e.g. 150.00" placeholderTextColor={colors.muted} keyboardType="decimal-pad" value={avgCost} onChangeText={setAvgCost} />
          </View>
        )}

        <View style={styles.actions}>
          {selected && (
            <TouchableOpacity style={[styles.addBtn, loading && styles.btnDisabled]} onPress={handleAdd} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.addBtnText}>Add to Portfolio →</Text>}
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.skipBtn} onPress={() => router.push("/onboarding/all-set")}>
            <Text style={styles.skipBtnText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, padding: spacing.lg },
  header: { paddingTop: spacing.xl, marginBottom: spacing.lg },
  step: { color: colors.primary, fontSize: 13, fontWeight: "700", marginBottom: spacing.xs },
  title: { color: colors.text, fontSize: 26, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 15, marginTop: spacing.xs },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: spacing.md, marginBottom: spacing.sm, gap: spacing.sm },
  searchInput: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 13 },
  resultsList: { maxHeight: 200, marginBottom: spacing.sm },
  resultRow: { backgroundColor: colors.card, borderRadius: 10, padding: spacing.md, marginBottom: 4 },
  resultTicker: { color: colors.text, fontWeight: "800", fontSize: 15 },
  resultName: { color: colors.muted, fontSize: 12, marginTop: 2 },
  form: { gap: spacing.xs },
  label: { color: colors.muted, fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16, fontFamily: mono, marginBottom: spacing.sm },
  errorBox: { backgroundColor: colors.red + "22", borderRadius: 8, padding: spacing.sm },
  errorText: { color: colors.red, fontSize: 13 },
  actions: { marginTop: "auto", gap: spacing.sm, paddingBottom: spacing.md },
  addBtn: { backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: "center" },
  addBtnText: { color: colors.white, fontWeight: "800", fontSize: 17 },
  btnDisabled: { opacity: 0.6 },
  skipBtn: { padding: 14, alignItems: "center" },
  skipBtnText: { color: colors.muted, fontWeight: "600" },
});
