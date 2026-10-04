import type { PageDef } from "../types";

export const overviewPage: PageDef = {
  route: "/",
  title: "Overview",
  blocks: [
    { kind: "h1", text: "PCP" },

    {
      kind: "p",
      text: "**PCP coordinates access to shared physical resources — space, tools, actuation — across multiple robots or actuated agents, through formally verified safety gates.**",
    },

    {
      kind: "p",
      text: "MCP solved tool-calling for software agents: a model can invoke a function, and the worst outcome is a bad string. Physical agents are different. Two robots granted the same space at the same time do not return errors — they collide. A gripper commanded past its force budget does not raise an exception — it breaks the part, or a finger. PCP exists for that gap: a protocol layer that treats space, energy, and actuation as lease-guarded resources, checks every command against a declared constitution before it runs, and validates it in a shadow before it ever reaches hardware.",
    },

    {
      kind: "p",
      text: "Every request passes the same fixed gate sequence. The order is part of the specification, not an implementation choice:",
    },

    {
      kind: "ascii",
      content: [
        " agent request",
        "      │",
        "      ▼",
        " ┌───────┐   ┌──────────────┐   ┌─────────┐",
        " │ LEASE │──▶│ CONSTITUTION │──▶│ SHADOW  │──▶ actuation",
        " └───────┘   └──────────────┘   └─────────┘",
        "      │            │                │",
        "      └────────────┼────────────────┘",
        "                   │",
        "                E-STOP (latch)",
      ].join("\n"),
    },

    {
      kind: "p",
      text: "**Lease** — does the agent hold exclusive rights to the space and resources it is about to use? **Constitution** — does the command itself satisfy the deployment's declared safety rules? **Shadow** — does a validated monitor agree the plan is safe, immediately before execution? **E-Stop** is not gate four: it is a separate path that cuts across all three, latches, and requires an explicit reset.",
    },

    {
      kind: "linkrows",
      rows: [
        { label: "Quickstart", href: "/quickstart", desc: "working code in under 5 minutes" },
        { label: "Protocol Overview", href: "/protocol/overview", desc: "the wire format and required behaviors" },
        { label: "Limitations", href: "/limitations", desc: "the three open research problems" },
      ],
    },

    {
      kind: "p",
      text: "[159/160 Python tests passing](/verification) · [43/43 Rust tests passing](/verification) · [TLA+ model-checked](/verification)",
    },
  ],
};
