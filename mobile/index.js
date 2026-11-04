// The app's start: expo-router's screens, plus the handler that draws the home-screen widgets.
import "expo-router/entry";
import { registerWidgetTaskHandler } from "react-native-android-widget";
import { load } from "./src/phone-bot";
import { widgetTaskHandler } from "./src/widgets";

registerWidgetTaskHandler(widgetTaskHandler(load));
