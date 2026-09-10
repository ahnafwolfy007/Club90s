/**
 * CLUB 90s FC — Constitution & Official Rulebook v1.0 (effective September 2026)
 *
 * This module is the single source of truth for every rule the app enforces.
 * Each export cites the clause it implements, so app behaviour can always be
 * traced back to the document — and so a rulebook amendment has one obvious
 * place to land.
 *
 * Nothing here touches the database or the network: it is pure, so the rules
 * can be unit-tested directly (see rulebook.test.ts).
 */

export const RULEBOOK = {
  version: "1.0",
  /** §9.2 — takes effect on the stated Effective Date. */
  effectiveFrom: "2026-09",
  clubName: "CLUB 90s FC",
  established: 2023,
} as const;

/**
 * §4 — the six official Divisions. These replace the app's earlier ad-hoc
 * sector list; `legacyName` maps an old sector onto its rulebook Division so
 * existing role assignments survive the rename.
 */
export const DIVISIONS = [
  {
    number: 1,
    name: "Player Recruitment & Scouting",
    legacyName: "Recruitment",
    description:
      "Scouting, open trials, student recruitment, core squad announcements, long-term player development. Dissolves once an official Coach is hired (§4.1).",
  },
  {
    number: 2,
    name: "Operations & Management",
    legacyName: "Club Team",
    description: "Pitch procurement, session scheduling, equipment, referee coordination (§4.2).",
  },
  {
    number: 3,
    name: "Administration & Governance",
    legacyName: null,
    description:
      "Member registry, digital tools, voting penalties and code of conduct enforcement, constitutional documentation, BFF communications (§4.3).",
  },
  {
    number: 4,
    name: "Finance & Fund",
    legacyName: "Finance",
    description: "Dues and match fee collection, receipts, ledger, payments, monthly reporting (§4.4).",
  },
  {
    number: 5,
    name: "Media, Content & Sponsorship",
    legacyName: "Communications",
    description: "Social media, photography, tournament coverage, kit graphics, sponsorship outreach (§4.5).",
  },
  {
    number: 6,
    name: "Tournament & Competitions",
    legacyName: "Tournament",
    description:
      "Tournament identification, registration and coordination, fixtures, logistics, budgeting, records. Also reviews disciplinary infractions (§4.6, §7.2.1).",
  },
] as const;

export type DivisionName = (typeof DIVISIONS)[number]["name"];

export const DIVISION = {
  RECRUITMENT: "Player Recruitment & Scouting",
  OPERATIONS: "Operations & Management",
  ADMINISTRATION: "Administration & Governance",
  FINANCE: "Finance & Fund",
  MEDIA: "Media, Content & Sponsorship",
  TOURNAMENT: "Tournament & Competitions",
} as const satisfies Record<string, DivisionName>;

/** §3.3.2 — each Division is co-headed by a Senior and a Junior President. */
export const PRESIDENT_TIERS = ["senior", "junior"] as const;

/** §3.4.1 — Divisional Presidents serve a one-year term. */
export const PRESIDENT_TERM_MONTHS = 12;

/** §3.4.2 — elections are announced 30 days before term expiry. */
export const ELECTION_NOTICE_DAYS = 30;

/** §3.4.6 — removal before term expiry needs a two-thirds majority. */
export const REMOVAL_MAJORITY = 2 / 3;

/** §9.1.1 — amendments need a two-thirds Executive Committee majority. */
export const AMENDMENT_MAJORITY = 2 / 3;

export * from "./effective";
export * from "./dues";
export * from "./voting";
export * from "./jersey";
export * from "./eligibility";
export * from "./attendance";
