// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ArenaSoundscape, { ARENA_SOUND_PROFILES } from "../components/game/ArenaSoundscape";

const created = vi.fn();
const closed = vi.fn();
const stop = vi.fn();
const audioParam = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn() });
const node = () => ({ connect: vi.fn(function (this: unknown) { return this; }), disconnect: vi.fn(), start: vi.fn(), stop, frequency: audioParam(), gain: audioParam(), type: "" });

beforeEach(() => {
  localStorage.clear();
  created.mockClear(); closed.mockClear(); stop.mockClear();
  vi.stubGlobal("AudioContext", class {
    sampleRate = 10;
    currentTime = 0;
    state = "running";
    destination = node();
    constructor() { created(); }
    createBuffer() { return { getChannelData: () => new Float32Array(20) }; }
    createBufferSource() { return node(); }
    createBiquadFilter() { return node(); }
    createGain() { return node(); }
    createOscillator() { return node(); }
    resume() { return Promise.resolve(); }
    close() { closed(); return Promise.resolve(); }
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Arena ambience", () => {
  it("has a distinct profile for every map and waits for a user gesture", () => {
    expect(Object.keys(ARENA_SOUND_PROFILES)).toHaveLength(11);
    expect(ARENA_SOUND_PROFILES.jungle).not.toEqual(ARENA_SOUND_PROFILES.space);
    render(<ArenaSoundscape mapId="jungle" language="en" />);
    expect(created).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Play world ambience" }));
    expect(created).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Mute world ambience" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Mute world ambience" }));
    expect(closed).toHaveBeenCalledOnce();
    expect(stop).toHaveBeenCalled();
  });

  it("restores zero volume and labels controls in Hebrew", () => {
    localStorage.setItem("vb-arena-ambience-volume", "0");
    render(<ArenaSoundscape mapId="space" language="he" duck />);
    expect(screen.getByRole("slider", { name: "עוצמת צלילי העולם" })).toHaveProperty("value", "0");
    expect(created).not.toHaveBeenCalled();
  });
});
