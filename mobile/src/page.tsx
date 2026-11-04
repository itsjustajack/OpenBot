import { router } from "expo-router";
import type { ReactNode } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Theme } from "./theme";

/**
 * A Latch page: the calm page colour, a slim top bar with back and the page's name, and the page
 * scrolling below with pull to refresh.
 */
export function LatchPage({
  theme,
  title,
  refreshing,
  onRefresh,
  children,
}: {
  theme: Theme;
  title: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: theme.page }}>
      <StatusBar
        backgroundColor={theme.page}
        barStyle={theme.dark ? "light-content" : "dark-content"}
      />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingTop: insets.top + 8,
          paddingBottom: 10,
          paddingHorizontal: 12,
        }}
      >
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() =>
            router.canGoBack() ? router.back() : router.push("/")
          }
          style={{ width: 28, alignItems: "center" }}
        >
          <Text style={{ color: theme.text, fontSize: 28, fontWeight: "300" }}>
            ‹
          </Text>
        </Pressable>
        <Text
          accessibilityRole="header"
          style={{ color: theme.text, fontSize: 20, fontWeight: "600" }}
        >
          {title}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 8,
          paddingBottom: insets.bottom + 32,
          gap: 12,
        }}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              onRefresh={onRefresh}
              refreshing={Boolean(refreshing)}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </View>
  );
}

/** A plain-words problem line in the theme's error colour. */
export function LatchProblem({
  theme,
  message,
}: {
  theme: Theme;
  message?: string;
}) {
  if (!message) return null;
  return (
    <Text accessibilityRole="alert" style={{ color: theme.error }}>
      {message}
    </Text>
  );
}

/** A rounded card with a title, a grey line under it, and an on/off switch on the right. */
export function SwitchCard({
  theme,
  title,
  about,
  value,
  disabled,
  label,
  onChange,
}: {
  theme: Theme;
  title: string;
  about: string;
  value: boolean;
  disabled?: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: theme.card,
        borderColor: theme.dark ? "#2E2F30" : "#ECEDEF",
        borderWidth: 1,
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: theme.text, fontSize: 15, fontWeight: "600" }}>
          {title}
        </Text>
        <Text style={{ color: theme.grey, fontSize: 13 }}>{about}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        disabled={disabled}
        onValueChange={onChange}
        thumbColor="#FFFFFF"
        {...{ activeThumbColor: "#FFFFFF" }}
        trackColor={{ true: theme.accent, false: theme.border }}
        value={value}
      />
    </View>
  );
}
