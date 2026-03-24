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
  onAfterConfirm?: (sellType: "full" | "partial") => void | Promise<void>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

export default function SellSheet({
  stock,
  onClose,
  onDone,
  source = "manual",
  doneLabel = "Back to portfolio",
  onAfterConfirm,
}: Props) {
  const [step, setStep] = useState<"form" | "confirm" | "success">("form");
  const [sellType, setSellType] = useState<"full" | "partial">("full");
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState(stock.current_price?.toFixed(2) ?? "");
  const sym = stock.currency === "INR" ? "₹" : "$";

  const priceNum = parseFloat(price) || 0;
  const sharesNum = sellType === "full" ? stock.quantity : parseFloat(shares) || 0;
  const proceeds = sharesNum * priceNum;
  const costBasis = sharesNum * stock.avg_cost;
  const profit = proceeds - costBasis;
  const remaining = stock.quantity - sharesNum;

  async function confirm() {
    try {
      await stocksApi.sell(stock.id, {
        sell_type: sellType,
        shares: sellType === "partial" ? sharesNum : undefined,
        price: priceNum,
        source,
      });
      if (onAfterConfirm) await onAfterConfirm(sellType);
      setStep("success");
    } catch {}
  }

  if (step === "success") {
    if (sellType === "full") {
      return (
        <View style={s.container}>
          <Text style={s.checkmark}>✓</Text>
          <Text style={s.heroTitle}>Sold in full</Text>
          <Text style={s.heroSub}>
            {stock.ticker} marked inactive. All alerts stopped. History kept forever.
          </Text>
          <View style={s.detailCard}>
            <Row label="Shares sold" value={String(sharesNum)} />
            <Row label="Sell price" value={`${sym}${priceNum.toFixed(2)}`} />
            <Row label="Bought price" value={`${sym}${stock.avg_cost.toFixed(2)}`} />
            <Row label="Total profit" value={`${profit >= 0 ? "+" : ""}${sym}${profit.toFixed(2)}`} />
            <Row label="Alert status" value="Stopped" />
          </View>
          <Text style={s.disclaimer}>Remember to execute this in your brokerage.</Text>
          <TouchableOpacity style={[s.btn, { backgroundColor: colors.primary }]} onPress={onDone}>
            <Text style={s.btnText}>{doneLabel}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={s.container}>
        <Text style={s.checkmark}>✓</Text>
        <Text style={s.heroTitle}>Partial sell logged</Text>
        <Text style={s.heroSub}>Quantity updated. Alerts continue unchanged.</Text>
        <View style={s.detailCard}>
          <Row label="Shares sold" value={String(sharesNum)} />
          <Row label="Profit on sold" value={`${profit >= 0 ? "+" : ""}${sym}${profit.toFixed(2)}`} />
          <Row label="Remaining shares" value={remaining.toFixed(4)} />
          <Row label="Cost basis" value="Unchanged" />
          <Row label="Current rung" value="Unchanged" />
          <Row label="Alerts" value="Continuing" />
        </View>
        <Text style={s.disclaimer}>Remember to execute this in your brokerage.</Text>
        <TouchableOpacity style={[s.btn, { backgroundColor: colors.primary }]} onPress={onDone}>
          <Text style={s.btnText}>{doneLabel}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === "confirm") {
    return (
      <View style={s.container}>
        <View style={[s.heroBox, { backgroundColor: colors.red + "22", borderColor: colors.red }]}>
          <Text style={[s.heroBoxText, { color: colors.red }]}>
            Selling · {sharesNum} shares · {stock.ticker} at {sym}{priceNum.toFixed(2)}
          </Text>
        </View>
        <View style={s.detailCard}>
          <Row label="Total proceeds" value={`${sym}${proceeds.toFixed(2)}`} />
          <Row label="Cost basis" value={`${sym}${costBasis.toFixed(2)}`} />
          <Row label="Profit" value={`${profit >= 0 ? "+" : ""}${sym}${profit.toFixed(2)}`} />
          <Row label="Shares remaining" value={remaining.toFixed(4)} />
          <Row label="Alert status" value={sellType === "full" ? "Stopped" : "Continuing"} />
        </View>
        <Text style={s.disclaimer}>Execute your trade in your brokerage separately.</Text>
        <TouchableOpacity style={[s.btn, { backgroundColor: colors.red }]} onPress={confirm}>
          <Text style={s.btnText}>Confirm sell</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.cancelBtn} onPress={() => setStep("form")}>
          <Text style={s.cancelText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>Sell {stock.ticker}</Text>
      <Text style={s.sub}>
        {stock.quantity} shares · avg cost {sym}{stock.avg_cost.toFixed(2)} · current{" "}
        {(stock.profit_pct ?? 0) >= 0 ? "+" : ""}{(stock.profit_pct ?? 0).toFixed(1)}%
      </Text>
      <View style={s.typeRow}>
        {(["full", "partial"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.typeBtn, sellType === t && s.typeBtnActive]}
            onPress={() => setSellType(t)}
          >
            <Text style={[s.typeBtnText, sellType === t && s.typeBtnTextActive]}>
              {t === "full" ? "Full sell" : "Partial sell"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {sellType === "partial" && (
        <TextInput
          style={s.input}
          placeholder="Shares to sell"
          placeholderTextColor={colors.muted}
          keyboardType="decimal-pad"
          value={shares}
          onChangeText={setShares}
        />
      )}
      <TextInput
        style={s.input}
        placeholder={`Sell price (${sym})`}
        placeholderTextColor={colors.muted}
        keyboardType="decimal-pad"
        value={price}
        onChangeText={setPrice}
      />
      {priceNum > 0 && (
        <>
          <View style={s.detailCard}>
            <Row label="Shares selling" value={String(sharesNum)} />
            <Row label="Shares remaining" value={Math.max(0, remaining).toFixed(4)} />
            <Row label="Total proceeds" value={`${sym}${proceeds.toFixed(2)}`} />
            <Row label="Profit realised" value={`${profit >= 0 ? "+" : ""}${sym}${profit.toFixed(2)}`} />
          </View>
          {sellType === "full" ? (
            <View style={[s.infoBox, { backgroundColor: colors.red + "18", borderColor: colors.red + "44" }]}>
              <Text style={[s.infoText, { color: colors.red }]}>
                Alerts will stop. Stock marked inactive but kept in history.
              </Text>
            </View>
          ) : (
            <View style={[s.infoBox, { backgroundColor: colors.grey + "18", borderColor: colors.grey + "44" }]}>
              <Text style={[s.infoText, { color: colors.grey }]}>
                Alerts continue unchanged. Only quantity reduces.
              </Text>
            </View>
          )}
        </>
      )}
      <TouchableOpacity
        style={[s.btn, { backgroundColor: colors.red, opacity: priceNum > 0 ? 1 : 0.5 }]}
        disabled={priceNum <= 0}
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
  typeRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  typeBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: "center",
  },
  typeBtnActive: { backgroundColor: colors.primary + "22", borderColor: colors.primary },
  typeBtnText: { color: colors.muted, fontWeight: "600" },
  typeBtnTextActive: { color: colors.primary },
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
