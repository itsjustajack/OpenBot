import {
  IconChevronRight,
  IconDeviceDesktop,
  IconFolder,
  IconMail,
  IconPlus,
  IconRobot,
  IconWorld,
} from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { PageCard, PageRows } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import {
  type ApprovalInboxData,
  createApprovalRuleMutationOptions,
  type HostCommandPolicy,
  type RuleBehaviour,
  updateApprovalRuleMutationOptions,
} from "@/lib/approvals";
import {
  ANSWER_LABELS,
  AREA_ORDER,
  AREAS,
  answerLabel,
  choiceSentence,
  currentAnswer,
  type PlainAnswer,
  type PlainArea,
  type PlainDoing,
  ruleFor,
  savedRule,
  summarySentences,
} from "@/lib/plain-approvals";
import { queryClient } from "@/query-client";
import { cn } from "@/lib/utils";
import { HOST_LABELS, LabelSelect } from "./rules";

const ICONS: Record<PlainArea, typeof IconMail> = {
  email: IconMail,
  websites: IconWorld,
  files: IconFolder,
  bots: IconRobot,
};

const PILL: Record<RuleBehaviour, string> = {
  allow: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  pre_approved: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  ask: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  hand_off: "bg-red-500/15 text-red-700 dark:text-red-300",
};

function Pill({ behaviour }: { behaviour: RuleBehaviour }) {
  return (
    <span
      className={cn(
        "whitespace-nowrap rounded-full px-2.5 py-1 font-medium text-xs",
        PILL[behaviour],
      )}
    >
      {answerLabel(behaviour)}
    </span>
  );
}

/** "Right now": what every Bot may do today, said in a few plain sentences. */
export function PlainSummary({ data }: { data: ApprovalInboxData }) {
  return (
    <PageCard className="text-sm leading-relaxed">
      <ul aria-label="What your Bots can do right now" className="space-y-1">
        {summarySentences({
          rules: data.rules,
          enabled: data.enabled,
          hostCommands: data.hostCommands ?? data.preferences?.hostCommands,
        }).map((sentence) => (
          <li key={sentence}>{sentence}</li>
        ))}
        <li className="text-muted-foreground">
          Passwords, security settings and payments always come to you.
        </li>
      </ul>
    </PageCard>
  );
}

/**
 * One row per thing a Bot can touch, each saying what happens when a Bot looks and when it changes
 * something, and opening the choice to change it. On a Bot's page the rows are for that Bot alone.
 */
export function PlainChoices({
  data,
  bots,
  forBot,
  disabled,
  onHostCommands,
}: {
  data: ApprovalInboxData;
  /** The person's Bots, offered under "Which Bots". Not shown on a Bot's own page. */
  bots?: readonly { id: string; name: string }[];
  /** On a Bot's page: that Bot, which every choice there is for. */
  forBot?: { id: string; name: string };
  disabled?: boolean;
  /** Settings only: commands on the person's own computer, which is its own preference. */
  onHostCommands?: (value: HostCommandPolicy) => void;
}) {
  const [editing, setEditing] = useState<PlainArea | "new" | null>(null);
  const botId = forBot?.id ?? "*";
  const host = data.preferences?.hostCommands;
  return (
    <>
      <PageRows>
        {AREA_ORDER.map((area, index) => {
          const Icon = ICONS[area];
          const info = AREAS[area];
          const answers = info.doings.map((doing) => ({
            doing,
            behaviour: currentAnswer(data, area, doing, botId),
          }));
          const headline = answers.at(-1)?.behaviour ?? "allow";
          return (
            <Fragment key={area}>
              {index > 0 ? <Separator /> : null}
              <Item
                render={
                  <button
                    disabled={disabled}
                    onClick={() => setEditing(area)}
                    type="button"
                  />
                }
                size="sm"
              >
                <ItemMedia variant="icon">
                  <Icon />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{info.title}</ItemTitle>
                  <ItemDescription className="line-clamp-none">
                    {answers
                      .map(
                        ({ doing, behaviour }) =>
                          `${capital(info[doing])}: ${answerLabel(behaviour).toLowerCase()}`,
                      )
                      .join(" · ")}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Pill behaviour={headline} />
                </ItemActions>
              </Item>
            </Fragment>
          );
        })}
        {onHostCommands && host ? (
          <>
            <Separator />
            <Item size="sm">
              <ItemMedia variant="icon">
                <IconDeviceDesktop />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Your PC</ItemTitle>
                <ItemDescription className="line-clamp-none">
                  {data.hostCommands && data.hostCommands !== host
                    ? `An admin limits this to "${HOST_LABELS[data.hostCommands]}". `
                    : ""}
                  Running programs and commands on this computer. When it asks,
                  the OpenBot window shows you the exact command first.
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <LabelSelect
                  disabled={disabled}
                  label="Your PC"
                  labels={HOST_LABELS}
                  onChange={onHostCommands}
                  value={host}
                />
              </ItemActions>
            </Item>
          </>
        ) : null}
        <Separator />
        <Item
          render={
            <button
              disabled={disabled}
              onClick={() => setEditing("new")}
              type="button"
            />
          }
          size="sm"
        >
          <ItemMedia variant="icon">
            <IconPlus />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Add a choice</ItemTitle>
            <ItemDescription>
              Tap what, doing what, and then what.
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <IconChevronRight className="size-4 text-muted-foreground" />
          </ItemActions>
        </Item>
      </PageRows>
      {editing ? (
        <ChoiceDialog
          area={editing === "new" ? "websites" : editing}
          bots={forBot ? undefined : bots}
          data={data}
          forBot={forBot}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}

function capital(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 font-semibold text-muted-foreground text-xs tracking-wide">
        {label.toUpperCase()}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            aria-pressed={option.value === value}
            key={option.value}
            onClick={() => onChange(option.value)}
            size="sm"
            type="button"
            variant={option.value === value ? "default" : "outline"}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}

/** The choice itself: tap what, doing what, then what, and which Bots. No typing. */
function ChoiceDialog({
  area: firstArea,
  data,
  bots,
  forBot,
  onClose,
}: {
  area: PlainArea;
  data: ApprovalInboxData;
  bots?: readonly { id: string; name: string }[];
  forBot?: { id: string; name: string };
  onClose: () => void;
}) {
  const add = useMutation(createApprovalRuleMutationOptions(queryClient));
  const change = useMutation(updateApprovalRuleMutationOptions(queryClient));
  const [area, setArea] = useState<PlainArea>(firstArea);
  const [doing, setDoing] = useState<PlainDoing>("change");
  const [botId, setBotId] = useState(forBot?.id ?? "*");
  const doings = AREAS[area].doings;
  const shownDoing: PlainDoing = doings.includes(doing)
    ? doing
    : (doings[0] ?? "change");
  const now = currentAnswer(data, area, shownDoing, botId);
  const [answer, setAnswer] = useState<PlainAnswer | null>(null);
  const chosen: PlainAnswer = answer ?? (now === "pre_approved" ? "ask" : now);
  const botName =
    forBot?.name ??
    (botId === "*" ? undefined : bots?.find((bot) => bot.id === botId)?.name);
  const error = add.error ?? change.error;
  const pending = add.isPending || change.isPending;
  const save = () => {
    const existing = savedRule(data.rules, area, shownDoing, botId);
    if (existing)
      change.mutate(
        { id: existing.id, behaviour: chosen },
        { onSuccess: onClose },
      );
    else
      add.mutate(ruleFor(area, shownDoing, chosen, botId), {
        onSuccess: onClose,
      });
  };
  return (
    <Dialog onOpenChange={(open) => (open ? null : onClose())} open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a choice</DialogTitle>
          <DialogDescription>Tap your answers. No typing.</DialogDescription>
        </DialogHeader>
        <DialogBody className="mt-4 space-y-5">
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
              value={shownDoing}
            />
          ) : null}
          <Chips
            label="Then"
            onChange={setAnswer}
            options={(Object.keys(ANSWER_LABELS) as PlainAnswer[]).map(
              (value) => ({ value, label: ANSWER_LABELS[value] }),
            )}
            value={chosen}
          />
          {bots && bots.length > 0 ? (
            <Chips
              label="Which Bots"
              onChange={(next) => {
                setBotId(next);
                setAnswer(null);
              }}
              options={[
                { value: "*", label: "All my Bots" },
                ...bots.map((bot) => ({ value: bot.id, label: bot.name })),
              ]}
              value={botId}
            />
          ) : null}
          <p className="rounded-md bg-muted px-3 py-2 text-sm">
            In plain words:{" "}
            <strong>
              {choiceSentence({
                area,
                doing: shownDoing,
                answer: chosen,
                botName,
              })}
            </strong>
          </p>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error.message}
            </p>
          ) : null}
        </DialogBody>
        <DialogFooter className="mt-4">
          <Button onClick={onClose} size="sm" variant="outline">
            Cancel
          </Button>
          <Button disabled={pending} onClick={save} size="sm">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
