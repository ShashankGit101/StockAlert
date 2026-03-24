import { useState } from "react";
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

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSave() {
    setError(null);
    setSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    setSaving(true);
    try {
      await userApi.changePassword({ current_password: currentPassword, new_password: newPassword });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to change password. Check your current password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.fieldLabel}>Current password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter current password"
          placeholderTextColor={colors.muted}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          autoCapitalize="none"
        />

        <Text style={styles.fieldLabel}>New password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter new password"
          placeholderTextColor={colors.muted}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          autoCapitalize="none"
        />

        <Text style={styles.fieldLabel}>Confirm new password</Text>
        <TextInput
          style={styles.input}
          placeholder="Confirm new password"
          placeholderTextColor={colors.muted}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
        />

        {error && <Text style={styles.errorText}>{error}</Text>}
        {success && <Text style={styles.successText}>Password changed successfully.</Text>}

        <TouchableOpacity
          style={[styles.saveBtn, { opacity: saving ? 0.6 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>Change password</Text>
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
