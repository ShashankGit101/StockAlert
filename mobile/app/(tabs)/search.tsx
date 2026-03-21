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
import { alertsApi, type AlertDirection } from "@/api/alerts";
import { stocksApi, type SearchResult } from "@/api/stocks";
import { colors, spacing } from "@/theme";

interface CreateAlertModalProps {
  visible: boolean;
  ticker: string;
  onClose: () => void;
  onCreated: () => void;
}

function CreateAlertModal({ visible, ticker, onClose, onCreated }: CreateAlertModalProps) {
  const [direction, setDirection] = useState<AlertDirection>("above");
  const [targetPrice, setTargetPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetState() {
    setDirection("above");
    setTargetPrice("");
    setError(null);
    setLoading(false);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  async function handleCreate() {
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      setError("Please enter a valid target price.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await alertsApi.create({
        ticker,
        direction,
        target_price: price,
      });
      resetState();
      onCreated();
    } catch (err: any) {
      const message = err?.response?.data?.detail ?? "Failed to create alert.";
      setError(typeof message === "string" ? message : "Failed to create alert.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.modalSheet}>
          <Text style={styles.modalTicker}>{ticker}</Text>
          <Text style={styles.modalSubtitle}>Create Price Alert</Text>

          {error != null && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>Direction</Text>
          <View style={styles.directionRow}>
            <TouchableOpacity
              style={[
                styles.directionBtn,
                direction === "above" && styles.directionBtnActive,
              ]}
              onPress={() => setDirection("above")}
              disabled={loading}
            >
              <Text
                style={[
                  styles.directionBtnText,
                  direction === "above" && styles.directionBtnTextActive,
                ]}
              >
                Above ↑
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.directionBtn,
                direction === "below" && styles.directionBtnActive,
              ]}
              onPress={() => setDirection("below")}
              disabled={loading}
            >
              <Text
                style={[
                  styles.directionBtnText,
                  direction === "below" && styles.directionBtnTextActive,
                ]}
              >
                Below ↓
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Target Price</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 150.00"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            value={targetPrice}
            onChangeText={setTargetPrice}
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.createBtn, loading && styles.btnDisabled]}
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.createBtnText}>Create Alert</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleClose}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await stocksApi.search(query.trim());
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleSelectResult(ticker: string) {
    setSelectedTicker(ticker);
  }

  function handleModalClose() {
    setSelectedTicker(null);
  }

  function handleAlertCreated() {
    setSelectedTicker(null);
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by ticker or company name..."
          placeholderTextColor={colors.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => setQuery("")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {!loading && query.trim() === "" && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Search for a stock to create an alert</Text>
        </View>
      )}

      {!loading && query.trim() !== "" && results.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No results found for "{query}"</Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => item.ticker}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.resultRow}
            onPress={() => handleSelectResult(item.ticker)}
            activeOpacity={0.7}
          >
            <Text style={styles.resultTicker}>{item.ticker}</Text>
            <Text style={styles.resultName} numberOfLines={1}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
      />

      {selectedTicker != null && (
        <CreateAlertModal
          visible={selectedTicker != null}
          ticker={selectedTicker}
          onClose={handleModalClose}
          onCreated={handleAlertCreated}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 12,
  },
  clearBtn: {
    padding: spacing.xs,
  },
  clearBtnText: {
    color: colors.muted,
    fontSize: 16,
  },
  loadingRow: {
    padding: spacing.md,
    alignItems: "center",
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  resultRow: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  resultTicker: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 2,
  },
  resultName: {
    color: colors.muted,
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 15,
    textAlign: "center",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xl + spacing.md,
  },
  modalTicker: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  directionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  directionBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    alignItems: "center",
  },
  directionBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  directionBtnText: {
    color: colors.muted,
    fontWeight: "600",
    fontSize: 15,
  },
  directionBtnTextActive: {
    color: colors.white,
  },
  input: {
    backgroundColor: colors.bg,
    color: colors.text,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  createBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  createBtnText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
  cancelBtn: {
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  cancelBtnText: {
    color: colors.muted,
    fontWeight: "600",
    fontSize: 15,
  },
  errorBox: {
    backgroundColor: colors.red + "22",
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.red,
    fontSize: 14,
  },
});
