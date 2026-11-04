import { createFileRoute } from "@tanstack/react-router";
import { BotApprovalRules } from "@/components/approvals/bot-rules";
import { BotSubpage } from "@/components/bot-profile/bot-subpage";

export const Route = createFileRoute("/_authed/_app/bots/$agentId/approvals")({
  component: ApprovalRulesPage,
});

function ApprovalRulesPage() {
  const { agentId } = Route.useParams();
  return (
    <BotSubpage
      agentId={agentId}
      description="What this Bot may do on its own, what it asks you about first, and what it never does."
      title="Approvals"
    >
      {(agent) => (
        <BotApprovalRules agentId={agent.id} agentName={agent.name} />
      )}
    </BotSubpage>
  );
}
