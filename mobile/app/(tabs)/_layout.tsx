import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { authApi } from "@/api/auth";
import { colors } from "@/theme";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: colors.primary,
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

function navigateToAlert(router: ReturnType<typeof useRouter>, alertId: number) {
  router.navigate({
    pathname: "/(tabs)/alerts",
    params: { highlightId: String(alertId) },
  });
}

function extractAlertId(response: Notifications.NotificationResponse): number | null {
  const data = response.notification.request.content.data;
  const id = data?.alert_id;
  return id != null ? Number(id) : null;
}

export default function TabLayout() {
  const router = useRouter();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Push token registration
    registerForPushNotificationsAsync()
      .then(async (pushToken) => {
        if (pushToken) {
          try {
            await authApi.updatePushToken(pushToken);
          } catch {
            // Non-fatal
          }
        }
      })
      .catch(() => {});

    // Cold-start: app was killed when notification was tapped
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const alertId = extractAlertId(response);
        if (alertId != null) navigateToAlert(router, alertId);
      }
    });

    // Foreground: show the alert banner (default handler above covers this)
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (_notification) => {}
    );

    // Background / foreground tap: user tapped the notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const alertId = extractAlertId(response);
        if (alertId != null) navigateToAlert(router, alertId);
      }
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Watchlist",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
