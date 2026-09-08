import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// This is the architectural invariant from SRS §16.2/§16.4: no query path may
// ever exist from an election_ballots row back to a member. The strongest
// guarantee we can give is at the schema level — if a future change adds a
// member/voter reference to ElectionBallot (or a candidate reference to
// ElectionVoter), this test fails immediately, before it ever reaches a
// database.
const schema = readFileSync(join(__dirname, "schema.prisma"), "utf-8");

function extractModel(name: string): string {
  const match = schema.match(new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`));
  if (!match) throw new Error(`model ${name} not found in schema.prisma`);
  return match[1];
}

describe("election ballot/voter privacy separation (SRS §16.2)", () => {
  it("ElectionBallot has no member or voter reference of any kind", () => {
    const body = extractModel("ElectionBallot").toLowerCase();
    expect(body).not.toContain("member");
    expect(body).not.toContain("voter");
  });

  it("ElectionVoter has no candidate or ballot/choice reference of any kind", () => {
    const body = extractModel("ElectionVoter").toLowerCase();
    expect(body).not.toContain("candidate");
    expect(body).not.toContain("ballot");
  });

  it("ElectionBallot's cast date column has no time precision (SRS §16.3 timing-correlation mitigation)", () => {
    const body = extractModel("ElectionBallot");
    expect(body).toMatch(/castDate\s+DateTime\s+@map\("cast_date"\)\s+@db\.Date/);
  });
});
