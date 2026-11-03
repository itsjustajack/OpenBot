import { createFileRoute } from "@tanstack/react-router";
import { ApprovalSettings } from "@/components/approvals/settings";
import { PageShell } from "@/components/layout/page-shell";
import { TeamBotConsents } from "@/components/settings/team-bot-consents";

export const Route = createFileRoute("/_authed/settings/approvals")({
  component: ApprovalsSettingsPage,
});

function ApprovalsSettingsPage() {
  return (
    <PageShell
      description="What your Bots may do on their own, what they ask you about first, and what they never do."
      title="Approvals"
    >
      <ApprovalSettings />
      <TeamBotConsents />
    </PageShell>
  );
}
