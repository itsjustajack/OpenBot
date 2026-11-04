import { Redirect, router } from "expo-router";
import { useCallback } from "react";
import { Text } from "react-native";
import { api, type Bot } from "../src/api";
import { authClient } from "../src/auth";
import { BotCard, SectionLabel } from "../src/home-screen";
import { LatchPage, LatchProblem } from "../src/page";
import { useTheme } from "../src/theme";
import { useLoad } from "../src/use-load";

/** Every Bot this person can reach, each with its face, opening its page. */
export default function BotsScreen() {
  const theme = useTheme();
  const { data: session, isPending } = authClient.useSession();
  const load = useCallback(() => api<{ agents: Bot[] }>("/api/agents"), []);
  const bots = useLoad(load, Boolean(session));
  if (!session && !isPending) return <Redirect href="/" />;
  return (
    <LatchPage
      onRefresh={() => void bots.refresh()}
      refreshing={bots.pending}
      theme={theme}
      title="Bots"
    >
      <LatchProblem message={bots.error} theme={theme} />
      <SectionLabel text="On this phone" theme={theme} />
      <BotCard
        bot={{
          key: "phone-bot",
          name: "Phone Bot",
          about: "Reminders and notes, right on your phone",
          onPress: () => router.push("/phone-bot"),
        }}
        theme={theme}
      />
      <SectionLabel text="On your PC" theme={theme} />
      {bots.data?.agents.map((bot) => (
        <BotCard
          bot={{
            key: bot.id,
            name: bot.name,
            about: bot.title ?? bot.roleDescription ?? "A Bot on your PC",
            onPress: () =>
              router.push({ pathname: "/bot", params: { botId: bot.id } }),
          }}
          key={bot.id}
          theme={theme}
        />
      ))}
      {bots.data?.agents.length === 0 ? (
        <Text style={{ color: theme.grey }}>
          No Bots on your PC yet. Make one in OpenBot on your computer.
        </Text>
      ) : null}
    </LatchPage>
  );
}
