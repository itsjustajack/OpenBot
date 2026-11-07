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
import { BottomBar, Card, faint, Icon, type IconName, Row } from "./latch";
import { faceColour, greeting, type Theme, useTheme } from "./theme";
import { VoiceTypingButton } from "./voice-typing";

/**
 * The front screen and the pieces other screens share: a Bot's face, the small caps section label,
 * and labelled cards of rows. Light or dark with the phone.
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
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 0.8,
        textTransform: "uppercase",
        paddingLeft: 4,
      }}
    >
      {text}
    </Text>
  );
}

export type Count = { key: string; label: string; count: number };

export type RecentChat = {
  key: string;
  title: string;
  about: string;
  icon: IconName;
  onPress: () => void;
};

/**
 * The front screen, in the Latch look: the greeting, the ask box, your Bots' faces in a row, what's
 * happening right now, your recent chats, and the Chats, Bots and Menu bar along the bottom.
 */
export function HomeScreen({
  name,
  hint,
  bots,
  counts,
  recent,
  quickStarts,
  onAsk,
  onBell,
  below,
  menu,
}: {
  name?: string;
  hint?: string;
  bots: HomeBot[];
  counts: Count[];
  recent: RecentChat[];
  quickStarts: QuickStart[];
  onAsk: (text: string) => void;
  onBell?: () => void;
  below?: React.ReactNode;
  menu: (close: () => void) => React.ReactNode;
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
          paddingHorizontal: 16,
          paddingTop: insets.top + 12,
          paddingBottom: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: 48,
            paddingLeft: 4,
          }}
        >
          <Text
            accessibilityRole="header"
            style={{ color: theme.text, fontSize: 20, fontWeight: "600" }}
          >
            {greeting()}
            {name ? `, ${name}` : ""}
          </Text>
          {onBell ? (
            <Pressable
              accessibilityLabel="What needs you"
              accessibilityRole="button"
              onPress={onBell}
              style={{
                width: 48,
                height: 48,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon colour={theme.text} name="bell-outline" size={24} />
            </Pressable>
          ) : null}
        </View>

        <View
          style={{
            backgroundColor: theme.raised,
            borderRadius: 22,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 8,
            marginTop: 6,
            gap: 4,
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
              fontSize: 15,
              minHeight: 44,
              textAlignVertical: "top",
              padding: 0,
            }}
            value={text}
          />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Pressable
              accessibilityLabel={
                showQuick ? "Hide quick starts" : "Show quick starts"
              }
              accessibilityRole="button"
              onPress={() => setShowQuick((now) => !now)}
              style={{
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
                marginLeft: -8,
              }}
            >
              <Icon
                colour={theme.grey}
                name={showQuick ? "close" : "plus"}
                size={24}
              />
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
                backgroundColor: theme.accent,
                opacity: ready ? 1 : 0.4,
              }}
            >
              <Icon colour={theme.onAccent} name="arrow-up" size={22} />
            </Pressable>
          </View>
        </View>

        {showQuick ? (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 10,
            }}
          >
            {quickStarts.map((quick) => (
              <Pressable
                accessibilityRole="button"
                key={quick.label}
                onPress={() => {
                  setText(quick.text);
                  setShowQuick(false);
                }}
                style={{
                  backgroundColor: theme.card,
                  borderColor: faint(theme, 0.6),
                  borderWidth: 0.5,
                  borderRadius: 18,
                  paddingHorizontal: 14,
                  minHeight: 40,
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: theme.text, fontSize: 13 }}>
                  {quick.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {hint ? (
          <Text
            style={{
              color: theme.grey,
              fontSize: 12,
              marginTop: 8,
              paddingLeft: 4,
            }}
          >
            {hint}
          </Text>
        ) : null}

        <Section label="Your Bots" theme={theme}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 12 }}>
            {bots.map((bot) => (
              <Pressable
                accessibilityHint={bot.about}
                accessibilityLabel={`Open ${bot.name}`}
                accessibilityRole="button"
                key={bot.key}
                onPress={bot.onPress}
                style={{ width: "20%", alignItems: "center", gap: 5 }}
              >
                <Face name={bot.name} size={48} />
                <Text
                  numberOfLines={1}
                  style={{ color: theme.text, fontSize: 12 }}
                >
                  {bot.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </Section>

        {counts.length ? (
          <Section label="Right now" theme={theme}>
            <Card theme={theme}>
              <View style={{ flexDirection: "row" }}>
                {counts.map((count, index) => (
                  <View
                    accessible
                    accessibilityLabel={`${count.count} ${count.label}`}
                    key={count.key}
                    style={{
                      flex: 1,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderLeftWidth: index > 0 ? 1 : 0,
                      borderLeftColor: faint(theme, 0.3),
                    }}
                  >
                    <Text
                      style={{
                        color: theme.text,
                        fontSize: 20,
                        fontWeight: "600",
                      }}
                    >
                      {count.count}
                    </Text>
                    <Text style={{ color: theme.grey, fontSize: 11.5 }}>
                      {count.label}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          </Section>
        ) : null}

        <Section label="Recent chats" theme={theme}>
          <Card theme={theme}>
            {recent.map((chat, index) => (
              <Row
                about={chat.about}
                first={index === 0}
                icon={chat.icon}
                key={chat.key}
                onPress={chat.onPress}
                theme={theme}
                title={chat.title}
              />
            ))}
          </Card>
        </Section>
        {below}
      </ScrollView>
      <BottomBar current="chats" menu={menu} theme={theme} />
    </View>
  );
}

/** A small caps label with its card below, 20dp from the section above. */
export function Section({
  theme,
  label,
  children,
}: {
  theme: Theme;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginTop: 20, gap: 6 }}>
      <SectionLabel text={label} theme={theme} />
      {children}
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
  icon?: IconName;
  onPress: () => void;
};

/** A labelled card of rows (icon, name, grey line, arrow), the Latch way of listing places to go. */
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
    <Section label={label} theme={theme}>
      <Card theme={theme}>
        {rows.map((row, index) => (
          <Row
            about={row.about}
            first={index === 0}
            icon={row.icon}
            key={row.key}
            onPress={row.onPress}
            theme={theme}
            title={row.title}
          />
        ))}
      </Card>
    </Section>
  );
}
