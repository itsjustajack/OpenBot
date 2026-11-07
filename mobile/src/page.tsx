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
import { Card, Icon, type IconName, Row } from "./latch";
import type { Theme } from "./theme";

/**
 * A Latch page: the calm page colour, a slim top bar with back and the page's name, and the page
 * scrolling below with pull to refresh. Pages reached from the bottom bar leave out back.
 */
export function LatchPage({
  theme,
  title,
  refreshing,
  onRefresh,
  back = true,
  children,
}: {
  theme: Theme;
  title: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  back?: boolean;
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
          gap: 4,
          minHeight: 48,
          paddingTop: insets.top + 4,
          paddingBottom: 4,
          paddingHorizontal: back ? 4 : 20,
        }}
      >
        {back ? (
          <Pressable
            accessibilityLabel="Back"
            accessibilityRole="button"
            onPress={() =>
              router.canGoBack() ? router.back() : router.push("/")
            }
            style={{
              width: 48,
              height: 48,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon colour={theme.text} name="arrow-left" size={24} />
          </Pressable>
        ) : null}
        <Text
          accessibilityRole="header"
          style={{ color: theme.text, fontSize: 20, fontWeight: "600" }}
        >
          {title}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: insets.bottom + 32,
          gap: 8,
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

/** A Latch card holding one row: an icon, a name, a grey line under it, and an on/off switch. */
export function SwitchCard({
  theme,
  icon,
  title,
  about,
  value,
  disabled,
  label,
  onChange,
}: {
  theme: Theme;
  icon?: IconName;
  title: string;
  about: string;
  value: boolean;
  disabled?: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <Card theme={theme}>
      <SwitchRow
        about={about}
        disabled={disabled}
        first
        icon={icon}
        label={label}
        onChange={onChange}
        theme={theme}
        title={title}
        value={value}
      />
    </Card>
  );
}

/** One Latch row with an on/off switch on the right, for a card of several. */
export function SwitchRow({
  theme,
  icon,
  title,
  about,
  value,
  disabled,
  label,
  first,
  onChange,
}: {
  theme: Theme;
  icon?: IconName;
  title: string;
  about: string;
  value: boolean;
  disabled?: boolean;
  label: string;
  first?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Row
      about={about}
      first={first}
      icon={icon}
      right={
        <Switch
          accessibilityLabel={label}
          disabled={disabled}
          onValueChange={onChange}
          thumbColor="#FFFFFF"
          {...{ activeThumbColor: "#FFFFFF" }}
          trackColor={{ true: theme.accent, false: theme.border }}
          value={value}
        />
      }
      theme={theme}
      title={title}
    />
  );
}

/** A row of round choices under a small grey label: tap one, the rest let go. */
export function Chips<T extends string>({
  theme,
  label,
  options,
  value,
  onChange,
}: {
  theme: Theme;
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          color: theme.grey,
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 0.8,
        }}
      >
        {label.toUpperCase()}
      </Text>
      <View
        accessibilityLabel={label}
        accessibilityRole="radiogroup"
        style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
      >
        {options.map((option) => {
          const on = option.value === value;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              key={option.value}
              onPress={() => onChange(option.value)}
              style={{
                backgroundColor: on ? theme.accent : theme.card,
                borderColor: on ? theme.accent : theme.border,
                borderWidth: 1,
                borderRadius: 999,
                paddingHorizontal: 14,
                minHeight: 40,
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: on ? theme.onAccent : theme.text,
                  fontSize: 13,
                  fontWeight: on ? "600" : "400",
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
