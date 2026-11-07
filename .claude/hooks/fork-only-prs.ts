// Refuses a pull request aimed anywhere but Jack's fork. This repo is a fork of CopilotKit/OpenBot,
// and GitHub offers the original project as the default target, so a PR once went there by mistake.
const FORK = "itsjustajack/openbot";
const input = JSON.parse(await Bun.stdin.text());
const tool: string = input?.tool_name ?? "";
const args = input?.tool_input ?? {};

function refuse(reason: string): never {
  console.error(reason);
  process.exit(2);
}

if (tool.endsWith("create_pull_request")) {
  const target = `${args.owner ?? ""}/${args.repo ?? ""}`.toLowerCase();
  if (target !== FORK)
    refuse(
      `Pull requests go to ${FORK} only, not ${target}. Set owner and repo to the fork.`,
    );
} else if (tool === "Bash") {
  const command: string = args.command ?? "";
  if (
    /\bgh\s+pr\s+create\b/.test(command) &&
    !/--repo[ =]itsjustajack\/openbot\b/i.test(command)
  )
    refuse(
      `Run gh pr create with --repo ${FORK}, so the PR can't go to CopilotKit's original project.`,
    );
}
