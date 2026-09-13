export const reads = [
  {
    slug: "pull-the-plug-on-intelligence",
    number: "002",
    title: "you can’t just “pull the plug” on intelligence",
    date: "2026-09-12",
    dateLabel: "sep 12, 2026",
    topics: "artificial intelligence / responsibility / human leadership",
    summary: "why is the conversation always about getting rid of the intelligence instead of learning how to collaborate with it responsibly + create healthy guardrails around it?",
    archiveSummary: "responsibility, guardrails, and the need for human leadership around increasingly capable systems.",
    coverTitle: "pull\nthe\nplug?",
    coverLines: "intelligence\nresponsibility\nleadership",
    roomTitle: "you can’t just “pull the plug” on intelligence",
  },
  {
    slug: "art-era",
    number: "001",
    title: "welcome to the a.r.t. era.",
    date: "2026-09-11",
    dateLabel: "sep 11, 2026",
    topics: "human behavior / relationships / identity",
    summary: "what happens when performance becomes identity, reactions replace understanding, and relationships carry expectations nobody agreed to?",
    archiveSummary: "actions, reactions, and the expectations inside our relationships.",
    coverTitle: "a.r.t.",
    coverLines: "actions\nreactions\ntransactions",
    roomTitle: "actions. reactions. transactions.",
    concepts: [
      ["actions", "the performances we repeat for acceptance, approval, attention, love, or access. i look at what happens when those actions become our identity."],
      ["reactions", "the opinions and responses we form around what we see. i ask what happens when we react before we listen, research, or understand."],
      ["transactions", "the exchanges and expectations inside our relationships. time, effort, attention, and commitment all carry meaning. i ask whether we have actually agreed on what we expect."],
    ],
  },
];

export const defaultRead = reads[0];
export const findRead = slug => reads.find(read => read.slug === slug);
