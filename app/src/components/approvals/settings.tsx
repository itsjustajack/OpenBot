import { IconEyeCheck, IconHandStop } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Fragment } from "react";
import { PageRows, PageSection } from "@/components/layout/page-shell";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { agentListQueryOptions } from "@/lib/agents/queries";
import {
  approvalInboxOptions,
  approvalPreferencesMutationOptions,
  revokeApprovalRuleMutationOptions,
  ruleCoversBot,
  updateApprovalRuleMutationOptions,
} from "@/lib/approvals";
import { PlainChoices, PlainSummary } from "./plain-choices";
import { currentUserQueryOptions } from "@/lib/auth/queries";
import { plainChoiceOf } from "@/lib/plain-approvals";
import { queryClient } from "@/query-client";
import { RuleRow } from "./rules";

/**
 * The person's own approval settings: whether their Bots ask before changing things, and the rules
 * that apply to every one of their Bots. Team rules are listed so the person can see them, locked;
 * administrators change them in Admin → Approvals. Rules for a single Bot are on that Bot's page.
 */
export function ApprovalSettings() {
  const inbox = useQuery(approvalInboxOptions());
  const me = useQuery(currentUserQueryOptions()).data;
  const agents = useQuery(agentListQueryOptions());
  const hiddenAgents = useQuery(agentListQueryOptions(true));
  const preferences = useMutation(
    approvalPreferencesMutationOptions(queryClient),
  );
  const changeRule = useMutation(
    updateApprovalRuleMutationOptions(queryClient),
  );
  const revoke = useMutation(revokeApprovalRuleMutationOptions(queryClient));
  const error =
    inbox.error ?? preferences.error ?? changeRule.error ?? revoke.error;
  if (inbox.isPending && !error) return null;
  const enforced = inbox.data?.team?.enforceAutoReview ?? false;
  const rulesOff = inbox.data?.team?.customRulesEnabled === false;
  // The plain choices are shown as rows of their own; everything else for every Bot is listed below.
  const everyBot = (inbox.data?.rules ?? []).filter(
    (rule) => rule.botId === "*" && !plainChoiceOf(rule),
  );
  /*
   * Rules that name no Bot this person can open — a Bot since deleted, or a name typed where an id
   * belonged. They are still enforced, so they are listed here where they can be removed.
   */
  const reachable = [...(agents.data ?? []), ...(hiddenAgents.data ?? [])];
  const otherBots = (inbox.data?.rules ?? []).filter(
    (rule) =>
      rule.botId !== "*" &&
      (agents.data === undefined ||
        !reachable.some((agent) => ruleCoversBot(rule.botId, agent.id))),
  );
  const teamRules = inbox.data?.teamRules ?? [];
  const saved = teamRules.length + everyBot.length;

  return (
    <>
      {error ? (
        <p className="mt-6 text-destructive text-sm" role="alert">
          {error.message}
        </p>
      ) : null}
      {me?.role === "admin" ? (
        <p className="mt-6 text-muted-foreground text-sm">
          Team settings and shared account requests are in{" "}
          <Link className="underline underline-offset-4" to="/admin/approvals">
            Admin → Approvals
          </Link>
          .
        </p>
      ) : null}
      {inbox.data ? (
        <PageSection title="Right now">
          <PlainSummary data={inbox.data} />
        </PageSection>
      ) : null}
      {inbox.data?.preferences ? (
        <PageSection
          description={
            <>
              These apply to all your Bots. Tap one to change it.
              {rulesOff
                ? " An admin has turned off personal rules. Yours are kept but don't apply."
                : ""}
            </>
          }
          title="Your choices"
        >
          <PlainChoices
            bots={[
              ...new Map(
                reachable.map((agent) => [
                  agent.id,
                  { id: agent.id, name: agent.name ?? agent.id },
                ]),
              ).values(),
            ]}
            data={inbox.data}
            disabled={rulesOff}
            onHostCommands={(hostCommands) =>
              preferences.mutate({ hostCommands })
            }
          />
        </PageSection>
      ) : null}
      <PageSection title="Safety">
        <PageRows>
          <Item size="sm">
            <ItemMedia variant="icon">
              <IconHandStop />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Ask before other changes</ItemTitle>
              <ItemDescription className="line-clamp-none">
                For anything your choices above don't cover, Bots stop and ask
                you before they change it.
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Switch
                aria-label="Ask before other changes"
                checked={inbox.data?.enabled ?? false}
                disabled={inbox.isLoading || preferences.isPending}
                onCheckedChange={(enabled) => preferences.mutate({ enabled })}
              />
            </ItemActions>
          </Item>
          {inbox.data?.preferences ? (
            <>
              <Separator />
              <Item size="sm">
                <ItemMedia variant="icon">
                  <IconEyeCheck />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle id="auto-review-title">
                    Double-check risky steps
                  </ItemTitle>
                  <ItemDescription
                    className="line-clamp-none"
                    id="auto-review-description"
                  >
                    {enforced ? "An admin requires this. " : ""}
                    Before a Bot sends or shares something, OpenBot checks it
                    matches what you asked for. If it can't tell, it asks you.
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Switch
                    // Named by its title alone and described by the sentence beside it, so the name
                    // stays short however long the description grows.
                    aria-describedby="auto-review-description"
                    aria-labelledby="auto-review-title"
                    checked={enforced || inbox.data.preferences.autoReview}
                    disabled={enforced || preferences.isPending}
                    onCheckedChange={(autoReview) =>
                      preferences.mutate({ autoReview })
                    }
                  />
                </ItemActions>
              </Item>
            </>
          ) : null}
        </PageRows>
      </PageSection>
      {saved > 0 ? (
        <PageSection
          description={
            <>
              Rules from your team, or written another way. The strictest one
              wins. Rules for one Bot are on{" "}
              <Link className="underline underline-offset-4" to="/bots">
                that Bot's page
              </Link>
              .
            </>
          }
          title="Other rules"
        >
          <PageRows>
            {teamRules.map((rule, index) => (
              <Fragment key={rule.id}>
                {index > 0 ? <Separator /> : null}
                <RuleRow
                  disabled
                  locked
                  onChange={() => {}}
                  onRevoke={() => {}}
                  rule={rule}
                  team
                />
              </Fragment>
            ))}
            {everyBot.map((rule, index) => (
              <Fragment key={rule.id}>
                {teamRules.length + index > 0 ? <Separator /> : null}
                <RuleRow
                  disabled={revoke.isPending || changeRule.isPending}
                  locked={rulesOff}
                  onChange={(behaviour) =>
                    changeRule.mutate({ id: rule.id, behaviour })
                  }
                  onRevoke={() => revoke.mutate(rule.id)}
                  rule={rule}
                />
              </Fragment>
            ))}
          </PageRows>
        </PageSection>
      ) : null}
      {agents.data !== undefined && otherBots.length > 0 ? (
        <PageSection
          description="These don't match a Bot you can open. They still apply to any Bot they match. Remove the ones you don't want."
          title="Rules for other Bots"
        >
          <PageRows>
            {otherBots.map((rule, index) => (
              <Fragment key={rule.id}>
                {index > 0 ? <Separator /> : null}
                <RuleRow
                  disabled={revoke.isPending || changeRule.isPending}
                  locked={rulesOff}
                  onChange={(behaviour) =>
                    changeRule.mutate({ id: rule.id, behaviour })
                  }
                  onRevoke={() => revoke.mutate(rule.id)}
                  rule={rule}
                />
              </Fragment>
            ))}
          </PageRows>
        </PageSection>
      ) : null}
    </>
  );
}
