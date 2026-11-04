import type { Socket } from "socket.io-client";
import { QP_EVENTS, type QpArenaGrabPayload, type QpArenaMovePayload } from "../core/quickPlayProtocol";

/** Commit the position behind the claim cue before asking the referee to lock a word. */
export function emitArenaClaim(socket: Socket, claim: QpArenaGrabPayload & { x: number; y: number }, isCurrent: () => boolean) {
  const position: QpArenaMovePayload = {
    sessionCode: claim.sessionCode,
    clientId: claim.clientId,
    x: Math.round(claim.x),
    y: Math.round(claim.y),
  };
  // The regular movement stream runs at 10/sec. Its last position can be
  // outside the grab radius even when the local 60fps cue says "Claim".
  socket.timeout(1500).emit(QP_EVENTS.ARENA_MOVE, position, () => {
    if (!isCurrent() || !socket.connected) return;
    // A timed-out or rejected move still goes through the referee, which
    // checks its last accepted position and can safely deny the attempt.
    socket.emit(QP_EVENTS.ARENA_GRAB, claim);
  });
}
