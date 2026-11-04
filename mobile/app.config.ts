import type { ExpoConfig } from "expo/config";

const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
const config: ExpoConfig = {
  name: "OpenBot",
  slug: "openbot",
  version: "0.0.1",
  scheme: "openbotmobile",
  ios: { bundleIdentifier: "ai.openbot.mobile", supportsTablet: true },
  android: { package: "ai.openbot.mobile" },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "./modules/needle/app.plugin.js",
    ["expo-notifications", { defaultChannel: "openbot" }],
    [
      "react-native-android-widget",
      {
        widgets: [
          {
            name: "AskPhoneBot",
            label: "Ask a Bot",
            description: "Opens the Phone Bot. Works with no signal.",
            minWidth: "250dp",
            minHeight: "50dp",
            targetCellWidth: 4,
            targetCellHeight: 1,
            resizeMode: "horizontal",
          },
          {
            name: "QuickStarts",
            label: "Quick starts",
            description: "Remind me, save a note, or see your notes.",
            minWidth: "250dp",
            minHeight: "50dp",
            targetCellWidth: 4,
            targetCellHeight: 1,
            resizeMode: "horizontal",
          },
          {
            name: "PhoneNotes",
            label: "My notes",
            description: "Your newest notes on this phone.",
            minWidth: "250dp",
            minHeight: "180dp",
            targetCellWidth: 4,
            targetCellHeight: 2,
            resizeMode: "horizontal|vertical",
            updatePeriodMillis: 1800000,
          },
        ],
      },
    ],
    [
      "expo-speech-recognition",
      {
        microphonePermission:
          "OpenBot listens only while you tap the mic, to type what you say.",
        speechRecognitionPermission:
          "OpenBot turns your voice into text on this phone.",
        androidSpeechServicePackages: [
          "com.google.android.as",
          "com.google.android.tts",
          "com.google.android.googlequicksearchbox",
        ],
      },
    ],
  ],
  extra: { ...(projectId ? { eas: { projectId } } : {}) },
};
export default config;
