import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  type ApprovalInbox,
  api,
  type Bot,
  type BotTask,
  type Conversation,
} from "../src/api";
import {
  authClient,
  serverConfigured,
  signIn,
  signInEnterprise,
} from "../src/auth";
import {
  type Count,
  type HomeBot,
  HomeScreen,
  type MenuRow,
  MenuRows,
  type RecentChat,
} from "../src/home-screen";
import { MainMenu } from "../src/main-menu";
import { load } from "../src/phone-bot";
import { type Theme, useTheme } from "../src/theme";
import { useLoad } from "../src/use-load";

/** Quick starts the Phone Bot can always do, with no PC and no signal. */
const PHONE_QUICK_STARTS = [
  { label: "Remind me", text: "Remind me in 10 minutes to " },
  { label: "Save a note", text: "Note: " },
  { label: "Find my notes", text: "Show my notes" },
];

function askPhoneBot(text: string) {
  router.push({ pathname: "/phone-bot", params: { ask: text } });
}

const PHONE_BOT: HomeBot = {
  key: "phone-bot",
  name: "Phone Bot",
  about: "Reminders and notes, right on your phone",
  onPress: () => router.push("/phone-bot"),
};

/**
 * The front screen: the ask box, your Bots' faces, what's happening right now and your recent chats.
 * Questions typed here go to the Phone Bot, which works with no PC and no signal. Signed in to an
 * OpenBot PC, its Bots, chats and what needs you show here too.
 */
export default function Home() {
  const theme = useTheme();
  const { data: session } = authClient.useSession();
  const signedIn = serverConfigured && Boolean(session);
  const [phone, setPhone] = useState(loadPhone);
  useFocusEffect(useCallback(() => setPhone(loadPhone()), []));

  const loadBots = useCallback(() => api<{ agents: Bot[] }>("/api/agents"), []);
  const pcBots = useLoad(loadBots, signedIn);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reload for whoever is signed in now
  const loadChats = useCallback(
    () => api<{ conversations: Conversation[] }>("/api/delivery/conversations"),
    [session?.user.id],
  );
  const chats = useLoad(loadChats, signedIn);
  const loadApprovals = useCallback(
    () => api<ApprovalInbox>("/api/approvals"),
    [],
  );
  const approvals = useLoad(loadApprovals, signedIn);
  const loadTasks = useCallback(
    () => api<{ tasks: BotTask[] }>("/api/tasks"),
    [],
  );
  const tasks = useLoad(loadTasks, signedIn);

  const bots: HomeBot[] = [
    PHONE_BOT,
    ...(pcBots.data?.agents ?? []).map((bot) => ({
      key: bot.id,
      name: bot.name,
      about: bot.title ?? bot.roleDescription ?? "A Bot on your PC",
      onPress: () =>
        router.push({ pathname: "/bot", params: { botId: bot.id } }),
    })),
  ];

  const waitingOnYou =
    (approvals.data?.requests.filter((request) => request.status === "pending")
      .length ?? 0) +
    (approvals.data?.questions?.length ?? 0) +
    (tasks.data?.tasks.filter((task) => task.status === "needs_input").length ??
      0);
  const counts: Count[] = signedIn
    ? [
        { key: "you", label: "Waiting on you", count: waitingOnYou },
        {
          key: "working",
          label: "Working now",
          count:
            tasks.data?.tasks.filter((task) => task.status === "working")
              .length ?? 0,
        },
        { key: "send", label: "Waiting to send", count: phone.outbox.length },
      ]
    : [
        { key: "notes", label: "Notes", count: phone.notes.length },
        { key: "send", label: "Waiting to send", count: phone.outbox.length },
      ];

  const lastNote = phone.notes.at(-1);
  const recent: RecentChat[] = [
    {
      key: "phone-bot",
      title: "Phone Bot",
      about: lastNote
        ? `Note: ${lastNote.text}`
        : "Reminders and notes, with no signal",
      icon: "cellphone-message",
      onPress: () => router.push("/phone-bot"),
    },
    ...(chats.data?.conversations ?? [])
      .filter((chat) => chat.active)
      .slice(0, 4)
      .map((chat) => ({
        key: chat.id,
        title: chat.name,
        about: "Chat on your PC",
        icon: "message-outline" as const,
        onPress: () =>
          router.push({
            pathname: "/conversation",
            params: { channelId: chat.id },
          }),
      })),
  ];

  return (
    <HomeScreen
      below={
        serverConfigured && !signedIn ? <SignIn theme={theme} /> : undefined
      }
      bots={bots}
      counts={counts}
      hint={
        signedIn
          ? undefined
          : "The Phone Bot answers here, with no PC and no signal."
      }
      menu={(close) => <MainMenu close={close} theme={theme} />}
      name={session?.user.name?.split(" ")[0]}
      onAsk={askPhoneBot}
      onBell={signedIn ? () => router.push("/needs-you") : undefined}
      quickStarts={PHONE_QUICK_STARTS}
      recent={recent}
    />
  );
}

function loadPhone() {
  const saved = load();
  return { notes: saved.notes, outbox: saved.outbox };
}

/** Signing in to the OpenBot PC, for a phone app that has one set. */
function SignIn({ theme }: { theme: Theme }) {
  const [email, setEmail] = useState("");
  const [problem, setProblem] = useState("");
  const loadOptions = useCallback(
    () =>
      api<{
        authProviders?: ("google" | "microsoft" | "okta")[];
        ssoConfigured?: boolean;
      }>("/api/capabilities"),
    [],
  );
  const options = useLoad(loadOptions, true);

  async function act(work: () => Promise<unknown>) {
    setProblem("");
    try {
      await work();
    } catch (failure) {
      setProblem(
        failure instanceof Error ? failure.message : "Could not sign in.",
      );
    }
  }

  const rows: MenuRow[] = (options.data?.authProviders ?? []).map(
    (provider) => ({
      key: provider,
      title: `Sign in with ${provider[0]?.toUpperCase()}${provider.slice(1)}`,
      about: "To see your PC's Bots here too",
      onPress: () => void act(() => signIn(provider)),
    }),
  );

  return (
    <>
      {problem || options.error ? (
        <Text accessibilityRole="alert" style={{ color: "#D93025" }}>
          {problem ||
            "Your OpenBot PC can't be reached right now. The Phone Bot still works."}
        </Text>
      ) : null}
      {rows.length ? (
        <MenuRows label="Your PC" rows={rows} theme={theme} />
      ) : null}
      {options.data?.ssoConfigured ? (
        <View style={{ gap: 8 }}>
          <TextInput
            accessibilityLabel="Work email"
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Work email"
            placeholderTextColor={theme.grey}
            style={{
              color: theme.text,
              backgroundColor: theme.card,
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: 12,
              padding: 12,
            }}
            value={email}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!email}
            onPress={() => void act(() => signInEnterprise(email))}
            style={{
              backgroundColor: theme.accent,
              borderRadius: 999,
              padding: 12,
              alignItems: "center",
              opacity: email ? 1 : 0.5,
            }}
          >
            <Text style={{ color: theme.card, fontWeight: "600" }}>
              Continue with organization
            </Text>
          </Pressable>
        </View>
      ) : null}
    </>
  );
}
