import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useCallback } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import {
  api,
  type Bot,
  type BotLifecycle,
  type CheckInItem,
  type Conversation,
  type Routine,
} from "../src/api";
import { authClient } from "../src/auth";
import { hideItem, ItemCard, startItem } from "../src/check-ins";
import { Face, MenuRows, SectionLabel } from "../src/home-screen";
import { LatchPage, LatchProblem, SwitchCard } from "../src/page";
import {
  ADD_ROUTINE_DRAFT,
  RUN_COLORS,
  RUN_LABELS,
  when,
} from "../src/routines";
import { useTheme } from "../src/theme";
import { useAction } from "../src/ui";
import { useLoad } from "../src/use-load";

/**
 * The Bot profile: what its check-ins found for the person, pause, its computer, its routines, and
 * what customizes it.
 */
export default function BotScreen() {
  const { botId = "" } = useLocalSearchParams<{ botId: string }>();
  const { data: session, isPending } = authClient.useSession();
  const action = useAction();
  const theme = useTheme();
  const loadBot = useCallback(
    () => api<{ agent: Bot }>(`/api/agents/${encodeURIComponent(botId)}`),
    [botId],
  );
  const bot = useLoad(loadBot, Boolean(session && botId));
  const loadLifecycle = useCallback(
    () =>
      api<{ lifecycle: BotLifecycle }>(
        `/api/bots/${encodeURIComponent(botId)}/lifecycle`,
      ),
    [botId],
  );
  const lifecycle = useLoad(loadLifecycle, Boolean(session && botId));
  const loadRoutines = useCallback(
    () => api<{ routines: Routine[] }>("/api/routines"),
    [],
  );
  const routines = useLoad(loadRoutines, Boolean(session));
  const loadItems = useCallback(
    () => api<{ suggestions: CheckInItem[] }>("/api/proactive/suggestions"),
    [],
  );
  const items = useLoad(loadItems, Boolean(session));
  if (!session && !isPending) return <Redirect href="/" />;
  const mine = routines.data?.routines.filter(
    (routine) => routine.agentId === botId,
  );
  const found = items.data?.suggestions.filter(
    (item) => item.agentId === botId,
  );
  const paused = lifecycle.data?.lifecycle.paused;
  const name = bot.data?.agent.name ?? "This Bot";

  async function setPaused(next: boolean) {
    await action.run("pause", async () => {
      await api(
        `/api/bots/${encodeURIComponent(botId)}/${next ? "pause" : "resume"}`,
        { method: "POST" },
      );
      await lifecycle.refresh();
    });
  }
  async function setActive(routine: Routine, enabled: boolean) {
    await action.run(routine.id, async () => {
      await api(`/api/routines/${encodeURIComponent(routine.id)}/enabled`, {
        method: "PUT",
        body: { enabled },
      });
      await routines.refresh();
    });
  }
  async function findConversation(then: string) {
    const page = await api<{ conversations: Conversation[] }>(
      "/api/delivery/conversations",
    );
    const conversation = page.conversations.find(
      (item) => item.active && item.agentIds.includes(botId),
    );
    if (!conversation)
      throw new Error(
        `Start a conversation with ${name} on your PC first, then ${then}.`,
      );
    return conversation;
  }
  async function talk() {
    await action.run("talk", async () => {
      const conversation = await findConversation("talk to it here");
      router.push({
        pathname: "/conversation",
        params: { channelId: conversation.id, agentId: botId },
      });
    });
  }
  async function addRoutine() {
    await action.run("add", async () => {
      const conversation = await findConversation("add a routine from it");
      router.push({
        pathname: "/conversation",
        params: {
          channelId: conversation.id,
          agentId: botId,
          draft: ADD_ROUTINE_DRAFT,
        },
      });
    });
  }

  const soft = theme.dark ? "#2E2F30" : "#ECEDEF";
  const about = bot.data?.agent.title ?? bot.data?.agent.roleDescription;

  return (
    <LatchPage
      onRefresh={() => {
        void bot.refresh();
        void lifecycle.refresh();
        void routines.refresh();
        void items.refresh();
      }}
      refreshing={
        bot.pending || lifecycle.pending || routines.pending || items.pending
      }
      theme={theme}
      title={name}
    >
      <View style={{ alignItems: "center", gap: 6, paddingVertical: 10 }}>
        <Face name={name} size={84} />
        <Text
          style={{
            color: theme.text,
            fontSize: 24,
            fontWeight: "600",
            marginTop: 6,
          }}
        >
          {name}
        </Text>
        {about ? (
          <Text
            style={{ color: theme.grey, fontSize: 14, textAlign: "center" }}
          >
            {about}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={Boolean(action.busy)}
          onPress={() => void talk()}
          style={({ pressed }) => ({
            marginTop: 10,
            backgroundColor: theme.accent,
            borderRadius: 999,
            paddingHorizontal: 22,
            paddingVertical: 11,
            opacity: pressed || action.busy ? 0.75 : 1,
          })}
        >
          <Text
            style={{
              color: theme.dark ? "#062E6F" : "#FFFFFF",
              fontSize: 15,
              fontWeight: "600",
            }}
          >
            {action.busy === "talk" ? "Opening…" : `Talk to ${name}`}
          </Text>
        </Pressable>
      </View>
      <LatchProblem
        message={
          action.error ||
          bot.error ||
          lifecycle.error ||
          routines.error ||
          items.error
        }
        theme={theme}
      />
      <SwitchCard
        about={
          paused
            ? "It does no work for you, including routines, until you turn it back on."
            : "Turn off to pause its work for you and skip its routines."
        }
        disabled={paused === undefined || Boolean(action.busy)}
        label={`${name} is on`}
        onChange={(on) => {
          void setPaused(!on);
        }}
        theme={theme}
        title={
          paused === undefined
            ? "Checking…"
            : paused
              ? "Paused"
              : "On and working"
        }
        value={paused === false}
      />
      {found?.length ? (
        <>
          <SectionLabel text="Needs you" theme={theme} />
          {found.map((item) => (
            <ItemCard
              botName={name}
              busy={action.busy}
              item={item}
              key={item.id}
              onHide={() => {
                void action.run(`hide:${item.id}`, async () => {
                  await hideItem(item);
                  await items.refresh();
                });
              }}
              onStart={() => {
                void action.run(`start:${item.id}`, async () => {
                  await startItem(item);
                  void items.refresh();
                });
              }}
              theme={theme}
            />
          ))}
        </>
      ) : null}
      <View style={{ gap: 8, marginTop: 14 }}>
        <SectionLabel text="Routines" theme={theme} />
        {mine?.map((routine) => (
          <Pressable
            accessibilityLabel={`Routine: ${routine.instruction}`}
            accessibilityRole="link"
            key={routine.id}
            onPress={() =>
              router.push({
                pathname: "/routine",
                params: { routineId: routine.id },
              })
            }
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              backgroundColor: pressed ? theme.raised : theme.card,
              borderColor: soft,
              borderWidth: 1,
              borderRadius: 18,
              paddingHorizontal: 16,
              paddingVertical: 14,
            })}
          >
            <View style={{ flex: 1, gap: 3 }}>
              <Text
                numberOfLines={2}
                style={{ color: theme.text, fontSize: 15, fontWeight: "600" }}
              >
                {routine.instruction}
              </Text>
              <Text style={{ color: theme.grey, fontSize: 13 }}>
                {routine.enabled
                  ? `Next run ${when(routine.nextRunAt)}`
                  : "Paused"}
              </Text>
              {routine.lastRun?.status ? (
                <Text
                  style={{
                    color: RUN_COLORS[routine.lastRun.status],
                    fontSize: 13,
                  }}
                >
                  Last run: {RUN_LABELS[routine.lastRun.status]}
                </Text>
              ) : null}
            </View>
            <Switch
              accessibilityLabel="On"
              disabled={Boolean(action.busy)}
              onValueChange={(enabled) => {
                void setActive(routine, enabled);
              }}
              thumbColor="#FFFFFF"
              {...{ activeThumbColor: "#FFFFFF" }}
              trackColor={{ true: theme.accent, false: theme.border }}
              value={routine.enabled}
            />
          </Pressable>
        ))}
        {mine?.length === 0 ? (
          <Text style={{ color: theme.grey, paddingLeft: 6 }}>
            No routines yet.
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={Boolean(action.busy)}
          onPress={() => {
            void addRoutine();
          }}
          style={{
            alignSelf: "flex-start",
            backgroundColor: theme.raised,
            borderRadius: 18,
            paddingHorizontal: 14,
            paddingVertical: 8,
          }}
        >
          <Text style={{ color: theme.text, fontSize: 14 }}>
            + Add a routine
          </Text>
        </Pressable>
      </View>
      <MenuRows
        label="More"
        rows={[
          {
            key: "computer",
            title: "Its computer",
            about: "Watch what it's doing on its computer",
            onPress: () =>
              router.push({ pathname: "/computer", params: { botId } }),
          },
          {
            key: "rules",
            title: "What it can do",
            about: "Choose what it may do without asking",
            onPress: () =>
              router.push({ pathname: "/rules", params: { botId } }),
          },
          {
            key: "plugins",
            title: "Plugins",
            about: "Extra skills it can use",
            onPress: () =>
              router.push({ pathname: "/plugins", params: { botId } }),
          },
          {
            key: "memory",
            title: "Memory",
            about: "What your Bots remember",
            onPress: () => router.push("/memory"),
          },
        ]}
        theme={theme}
      />
    </LatchPage>
  );
}
