import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, spacing } from "@/theme";

interface StockRowProps {
  ticker: string;
  price: number | null;
  change_percent: number | null;
  loading?: boolean;
  onPress?: () => void;
}

function formatPrice(price: number): string {
  return price.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatChange(change: number): string {
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}%`;
}

export default function StockRow({
  ticker,
  price,
  change_percent,
  loading = false,
  onPress,
}: StockRowProps) {
  if (loading) {
    return (
      <View style={styles.row}>
        <View style={styles.left}>
          <View style={styles.placeholderTicker} />
        </View>
        <View style={styles.right}>
          <View style={styles.placeholderPrice} />
          <View style={styles.placeholderChange} />
        </View>
      </View>
    );
  }

  const isPositive = change_percent != null && change_percent >= 0;
  const changeColor = change_percent == null
    ? colors.muted
    : isPositive
    ? colors.green
    : colors.red;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.left}>
        <Text style={styles.ticker}>{ticker}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.price}>
          {price != null ? formatPrice(price) : "—"}
        </Text>
        {change_percent != null && (
          <Text style={[styles.change, { color: changeColor }]}>
            {formatChange(change_percent)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flex: 1,
  },
  right: {
    alignItems: "flex-end",
  },
  ticker: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 16,
  },
  price: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  change: {
    fontSize: 13,
    marginTop: 2,
  },
  placeholderTicker: {
    width: 60,
    height: 16,
    backgroundColor: colors.border,
    borderRadius: 4,
  },
  placeholderPrice: {
    width: 80,
    height: 16,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: 4,
  },
  placeholderChange: {
    width: 50,
    height: 13,
    backgroundColor: colors.border,
    borderRadius: 4,
  },
});
