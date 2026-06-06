import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

afterEach(cleanup);
import ModeIsland from "../components/arcade/ModeIsland";

const base = {
  name: "Classic",
  emoji: <span>📖</span>,
  gradient: "from-emerald-400 to-teal-500",
  pos: { xPct: 50, y: 120 },
  reduced: true,
};

describe("ModeIsland", () => {
  it("labels the button with the mode name and state", () => {
    render(<ModeIsland {...base} state="done" mastery={2} onTap={() => {}} />);
    expect(screen.getByRole("button", { name: /Classic/ })).toBeTruthy();
  });

  it("fires onTap when not locked", () => {
    const onTap = vi.fn();
    render(<ModeIsland {...base} state="todo" mastery={0} onTap={onTap} />);
    fireEvent.click(screen.getByRole("button", { name: /Classic/ }));
    expect(onTap).toHaveBeenCalledOnce();
  });

  it("does not fire onTap when locked", () => {
    const onTap = vi.fn();
    render(<ModeIsland {...base} state="locked" mastery={0} onTap={onTap} />);
    fireEvent.click(screen.getByRole("button", { name: /Classic/ }));
    expect(onTap).not.toHaveBeenCalled();
  });
});
