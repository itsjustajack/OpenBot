import type { ReactNode } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Face } from "./home-screen";
import type { Theme } from "./theme";
import { VoiceTypingButton } from "./voice-typing";

/**
 * The pieces of a Latch chat: a slim top bar with the Bot's face, message bubbles, a card that asks
 * before a Bot acts (Approve or Discard), and the rounded box to type in at the bottom.
 */

const soft = (theme: Theme) => (theme.dark ? "#2E2F30" : "#ECEDEF");

/** The top bar: back, the Bot's face and name, a grey line under it, and one optional button. */
export function ChatTop({
  theme,
  name,
  about,
  top,
  onBack,
  right,
}: {
  theme: Theme;
  name: string;
  about: string;
  top: number;
  onBack: () => void;
  right?: { label: string; onPress: () => void };
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingTop: top + 8,
        paddingBottom: 10,
        paddingHorizontal: 12,
        backgroundColor: theme.page,
        borderBottomColor: soft(theme),
        borderBottomWidth: 1,
      }}
    >
      <Pressable
        accessibilityLabel="Back"
        accessibilityRole="button"
        hitSlop={10}
        onPress={onBack}
        style={{ width: 28, alignItems: "center" }}
      >
        <Text style={{ color: theme.text, fontSize: 28, fontWeight: "300" }}>
          ‹
        </Text>
      </Pressable>
      <Face name={name} size={36} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.text, fontSize: 17, fontWeight: "600" }}>
          {name}
        </Text>
        <Text style={{ color: theme.grey, fontSize: 12 }}>{about}</Text>
      </View>
      {right ? (
        <Pressable
          accessibilityRole="button"
          onPress={right.onPress}
          style={{
            backgroundColor: theme.raised,
            borderRadius: 16,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text style={{ color: theme.text, fontSize: 13, fontWeight: "600" }}>
            {right.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** One message. Yours sit on the right in the accent colour; the Bot's on the left with its face. */
export function Bubble({
  theme,
  from,
  name,
  text,
  children,
}: {
  theme: Theme;
  from: "you" | "bot";
  name?: string;
  text: string;
  children?: ReactNode;
}) {
  const you = from === "you";
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: you ? "flex-end" : "flex-start",
        alignItems: "flex-end",
        gap: 8,
      }}
    >
      {!you && name ? <Face name={name} size={26} /> : null}
      <View style={{ maxWidth: "80%", gap: 6 }}>
        <View
          style={{
            backgroundColor: you ? theme.accent : theme.card,
            borderColor: you ? theme.accent : soft(theme),
            borderWidth: 1,
            borderRadius: 18,
            borderBottomRightRadius: you ? 6 : 18,
            borderBottomLeftRadius: you ? 18 : 6,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text
            style={{
              color: you ? (theme.dark ? "#062E6F" : "#FFFFFF") : theme.text,
              fontSize: 15,
              lineHeight: 21,
            }}
          >
            {text}
          </Text>
        </View>
        {children}
      </View>
    </View>
  );
}

/** A small card inside the chat, such as a found note or a message waiting to send. */
export function SmallCard({
  theme,
  title,
  text,
  note,
  action,
}: {
  theme: Theme;
  title?: string;
  text: string;
  note?: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderColor: soft(theme),
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 4,
      }}
    >
      {title ? (
        <Text style={{ color: theme.text, fontSize: 13, fontWeight: "600" }}>
          {title}
        </Text>
      ) : null}
      <Text style={{ color: theme.text, fontSize: 14 }}>{text}</Text>
      {note || action ? (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Text style={{ color: theme.grey, fontSize: 12, flex: 1 }}>
            {note ?? ""}
          </Text>
          {action ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={action.onPress}
            >
              <Text
                style={{ color: theme.error, fontSize: 13, fontWeight: "600" }}
              >
                {action.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/**
 * The card a Bot shows before it acts when it isn't sure: what it will do, in plain words, and two
 * buttons. Approve does it; Discard does nothing.
 */
export function ChoiceCard({
  theme,
  name,
  title,
  lines,
  onApprove,
  onDiscard,
  discardLabel = "Discard",
}: {
  theme: Theme;
  name: string;
  title: string;
  lines: string[];
  onApprove: () => void;
  onDiscard: () => void;
  discardLabel?: string;
}) {
  return (
    <View
      accessibilityLabel={`${name} asks: ${title}`}
      style={{
        backgroundColor: theme.card,
        borderColor: theme.dark ? "#3C3D3E" : theme.border,
        borderWidth: 1,
        borderRadius: 18,
        padding: 16,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Face name={name} size={24} />
        <Text
          style={{
            color: theme.accent,
            fontSize: 12,
            fontWeight: "700",
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          {name} asks
        </Text>
      </View>
      <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600" }}>
        {title}
      </Text>
      <View style={{ gap: 4 }}>
        {lines.map((line, index) => (
          <Text
            // biome-ignore lint/suspicious/noArrayIndexKey: the lines of one card never reorder
            key={index}
            style={{ color: theme.grey, fontSize: 14, lineHeight: 20 }}
          >
            • {line}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
        <Pressable
          accessibilityRole="button"
          onPress={onApprove}
          style={({ pressed }) => ({
            flex: 1,
            alignItems: "center",
            backgroundColor: theme.accent,
            borderRadius: 999,
            paddingVertical: 11,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text
            style={{
              color: theme.dark ? "#062E6F" : "#FFFFFF",
              fontSize: 15,
              fontWeight: "600",
            }}
          >
            Approve
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onDiscard}
          style={({ pressed }) => ({
            flex: 1,
            alignItems: "center",
            backgroundColor: pressed ? theme.raised : theme.card,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 999,
            paddingVertical: 11,
          })}
        >
          <Text style={{ color: theme.text, fontSize: 15, fontWeight: "600" }}>
            {discardLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/** The rounded box at the bottom to type or speak into, with the round send button. */
export function Composer({
  theme,
  value,
  onChange,
  onSend,
  placeholder,
  disabled,
  busy,
  bottom,
}: {
  theme: Theme;
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  placeholder: string;
  disabled?: boolean;
  busy?: boolean;
  bottom: number;
}) {
  const ready = !disabled && !busy && value.trim().length > 0;
  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: bottom + 10,
        backgroundColor: theme.page,
      }}
    >
      <View
        style={{
          backgroundColor: theme.card,
          borderColor: theme.dark ? "#3C3D3E" : theme.border,
          borderWidth: 1,
          borderRadius: 22,
          paddingHorizontal: 14,
          paddingTop: 8,
          paddingBottom: 8,
          gap: 4,
        }}
      >
        <TextInput
          accessibilityLabel={placeholder}
          editable={!disabled && !busy}
          multiline
          onChangeText={onChange}
          placeholder={busy ? "Working…" : placeholder}
          placeholderTextColor={theme.grey}
          style={{
            color: theme.text,
            fontSize: 16,
            minHeight: 24,
            maxHeight: 120,
            paddingVertical: 4,
          }}
          value={value}
        />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <VoiceTypingButton
              disabled={disabled || busy}
              onText={onChange}
              text={value}
              theme={theme}
            />
          </View>
          <Pressable
            accessibilityLabel="Send"
            accessibilityRole="button"
            disabled={!ready}
            onPress={onSend}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.send,
              opacity: ready ? 1 : 0.4,
            }}
          >
            <Text
              style={{ color: theme.sendIcon, fontSize: 18, fontWeight: "700" }}
            >
              ↑
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
