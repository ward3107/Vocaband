import { describe, expect, it, vi } from "vitest";
import type { Socket } from "socket.io-client";
import { QP_EVENTS } from "../core/quickPlayProtocol";
import { emitArenaClaim } from "../utils/arenaClaim";

function claimSocket() {
  let moveAck: (() => void) | undefined;
  const socket = {
    connected: true,
    timeout: vi.fn().mockReturnThis(),
    emit: vi.fn((event: string, _payload: unknown, callback?: () => void) => {
      if (event === QP_EVENTS.ARENA_MOVE) moveAck = callback;
    }),
  };
  return { socket, acknowledgeMove: () => moveAck?.() };
}

describe("arena claim ordering", () => {
  it("waits for the server move acknowledgement before sending the grab", () => {
    const { socket, acknowledgeMove } = claimSocket();
    const claim = { sessionCode: "ABC234", clientId: "student", wordId: "word", x: 999.7, y: 1000.2 };
    emitArenaClaim(socket as unknown as Socket, claim, () => true);
    expect(socket.emit).toHaveBeenCalledTimes(1);
    expect(socket.emit).toHaveBeenCalledWith(QP_EVENTS.ARENA_MOVE,
      { sessionCode: "ABC234", clientId: "student", x: 1000, y: 1000 }, expect.any(Function));
    acknowledgeMove();
    expect(socket.emit).toHaveBeenLastCalledWith(QP_EVENTS.ARENA_GRAB, claim);
  });

  it("does not submit a stale claim after the socket changes", () => {
    const { socket, acknowledgeMove } = claimSocket();
    emitArenaClaim(socket as unknown as Socket,
      { sessionCode: "ABC234", clientId: "student", wordId: "word", x: 1000, y: 1000 }, () => false);
    acknowledgeMove();
    expect(socket.emit).toHaveBeenCalledTimes(1);
  });
});
