import { useEffect, useState } from "react";
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
import { userApi } from "@/api/user";
import { colors, spacing } from "@/theme";

export default function EditProfileScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    userApi.get().then((u) => {
      setName(u.name ?? "");
      setEmail(u.email ?? "");
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await userApi.update({ name, email });
      setSuccess(true);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.fieldLabel}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor={colors.muted}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <Text style={styles.fieldLabel}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="your@email.com"
          placeholderTextColor={colors.muted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {error && <Text style={styles.errorText}>{error}</Text>}
        {success && <Text style={styles.successText}>Profile saved.</Text>}

        <TouchableOpacity
          style={[styles.saveBtn, { opacity: saving ? 0.6 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  fieldLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 4,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    marginBottom: spacing.sm,
  },
  errorText: { color: colors.red, fontSize: 13, marginBottom: spacing.sm },
  successText: { color: colors.green, fontSize: 13, marginBottom: spacing.sm },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    marginTop: spacing.md,
  },
  saveBtnText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  cancelBtn: { padding: 15, alignItems: "center" },
  cancelText: { color: colors.muted, fontWeight: "600" },
});
