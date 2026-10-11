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
  { label: "Workflows", href: "/#integrations", section: "integrations" },
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

export const hero = {
  title: ["Builders worth", "trusting"],
  subtitle: "Every builder is verified and every agent is reviewed before it is listed.",
  cta: { label: "Browse builders", href: "/tools" },
};

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
