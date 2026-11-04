// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ArenaCanvas from "../components/game/ArenaCanvas";
import { QP_ARENA_HEIGHT, QP_ARENA_WIDTH, type QpArenaStatePayload } from "../core/quickPlayProtocol";
import { ARENA_STUDENT_STRINGS, type ArenaClaimCopy } from "../views/arenaStrings";

const arena: QpArenaStatePayload = {
  sessionCode: "ABC123",
  width: QP_ARENA_WIDTH,
  height: QP_ARENA_HEIGHT,
  grabRadius: 60,
  roundSeconds: 20,
  words: [{ wordId: "one", label: "Ocean", pos: { x: 1000, y: 1000 }, state: "available" }],
  positions: [{ clientId: "student", nickname: "Student", avatar: "cat", x: 1000, y: 1000 }],
  pickups: [],
};

let frame: FrameRequestCallback | undefined;
beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    disconnect() {}
  });
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { frame = cb; return 1; });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); frame = undefined; });

function mount(startX: number, claimCopy: ArenaClaimCopy = ARENA_STUDENT_STRINGS.en.claim) {
  const onGrab = vi.fn();
  const positionsRef = { current: new Map([["student", { x: startX, y: 1000 }]]) };
  const inputRef = { current: { dx: 0, dy: 0 } };
  const selfPosRef = { current: { x: startX, y: 1000 } };
  render(<ArenaCanvas arena={arena} positionsRef={positionsRef} leaderboard={[]}
    selfClientId="student" inputRef={inputRef} selfPosRef={selfPosRef} onGrab={onGrab}
    claimCopy={claimCopy} />);
  act(() => { frame?.(performance.now() + 16); });
  return { onGrab, selfPosRef };
}

describe("arena word claiming", () => {
  it.each(["en", "he", "ar"] as const)("requires an explicit tap with %s copy", language => {
    const copy = ARENA_STUDENT_STRINGS[language].claim;
    const { onGrab } = mount(1000, copy);
    expect(onGrab).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: copy.tapToClaim("Ocean") })).toBeTruthy();
    expect(screen.getByText(copy.tap)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: copy.claim("Ocean") }));
    expect(onGrab).toHaveBeenCalledOnce();
    expect(onGrab).toHaveBeenCalledWith("one", 1000, 1000);
  });

  it.each(["en", "he", "ar"] as const)("does not claim or auto-run from a distant %s label", language => {
    const copy = ARENA_STUDENT_STRINGS[language].claim;
    const { onGrab, selfPosRef } = mount(2000, copy);
    fireEvent.click(screen.getByRole("button", { name: copy.moveCloser("Ocean") }));
    act(() => { frame?.(performance.now() + 32); });
    expect(onGrab).not.toHaveBeenCalled();
    expect(selfPosRef.current.x).toBe(2000);
  });
});
