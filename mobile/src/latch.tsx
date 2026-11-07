import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { type ComponentProps, type ReactNode, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Theme } from "./theme";

/**
 * The Latch building blocks for the phone (design/Latch-look-and-feel.md): an accent icon, a card
 * of compact rows, the three-icon bar along the bottom, and the menu that slides up from it.
 */

export type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export function Icon({
  name,
  colour,
  size = 22,
}: {
  name: IconName;
  colour: string;
  size?: number;
}) {
  return (
    <MaterialCommunityIcons
      accessibilityElementsHidden
      color={colour}
      importantForAccessibility="no"
      name={name}
      size={size}
    />
  );
}

/** A faint line: the border colour at a given strength, as Latch draws its edges. */
export function faint(theme: Theme, strength: number): string {
  const alpha = Math.round(strength * 255)
    .toString(16)
    .padStart(2, "0");
  return `${theme.border}${alpha}`;
}

/** A rounded card with a thin faint edge. Rows bring their own padding. */
export function Card({
  theme,
  children,
}: {
  theme: Theme;
  children: ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderColor: faint(theme, 0.4),
        borderWidth: 0.5,
        borderRadius: 16,
        paddingVertical: 4,
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );
}

/**
 * One row: an accent icon, a name, a grey line under it, then whatever sits on the right (an arrow
 * by default when it opens something). A faint line separates it from the row above.
 */
export function Row({
  theme,
  icon,
  title,
  about,
  right,
  first,
  onPress,
  danger,
  leading,
}: {
  theme: Theme;
  icon?: IconName;
  /** Something on the left in place of the icon, such as a Bot's face. */
  leading?: ReactNode;
  title: string;
  about?: string;
  right?: ReactNode;
  first?: boolean;
  onPress?: () => void;
  danger?: boolean;
}) {
  const colour = danger ? theme.error : theme.accent;
  const body = (
    <>
      {first ? null : (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 16,
            right: 16,
            borderTopWidth: 1,
            borderTopColor: faint(theme, 0.2),
          }}
        />
      )}
      {leading ?? (icon ? <Icon colour={colour} name={icon} /> : null)}
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            color: danger ? theme.error : theme.text,
            fontSize: 14,
            fontWeight: "600",
          }}
        >
          {title}
        </Text>
        {about ? (
          <Text style={{ color: theme.grey, fontSize: 11.5 }}>{about}</Text>
        ) : null}
      </View>
      {right === undefined && onPress ? (
        <Icon colour={theme.grey} name="chevron-right" size={20} />
      ) : (
        right
      )}
    </>
  );
  const style = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 10,
  };
  if (!onPress) return <View style={style}>{body}</View>;
  return (
    <Pressable
      accessibilityHint={about}
      accessibilityLabel={title}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        style,
        pressed ? { backgroundColor: theme.raised } : null,
      ]}
    >
      {body}
    </Pressable>
  );
}

/** A small rounded tag in the accent colour, such as "Online" or "2 ask". */
export function Tag({ theme, text }: { theme: Theme; text: string }) {
  return (
    <View
      style={{
        backgroundColor: `${theme.accent}2E`,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}
    >
      <Text style={{ color: theme.accent, fontSize: 11, fontWeight: "700" }}>
        {text}
      </Text>
    </View>
  );
}

export type Place = "chats" | "bots";

/**
 * The bar along the bottom of the main screens: Chats, Bots, and Menu, which slides up the menu.
 * Each button is a full 48dp tap.
 */
export function BottomBar({
  theme,
  current,
  menu,
}: {
  theme: Theme;
  current: Place;
  menu: (close: () => void) => ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const buttons: {
    key: Place | "menu";
    label: string;
    icon: IconName;
    onPress: () => void;
  }[] = [
    {
      key: "chats",
      label: "Chats",
      icon: current === "chats" ? "message" : "message-outline",
      onPress: () => (current === "chats" ? null : router.navigate("/")),
    },
    {
      key: "bots",
      label: "Bots",
      icon: current === "bots" ? "view-grid" : "view-grid-outline",
      onPress: () => (current === "bots" ? null : router.navigate("/bots")),
    },
    {
      key: "menu",
      label: "Menu",
      icon: "menu",
      onPress: () => setOpen(true),
    },
  ];
  return (
    <>
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: "row",
          backgroundColor: theme.page,
          borderTopColor: faint(theme, 0.4),
          borderTopWidth: 0.5,
          paddingBottom: insets.bottom,
        }}
      >
        {buttons.map((button) => {
          const on = button.key === current;
          const colour = on ? theme.accent : theme.grey;
          return (
            <Pressable
              accessibilityLabel={button.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              key={button.key}
              onPress={button.onPress}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                minHeight: 56,
                gap: 2,
              }}
            >
              <Icon colour={colour} name={button.icon} size={24} />
              <Text
                style={{
                  color: colour,
                  fontSize: 11,
                  fontWeight: on ? "700" : "500",
                }}
              >
                {button.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {open ? (
        <Sheet onClose={() => setOpen(false)} theme={theme}>
          {menu(() => setOpen(false))}
        </Sheet>
      ) : null}
    </>
  );
}

/** A sheet that slides up from the bottom over a dimmed page. Tap outside or Back to close. */
export function Sheet({
  theme,
  onClose,
  children,
}: {
  theme: Theme;
  onClose: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible>
      <Pressable
        accessibilityLabel="Close the menu"
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
      />
      <View
        style={{
          maxHeight: "85%",
          backgroundColor: theme.dark
            ? theme.page === "#000000"
              ? "#000000"
              : "#141416"
            : "#F9F9FB",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingTop: 8,
          paddingHorizontal: 12,
          paddingBottom: insets.bottom + 12,
        }}
      >
        <View
          style={{
            alignSelf: "center",
            width: 32,
            height: 3,
            borderRadius: 2,
            backgroundColor: theme.grey,
            opacity: 0.6,
            marginBottom: 10,
          }}
        />
        <ScrollView contentContainerStyle={{ gap: 4 }}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

export type QuickButton = {
  key: string;
  label: string;
  icon: IconName;
  onPress: () => void;
  danger?: boolean;
};

/** A card of up to four icon buttons in a row, for the most-used places. */
export function QuickButtons({
  theme,
  buttons,
}: {
  theme: Theme;
  buttons: QuickButton[];
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: theme.card,
        borderRadius: 12,
        paddingVertical: 6,
      }}
    >
      {buttons.map((button) => {
        const colour = button.danger ? theme.error : theme.accent;
        return (
          <Pressable
            accessibilityLabel={button.label}
            accessibilityRole="button"
            key={button.key}
            onPress={button.onPress}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              minHeight: 60,
              gap: 4,
              borderRadius: 10,
              backgroundColor: pressed ? theme.raised : "transparent",
            })}
          >
            <Icon colour={colour} name={button.icon} />
            <Text
              style={{
                color: button.danger ? theme.error : theme.text,
                fontSize: 11,
              }}
            >
              {button.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
