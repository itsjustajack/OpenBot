import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { api, type Bot, type Conversation } from "../src/api";
import {
  authClient,
  serverConfigured,
  signIn,
  signInEnterprise,
} from "../src/auth";
import {
  type HomeBot,
  HomeScreen,
  type MenuRow,
  MenuRows,
} from "../src/home-screen";
import { registerPush, unregisterPush } from "../src/notifications";
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
 * The front screen: a greeting, one "Ask a Bot anything" box, and the Bots as cards. Questions typed
 * here go to the Phone Bot, which works with no PC and no signal. With an OpenBot PC set and signed
 * in, the PC's Bots are listed too, with the rest of the app below.
 */
export default function Home() {
  const theme = useTheme();
  const { data: session } = authClient.useSession();
  const signedIn = serverConfigured && Boolean(session);

  const loadBots = useCallback(() => api<{ agents: Bot[] }>("/api/agents"), []);
  const pcBots = useLoad(loadBots, signedIn);

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

  return (
    <HomeScreen
      bots={bots}
      footer={
        !serverConfigured ? null : signedIn ? (
          <SignedInMenu theme={theme} />
        ) : (
          <SignIn theme={theme} />
        )
      }
      hint={
        signedIn
          ? "The Phone Bot answers here. Tap a Bot to talk to it."
          : "Works on your phone with no PC and no signal."
      }
      name={session?.user.name?.split(" ")[0]}
      onAsk={askPhoneBot}
      quickStarts={PHONE_QUICK_STARTS}
    />
  );
}

/** Everything else in the app, as Latch rows: what needs you, your chats, and the PC's parts. */
function SignedInMenu({ theme }: { theme: Theme }) {
  const { data: session } = authClient.useSession();
  const [problem, setProblem] = useState("");
  const [pushOn, setPushOn] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reload for whoever is signed in now
  const loadConversations = useCallback(
    () =>
      api<{ conversations: Conversation[]; nextCursor: string | null }>(
        "/api/delivery/conversations",
      ),
    [session?.user.id],
  );
  const conversations = useLoad(loadConversations, true);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new person starts with notifications off here
  useEffect(() => setPushOn(false), [session?.user.id]);

  async function act(work: () => Promise<unknown>) {
    setProblem("");
    try {
      await work();
    } catch (failure) {
      setProblem(
        failure instanceof Error ? failure.message : "That didn't work.",
      );
    }
  }

  const go = (pathname: string) => () => router.push(pathname as never);
  const places: MenuRow[] = [
    {
      key: "needs-you",
      title: "Needs you",
      about: "What your Bots found that needs you",
      onPress: go("/needs-you"),
    },
    {
      key: "approvals",
      title: "Questions and approvals",
      about: "Say yes or no to what your Bots want to do",
      onPress: go("/approvals"),
    },
    {
      key: "rules",
      title: "What your Bots can do",
      about: "Choose in plain words, or stop them all",
      onPress: go("/rules"),
    },
    {
      key: "bots",
      title: "Bots, routines and computers",
      onPress: go("/bots"),
    },
    { key: "memory", title: "Memory", onPress: go("/memory") },
  ];
  const chats: MenuRow[] = (conversations.data?.conversations ?? []).map(
    (conversation) => ({
      key: conversation.id,
      title: conversation.name,
      about: conversation.active ? undefined : "Inactive",
      onPress: () =>
        router.push({
          pathname: "/conversation",
          params: { channelId: conversation.id },
        }),
    }),
  );
  const account: MenuRow[] = [
    {
      key: "push",
      title: pushOn ? "Notifications are on" : "Turn on notifications",
      about: "Hear from your Bots when you're away",
      onPress: () =>
        void act(async () => {
          await registerPush();
          setPushOn(true);
        }),
    },
    {
      key: "sign-out",
      title: "Sign out",
      onPress: () =>
        void act(async () => {
          await unregisterPush();
          const result = await authClient.signOut();
          if (result.error)
            throw new Error(result.error.message ?? "Could not sign out.");
        }),
    },
  ];

  return (
    <>
      {problem || conversations.error ? (
        <Text accessibilityRole="alert" style={{ color: "#D93025" }}>
          {problem || conversations.error}
        </Text>
      ) : null}
      <MenuRows label="Your OpenBot" rows={places} theme={theme} />
      {chats.length ? (
        <MenuRows label="Conversations" rows={chats} theme={theme} />
      ) : null}
      <MenuRows label="Account" rows={account} theme={theme} />
    </>
  );
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
