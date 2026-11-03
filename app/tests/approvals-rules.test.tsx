import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  test,
} from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import {
  cleanup,
  fireEvent,
  render,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { InlineApproval } from "@/components/approvals/inline-approval";
import { ApprovalSettings } from "@/components/approvals/settings";
import { toVisibleChatItems } from "@/components/channels/chat-messages";
import {
  groupToolSteps,
  ToolActivity,
} from "@/components/channels/tool-activity";

beforeAll(() => GlobalRegistrator.register());
afterEach(cleanup);
afterAll(() => GlobalRegistrator.unregister());

const originalFetch = global.fetch;
let role: "user" | "admin" = "user";
const sent: { path: string; method: string; body: unknown }[] = [];

const inbox = {
  enabled: false,
  requests: [
    {
      id: "request-1",
      status: "pending",
      createdAt: new Date().toISOString(),
      action: {
        botId: "Shopper",
        toolRef: "computer_click",
        effect: "write",
        scope: "shop.example",
        threadId: "thread",
        args: { element: "Pay now" },
        target: {},
        toolCallId: "pay-call",
        policy: {
          behaviour: "hand_off",
          source: "safety",
          reason:
            "Paying, purchasing or moving money is always done by the person.",
        },
      },
    },
  ],
  rules: [
    {
      id: "mine",
      botId: "*",
      toolRef: "mcp/gmail/*",
      effect: "*",
      scope: "*",
      behaviour: "allow",
    },
  ],
  teamRules: [
    {
      id: "locked",
      botId: "*",
      toolRef: "mcp/drive/share",
      effect: "*",
      scope: "*",
      behaviour: "ask",
    },
  ],
  preferences: { enabled: false, autoReview: false, hostCommands: "allow" },
  team: {
    enforceAutoReview: true,
    customRulesEnabled: true,
    hostCommandsCap: "ask",
  },
  hostCommands: "ask",
  questions: [],
};

/** Per-test changes to the inbox the server returns. */
let inboxOverride: Record<string, unknown> = {};
/** A refusal the server gives the next time a rule is added, or none. */
let refuseRule: string | null = null;

beforeEach(() => {
  sent.length = 0;
  inboxOverride = {};
  refuseRule = null;
  role = "user";
  global.fetch = Object.assign(
    async (path: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const url = String(path);
      if (init?.method && init.method !== "GET") {
        sent.push({
          path: url,
          method: init.method,
          body: init.body ? JSON.parse(String(init.body)) : undefined,
        });
        if (url === "/api/approvals/rules" && refuseRule) {
          const error = refuseRule;
          refuseRule = null;
          return Response.json({ error }, { status: 400 });
        }
        return Response.json({ ok: true });
      }
      if (url === "/api/approvals")
        return Response.json({ ...inbox, ...inboxOverride });
      if (url.startsWith("/api/agents"))
        return Response.json({ agents: [{ id: "shopper-bot", name: "Shop" }] });
      if (url === "/api/me")
        return Response.json({
          user: { id: "me", email: "me@example.test", role },
        });
      return new Response(null, { status: 404 });
    },
    { preconnect: originalFetch.preconnect },
  );
});
afterEach(() => {
  global.fetch = originalFetch;
});

/** A screen in a router of one route, for the links it holds. */
function draw(screen: ReactNode = <ApprovalSettings />) {
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/"] }),
    routeTree: createRootRoute({ component: () => screen }),
  });
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <RouterProvider router={router as never} />
    </QueryClientProvider>,
  );
}

test("team rules are locked for members, enforced auto-review is shown as required, and the host cap is named", async () => {
  const view = draw(<ApprovalSettings />);
  await view.findByText("Ask me first (team rule)");
  const mine = view.getByRole("combobox", {
    name: "Behaviour for mcp/gmail/*",
  });
  expect(mine.textContent).toContain("Just do it");
  expect(view.getByText("Locked")).toBeTruthy();
  const review = view.getByRole("switch", { name: "Double-check risky steps" });
  expect(review.getAttribute("aria-checked")).toBe("true");
  expect(view.getByText(/An admin requires this/)).toBeTruthy();
  expect(view.getByText(/An admin limits this to "Ask me first"/)).toBeTruthy();
  expect(view.queryByText("Team settings")).toBeNull();
});

test("a member changes a saved rule in place", async () => {
  const view = draw(<ApprovalSettings />);
  const mine = await view.findByRole("combobox", {
    name: "Behaviour for mcp/gmail/*",
  });
  const user = userEvent.setup({ document });
  await user.click(mine);
  await user.click(
    await view.findByRole("option", { name: "Never (left to you)" }),
  );
  await waitFor(() =>
    expect(sent).toContainEqual({
      path: "/api/approvals/rules/mine",
      method: "PATCH",
      body: { behaviour: "hand_off" },
    }),
  );
  expect(
    view.queryByRole("combobox", { name: "Behaviour for mcp/drive/share" }),
  ).toBeNull();
});

test("a member makes a plain choice by tapping, and is told in plain words what it allows first", async () => {
  const view = draw(<ApprovalSettings />);
  fireEvent.click(await view.findByRole("button", { name: /Add a choice/ }));
  const dialog = await view.findByRole("dialog");
  // No boxes to type code into.
  expect(within(dialog).queryByRole("textbox")).toBeNull();
  fireEvent.click(within(dialog).getByRole("button", { name: "Email" }));
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Changing or sending" }),
  );
  fireEvent.click(within(dialog).getByRole("button", { name: "Never" }));
  expect(
    within(dialog).getByText(
      "All your Bots leave sending or deleting email to you.",
    ),
  ).toBeTruthy();
  fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(sent).toContainEqual({
      path: "/api/approvals/rules",
      method: "POST",
      body: {
        botId: "*",
        toolRef: "*mail*|*outlook*",
        effect: "write",
        scope: "*",
        behaviour: "hand_off",
      },
    }),
  );
  await waitFor(() => expect(view.queryByRole("dialog")).toBeNull());
});

test("a choice already made is changed in place, not saved twice", async () => {
  inboxOverride = {
    rules: [
      {
        id: "websites-change",
        botId: "*",
        toolRef:
          "computer_navigate|computer_read|computer_snapshot|computer_screenshot|computer_scroll|computer_click|computer_type|computer_key|computer_download_file",
        effect: "write",
        scope: "*",
        behaviour: "ask",
      },
    ],
  };
  const view = draw(<ApprovalSettings />);
  // Shown as the Websites row, in plain words, and not as a rule of code.
  const row = await view.findByRole("button", { name: /^Websites/ });
  expect(row.textContent).toContain(
    "Clicking, typing or filling in forms on websites: ask me first",
  );
  expect(view.queryByText(/computer_navigate/)).toBeNull();
  fireEvent.click(row);
  const dialog = await view.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Just do it" }));
  fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(sent).toContainEqual({
      path: "/api/approvals/rules/websites-change",
      method: "PATCH",
      body: { behaviour: "allow" },
    }),
  );
  expect(sent.some((request) => request.method === "POST")).toBeFalse();
});

test("the top of the page says what every Bot can do right now", async () => {
  inboxOverride = { enabled: true, rules: [] };
  const view = draw(<ApprovalSettings />);
  const summary = await view.findByRole("list", {
    name: "What your Bots can do right now",
  });
  expect(summary.textContent).toContain(
    "Your Bots go ahead with reading your email, looking at websites and opening files without asking.",
  );
  expect(summary.textContent).toContain(
    "They ask you first before sending or deleting email",
  );
  expect(summary.textContent).toContain(
    "Passwords, security settings and payments always come to you.",
  );
});

test("a choice that is not saved keeps the dialog open and says why", async () => {
  refuseRule = "That could not be saved.";
  const view = draw(<ApprovalSettings />);
  fireEvent.click(await view.findByRole("button", { name: /Add a choice/ }));
  const dialog = await view.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
  expect((await within(dialog).findByRole("alert")).textContent).toContain(
    "That could not be saved.",
  );
  fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
  await waitFor(() => expect(view.queryByRole("dialog")).toBeNull());
});

test("two rules for one tool are told apart by the rest of what they match, never cut short", async () => {
  inboxOverride = {
    rules: [
      {
        id: "anywhere",
        botId: "*",
        toolRef: "computer_click",
        effect: "*",
        scope: "*",
        behaviour: "ask",
      },
      {
        id: "one-site",
        botId: "*",
        toolRef: "computer_click",
        effect: "write",
        scope: "checkout.a-very-long-shop-name.example",
        behaviour: "allow",
      },
    ],
  };
  const view = draw(<ApprovalSettings />);
  const match = await view.findByText(
    "write on checkout.a-very-long-shop-name.example",
  );
  expect(match.className).toContain("line-clamp-none");
  // The tool stays the row's title.
  expect(view.getAllByText("computer_click")).toHaveLength(2);
});

test("with personal rules switched off by the team, they are shown as not applying and none can be added", async () => {
  inboxOverride = {
    team: { ...inbox.team, customRulesEnabled: false },
  };
  const view = draw(<ApprovalSettings />);
  expect(
    await view.findByText(
      /An admin has turned off personal rules\. Yours are kept but don't apply\./,
    ),
  ).toBeTruthy();
  expect(
    (view.getByRole("button", { name: /Add a choice/ }) as HTMLButtonElement)
      .disabled,
  ).toBeTrue();
});

test("an administrator is told where team settings are", async () => {
  role = "admin";
  const view = draw(<ApprovalSettings />);
  const link = await view.findByRole("link", { name: "Admin → Approvals" });
  expect(link.getAttribute("href")).toBe("/admin/approvals");
});

test("a member is not pointed at Admin", async () => {
  const view = draw(<ApprovalSettings />);
  await view.findByText("Other rules");
  expect(view.queryByRole("link", { name: "Admin → Approvals" })).toBeNull();
});

test("rules for every Bot point to where rules for a single Bot are", async () => {
  inboxOverride = {
    rules: [
      ...inbox.rules,
      {
        id: "one-bot",
        botId: "shopper-bot",
        toolRef: "computer_click",
        effect: "*",
        scope: "*",
        behaviour: "ask",
      },
    ],
  };
  const view = draw(<ApprovalSettings />);
  const link = await view.findByRole("link", { name: "that Bot's page" });
  expect(link.getAttribute("href")).toBe("/bots");
  // A rule naming one Bot lives on that Bot's page, not here.
  expect(
    view.queryByRole("combobox", { name: "Behaviour for computer_click" }),
  ).toBeNull();
});

test("a rule naming no Bot this person can open is listed so it can be removed", async () => {
  inboxOverride = {
    rules: [
      ...inbox.rules,
      {
        id: "orphan",
        botId: "Shopper",
        toolRef: "computer_click",
        effect: "*",
        scope: "*",
        behaviour: "allow",
      },
    ],
  };
  const view = draw(<ApprovalSettings />);
  expect(await view.findByText("Rules for other Bots")).toBeTruthy();
  expect(
    view.getByRole("combobox", { name: "Behaviour for computer_click" }),
  ).toBeTruthy();
});

test("a pending change is drawn in the conversation where the action was, and decided there", async () => {
  const view = render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <InlineApproval toolCallId="pay-call" fallback={<p>Clicked on page</p>} />
      <InlineApproval
        toolCallId="other-call"
        fallback={<p>Filled in field</p>}
      />
    </QueryClientProvider>,
  );
  await view.findByRole("region", { name: "Waiting for your approval" });
  expect(view.getByText(/This needs you: click on shop.example/)).toBeTruthy();
  // Another call's line is left to its own renderer.
  expect(view.getByText("Filled in field")).toBeTruthy();
  expect(view.queryByText("Clicked on page")).toBeNull();
  fireEvent.click(view.getByRole("button", { name: "I did it myself" }));
  await waitFor(() =>
    expect(sent).toContainEqual({
      path: "/api/approvals/request-1/decision",
      method: "POST",
      body: { decision: "handled" },
    }),
  );
});

test("in the real transcript shape a waiting click is folded into browser activity, so its card is drawn beside the group", async () => {
  // What the channel transcript builds from the conversation: a navigate that finished and the
  // click the chat stopped on, unanswered, grouped into one browser-activity line.
  const items = groupToolSteps(
    toVisibleChatItems([
      { id: "u1", role: "user", content: "Order a pizza on httpbin" },
      {
        id: "a1",
        role: "assistant",
        content: "",
        toolCalls: [
          {
            id: "nav-call",
            type: "function",
            function: {
              name: "computer_navigate",
              arguments: '{"url":"https://httpbin.org/forms/post"}',
            },
          },
          {
            id: "pay-call",
            type: "function",
            function: {
              name: "computer_click",
              arguments: '{"ref":"e7","snapshotId":3}',
            },
          },
        ],
      },
      {
        id: "t1",
        role: "tool",
        toolCallId: "nav-call",
        content: '{"ok":true,"url":"https://httpbin.org/forms/post"}',
      },
    ] as never),
    // Browser steps fold whatever the app draws, so nothing else needs naming here.
    () => false,
  );
  const group = items.find((item) => item.kind === "tools");
  if (group?.kind !== "tools") throw new Error("no tool group");
  const view = render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      {/* ToolActivity mounts the waiting cards beside its folded line itself. */}
      <ToolActivity group={group} active={false} />
    </QueryClientProvider>,
  );
  await view.findByRole("region", { name: "Waiting for your approval" });
  // Only the waiting call gets a card; the finished navigate does not.
  expect(
    view.getAllByRole("region", { name: "Waiting for your approval" }),
  ).toHaveLength(1);
  expect(view.getByRole("button", { name: "I did it myself" })).toBeTruthy();
});
