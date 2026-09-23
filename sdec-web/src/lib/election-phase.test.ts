import { describe, expect, it } from "vitest";
import { electionPhase, type ElectionPhaseInput } from "./election-phase";

function base(overrides: Partial<ElectionPhaseInput> = {}): ElectionPhaseInput {
  return {
    is_published: true,
    override: null,
    nominations_open_at: null,
    nominations_close_at: null,
    starts_at: "2026-03-01T00:00:00Z",
    ends_at: "2026-03-03T00:00:00Z",
    results_published_at: null,
    ...overrides,
  };
}

describe("electionPhase", () => {
  it("is draft when not published", () => {
    expect(electionPhase(base({ is_published: false }))).toBe("draft");
  });

  it("is cancelled when overridden, even if published", () => {
    expect(electionPhase(base({ override: "cancelled" }))).toBe("cancelled");
  });

  it("is paused when overridden", () => {
    expect(electionPhase(base({ override: "paused" }))).toBe("paused");
  });

  it("is results once published, regardless of time", () => {
    expect(
      electionPhase(base({ results_published_at: "2026-03-04T00:00:00Z" })),
    ).toBe("results");
  });

  it("is nominations inside the nomination window", () => {
    const election = base({
      nominations_open_at: "2026-02-01T00:00:00Z",
      nominations_close_at: "2026-02-10T00:00:00Z",
    });
    expect(
      electionPhase(election, new Date("2026-02-05T00:00:00Z")),
    ).toBe("nominations");
  });

  it("is scheduled before starts_at", () => {
    expect(
      electionPhase(base(), new Date("2026-02-28T00:00:00Z")),
    ).toBe("scheduled");
  });

  it("is live between starts_at and ends_at", () => {
    expect(
      electionPhase(base(), new Date("2026-03-02T00:00:00Z")),
    ).toBe("live");
  });

  it("is ended after ends_at", () => {
    expect(
      electionPhase(base(), new Date("2026-03-04T00:00:00Z")),
    ).toBe("ended");
  });

  it("is ended when closed early, even before ends_at", () => {
    const election = base({ override: "closed_early" });
    expect(
      electionPhase(election, new Date("2026-03-02T00:00:00Z")),
    ).toBe("ended");
  });
});
