import { router } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { authClient, serverConfigured } from "./auth";
import { Card, QuickButtons, Row, Tag } from "./latch";
import { registerPush, unregisterPush } from "./notifications";
import type { Theme } from "./theme";

/**
 * The menu that slides up from the bar: the most-used places as four buttons, then everything else
 * as rows, then Look, the Phone Bot and Stop all at the thumb's reach. Places that need the PC show
 * only once the phone is signed in to it, so the phone on its own never shows a dead end.
 */
export function MainMenu({
  theme,
  close,
}: {
  theme: Theme;
  close: () => void;
}) {
  const { data: session } = authClient.useSession();
  const signedIn = serverConfigured && Boolean(session);
  const [pushOn, setPushOn] = useState(false);
  const [problem, setProblem] = useState("");
  const go = (pathname: string) => () => {
    close();
    router.push(pathname as never);
  };

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

  return (
    <>
      {signedIn ? (
        <QuickButtons
          buttons={[
            {
              key: "approvals",
              label: "Approvals",
              icon: "checkbox-marked-outline",
              onPress: go("/approvals"),
            },
            {
              key: "needs-you",
              label: "Needs you",
              icon: "bell-outline",
              onPress: go("/needs-you"),
            },
            {
              key: "memory",
              label: "Memory",
              icon: "brain",
              onPress: go("/memory"),
            },
            {
              key: "bots",
              label: "Bots",
              icon: "view-grid-outline",
              onPress: go("/bots"),
            },
          ]}
          theme={theme}
        />
      ) : null}
      <Card theme={theme}>
        {signedIn ? (
          <>
            <Row
              about="Ask first, just do it, or never"
              first
              icon="shield-outline"
              onPress={go("/rules")}
              theme={theme}
              title="What your Bots can do"
            />
            <Row
              about="Your mailbox, and whether the AI is online"
              icon="email-outline"
              onPress={go("/email-ai")}
              theme={theme}
              title="Email and AI"
            />
            <Row
              about="Hear from your Bots when you're away"
              icon="bell-ring-outline"
              onPress={() =>
                void act(async () => {
                  await registerPush();
                  setPushOn(true);
                })
              }
              right={pushOn ? <Tag text="On" theme={theme} /> : undefined}
              theme={theme}
              title={pushOn ? "Notifications are on" : "Turn on notifications"}
            />
            <Row
              icon="logout"
              onPress={() =>
                void act(async () => {
                  await unregisterPush();
                  const result = await authClient.signOut();
                  if (result.error)
                    throw new Error(
                      result.error.message ?? "Could not sign out.",
                    );
                  close();
                })
              }
              theme={theme}
              title="Sign out of your PC"
            />
          </>
        ) : (
          <Row
            about={
              serverConfigured
                ? "Not signed in. Sign in on the Chats page to see your PC's Bots"
                : "Not linked. The phone works on its own"
            }
            first
            icon="monitor"
            theme={theme}
            title="Your PC"
          />
        )}
      </Card>
      {problem ? (
        <Text
          accessibilityRole="alert"
          style={{ color: theme.error, fontSize: 12, padding: 8 }}
        >
          {problem}
        </Text>
      ) : null}
      <QuickButtons
        buttons={[
          {
            key: "look",
            label: "Look",
            icon: "palette-outline",
            onPress: go("/preferences"),
          },
          {
            key: "phone-bot",
            label: "Phone Bot",
            icon: "cellphone-message",
            onPress: go("/phone-bot"),
          },
          ...(signedIn
            ? [
                {
                  key: "stop",
                  label: "Stop all",
                  icon: "stop-circle-outline" as const,
                  danger: true,
                  onPress: go("/rules"),
                },
              ]
            : []),
        ]}
        theme={theme}
      />
    </>
  );
}
