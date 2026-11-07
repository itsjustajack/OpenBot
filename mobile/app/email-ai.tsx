import { Redirect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { type AiStatus, aiInWords } from "../src/ai-status";
import { api } from "../src/api";
import { authClient } from "../src/auth";
import { SectionLabel } from "../src/home-screen";
import { Card, Row } from "../src/latch";
import { LatchPage, LatchProblem } from "../src/page";
import { type Theme, useTheme } from "../src/theme";
import { useAction } from "../src/ui";
import { useLoad } from "../src/use-load";

type MailAccount = {
  address: string;
  username: string;
  imapHost: string;
  smtpHost: string;
  updatedAt: string;
};

/** A Latch card with room inside for the sign-in fields. */
function PaddedCard({
  theme,
  children,
}: {
  theme: Theme;
  children: React.ReactNode;
}) {
  return (
    <Card theme={theme}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
        {children}
      </View>
    </Card>
  );
}

/**
 * Your PC's email and AI, as seen from the phone: which mailbox your Bots may use (and connecting
 * one), and whether they're on the online AI or the PC's own offline AI right now. The Phone Bot
 * itself always runs on the phone.
 */
export default function EmailAndAi() {
  const theme = useTheme();
  const { data: session, isPending } = authClient.useSession();
  const action = useAction();
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const loadMail = useCallback(
    () => api<{ account: MailAccount | null }>("/api/mail/account"),
    [],
  );
  const mail = useLoad(loadMail, Boolean(session));
  const loadAi = useCallback(() => api<{ ai: AiStatus }>("/api/ai/status"), []);
  const ai = useLoad(loadAi, Boolean(session));
  if (!session && !isPending) return <Redirect href="/" />;

  const account = mail.data?.account;
  const words = ai.data ? aiInWords(ai.data.ai) : null;
  const dot = words
    ? { good: "#1E8E3E", backup: "#F29900", quiet: theme.grey }[words.tone]
    : theme.grey;
  const field = {
    color: theme.text,
    backgroundColor: theme.raised,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  } as const;
  const ready = address.includes("@") && password.length > 0;

  return (
    <LatchPage
      onRefresh={() => {
        void mail.refresh();
        void ai.refresh();
      }}
      refreshing={mail.pending || ai.pending}
      theme={theme}
      title="Email and AI"
    >
      <LatchProblem message={action.error || ai.error} theme={theme} />

      <SectionLabel text="AI" theme={theme} />
      <Card theme={theme}>
        <Row
          about={words?.about}
          first
          leading={
            <View
              style={{
                width: 22,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: dot,
                }}
              />
            </View>
          }
          theme={theme}
          title={words?.title ?? "Checking…"}
        />
        <Row
          about="Always runs right on this phone, with no internet and no PC"
          icon="cellphone"
          theme={theme}
          title="Phone Bot"
        />
      </Card>

      <SectionLabel text="Email" theme={theme} />
      <Text
        style={{
          color: theme.grey,
          fontSize: 12,
          lineHeight: 17,
          paddingHorizontal: 4,
        }}
      >
        Lets a Bot you give Email to read, search and send your mail. Reading
        never marks anything as read, and sending asks you first.
      </Text>
      <PaddedCard theme={theme}>
        {mail.error ? (
          <Text style={{ color: theme.grey, fontSize: 13 }}>{mail.error}</Text>
        ) : account ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={{ color: theme.text, fontSize: 14, fontWeight: "600" }}
              >
                {account.address}
              </Text>
              <Text style={{ color: theme.grey, fontSize: 11.5 }}>
                Connected through {account.imapHost}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={Boolean(action.busy)}
              onPress={() =>
                Alert.alert(
                  "Remove this mailbox?",
                  "Your Bots won't be able to read or send this email until you connect it again.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Remove",
                      style: "destructive",
                      onPress: () => {
                        void action.run("remove", async () => {
                          await api("/api/mail/account", { method: "DELETE" });
                          await mail.refresh();
                        });
                      },
                    },
                  ],
                )
              }
              style={{
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 999,
                paddingHorizontal: 14,
                paddingVertical: 7,
              }}
            >
              <Text style={{ color: theme.text, fontSize: 13 }}>Remove</Text>
            </Pressable>
          </View>
        ) : mail.data ? (
          <>
            <TextInput
              accessibilityLabel="Email address"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setAddress}
              placeholder="you@gmail.com"
              placeholderTextColor={theme.grey}
              style={field}
              value={address}
            />
            <TextInput
              accessibilityLabel="App password"
              autoCapitalize="none"
              onChangeText={setPassword}
              placeholder="App password"
              placeholderTextColor={theme.grey}
              secureTextEntry
              style={field}
              value={password}
            />
            <Text style={{ color: theme.grey, fontSize: 12, lineHeight: 17 }}>
              Use an app password, not your normal one. For Gmail, turn on
              2-Step Verification, then make one at
              myaccount.google.com/apppasswords.
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={!ready || Boolean(action.busy)}
              onPress={() =>
                void action.run("connect", async () => {
                  await api("/api/mail/account", {
                    method: "PUT",
                    body: { address: address.trim(), password },
                  });
                  setPassword("");
                  await mail.refresh();
                })
              }
              style={{
                alignSelf: "flex-end",
                backgroundColor: theme.accent,
                borderRadius: 999,
                paddingHorizontal: 20,
                paddingVertical: 10,
                opacity: ready && !action.busy ? 1 : 0.45,
              }}
            >
              <Text
                style={{
                  color: theme.onAccent,
                  fontSize: 15,
                  fontWeight: "600",
                }}
              >
                {action.busy === "connect" ? "Checking…" : "Connect"}
              </Text>
            </Pressable>
          </>
        ) : (
          <Text style={{ color: theme.grey, fontSize: 13 }}>Checking…</Text>
        )}
      </PaddedCard>
    </LatchPage>
  );
}
