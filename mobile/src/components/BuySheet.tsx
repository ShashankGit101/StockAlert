import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { colors, mono, spacing } from "@/theme";
import type { Stock } from "@/api/stocks";
import { stocksApi } from "@/api/stocks";

interface Props {
  stock: Stock;
  onClose: () => void;
  onDone: () => void;
  source?: "alert" | "manual";
  doneLabel?: string;
  onAfterConfirm?: () => void | Promise<void>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

export default function BuySheet({
  stock,
  onClose,
  onDone,
  source = "manual",
  doneLabel = "Back to portfolio",
  onAfterConfirm,
}: Props) {
  const [step, setStep] = useState<"form" | "confirm" | "success">("form");
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState(stock.current_price?.toFixed(2) ?? "");
  const sym = stock.currency === "INR" ? "₹" : "$";

  const sharesNum = parseFloat(shares) || 0;
  const priceNum = parseFloat(price) || 0;
  const oldShares = stock.quantity;
  const oldAvg = stock.avg_cost;
  const totalShares = oldShares + sharesNum;
  const newAvg =
    totalShares > 0
      ? (oldShares * oldAvg + sharesNum * priceNum) / totalShares
      : oldAvg;
  const newProfitPct =
    stock.current_price && newAvg > 0
      ? ((stock.current_price - newAvg) / newAvg) * 100
      : null;
  const newThresholdPct =
    stock.threshold_profit_price && newAvg > 0
      ? ((Number(stock.threshold_profit_price) - newAvg) / newAvg) * 100
      : null;

  async function confirm() {
    try {
      await stocksApi.buy(stock.id, { shares: sharesNum, price: priceNum, source });
      if (onAfterConfirm) await onAfterConfirm();
      setStep("success");
    } catch {}
  }

  if (step === "success") {
    return (
      <View style={s.container}>
        <Text style={s.checkmark}>✓</Text>
        <Text style={s.heroTitle}>Buy logged</Text>
        <Text style={s.heroSub}>Cost basis updated. Ladder continues from new position.</Text>
        <View style={s.detailCard}>
          <Row label="New avg cost" value={`${sym}${newAvg.toFixed(2)}`} />
          {newThresholdPct !== null && (
            <Row label="New threshold %" value={`${newThresholdPct.toFixed(2)}%`} />
          )}
          <Row label="Shares total" value={totalShares.toFixed(4)} />
        </View>
        <Text style={s.disclaimer}>Remember to execute this in your brokerage.</Text>
        <TouchableOpacity style={[s.btn, { backgroundColor: colors.green }]} onPress={onDone}>
          <Text style={s.btnText}>{doneLabel}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === "confirm") {
    return (
      <View style={s.container}>
        <View style={[s.heroBox, { backgroundColor: colors.green + "22", borderColor: colors.green }]}>
          <Text style={[s.heroBoxText, { color: colors.green }]}>
            Buying · {sharesNum} shares · {stock.ticker} at {sym}{priceNum.toFixed(2)}
          </Text>
        </View>
        <View style={s.detailCard}>
          <Row label="Total cost" value={`${sym}${(sharesNum * priceNum).toFixed(2)}`} />
          <Row label="Total shares after" value={totalShares.toFixed(4)} />
          <Row label="New avg cost" value={`${sym}${newAvg.toFixed(2)}`} />
          {newThresholdPct !== null && (
            <Row label="New threshold %" value={`${newThresholdPct.toFixed(2)}%`} />
          )}
          {newProfitPct !== null && (
            <Row
              label="New profit % at current"
              value={`${newProfitPct >= 0 ? "+" : ""}${newProfitPct.toFixed(2)}%`}
            />
          )}
          <Row label="Alert status" value="Continues from current position" />
        </View>
        <Text style={s.disclaimer}>
          This only logs in the app. Execute your trade in your brokerage separately.
        </Text>
        <TouchableOpacity style={[s.btn, { backgroundColor: colors.green }]} onPress={confirm}>
          <Text style={s.btnText}>Confirm buy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.cancelBtn} onPress={() => setStep("form")}>
          <Text style={s.cancelText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>Buy {stock.ticker}</Text>
      <Text style={s.sub}>
        {oldShares} shares · avg cost {sym}{oldAvg.toFixed(2)} · current{" "}
        {(stock.profit_pct ?? 0) >= 0 ? "+" : ""}{(stock.profit_pct ?? 0).toFixed(1)}%
      </Text>
      <View style={s.inputRow}>
        <TextInput
          style={[s.input, { flex: 1 }]}
          placeholder="Shares to buy"
          placeholderTextColor={colors.muted}
          keyboardType="decimal-pad"
          value={shares}
          onChangeText={setShares}
        />
        <TextInput
          style={[s.input, { flex: 1 }]}
          placeholder={`Buy price (${sym})`}
          placeholderTextColor={colors.muted}
          keyboardType="decimal-pad"
          value={price}
          onChangeText={setPrice}
        />
      </View>
      {sharesNum > 0 && priceNum > 0 && (
        <>
          <View style={s.detailCard}>
            <Row label="Total shares after" value={totalShares.toFixed(4)} />
            <Row label="New avg cost" value={`${sym}${newAvg.toFixed(2)}`} />
            {newProfitPct !== null && (
              <Row
                label="New profit % at current"
                value={`${newProfitPct >= 0 ? "+" : ""}${newProfitPct.toFixed(2)}%`}
              />
            )}
          </View>
          <View style={[s.infoBox, { backgroundColor: colors.green + "18", borderColor: colors.green + "44" }]}>
            <Text style={[s.infoText, { color: colors.green }]}>
              Profit ladder continues from current position
            </Text>
          </View>
          {newProfitPct !== null && newProfitPct < 0 && (
            <View style={[s.infoBox, { backgroundColor: colors.amber + "18", borderColor: colors.amber + "44" }]}>
              <Text style={[s.infoText, { color: colors.amber }]}>
                Loss ladder recalculates from new avg cost
              </Text>
            </View>
          )}
        </>
      )}
      <TouchableOpacity
        style={[s.btn, { backgroundColor: colors.green, opacity: sharesNum > 0 && priceNum > 0 ? 1 : 0.5 }]}
        disabled={sharesNum <= 0 || priceNum <= 0}
        onPress={() => setStep("confirm")}
      >
        <Text style={s.btnText}>Review and confirm</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
        <Text style={s.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: spacing.lg },
  title: { color: colors.text, fontSize: 20, fontWeight: "800", marginBottom: 4 },
  sub: { color: colors.muted, fontSize: 13, fontFamily: mono, marginBottom: spacing.md },
  inputRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.bg,
    color: colors.text,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: spacing.sm,
    fontSize: 15,
    fontFamily: mono,
  },
  detailCard: {
    backgroundColor: colors.bg,
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  detailLabel: { color: colors.muted, fontSize: 13 },
  detailValue: { color: colors.text, fontSize: 13, fontFamily: mono },
  infoBox: { borderWidth: 1, borderRadius: 8, padding: spacing.sm, marginBottom: spacing.sm },
  infoText: { fontSize: 12, fontWeight: "600" },
  heroBox: { borderWidth: 1, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md },
  heroBoxText: { fontSize: 15, fontWeight: "700" },
  heroTitle: { color: colors.text, fontSize: 22, fontWeight: "800", textAlign: "center", marginTop: 8 },
  heroSub: { color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 4, marginBottom: spacing.md },
  checkmark: { fontSize: 48, textAlign: "center", color: colors.green },
  disclaimer: {
    color: colors.muted,
    fontSize: 11,
    textAlign: "center",
    marginBottom: spacing.md,
    fontStyle: "italic",
  },
  btn: { borderRadius: 10, padding: 14, alignItems: "center", marginBottom: spacing.sm },
  btnText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  cancelBtn: { padding: 14, alignItems: "center" },
  cancelText: { color: colors.muted, fontWeight: "600" },
});
