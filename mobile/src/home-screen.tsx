import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { faceColour, greeting, type Theme, useTheme } from "./theme";
import { VoiceTypingButton } from "./voice-typing";

/**
 * The front screen, after the preview Jack picked: a greeting, one big "Ask a Bot anything" box,
 * and the Bots below as rounded cards with a soft two-colour face. Light or dark with the phone.
 */

export type HomeBot = {
  key: string;
  name: string;
  about: string;
  onPress: () => void;
};

export type QuickStart = { label: string; text: string };

/** A Bot's face: a round soft colour with two little eyes, the same colour every time. */
export function Face({ name, size = 44 }: { name: string; size?: number }) {
  const eye = {
    position: "absolute" as const,
    top: size * 0.3,
    width: size * 0.1,
    height: size * 0.22,
    borderRadius: size * 0.05,
    backgroundColor: "#1F1F1F",
    transform: [{ rotate: "12deg" }],
  };
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: faceColour(name),
      }}
    >
      <View style={[eye, { left: size * 0.36 }]} />
      <View style={[eye, { left: size * 0.53 }]} />
    </View>
  );
}

export function SectionLabel({ theme, text }: { theme: Theme; text: string }) {
  return (
    <Text
      accessibilityRole="header"
      style={{
        color: theme.accent,
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
        paddingLeft: 6,
      }}
    >
      {text}
    </Text>
  );
}

export function HomeScreen({
  name,
  hint,
  bots,
  quickStarts,
  onAsk,
  footer,
}: {
  name?: string;
  hint: string;
  bots: HomeBot[];
  quickStarts: QuickStart[];
  onAsk: (text: string) => void;
  footer?: React.ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [showQuick, setShowQuick] = useState(false);
  const ready = text.trim().length > 0;

  function send() {
    const words = text.trim();
    if (!words) return;
    setText("");
    onAsk(words);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.page }}>
      <StatusBar
        backgroundColor={theme.page}
        barStyle={theme.dark ? "light-content" : "dark-content"}
      />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: insets.top + 72,
          paddingBottom: insets.bottom + 32,
          gap: 14,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={{
            color: theme.text,
            fontSize: 30,
            fontWeight: "400",
            textAlign: "center",
            marginBottom: 22,
          }}
        >
          {greeting()}
          {name ? `, ${name}` : ""}
        </Text>

        <View
          style={{
            backgroundColor: theme.card,
            borderColor: theme.dark ? "#3C3D3E" : theme.border,
            borderWidth: 1,
            borderRadius: 22,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 10,
            gap: 6,
          }}
        >
          <TextInput
            accessibilityLabel="Ask a Bot anything"
            multiline
            onChangeText={setText}
            placeholder="Ask a Bot anything..."
            placeholderTextColor={theme.grey}
            style={{
              color: theme.text,
              fontSize: 17,
              minHeight: 52,
              textAlignVertical: "top",
              padding: 0,
            }}
            value={text}
          />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Pressable
              accessibilityLabel={
                showQuick ? "Hide quick starts" : "Show quick starts"
              }
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setShowQuick((now) => !now)}
              style={{ width: 32, alignItems: "center" }}
            >
              <Text
                style={{ color: theme.grey, fontSize: 26, fontWeight: "300" }}
              >
                {showQuick ? "×" : "+"}
              </Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <VoiceTypingButton onText={setText} text={text} theme={theme} />
            </View>
            <Pressable
              accessibilityLabel="Send"
              accessibilityRole="button"
              disabled={!ready}
              onPress={send}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.send,
                opacity: ready ? 1 : 0.45,
              }}
            >
              <Text
                style={{
                  color: theme.sendIcon,
                  fontSize: 20,
                  fontWeight: "700",
                }}
              >
                ↑
              </Text>
            </Pressable>
          </View>
        </View>

        {showQuick ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {quickStarts.map((quick) => (
              <Pressable
                accessibilityRole="button"
                key={quick.label}
                onPress={() => {
                  setText(quick.text);
                  setShowQuick(false);
                }}
                style={{
                  backgroundColor: theme.raised,
                  borderRadius: 18,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ color: theme.text, fontSize: 14 }}>
                  {quick.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Text
          style={{
            color: theme.grey,
            fontSize: 14,
            textAlign: "center",
            marginBottom: 30,
          }}
        >
          {hint}
        </Text>

        <SectionLabel text="Explore Bots" theme={theme} />
        {bots.map((bot) => (
          <BotCard bot={bot} key={bot.key} theme={theme} />
        ))}
        {footer}
      </ScrollView>
    </View>
  );
}

/** One Bot as a rounded card: its face, its name, and a grey line on what it does. */
export function BotCard({
  theme,
  bot,
  right,
}: {
  theme: Theme;
  bot: HomeBot;
  right?: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityLabel={`Open ${bot.name}`}
      accessibilityRole="button"
      onPress={bot.onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        backgroundColor: pressed ? theme.raised : theme.card,
        borderColor: theme.dark ? "#2E2F30" : "#ECEDEF",
        borderWidth: 1,
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 14,
      })}
    >
      <Face name={bot.name} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: theme.text, fontSize: 17, fontWeight: "600" }}>
          {bot.name}
        </Text>
        <Text style={{ color: theme.grey, fontSize: 14 }}>{bot.about}</Text>
      </View>
      {right}
    </Pressable>
  );
}

export type MenuRow = {
  key: string;
  title: string;
  about?: string;
  onPress: () => void;
};

/** A labelled card of rows (name, grey line, arrow), the Latch way of listing places to go. */
export function MenuRows({
  theme,
  label,
  rows,
}: {
  theme: Theme;
  label: string;
  rows: MenuRow[];
}) {
  return (
    <View style={{ gap: 8, marginTop: 14 }}>
      <SectionLabel text={label} theme={theme} />
      <View
        style={{
          backgroundColor: theme.card,
          borderColor: theme.dark ? "#2E2F30" : "#ECEDEF",
          borderWidth: 1,
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        {rows.map((row, index) => (
          <Pressable
            accessibilityRole="button"
            key={row.key}
            onPress={row.onPress}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: pressed ? theme.raised : theme.card,
              borderTopWidth: index > 0 ? 0.5 : 0,
              borderTopColor: theme.border,
            })}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={{ color: theme.text, fontSize: 14, fontWeight: "600" }}
              >
                {row.title}
              </Text>
              {row.about ? (
                <Text style={{ color: theme.grey, fontSize: 12 }}>
                  {row.about}
                </Text>
              ) : null}
            </View>
            <Text style={{ color: theme.grey, fontSize: 18 }}>›</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
