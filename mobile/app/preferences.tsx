import Constants from "expo-constants";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { requestPinWidget } from "react-native-android-widget";
import { serverConfigured, serverUrl } from "../src/auth";
import { SectionLabel } from "../src/home-screen";
import { Card, Row } from "../src/latch";
import { Chips, LatchPage, SwitchCard } from "../src/page";
import {
  type AccentName,
  type LookMode,
  setPreferences,
  usePreferences,
} from "../src/preferences";
import { ACCENTS, useTheme } from "../src/theme";
import { WIDGETS } from "../src/widgets";

const WIDGET_ROWS = [
  {
    name: WIDGETS.ask,
    title: "Ask a Bot",
    about: "A box that opens the Phone Bot",
  },
  {
    name: WIDGETS.quick,
    title: "Quick starts",
    about: "Remind me, Save a note, My notes",
  },
  {
    name: WIDGETS.notes,
    title: "My notes",
    about: "Your newest notes, and a button for another",
  },
];

const LOOKS: { value: LookMode; label: string }[] = [
  { value: "phone", label: "Match my phone" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/**
 * The phone's own preferences: how the app looks and how careful the Phone Bot is. They are kept
 * on the phone, so they work with no PC and no signal.
 */
export default function PreferencesScreen() {
  const theme = useTheme();
  const preferences = usePreferences();
  const [widgetNote, setWidgetNote] = useState("");
  const version =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "";

  return (
    <LatchPage theme={theme} title="Look and feel">
      <SectionLabel text="Look" theme={theme} />
      <Card theme={theme}>
        <View style={{ padding: 16, gap: 16 }}>
          <Chips
            label="Light or dark"
            onChange={(look) => setPreferences({ look })}
            options={LOOKS}
            theme={theme}
            value={preferences.look}
          />
          <View style={{ gap: 8 }}>
            <Text
              style={{
                color: theme.grey,
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 0.8,
              }}
            >
              COLOUR
            </Text>
            <View
              accessibilityLabel="Colour"
              accessibilityRole="radiogroup"
              style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}
            >
              {(Object.keys(ACCENTS) as AccentName[]).map((name) => {
                const on = preferences.accent === name;
                const colour = theme.dark
                  ? ACCENTS[name].dark
                  : ACCENTS[name].light;
                return (
                  <Pressable
                    accessibilityLabel={ACCENTS[name].name}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    hitSlop={4}
                    key={name}
                    onPress={() => setPreferences({ accent: name })}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: on ? 2 : 0,
                      borderColor: theme.text,
                    }}
                  >
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        backgroundColor: colour,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {on ? (
                        <Text
                          style={{
                            color: theme.dark
                              ? ACCENTS[name].onDark
                              : "#FFFFFF",
                            fontSize: 15,
                            fontWeight: "700",
                          }}
                        >
                          ✓
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Text style={{ color: theme.grey, fontSize: 12 }}>
              {ACCENTS[preferences.accent].name}
            </Text>
          </View>
        </View>
      </Card>
      {theme.dark ? (
        <SwitchCard
          about="A pure black page in dark mode. Easier on the battery"
          icon="circle-half-full"
          label="True black"
          onChange={(trueBlack) => setPreferences({ trueBlack })}
          theme={theme}
          title="True black"
          value={preferences.trueBlack}
        />
      ) : null}

      <SectionLabel text="Phone Bot" theme={theme} />
      <SwitchCard
        about={
          preferences.phoneBotAlwaysAsks
            ? "It shows what it will do and waits for Approve, every time."
            : "It goes ahead when it's sure, and asks you when it isn't."
        }
        icon="shield-check-outline"
        label="Always check with me first"
        onChange={(phoneBotAlwaysAsks) =>
          setPreferences({ phoneBotAlwaysAsks })
        }
        theme={theme}
        title="Always check with me first"
        value={preferences.phoneBotAlwaysAsks}
      />

      {Platform.OS === "android" ? (
        <>
          <SectionLabel text="Home screen widgets" theme={theme} />
          <Card theme={theme}>
            {WIDGET_ROWS.map((widget, index) => (
              <Row
                about={widget.about}
                first={index === 0}
                icon="widgets-outline"
                key={widget.name}
                right={
                  <Pressable
                    accessibilityLabel={`Add ${widget.title} to your home screen`}
                    accessibilityRole="button"
                    onPress={() => {
                      setWidgetNote("");
                      requestPinWidget({ widgetName: widget.name })
                        .then((asked) => {
                          if (!asked)
                            setWidgetNote(
                              "Your phone can't add it from here. Hold an empty spot on your home screen, tap Widgets, and find OpenBot.",
                            );
                        })
                        .catch(() =>
                          setWidgetNote(
                            "Hold an empty spot on your home screen, tap Widgets, and find OpenBot.",
                          ),
                        );
                    }}
                    style={{
                      backgroundColor: theme.accent,
                      borderRadius: 999,
                      paddingHorizontal: 16,
                      minHeight: 36,
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: theme.onAccent,
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                    >
                      Add
                    </Text>
                  </Pressable>
                }
                theme={theme}
                title={widget.title}
              />
            ))}
            {widgetNote ? (
              <Text
                style={{
                  color: theme.grey,
                  fontSize: 12,
                  paddingHorizontal: 16,
                  paddingBottom: 10,
                }}
              >
                {widgetNote}
              </Text>
            ) : null}
          </Card>
        </>
      ) : null}

      <SectionLabel text="Your PC" theme={theme} />
      <Card theme={theme}>
        <Row
          about={
            serverConfigured
              ? `Talks to ${serverUrl}. The Phone Bot still works with no PC and no signal`
              : "Not linked. The phone works on its own"
          }
          first
          icon="monitor"
          theme={theme}
          title={serverConfigured ? "Linked to your PC" : "Your PC"}
        />
      </Card>

      <SectionLabel text="About" theme={theme} />
      <Card theme={theme}>
        <Row
          about={`${version ? `Version ${version}. ` : ""}Your preferences stay on this phone`}
          first
          icon="information-outline"
          theme={theme}
          title="OpenBot for your phone"
        />
      </Card>
    </LatchPage>
  );
}
