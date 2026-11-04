import Constants from "expo-constants";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { requestPinWidget } from "react-native-android-widget";
import { serverConfigured, serverUrl } from "../src/auth";
import { SectionLabel } from "../src/home-screen";
import { Chips, LatchPage, SwitchCard } from "../src/page";
import {
  type AccentName,
  type LookMode,
  setPreferences,
  usePreferences,
} from "../src/preferences";
import { ACCENTS, type Theme, useTheme } from "../src/theme";
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

function Card({
  theme,
  children,
}: {
  theme: Theme;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderColor: theme.dark ? "#2E2F30" : "#ECEDEF",
        borderWidth: 1,
        borderRadius: 18,
        padding: 16,
        gap: 16,
      }}
    >
      {children}
    </View>
  );
}

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
    <LatchPage theme={theme} title="Preferences">
      <SectionLabel text="Look" theme={theme} />
      <Card theme={theme}>
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
              fontSize: 12,
              fontWeight: "700",
              letterSpacing: 1,
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
                          color: theme.dark ? ACCENTS[name].onDark : "#FFFFFF",
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
          <Text style={{ color: theme.grey, fontSize: 13 }}>
            {ACCENTS[preferences.accent].name}
          </Text>
        </View>
      </Card>
      {theme.dark ? (
        <SwitchCard
          about="A pure black page in dark mode. Easier on the battery of most phones."
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
            {WIDGET_ROWS.map((widget) => (
              <View
                key={widget.name}
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 15,
                      fontWeight: "600",
                    }}
                  >
                    {widget.title}
                  </Text>
                  <Text style={{ color: theme.grey, fontSize: 13 }}>
                    {widget.about}
                  </Text>
                </View>
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
                    paddingHorizontal: 14,
                    paddingVertical: 7,
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
              </View>
            ))}
            {widgetNote ? (
              <Text style={{ color: theme.grey, fontSize: 13 }}>
                {widgetNote}
              </Text>
            ) : null}
          </Card>
        </>
      ) : null}

      <SectionLabel text="Your PC" theme={theme} />
      <Card theme={theme}>
        <View style={{ gap: 4 }}>
          <Text style={{ color: theme.text, fontSize: 15, fontWeight: "600" }}>
            {serverConfigured ? "Linked to your PC" : "Not linked to a PC"}
          </Text>
          <Text style={{ color: theme.grey, fontSize: 13 }}>
            {serverConfigured
              ? `This phone talks to ${serverUrl}. The Phone Bot still works with no PC and no signal.`
              : "The phone works on its own. Linking it to your PC is a later step."}
          </Text>
        </View>
      </Card>

      <SectionLabel text="About" theme={theme} />
      <Card theme={theme}>
        <View style={{ gap: 4 }}>
          <Text style={{ color: theme.text, fontSize: 15, fontWeight: "600" }}>
            OpenBot for your phone
          </Text>
          <Text style={{ color: theme.grey, fontSize: 13 }}>
            {version ? `Version ${version}. ` : ""}Your preferences stay on this
            phone.
          </Text>
        </View>
      </Card>
    </LatchPage>
  );
}
