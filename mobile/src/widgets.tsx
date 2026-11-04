import { Platform } from "react-native";
import {
  FlexWidget,
  requestWidgetUpdate,
  TextWidget,
  type WidgetTaskHandlerProps,
} from "react-native-android-widget";
import { getPreferences } from "./preferences";
import { ACCENTS, DARK, faceColour, LIGHT, type Theme } from "./theme";

/**
 * Home-screen widgets for the Android phone. All three work with no PC and no signal: they only
 * open the Phone Bot or show the notes kept on the phone. Each has a light and a dark look, and
 * the phone picks the one that matches its own setting.
 */

export const WIDGETS = {
  ask: "AskPhoneBot",
  quick: "QuickStarts",
  notes: "PhoneNotes",
} as const;

type Hex = `#${string}`;
type Note = { id: string; text: string; at: string };

const QUICK = [
  { label: "Remind me", draft: "Remind me in 10 minutes to " },
  { label: "Save a note", draft: "Note: " },
  { label: "My notes", ask: "Show my notes" },
];

/** A link into the app's Phone Bot: `ask` asks straight away, `draft` only fills in the box. */
export function phoneBotLink(input: { ask?: string; draft?: string } = {}) {
  const query = input.ask
    ? `?ask=${encodeURIComponent(input.ask)}`
    : input.draft
      ? `?draft=${encodeURIComponent(input.draft)}`
      : "";
  return `openbotmobile://phone-bot${query}`;
}

function palette(dark: boolean): Theme {
  const accent = ACCENTS[getPreferences().accent];
  return dark
    ? { ...DARK, accent: accent.dark, onAccent: accent.onDark }
    : { ...LIGHT, accent: accent.light, onAccent: "#FFFFFF" };
}

const hex = (colour: string) => colour as Hex;

function WidgetFace({ name, size }: { name: string; size: number }) {
  return (
    <FlexWidget
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: hex(faceColour(name)),
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        flexGap: Math.round(size * 0.08),
      }}
    >
      <FlexWidget
        style={{
          width: Math.round(size * 0.1),
          height: Math.round(size * 0.22),
          borderRadius: Math.round(size * 0.05),
          backgroundColor: "#1F1F1F",
        }}
      />
      <FlexWidget
        style={{
          width: Math.round(size * 0.1),
          height: Math.round(size * 0.22),
          borderRadius: Math.round(size * 0.05),
          backgroundColor: "#1F1F1F",
        }}
      />
    </FlexWidget>
  );
}

/** One wide pill: the Phone Bot's face and "Ask a Bot anything…". Tapping opens the Phone Bot. */
export function AskWidget({ dark }: { dark: boolean }) {
  const theme = palette(dark);
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: phoneBotLink() }}
      style={{
        width: "match_parent",
        height: "match_parent",
        flexDirection: "row",
        alignItems: "center",
        flexGap: 12,
        paddingHorizontal: 14,
        backgroundColor: hex(theme.card),
        borderRadius: 28,
        borderWidth: 1,
        borderColor: hex(dark ? "#3C3D3E" : theme.border),
      }}
    >
      <WidgetFace name="Phone Bot" size={32} />
      <TextWidget
        style={{ fontSize: 16, color: hex(theme.grey) }}
        text="Ask a Bot anything…"
      />
    </FlexWidget>
  );
}

/** Three round buttons that start the common jobs: a reminder, a note, or your notes. */
export function QuickWidget({ dark }: { dark: boolean }) {
  const theme = palette(dark);
  return (
    <FlexWidget
      style={{
        width: "match_parent",
        height: "match_parent",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 10,
        backgroundColor: hex(theme.card),
        borderRadius: 24,
        borderWidth: 1,
        borderColor: hex(dark ? "#2E2F30" : "#ECEDEF"),
      }}
    >
      {QUICK.map((quick) => (
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: phoneBotLink(quick) }}
          key={quick.label}
          style={{
            backgroundColor: hex(theme.raised),
            borderRadius: 18,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <TextWidget
            style={{ fontSize: 14, color: hex(theme.text) }}
            text={quick.label}
          />
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}

/** The newest notes on the phone, with a button to save another. */
export function NotesWidget({ dark, notes }: { dark: boolean; notes: Note[] }) {
  const theme = palette(dark);
  const shown = notes.slice(0, 3);
  return (
    <FlexWidget
      style={{
        width: "match_parent",
        height: "match_parent",
        flexDirection: "column",
        padding: 14,
        flexGap: 8,
        backgroundColor: hex(theme.card),
        borderRadius: 24,
        borderWidth: 1,
        borderColor: hex(dark ? "#2E2F30" : "#ECEDEF"),
      }}
    >
      <FlexWidget
        style={{
          width: "match_parent",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TextWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: phoneBotLink({ ask: "Show my notes" }) }}
          style={{
            fontSize: 12,
            fontWeight: "700",
            letterSpacing: 0.08,
            color: hex(theme.accent),
          }}
          text="MY NOTES"
        />
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: phoneBotLink({ draft: "Note: " }) }}
          style={{
            backgroundColor: hex(theme.accent),
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 5,
          }}
        >
          <TextWidget
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: hex(theme.onAccent),
            }}
            text="+ Note"
          />
        </FlexWidget>
      </FlexWidget>
      {shown.length === 0 ? (
        <TextWidget
          style={{ fontSize: 14, color: hex(theme.grey) }}
          text={'No notes yet. Tap "+ Note" to save one.'}
        />
      ) : (
        shown.map((note) => (
          <FlexWidget
            clickAction="OPEN_URI"
            clickActionData={{ uri: phoneBotLink({ ask: "Show my notes" }) }}
            key={note.id}
            style={{
              width: "match_parent",
              backgroundColor: hex(theme.raised),
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <TextWidget
              maxLines={1}
              style={{ fontSize: 14, color: hex(theme.text) }}
              text={note.text}
              truncate="END"
            />
          </FlexWidget>
        ))
      )}
    </FlexWidget>
  );
}

/** The widget for a name, in both looks, with the notes it shows. */
export function widgetFor(name: string, notes: Note[]) {
  if (name === WIDGETS.ask)
    return { light: <AskWidget dark={false} />, dark: <AskWidget dark /> };
  if (name === WIDGETS.quick)
    return { light: <QuickWidget dark={false} />, dark: <QuickWidget dark /> };
  return {
    light: <NotesWidget dark={false} notes={notes} />,
    dark: <NotesWidget dark notes={notes} />,
  };
}

/** Drawn when a widget is added, resized or due an update; taps open links, so need nothing here. */
export function widgetTaskHandler(load: () => { notes: Note[] }) {
  return async ({
    widgetInfo,
    widgetAction,
    renderWidget,
  }: WidgetTaskHandlerProps) => {
    if (widgetAction === "WIDGET_DELETED" || widgetAction === "WIDGET_CLICK")
      return;
    renderWidget(widgetFor(widgetInfo.widgetName, load().notes));
  };
}

/** Redraw the notes widget after the notes change. Does nothing off Android or with no widget. */
export function refreshNotesWidget(notes: Note[]) {
  if (Platform.OS !== "android") return;
  requestWidgetUpdate({
    widgetName: WIDGETS.notes,
    renderWidget: () => widgetFor(WIDGETS.notes, notes),
  }).catch(() => {
    // No notes widget on the home screen, or the launcher said no: nothing to redraw.
  });
}
