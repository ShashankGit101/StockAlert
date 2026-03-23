import { StyleSheet, Text, View } from "react-native";
import { colors, mono, spacing } from "@/theme";

interface LadderBarProps {
  rung: number;       // current rung (can be negative)
  stepPp: number;     // step size in pp, e.g. 2
  totalRungs?: number; // rungs shown each side, default 3
}

export default function LadderBar({ rung, stepPp, totalRungs = 3 }: LadderBarProps) {
  const rungs = Array.from({ length: totalRungs * 2 + 1 }, (_, i) => i - totalRungs);
  const clampedRung = Math.max(-totalRungs, Math.min(totalRungs, rung));

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {rungs.map((r) => {
          const isActive = r === clampedRung;
          const isProfit = r > 0;
          const isLoss = r < 0;
          const isBreakeven = r === 0;

          let bg = colors.border;
          if (isActive) {
            if (isProfit) bg = colors.green;
            else if (isLoss) bg = colors.red;
            else bg = colors.amber;
          } else if (r <= clampedRung) {
            // filled up to current
            if (clampedRung > 0 && r > 0) bg = colors.green + "55";
            else if (clampedRung < 0 && r < 0) bg = colors.red + "55";
          }

          return (
            <View
              key={r}
              style={[
                styles.segment,
                { backgroundColor: bg },
                isBreakeven && styles.breakevenSeg,
                isActive && styles.activeSegment,
              ]}
            />
          );
        })}
      </View>
      <View style={styles.labels}>
        <Text style={styles.label}>{`-${totalRungs * stepPp}%`}</Text>
        <Text style={[styles.label, styles.centerLabel]}>Cost</Text>
        <Text style={styles.label}>{`+${totalRungs * stepPp}%`}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
  },
  bar: {
    flexDirection: "row",
    gap: 3,
    height: 8,
    alignItems: "center",
  },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  breakevenSeg: {
    height: 8,
    borderRadius: 4,
  },
  activeSegment: {
    height: 10,
    borderRadius: 5,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  label: {
    color: colors.muted,
    fontSize: 10,
    fontFamily: mono,
  },
  centerLabel: {
    color: colors.muted,
    textAlign: "center",
  },
});
