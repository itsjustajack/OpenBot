import { router } from "expo-router";
import { useCallback } from "react";
import { Text, View } from "react-native";
import { api, type Bot } from "../src/api";
import { authClient, serverConfigured } from "../src/auth";
import { Face, SectionLabel } from "../src/home-screen";
import { BottomBar, Card, Row } from "../src/latch";
import { MainMenu } from "../src/main-menu";
import { LatchPage, LatchProblem } from "../src/page";
import { useTheme } from "../src/theme";
import { useLoad } from "../src/use-load";

/**
 * Every Bot this person can reach, each a row with its face, opening its page. The Phone Bot is
 * always here; the PC's Bots once the phone is signed in to it.
 */
export default function BotsScreen() {
  const theme = useTheme();
  const { data: session } = authClient.useSession();
  const signedIn = serverConfigured && Boolean(session);
  const load = useCallback(() => api<{ agents: Bot[] }>("/api/agents"), []);
  const bots = useLoad(load, signedIn);
  const pcBots = bots.data?.agents ?? [];
  return (
    <View style={{ flex: 1, backgroundColor: theme.page }}>
      <LatchPage
        back={false}
        onRefresh={signedIn ? () => void bots.refresh() : undefined}
        refreshing={bots.pending}
        theme={theme}
        title="Bots"
      >
        <LatchProblem message={bots.error} theme={theme} />
        <SectionLabel text="On this phone" theme={theme} />
        <Card theme={theme}>
          <Row
            about="Reminders and notes. Works with no PC and no signal"
            first
            leading={<Face name="Phone Bot" size={36} />}
            onPress={() => router.push("/phone-bot")}
            theme={theme}
            title="Phone Bot"
          />
        </Card>
        {signedIn ? (
          <View style={{ gap: 8 }}>
            <SectionLabel text="On your PC" theme={theme} />
            {pcBots.length ? (
              <Card theme={theme}>
                {pcBots.map((bot, index) => (
                  <Row
                    about={
                      bot.title ?? bot.roleDescription ?? "A Bot on your PC"
                    }
                    first={index === 0}
                    key={bot.id}
                    leading={<Face name={bot.name} size={36} />}
                    onPress={() =>
                      router.push({
                        pathname: "/bot",
                        params: { botId: bot.id },
                      })
                    }
                    theme={theme}
                    title={bot.name}
                  />
                ))}
              </Card>
            ) : bots.data ? (
              <Text style={{ color: theme.grey, fontSize: 12, padding: 4 }}>
                No Bots on your PC yet. Make one in OpenBot on your computer.
              </Text>
            ) : null}
          </View>
        ) : serverConfigured ? (
          <Text style={{ color: theme.grey, fontSize: 12, padding: 4 }}>
            Your PC's Bots show here once you sign in on the Chats page.
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
