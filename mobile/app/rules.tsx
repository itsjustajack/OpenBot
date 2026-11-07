import { Redirect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  type ApprovalRule,
  type ApprovalSettings,
  api,
  BEHAVIOUR_LABELS,
  type Bot,
  type BotLifecycle,
  type HostCommandPolicy,
  type RuleBehaviour,
} from "../src/api";
import { authClient } from "../src/auth";
import { SectionLabel } from "../src/home-screen";
import { Card, faint, Icon, type IconName } from "../src/latch";
import { Chips, LatchPage, LatchProblem, SwitchRow } from "../src/page";
import {
  ANSWER_LABELS,
  AREA_ORDER,
  AREAS,
  answerLabel,
  choiceSentence,
  currentAnswer,
  everyBotOverrules,
  type PlainAnswer,
  type PlainArea,
  type PlainDoing,
  plainChoiceOf,
  ruleFor,
  savedRule,
  summarySentences,
} from "../src/plain-approvals";
import { type Theme, useTheme } from "../src/theme";
import { useAction } from "../src/ui";
import { useLoad } from "../src/use-load";

const ICONS: Record<PlainArea, IconName> = {
  email: "email-outline",
  websites: "web",
  files: "file-document-outline",
  bots: "account-multiple-outline",
};

const HOST_LABELS: Record<HostCommandPolicy, string> = {
  ask: "Ask me first",
  allow: "Just do it",
  never: "Never",
};

function pillColours(theme: Theme, behaviour: RuleBehaviour) {
  const light = {
    allow: ["#E6F4EA", "#137333"],
    pre_approved: ["#E8F0FE", "#1967D2"],
    ask: ["#FEF7E0", "#B06000"],
    hand_off: ["#FCE8E6", "#C5221F"],
  } as const;
  const dark = {
    allow: ["#0F3D22", "#81C995"],
    pre_approved: ["#173A6B", "#A8C7FA"],
    ask: ["#4A3A0B", "#FDD663"],
    hand_off: ["#5C1D1A", "#F2B8B5"],
  } as const;
  return (theme.dark ? dark : light)[behaviour];
}

function Pill({
  theme,
  behaviour,
}: {
  theme: Theme;
  behaviour: RuleBehaviour;
}) {
  const [back, text] = pillColours(theme, behaviour);
  return (
    <View
      style={{
        backgroundColor: back,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Text style={{ color: text, fontSize: 12, fontWeight: "600" }}>
        {answerLabel(behaviour)}
      </Text>
    </View>
  );
}

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const describe = (rule: ApprovalRule) =>
  [
    rule.toolRef === "*" ? "Any tool" : rule.toolRef,
    rule.effect === "*" ? null : rule.effect,
    rule.scope === "*" ? null : rule.scope,
  ]
    .filter(Boolean)
    .join(" · ");

/**
 * What your Bots can do, in plain words, the same choices as Settings → Approvals on the PC: a
 * summary of right now, a Stop all button, one row per thing a Bot can touch, and the safety
 * switches. Opened from a Bot's page, the choices are for that Bot alone.
 */
export default function RulesScreen() {
  const { botId = "*" } = useLocalSearchParams<{ botId?: string }>();
  const theme = useTheme();
  const { data: session, isPending } = authClient.useSession();
  const action = useAction();
  const [editing, setEditing] = useState<PlainArea | null>(null);
  const load = useCallback(() => api<ApprovalSettings>("/api/approvals"), []);
  const settings = useLoad(load, Boolean(session));
  const loadBots = useCallback(async () => {
    const { agents } = await api<{ agents: Bot[] }>("/api/agents");
    const states = await Promise.all(
      agents.map((bot) =>
        api<{ lifecycle: BotLifecycle }>(
          `/api/bots/${encodeURIComponent(bot.id)}/lifecycle`,
        ).then((answer) => ({ bot, paused: answer.lifecycle.paused })),
      ),
    );
    return states;
  }, []);
  const bots = useLoad(loadBots, Boolean(session));
  if (!session && !isPending) return <Redirect href="/" />;

  const data = settings.data;
  const everyBot = botId === "*";
  const botName = everyBot
    ? undefined
    : bots.data?.find((state) => state.bot.id === botId)?.bot.name;
  const editable = data?.team?.customRulesEnabled !== false;
  const host = data?.preferences?.hostCommands;
  const others = [
    ...(data?.rules ?? []).filter(
      (rule) =>
        (rule.botId === botId || rule.botId === "*") && !plainChoiceOf(rule),
    ),
  ];
  const teamRules = (data?.teamRules ?? []).filter(
    (rule) => rule.botId === botId || rule.botId === "*",
  );
  const working = bots.data?.filter((state) => !state.paused) ?? [];
  const allStopped = Boolean(bots.data?.length) && working.length === 0;

  const refresh = () => {
    void settings.refresh();
    void bots.refresh();
  };
  const setPreference = (
    body: Partial<{
      enabled: boolean;
      autoReview: boolean;
      hostCommands: HostCommandPolicy;
    }>,
  ) =>
    action.run("preferences", async () => {
      await api("/api/approvals/preferences", { method: "PATCH", body });
      await settings.refresh();
    });
  const stopAll = (stop: boolean) =>
    action.run("stop", async () => {
      const targets = (bots.data ?? []).filter(
        (state) => state.paused !== stop,
      );
      await Promise.all(
        targets.map((state) =>
          api(
            `/api/bots/${encodeURIComponent(state.bot.id)}/${stop ? "pause" : "resume"}`,
            { method: "POST" },
          ),
        ),
      );
      await bots.refresh();
    });

  return (
    <LatchPage
      onRefresh={refresh}
      refreshing={settings.pending || bots.pending}
      theme={theme}
      title={
        everyBot
          ? "What your Bots can do"
          : `What ${botName ?? "this Bot"} can do`
      }
    >
      <LatchProblem
        message={action.error || settings.error || bots.error}
        theme={theme}
      />

      {everyBot && bots.data?.length ? (
        <View
          style={{
            backgroundColor: theme.card,
            borderColor: allStopped ? theme.border : theme.error,
            borderWidth: 1,
            borderRadius: 16,
            padding: 16,
            gap: 10,
          }}
        >
          <Text style={{ color: theme.text, fontSize: 14, fontWeight: "600" }}>
            {allStopped
              ? "All your Bots are stopped"
              : `${working.length} of your Bots ${working.length === 1 ? "is" : "are"} working`}
          </Text>
          <Text style={{ color: theme.grey, fontSize: 12 }}>
            {allStopped
              ? "They do nothing for you, routines included, until you start them again."
              : "Stop all halts every Bot straight away, routines included. Nothing is lost."}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={Boolean(action.busy)}
            onPress={() => {
              if (allStopped) {
                void stopAll(false);
                return;
              }
              Alert.alert(
                "Stop all your Bots?",
                "You can start them again here.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Stop all",
                    style: "destructive",
                    onPress: () => void stopAll(true),
                  },
                ],
              );
            }}
            style={({ pressed }) => ({
              alignItems: "center",
              backgroundColor: allStopped ? theme.accent : "#D93025",
              borderRadius: 999,
              minHeight: 44,
              justifyContent: "center",
              opacity: pressed || action.busy === "stop" ? 0.8 : 1,
            })}
          >
            <Text
              style={{
                color: allStopped ? theme.onAccent : "#FFFFFF",
                fontSize: 15,
                fontWeight: "700",
              }}
            >
              {action.busy === "stop"
                ? "One moment…"
                : allStopped
                  ? "Start them again"
                  : "Stop all"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {data ? (
        <>
          <SectionLabel text="Right now" theme={theme} />
          <View
            style={{
              backgroundColor: theme.card,
              borderColor: faint(theme, 0.4),
              borderWidth: 0.5,
              borderRadius: 16,
              padding: 16,
              gap: 6,
            }}
          >
            {summarySentences({
              rules: everyBot
                ? data.rules
                : data.rules.filter(
                    (rule) => rule.botId === "*" || rule.botId === botId,
                  ),
              enabled: data.enabled,
              hostCommands: data.hostCommands ?? host,
            }).map((sentence) => (
              <Text
                key={sentence}
                style={{ color: theme.text, fontSize: 13, lineHeight: 19 }}
              >
                {sentence}
              </Text>
            ))}
            <Text style={{ color: theme.grey, fontSize: 12, lineHeight: 17 }}>
              Passwords, security settings and payments always come to you.
            </Text>
          </View>

          <SectionLabel text="Your choices" theme={theme} />
          <View
            style={{
              backgroundColor: theme.card,
              borderColor: faint(theme, 0.4),
              borderWidth: 0.5,
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            {AREA_ORDER.map((area, index) => {
              const info = AREAS[area];
              const answers = info.doings.map((doing) => ({
                doing,
                behaviour: currentAnswer(data, area, doing, botId),
              }));
              const headline = answers.at(-1)?.behaviour ?? "allow";
              return (
                <Pressable
                  accessibilityHint="Opens the choice to change it"
                  accessibilityRole="button"
                  disabled={!editable || Boolean(action.busy)}
                  key={area}
                  onPress={() => setEditing(area)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    backgroundColor: pressed ? theme.raised : theme.card,
                    minHeight: 52,
                    borderTopWidth: index > 0 ? 1 : 0,
                    borderTopColor: faint(theme, 0.2),
                  })}
                >
                  <Icon colour={theme.accent} name={ICONS[area]} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      style={{
                        color: theme.text,
                        fontSize: 14,
                        fontWeight: "600",
                      }}
                    >
                      {info.title}
                    </Text>
                    <Text style={{ color: theme.grey, fontSize: 11.5 }}>
                      {answers
                        .map(
                          ({ doing, behaviour }) =>
                            `${capital(info[doing])}: ${answerLabel(behaviour).toLowerCase()}`,
                        )
                        .join(" · ")}
                    </Text>
                  </View>
                  <Pill behaviour={headline} theme={theme} />
                </Pressable>
              );
            })}
            {everyBot && host ? (
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  gap: 10,
                  borderTopWidth: 1,
                  borderTopColor: faint(theme, 0.2),
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <Icon colour={theme.accent} name="monitor" />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      style={{
                        color: theme.text,
                        fontSize: 14,
                        fontWeight: "600",
                      }}
                    >
                      Your PC
                    </Text>
                    <Text style={{ color: theme.grey, fontSize: 11.5 }}>
                      Running programs and commands on your computer
                    </Text>
                  </View>
                </View>
                <View
                  accessibilityLabel="Your PC"
                  accessibilityRole="radiogroup"
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    paddingLeft: 34,
                  }}
                >
                  {(Object.keys(HOST_LABELS) as HostCommandPolicy[]).map(
                    (value) => {
                      const on = value === host;
                      return (
                        <Pressable
                          accessibilityRole="radio"
                          accessibilityState={{ checked: on }}
                          disabled={Boolean(action.busy)}
                          key={value}
                          onPress={() =>
                            on
                              ? null
                              : void setPreference({ hostCommands: value })
                          }
                          style={{
                            backgroundColor: on ? theme.accent : theme.raised,
                            borderRadius: 999,
                            paddingHorizontal: 14,
                            minHeight: 36,
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: on ? theme.onAccent : theme.text,
                              fontSize: 13,
                              fontWeight: on ? "600" : "400",
                            }}
                          >
                            {HOST_LABELS[value]}
                          </Text>
                        </Pressable>
                      );
                    },
                  )}
                </View>
              </View>
            ) : null}
          </View>
          {!editable ? (
            <Text style={{ color: theme.grey, paddingLeft: 6 }}>
              Your workspace has switched these choices off.
            </Text>
          ) : null}

          {everyBot && data.preferences ? (
            <>
              <SectionLabel text="Safety" theme={theme} />
              <Card theme={theme}>
                <SwitchRow
                  about="Anything not chosen above waits for your yes"
                  disabled={Boolean(action.busy)}
                  first
                  icon="hand-back-right-outline"
                  label="Ask before other changes"
                  onChange={(enabled) => void setPreference({ enabled })}
                  theme={theme}
                  title="Ask before other changes"
                  value={data.preferences.enabled}
                />
                <SwitchRow
                  about={
                    data.team?.enforceAutoReview
                      ? "Your team keeps this on"
                      : "A second check looks over risky steps before they happen"
                  }
                  disabled={
                    Boolean(action.busy) ||
                    Boolean(data.team?.enforceAutoReview)
                  }
                  icon="shield-search"
                  label="Double-check risky steps"
                  onChange={(autoReview) => void setPreference({ autoReview })}
                  theme={theme}
                  title="Double-check risky steps"
                  value={data.preferences.autoReview}
                />
              </Card>
            </>
          ) : null}

          {others.length || teamRules.length ? (
            <>
              <SectionLabel text="Other rules" theme={theme} />
              {teamRules.map((rule) => (
                <OtherRule key={rule.id} rule={rule} team theme={theme} />
              ))}
              {others.map((rule) => (
                <OtherRule
                  key={rule.id}
                  onRemove={() =>
                    Alert.alert("Remove this rule?", describe(rule), [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Remove",
                        style: "destructive",
                        onPress: () => {
                          void action.run(rule.id, async () => {
                            await api(
                              `/api/approvals/rules/${encodeURIComponent(rule.id)}`,
                              { method: "DELETE" },
                            );
                            await settings.refresh();
                          });
                        },
                      },
                    ])
                  }
                  rule={rule}
                  theme={theme}
                />
              ))}
            </>
          ) : null}
        </>
      ) : null}

      {editing && data ? (
        <ChoiceSheet
          area={editing}
          botId={botId}
          botName={botName}
          data={data}
          onClose={() => setEditing(null)}
          onSave={(area, doing, answer) =>
            action.run("save", async () => {
              const existing = savedRule(data.rules, area, doing, botId);
              if (existing)
                await api(
                  `/api/approvals/rules/${encodeURIComponent(existing.id)}`,
                  { method: "PATCH", body: { behaviour: answer } },
                );
              else
                await api("/api/approvals/rules", {
                  method: "POST",
                  body: ruleFor(area, doing, answer, botId),
                });
              await settings.refresh();
              setEditing(null);
            })
          }
          saving={action.busy === "save"}
          theme={theme}
        />
      ) : null}
    </LatchPage>
  );
}

function OtherRule({
  theme,
  rule,
  team,
  onRemove,
}: {
  theme: Theme;
  rule: ApprovalRule;
  team?: boolean;
  onRemove?: () => void;
}) {
  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderColor: faint(theme, 0.4),
        borderWidth: 0.5,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 4,
      }}
    >
      <Text style={{ color: theme.text, fontSize: 14, fontWeight: "600" }}>
        {describe(rule)}
      </Text>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ color: theme.grey, fontSize: 11.5 }}>
          {BEHAVIOUR_LABELS[rule.behaviour]}
          {team
            ? " · set by your team"
            : rule.botId === "*"
              ? " · every Bot"
              : ""}
        </Text>
        {onRemove ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={onRemove}>
            <Text
              style={{ color: theme.error, fontSize: 13, fontWeight: "600" }}
            >
              Remove
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** The choice itself, as a sheet from the bottom: tap what, doing what, then what. No typing. */
function ChoiceSheet({
  theme,
  area: firstArea,
  data,
  botId,
  botName,
  saving,
  onSave,
  onClose,
}: {
  theme: Theme;
  area: PlainArea;
  data: ApprovalSettings;
  botId: string;
  botName?: string;
  saving: boolean;
  onSave: (area: PlainArea, doing: PlainDoing, answer: PlainAnswer) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [area, setArea] = useState<PlainArea>(firstArea);
  const [doing, setDoing] = useState<PlainDoing>("change");
  const doings = AREAS[area].doings;
  const shownDoing: PlainDoing = doings.includes(doing)
    ? doing
    : (doings[0] ?? "change");
  const now = currentAnswer(data, area, shownDoing, botId);
  const [answer, setAnswer] = useState<PlainAnswer | null>(null);
  const chosen: PlainAnswer = answer ?? (now === "pre_approved" ? "ask" : now);
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible>
      <Pressable
        accessibilityLabel="Close"
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
      />
      <View
        style={{
          backgroundColor: theme.page,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: insets.bottom + 20,
          gap: 18,
        }}
      >
        <View
          style={{
            alignSelf: "center",
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: theme.border,
          }}
        />
        <Text style={{ color: theme.text, fontSize: 20, fontWeight: "600" }}>
          Change a choice
        </Text>
        <Chips
          label="What"
          onChange={(next) => {
            setArea(next);
            setAnswer(null);
          }}
          options={AREA_ORDER.map((value) => ({
            value,
            label: AREAS[value].title,
          }))}
          theme={theme}
          value={area}
        />
        {doings.length > 1 ? (
          <Chips
            label="Doing"
            onChange={(next) => {
              setDoing(next);
              setAnswer(null);
            }}
            options={[
              { value: "look" as const, label: "Just looking" },
              { value: "change" as const, label: "Changing or sending" },
            ]}
            theme={theme}
            value={shownDoing}
          />
        ) : null}
        <Chips
          label="Then"
          onChange={setAnswer}
          options={(Object.keys(ANSWER_LABELS) as PlainAnswer[]).map(
            (value) => ({ value, label: ANSWER_LABELS[value] }),
          )}
          theme={theme}
          value={chosen}
        />
        <View
          style={{
            backgroundColor: theme.raised,
            borderRadius: 12,
            padding: 12,
          }}
        >
          <Text style={{ color: theme.text, fontSize: 13, lineHeight: 19 }}>
            In plain words:{" "}
            <Text style={{ fontWeight: "700" }}>
              {choiceSentence({
                area,
                doing: shownDoing,
                answer: chosen,
                botName,
                everyBot:
                  botId === "*"
                    ? undefined
                    : everyBotOverrules(data, area, shownDoing, chosen),
              })}
            </Text>
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={{
              flex: 1,
              alignItems: "center",
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: 999,
              minHeight: 44,
              justifyContent: "center",
            }}
          >
            <Text
              style={{ color: theme.text, fontSize: 15, fontWeight: "600" }}
            >
              Cancel
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={() => onSave(area, shownDoing, chosen)}
            style={{
              flex: 1,
              alignItems: "center",
              backgroundColor: theme.accent,
              borderRadius: 999,
              minHeight: 44,
              justifyContent: "center",
              opacity: saving ? 0.7 : 1,
            }}
          >
            <Text
              style={{
                color: theme.onAccent,
                fontSize: 15,
                fontWeight: "600",
              }}
            >
              {saving ? "Saving…" : "Save"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
