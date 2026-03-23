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
    const inOnboarding = segments[0] === "onboarding";
    const inAuth = segments[0] === "login" || segments[0] === "register";

    if (!token) {
      // Not logged in — send to login unless already on an auth screen
      // (onboarding screens navigate to /login or /register themselves)
      if (!inAuth && !inOnboarding) {
        router.replace("/login");
      }
    } else {
      // Logged in — get off auth/onboarding screens
      if (inAuth || inOnboarding) {
        router.replace("/(tabs)");
      } else if (!inTabs) {
        router.replace("/(tabs)");
      }
    }
  }, [token, hydrated, segments]);

  if (!hydrated) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen
          name="stock/[ticker]"
          options={({ route }: any) => ({
            title: route.params?.ticker ?? "Stock Detail",
            headerBackTitle: "Portfolio",
          })}
        />
      </Stack>
    </>
  );
}
