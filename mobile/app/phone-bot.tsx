import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  askNeedle,
  type NeedleCall,
  needleAvailable,
} from "../modules/needle/src";
import {
  Bubble,
  ChatTop,
  ChoiceCard,
  Composer,
  SmallCard,
} from "../src/chat-screen";
import {
  describe,
  doJob,
  load,
  type Note,
  phoneFacts,
  phoneTools,
  readPlainly,
  removeNote,
  removeWaiting,
  sendWaiting,
} from "../src/phone-bot";
import { getPreferences } from "../src/preferences";
import { useTheme } from "../src/theme";
import { refreshNotesWidget } from "../src/widgets";

const NAME = "Phone Bot";

/** Shown under the first hello, to fill in the box with one tap. */
const QUICK_STARTS = [
  { label: "Remind me", text: "Remind me in 10 minutes to " },
  { label: "Save a note", text: "Note: " },
  { label: "Find my notes", text: "Show my notes" },
];

/** Above this Needle's pick is done straight away; below it, the phone asks first. */
const SURE = 0.7;

type Said = { id: number; you: string; bot: string; notes?: Note[] };

/**
 * The Phone Bot: quick jobs done on the phone itself, with no PC and no signal.
 *
 * Needle picks the job and fills in its details; nothing leaves the phone except a message for a PC
 * Bot, which waits here until the PC can be reached. When Needle isn't sure, it says what it thinks
 * you meant and waits for a yes, the same "ask me" as the rest of OpenBot.
 */
export default function PhoneBot() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said[]>([]);
  const [unsure, setUnsure] = useState<{
    you: string;
    calls: NeedleCall[];
  } | null>(null);
  const [saved, setSaved] = useState(load);
  const available = needleAvailable();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [showNotes, setShowNotes] = useState(false);
  const scroller = useRef<ScrollView>(null);
  // Asked from the Home screen's box: answered straight away, once.
  const { ask: asked, draft } = useLocalSearchParams<{
    ask?: string;
    draft?: string;
  }>();
  const answered = useRef<string | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: only a new question from Home is asked
  useEffect(() => {
    if (!asked || answered.current === asked) return;
    answered.current = asked;
    void ask(asked);
  }, [asked]);

  // Opened from a widget with words to finish, such as "Note: ": put them in the box.
  useEffect(() => {
    if (draft) setText(draft);
  }, [draft]);
  // Keep the notes widget on the home screen in step with the notes here.
  useEffect(() => refreshNotesWidget(saved.notes), [saved.notes]);

  const refresh = useCallback(() => setSaved(load()), []);
  useFocusEffect(
    useCallback(() => {
      refresh();
      void sendWaiting().then(refresh);
    }, [refresh]),
  );

  function answer(you: string, bot: string, notes?: Note[]) {
    setSaid((now) =>
      [{ id: Date.now(), you, bot, notes }, ...now].slice(0, 20),
    );
  }

  async function run(you: string, calls: NeedleCall[]) {
    const lines: string[] = [];
    let notes: Note[] | undefined;
    for (const call of calls) {
      const done = await doJob(call);
      lines.push(done.said);
      if (done.notes) notes = done.notes;
      if (done.open) router.push(done.open as never);
    }
    answer(you, lines.join(" "), notes);
    refresh();
  }

  async function ask(given?: string) {
    const you = (given ?? text).trim();
    if (!you || busy) return;
    setBusy(true);
    setUnsure(null);
    try {
      // Common requests are read word for word; Needle only gets what this can't tell.
      const plain = readPlainly(you);
      // With "Always check with me first" on, nothing is done before Approve.
      const alwaysAsks = getPreferences().phoneBotAlwaysAsks;
      if (plain) {
        setText("");
        if (alwaysAsks) setUnsure({ you, calls: [plain] });
        else await run(you, [plain]);
        return;
      }
      const reply = await askNeedle(you, phoneTools(saved.bots), phoneFacts());
      setText("");
      if (reply.calls.length && (reply.confidence ?? 1) >= SURE && !alwaysAsks)
        await run(you, reply.calls);
      else if (reply.calls.length || reply.unsure.length)
        setUnsure({
          you,
          calls: reply.calls.length ? reply.calls : reply.unsure,
        });
      else
        answer(
          you,
          "That's not one I can do on the phone. I can set reminders, save and find notes, open parts of the app, and pass messages to your Bots.",
        );
    } catch (failure) {
      answer(
        you,
        failure instanceof Error ? failure.message : "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  }

  const when = (at: string | number) =>
    new Date(at).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  const empty = said.length === 0 && !unsure;

  return (
    <View style={{ flex: 1, backgroundColor: theme.page }}>
      <StatusBar
        backgroundColor={theme.page}
        barStyle={theme.dark ? "light-content" : "dark-content"}
      />
      <ChatTop
        about="Works with no signal"
        name={NAME}
        onBack={() => (router.canGoBack() ? router.back() : router.push("/"))}
        right={{
          label: showNotes ? "Chat" : `Notes (${saved.notes.length})`,
          onPress: () => setShowNotes((now) => !now),
        }}
        theme={theme}
        top={insets.top}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 14 }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            showNotes ? null : scroller.current?.scrollToEnd()
          }
          ref={scroller}
        >
          {!available ? (
            <SmallCard
              text="The Phone Bot needs Needle's two files added before the app is built. See modules/needle/README.md."
              theme={theme}
              title="Needle isn't in this build"
            />
          ) : null}

          {showNotes ? (
            <>
              {saved.notes.length === 0 ? (
                <Text style={{ color: theme.grey, textAlign: "center" }}>
                  No notes on this phone yet. Try "note: buy milk".
                </Text>
              ) : null}
              {saved.notes.slice(0, 50).map((note) => (
                <SmallCard
                  action={{
                    label: "Delete",
                    onPress: () => {
                      removeNote(note.id);
                      refresh();
                    },
                  }}
                  key={note.id}
                  note={when(note.at)}
                  text={note.text}
                  theme={theme}
                />
              ))}
            </>
          ) : (
            <>
              {empty ? (
                <>
                  <Bubble
                    from="bot"
                    name={NAME}
                    text="Hi! I work right on your phone, even with no signal. I can set reminders, save and find notes, and pass messages to your PC's Bots."
                    theme={theme}
                  />
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                      paddingLeft: 34,
                    }}
                  >
                    {QUICK_STARTS.map((quick) => (
                      <Pressable
                        accessibilityRole="button"
                        key={quick.label}
                        onPress={() => setText(quick.text)}
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
                </>
              ) : null}

              {[...said].reverse().map((entry) => (
                <View key={entry.id} style={{ gap: 10 }}>
                  <Bubble from="you" text={entry.you} theme={theme} />
                  <Bubble from="bot" name={NAME} text={entry.bot} theme={theme}>
                    {entry.notes?.map((note) => (
                      <SmallCard
                        key={note.id}
                        note={when(note.at)}
                        text={note.text}
                        theme={theme}
                      />
                    ))}
                  </Bubble>
                </View>
              ))}

              {unsure ? (
                <>
                  <Bubble from="you" text={unsure.you} theme={theme} />
                  <ChoiceCard
                    lines={unsure.calls.map(describe)}
                    name={NAME}
                    onApprove={() => {
                      const { you, calls } = unsure;
                      setUnsure(null);
                      void run(you, calls);
                    }}
                    onDiscard={() => {
                      // Put the words back so they can be fixed and sent again.
                      setText(unsure.you);
                      setUnsure(null);
                    }}
                    theme={theme}
                    title="Did you mean this?"
                  />
                </>
              ) : null}

              {saved.outbox.map((entry) => (
                <SmallCard
                  action={{
                    label: "Don't send",
                    onPress: () => {
                      removeWaiting(entry.id);
                      refresh();
                    },
                  }}
                  key={entry.id}
                  note={entry.problem ?? "Sends when your PC can be reached"}
                  text={entry.message}
                  theme={theme}
                  title={`Waiting to send to ${entry.bot}`}
                />
              ))}
            </>
          )}
        </ScrollView>
        <Composer
          bottom={insets.bottom}
          busy={busy}
          disabled={!available}
          onChange={setText}
          onSend={() => {
            setShowNotes(false);
            void ask();
          }}
          placeholder={'Try "remind me to call mum at 5pm"'}
          theme={theme}
          value={text}
        />
      </KeyboardAvoidingView>
    </View>
  );
}
