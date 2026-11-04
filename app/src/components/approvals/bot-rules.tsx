import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Fragment } from "react";
import { PageRows, PageSection } from "@/components/layout/page-shell";
import { Separator } from "@/components/ui/separator";
import {
  approvalInboxOptions,
  revokeApprovalRuleMutationOptions,
  ruleCoversBot,
  updateApprovalRuleMutationOptions,
} from "@/lib/approvals";
import { plainChoiceOf } from "@/lib/plain-approvals";
import { queryClient } from "@/query-client";
import { PlainChoices } from "./plain-choices";
import { RuleRow } from "./rules";

/**
 * What one Bot may do, in the same plain rows as Settings → Approvals but for this Bot alone, then
 * any other rules that reach it (team rules locked). A rule's `botId` is the Bot's id, or a pattern
 * covering it.
 */
export function BotApprovalRules({
  agentId,
  agentName,
}: {
  agentId: string;
  /** How the Bot is named in the plain sentences; its id when not given. */
  agentName?: string;
}) {
  const inbox = useQuery(approvalInboxOptions());
  const changeRule = useMutation(
    updateApprovalRuleMutationOptions(queryClient),
  );
  const revoke = useMutation(revokeApprovalRuleMutationOptions(queryClient));
  const error = inbox.error ?? changeRule.error ?? revoke.error;
  if (inbox.isPending && !error) return null;
  const rulesOff = inbox.data?.team?.customRulesEnabled === false;
  // Rules naming this Bot, including a pattern that covers it; rules for every Bot are in Settings.
  // The plain choices for this Bot are rows of their own above; other rules naming it are listed.
  const mine = (inbox.data?.rules ?? []).filter(
    (rule) =>
      rule.botId !== "*" &&
      ruleCoversBot(rule.botId, agentId) &&
      !(rule.botId === agentId && plainChoiceOf(rule)),
  );
  const team = (inbox.data?.teamRules ?? []).filter(
    (rule) => rule.botId === "*" || rule.botId === agentId,
  );
  const saved = team.length + mine.length;

  return (
    <>
      {error ? (
        <p className="mt-4 text-destructive text-sm" role="alert">
          {error.message}
        </p>
      ) : null}
      {inbox.data?.preferences ? (
        <PageSection
          description={
            <>
              Just for this Bot. Where your choices for every Bot in{" "}
              <Link
                className="underline underline-offset-4"
                to="/settings/approvals"
              >
                Settings → Approvals
              </Link>{" "}
              are stricter, those win.
              {rulesOff
                ? " An admin has turned off personal rules. Yours are kept but don't apply."
                : ""}
            </>
          }
          title="What this Bot can do"
        >
          <PlainChoices
            data={inbox.data}
            disabled={rulesOff}
            forBot={{ id: agentId, name: agentName ?? agentId }}
          />
        </PageSection>
      ) : null}
      {saved > 0 ? (
        <PageSection
          description="Rules from your team, or written another way. The strictest one wins."
          title="Other rules"
        >
          <PageRows>
            {team.map((rule, index) => (
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
            {mine.map((rule, index) => (
              <Fragment key={rule.id}>
                {team.length + index > 0 ? <Separator /> : null}
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
