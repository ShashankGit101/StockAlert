import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Alert } from "@/api/alerts";
import { colors, spacing } from "@/theme";

interface AlertCardProps {
  alert: Alert;
  onDelete?: (id: number) => void;
  highlighted?: boolean;
}

function formatPrice(price: number): string {
  return price.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function AlertCard({ alert, onDelete, highlighted }: AlertCardProps) {
  const highlightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!highlighted) return;
    // Flash in immediately, hold, then fade out
    highlightAnim.setValue(1);
    const timer = setTimeout(() => {
      Animated.timing(highlightAnim, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: false,
      }).start();
    }, 1000);
    return () => clearTimeout(timer);
  }, [highlighted]);

  const animatedBorderColor = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["transparent", colors.primary],
  });

  const isAbove = alert.direction === "above";

  const directionColor = isAbove ? colors.green : colors.red;
  const directionLabel = isAbove ? "↑ Above" : "↓ Below";

  let statusColor = colors.primary;
  let statusLabel = "Active";
  if (alert.status === "triggered") {
    statusColor = colors.green;
    statusLabel = "Triggered";
  } else if (alert.status === "cancelled") {
    statusColor = colors.muted;
    statusLabel = "Cancelled";
  }

  return (
    <Animated.View style={[styles.card, { borderWidth: 2, borderColor: animatedBorderColor }]}>
      <View style={styles.left}>
        <Text style={styles.ticker}>{alert.ticker}</Text>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: directionColor + "22" }]}>
            <Text style={[styles.badgeText, { color: directionColor }]}>
              {directionLabel}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusColor + "22", marginLeft: spacing.xs }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>
        <Text style={styles.price}>{formatPrice(alert.target_price)}</Text>
      </View>
      <View style={styles.right}>
        {alert.status === "active" && onDelete != null && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => onDelete(alert.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.deleteIcon}>🗑</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flex: 1,
  },
  right: {
    marginLeft: spacing.sm,
    alignItems: "flex-end",
  },
  ticker: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 16,
    marginBottom: spacing.xs,
  },
  badges: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  price: {
    color: colors.muted,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  deleteBtn: {
    padding: spacing.xs,
  },
  deleteIcon: {
    fontSize: 18,
  },
});
