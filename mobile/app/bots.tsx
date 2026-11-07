import { router } from "expo-router";
import { useCallback } from "react";
import { Text, View } from "react-native";
import { api, type Bot } from "../src/api";
import { authClient, serverConfigured } from "../src/auth";
import { BotCard, SectionLabel } from "../src/home-screen";
import { BottomBar } from "../src/latch";
import { MainMenu } from "../src/main-menu";
import { LatchPage, LatchProblem } from "../src/page";
import { useTheme } from "../src/theme";
import { useLoad } from "../src/use-load";

/**
 * Every Bot this person can reach, each with its face, opening its page. The Phone Bot is always
 * here; the PC's Bots once the phone is signed in to it.
 */
export default function BotsScreen() {
  const theme = useTheme();
  const { data: session } = authClient.useSession();
  const signedIn = serverConfigured && Boolean(session);
  const load = useCallback(() => api<{ agents: Bot[] }>("/api/agents"), []);
  const bots = useLoad(load, signedIn);
  return (
    <View style={{ flex: 1, backgroundColor: theme.page }}>
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
        {signedIn ? <SectionLabel text="On your PC" theme={theme} /> : null}
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
      <BottomBar
        current="bots"
        menu={(close) => <MainMenu close={close} theme={theme} />}
        theme={theme}
      />
    </View>
  );
}
