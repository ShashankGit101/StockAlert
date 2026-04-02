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
/*
  useEffect(() => {
    if (!hydrated) return;

    const inTabs = segments[0] === "(tabs)";
    const inOnboarding = segments[0] === "onboarding";
    const inAuth = segments[0] === "login" || segments[0] === "register";

    if (!token) {
      // Not logged in — send to login unless already on an auth/onboarding screen
      if (!inAuth && !inOnboarding) {
        router.replace("/login");
      }
    } else {
      // Logged in — get off auth/onboarding screens
      // Stack screens (edit-profile, change-password, stock/[ticker]) are allowed
      if (inAuth || inOnboarding) {
        router.replace("/(tabs)");
      }
    }
  }, [token, hydrated, segments]); */

  useEffect(() => {
    // Wait until we are sure the token has been checked from storage
    if (!hydrated) return;

    const inTabs = segments[0] === "(tabs)";
    const inOnboarding = segments[0] === "onboarding";
    const inAuth = segments[0] === "login" || segments[0] === "register";

    if (!token) {
      // If NO token and NOT on login/register/onboarding, go to login
      if (!inAuth && !inOnboarding) {
        router.replace("/login");
      }
    } else {
      // If we HAVE a token and we are stuck on Login, go to Home
      if (inAuth || inOnboarding) {
        router.replace("/(tabs)");
      }
    }
  }, [token, hydrated, segments]); // These are the triggers

  // Block render until AsyncStorage hydration completes
  if (!hydrated) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  // Prevent the 1-second flash: if we know we'll be redirected to login,
  // keep showing blank until the routing effect fires and segments update
  const inAuth = segments[0] === "login" || segments[0] === "register";
  const inOnboarding = segments[0] === "onboarding";
 /* if (!token && !inAuth && !inOnboarding) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }
*/
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
            title: "Stock Detail",
            headerBackTitle: "Portfolio",
          })}
        />
        <Stack.Screen
          name="edit-profile"
          options={{ title: "Edit Profile", headerBackTitle: "Settings" }}
        />
        <Stack.Screen
          name="change-password"
          options={{ title: "Change Password", headerBackTitle: "Settings" }}
        />
      </Stack>
    </>
  );
}
