import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { useAuthStore } from "@/store/authStore";
import { colors } from "@/theme";

export default function RootLayout() {
  const { token, hydrated, loadToken } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    loadToken();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const inTabs = segments[0] === "(tabs)";
    if (!token && inTabs) router.replace("/login");
    else if (token && !inTabs) router.replace("/(tabs)");
  }, [token, hydrated, segments]);

  if (!hydrated) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "Sign In", headerShown: false }} />
        <Stack.Screen name="register" options={{ title: "Create Account", headerShown: false }} />
      </Stack>
    </>
  );
}
