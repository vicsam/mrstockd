/**
 * Landing page copy and data, kept in one place so wording can change
 * without touching layout or animation code.
 *
 * Text follows the Figma design. Where the design described something
 * MrStockd doesn't do (yet), the line is either rewritten to what the
 * product actually does, or marked "[Later stage]" the way the design
 * already marks future features. Look for `// changed from design`.
 */

export const REPO_URL = "https://github.com/vicsam/mrstockd";

export const nav = [
  { label: "Marketplace", href: "/tools", section: null },
  { label: "How it works", href: "/#how-it-works", section: "how-it-works" },
  { label: "Solutions", href: "/#built-for", section: "built-for" },
  { label: "Pricing", href: "/#pricing", section: "pricing" },
] as const;

/** Photo cards flanking the hero headline, by column, top to bottom. */
export const heroColumns = [
  { id: "outer-left", side: "left", depth: 1.4, cards: [{ src: "hero-1", badge: null }, { src: "hero-2", badge: null }] },
  { id: "inner-left", side: "left", depth: 0.8, cards: [{ src: "hero-3", badge: "99.8%" }, { src: "hero-4", badge: null }] },
  { id: "inner-right", side: "right", depth: 0.8, cards: [{ src: "hero-5", badge: "Top 1%" }, { src: "hero-6", badge: null }] },
  { id: "outer-right", side: "right", depth: 1.4, cards: [{ src: "hero-7", badge: null }, { src: "hero-8", badge: null }] },
] as const;

// changed from design: the headline and subtitle now say what MrStockd is,
// so a first-time visitor understands the product without scrolling.
export const hero = {
  eyebrow: "The marketplace for AI tools, paid with PayPal",
  title: ["AI tools worth", "trusting"],
  subtitle:
    "Builders list the AI tools they make. You, or your AI agent, buy them with PayPal and start using them in seconds with one API key. Every tool is reviewed by a person before it goes live.",
  cta: { label: "Browse tools", href: "/tools" },
  secondary: { label: "Sell your tool", href: "/sell" },
};

/** The problem MrStockd solves, in one line, shown above "How it works". */
export const story = {
  problem:
    "Useful AI tools are scattered across GitHub repos, Discord servers and DMs. You can't tell which ones work, paying a stranger is awkward, and your AI agent can't buy anything at all.",
  answer: "MrStockd puts them in one store, checks that they work, and handles the payment.",
};

export type Step = { title: string; body: string; icon: "search" | "card" | "key" | "plug" | "check" | "wallet" };

export const howItWorks: Record<"buyers" | "builders", { label: string; steps: Step[]; cta: { label: string; href: string } }> = {
  buyers: {
    label: "I want to use AI tools",
    steps: [
      {
        icon: "search",
        title: "Find the right tool",
        body: "Search in plain words, like \u201csummarise a PDF\u201d. Every tool shows what it does, its price, its docs and who built it.",
      },
      {
        icon: "card",
        title: "Pay with PayPal",
        body: "Buy a pack of credits or a monthly plan. You pay MrStockd through PayPal, so you never hand your card details to a stranger.",
      },
      {
        icon: "key",
        title: "Use it anywhere",
        body: "You get one API key. Call the tool from your own app, or connect your AI agent to MrStockd and let it use the tool for you.",
      },
    ],
    cta: { label: "Browse tools", href: "/tools" },
  },
  builders: {
    label: "I build AI tools",
    steps: [
      {
        icon: "plug",
        title: "List your tool",
        body: "Give us your tool's web address, set a price and write the docs. Your code, prompts and server stay with you.",
      },
      {
        icon: "check",
        title: "Get reviewed",
        body: "A person tests your tool before it goes live, so buyers can trust it. You can try it yourself with a free test key while you wait.",
      },
      {
        icon: "wallet",
        title: "Get paid",
        // PLATFORM_FEE_BPS in @mrstockd/core is 10%.
        body: "Buyers pay through PayPal. You keep 90% of every sale and see every call and sale in your dashboard.",
      },
    ],
    cta: { label: "Sell your tool", href: "/sell" },
  },
};

export const faqs = [
  {
    q: "What is MrStockd?",
    a: "A marketplace for AI tools. Builders list tools that do a job, like summarising documents or finding leads. People and their AI agents buy them with PayPal and use them through one API key.",
  },
  {
    q: "What counts as an AI tool?",
    a: "Anything that does a job over the web: a summariser, an image generator, a data cleaner, or a full agent. If it takes a request and sends back a result, it can be listed.",
  },
  {
    q: "How does my AI agent use MrStockd?",
    // changed from design: agent purchases are not built yet, so this says what works today.
    a: "Connect your agent (Claude, Cursor or any app that supports MCP) to the MrStockd MCP server. It can then search the store and call the tools you have keys for. Letting agents buy on their own, within a spend limit you approve in PayPal, is coming next.",
  },
  {
    q: "Can buyers see my code or prompts?",
    a: "No. Every call goes through the MrStockd gateway to your server, so buyers only ever see the result. Your code, prompts and server address stay private.",
  },
  {
    q: "What if a tool fails?",
    a: "If a tool returns an error or times out, the credit for that call goes straight back to your balance. You only pay for calls that work.",
  },
  {
    q: "What does it cost?",
    a: "Buyers pay the price the builder sets. Listing a tool is free; MrStockd keeps 10% of each sale and the builder gets the rest.",
  },
] as const;

export const integrations = [
  { id: "gmail", name: "Gmail", icon: "gmail", tilt: -16, outer: true, detail: { title: "Gmail: Let agents draft and file your email", body: "Hand inbox chores to an agent and approve what it sends." } },
  { id: "slack", name: "Slack", icon: "slack", tilt: -8, outer: false, detail: { title: "Slack: Get agent updates in your channels", body: "Trigger autonomous workflows directly from Slack threads and alerts." } },
  { id: "calendar", name: "Calendar", icon: "calendar", tilt: 0, outer: false, detail: { title: "Calendar: Book and move meetings for you", body: "Agents find a time that works and keep your schedule in sync." } },
  { id: "notion", name: "Notion", icon: "notion", tilt: 8, outer: false, detail: { title: "Notion: Turn notes into finished work", body: "Agents read your docs and write summaries, plans and updates back." } },
  { id: "zapier", name: "Zapier", icon: "zapier", tilt: 16, outer: true, detail: { title: "Zapier: Connect thousands of other apps", body: "Chain an agent into the automations you already run." } },
] as const;

export const trust = [
  {
    title: ["Builder verification and", "agent review"],
    // changed from design: describes MrStockd's actual review process.
    body: "Every tool is reviewed by a person before it is listed, and changing a live tool's endpoint sends it back to review.",
    color: "#ffd84d",
    icon: "trust-shield",
    later: false,
  },
  {
    title: ["Sandboxed test runs"],
    body: "Every demonstration runs in disposable, air-gapped micro-VM containers with zero outbound host access.",
    color: "#3ccbf4",
    icon: "trust-chip",
    later: true, // changed from design: not built yet
  },
  {
    title: ["Clear permission", "disclosure"],
    body: "Granular manifest files outlining precise data read/write envelopes, credential boundaries, and model routing.",
    color: "#7c5cfa",
    icon: "trust-key",
    later: true, // changed from design: not built yet
  },
  {
    title: ["Ratings from verified", "purchases only"],
    // changed from design: MrStockd has PayPal purchases, not on-chain history.
    body: "Reviews can only be written by accounts that bought the tool through PayPal checkout.",
    color: "#f25c54",
    icon: "trust-star",
    later: true, // changed from design: reviews are not built yet
  },
] as const;

// changed from design: refunds and escrow mediation aren't built; this is what MrStockd does today.
export const trustNote = "Pay securely with PayPal. If a tool fails or times out, the call is refunded automatically.";

export const earnings = [
  // changed from design: MrStockd's platform fee is 10% (PLATFORM_FEE_BPS in @mrstockd/core).
  { stream: "Commission", how: "10 percent of each sale or subscription payment", role: "Core", tone: "core" },
  { stream: "Featured placement", how: "Homepage, category and search boosts", role: "Secondary", tone: "secondary" },
  { stream: "Builder Pro tier", how: "Analytics, priority review, lower commission ($29-$79/mo)", role: "Secondary", tone: "secondary" },
  { stream: "Enterprise and team plans", how: "Bulk licensing, admin controls, invoicing, VPC peering", role: "[Later stage]", tone: "later" },
] as const;

export const footerColumns = [
  {
    title: "Marketplace",
    links: [
      { label: "Autonomous Workflows", href: "/tools" },
      { label: "Compute Network", href: "/#integrations" },
      { label: "Agentic Registry", href: "/tools" },
      { label: "Safety Architecture", href: "/#trust" },
    ],
  },
  {
    title: "Builders",
    links: [
      { label: "Developer Docs", href: `${REPO_URL}#readme` },
      { label: "Builder Pro", href: "/#pricing" },
      { label: "Security Manifest", href: `${REPO_URL}#security-principles` },
      { label: "Sandbox SDK", href: "/sell" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Enterprise SLAs", href: "/#pricing" },
      { label: "Security Whitepaper", href: `${REPO_URL}#security-principles` },
      { label: "Privacy Framework", href: `${REPO_URL}#security-principles` },
      { label: "Press Kit", href: REPO_URL },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "System Status", href: "status" },
      { label: "Terms of Service", href: `${REPO_URL}/blob/main/LICENSE` },
      { label: "Dispute Mediation", href: "/#trust" },
      { label: "Contact Concierge", href: `${REPO_URL}/issues` },
    ],
  },
] as const;
