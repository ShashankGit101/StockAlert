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
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import { colors, spacing } from "@/theme";

export default function RegisterScreen() {
  const router = useRouter();
  const { setToken } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { access_token } = await authApi.register(email.trim(), password);
      await setToken(access_token);
      router.replace("/onboarding/notifications");
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ?? "Registration failed. Please try again.";
      setError(typeof message === "string" ? message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoArea}>
          <Text style={styles.appName}>StockAlert</Text>
          <Text style={styles.tagline}>Real-time price alerts for every trader</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>Create Account</Text>

          {error != null && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor={colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.muted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor={colors.muted}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!loading}
            onSubmitEditing={handleRegister}
            returnKeyType="go"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => router.push("/login")}
          disabled={loading}
        >
          <Text style={styles.linkText}>
            Already have an account?{" "}
            <Text style={styles.linkHighlight}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.md,
  },
  logoArea: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  appName: {
    color: colors.primary,
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: 1,
  },
  tagline: {
    color: colors.muted,
    fontSize: 14,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  form: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: spacing.md,
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
  input: {
    backgroundColor: colors.bg,
    color: colors.text,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: spacing.md,
    fontSize: 16,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
  linkRow: {
    alignItems: "center",
    padding: spacing.sm,
  },
  linkText: {
    color: colors.muted,
    fontSize: 14,
  },
  linkHighlight: {
    color: colors.primary,
    fontWeight: "600",
  },
});
