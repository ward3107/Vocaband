import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import type { QpArenaMapId } from "../../core/quickPlayProtocol";
import { arenaMapById } from "./arenaMaps";

type Profile = { filterHz: number; bed: number; toneHz: number; pulseHz: number; accent: "chirp" | "bubble" | "none" };

/** Small procedural beds ship with the game, so no third-party audio or network request is needed. */
export const ARENA_SOUND_PROFILES: Record<QpArenaMapId, Profile> = {
  islands:    { filterHz: 820, bed: .36, toneHz: 175, pulseHz: .09, accent: "bubble" },
  forest:     { filterHz: 1250, bed: .28, toneHz: 220, pulseHz: .07, accent: "chirp" },
  frozen:     { filterHz: 680, bed: .42, toneHz: 110, pulseHz: .05, accent: "none" },
  volcano:    { filterHz: 310, bed: .58, toneHz: 69, pulseHz: .14, accent: "none" },
  space:      { filterHz: 260, bed: .15, toneHz: 98, pulseHz: .12, accent: "none" },
  candy:      { filterHz: 1450, bed: .10, toneHz: 330, pulseHz: .18, accent: "chirp" },
  underwater: { filterHz: 570, bed: .40, toneHz: 146, pulseHz: .08, accent: "bubble" },
  desert:     { filterHz: 940, bed: .37, toneHz: 130, pulseHz: .06, accent: "none" },
  jungle:     { filterHz: 1320, bed: .32, toneHz: 196, pulseHz: .08, accent: "chirp" },
  kingdom:    { filterHz: 880, bed: .24, toneHz: 247, pulseHz: .09, accent: "chirp" },
  city:       { filterHz: 440, bed: .31, toneHz: 82, pulseHz: .11, accent: "none" },
};

type SoundGraph = { nodes: AudioScheduledSourceNode[]; timer: number | null; stop: () => void };

function makeGraph(ctx: AudioContext, output: GainNode, profile: Profile): SoundGraph {
  const nodes: AudioScheduledSourceNode[] = [];
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = profile.filterHz;
  const bed = ctx.createGain();
  bed.gain.value = profile.bed;
  noise.connect(filter).connect(bed).connect(output);
  noise.start();
  nodes.push(noise);

  const tone = ctx.createOscillator();
  tone.type = "sine";
  tone.frequency.value = profile.toneHz;
  const toneGain = ctx.createGain();
  toneGain.gain.value = profile.accent === "none" ? .12 : .055;
  tone.connect(toneGain).connect(output);
  tone.start();
  nodes.push(tone);

  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = profile.pulseHz;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = .035;
  lfo.connect(lfoGain).connect(toneGain.gain);
  lfo.start();
  nodes.push(lfo);

  let timer: number | null = null;
  if (profile.accent !== "none") {
    timer = window.setInterval(() => {
      if (document.hidden || ctx.state !== "running") return;
      const accent = ctx.createOscillator();
      accent.type = "sine";
      const t = ctx.currentTime;
      const base = profile.accent === "chirp" ? 780 : 170;
      accent.frequency.setValueAtTime(base, t);
      accent.frequency.exponentialRampToValueAtTime(profile.accent === "chirp" ? 1320 : 380, t + .18);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(.0001, t);
      gain.gain.exponentialRampToValueAtTime(.07, t + .035);
      gain.gain.exponentialRampToValueAtTime(.0001, t + .32);
      accent.connect(gain).connect(output);
      accent.start(t);
      accent.stop(t + .34);
    }, profile.accent === "chirp" ? 4800 : 3500);
  }
  return {
    nodes, timer,
    stop: () => {
      if (timer !== null) window.clearInterval(timer);
      for (const node of nodes) { try { node.stop(); } catch { /* already stopped */ } node.disconnect(); }
    },
  };
}

const COPY = {
  en: { title: "World ambience", play: "Play world ambience", pause: "Mute world ambience", volume: "World ambience volume" },
  he: { title: "צלילי העולם", play: "הפעלת צלילי העולם", pause: "השתקת צלילי העולם", volume: "עוצמת צלילי העולם" },
  ar: { title: "أصوات العالم", play: "تشغيل أصوات العالم", pause: "كتم أصوات العالم", volume: "مستوى أصوات العالم" },
} as const;

interface Props { mapId: QpArenaMapId; language: "en" | "he" | "ar"; compact?: boolean; duck?: boolean }

export default function ArenaSoundscape({ mapId, language, compact = false, duck = false }: Props) {
  const t = COPY[language];
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(() => {
    try { const saved = Number(localStorage.getItem("vb-arena-ambience-volume") ?? .35); return Number.isFinite(saved) ? Math.min(1, Math.max(0, saved)) : .35; }
    catch { return .35; }
  });
  const volumeRef = useRef(volume);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  const duckRef = useRef(duck);
  useEffect(() => { duckRef.current = duck; }, [duck]);
  const active = useRef<{ ctx: AudioContext; output: GainNode; graph: SoundGraph } | null>(null);

  const stop = () => {
    const current = active.current;
    active.current = null;
    if (!current) return;
    current.graph.stop();
    void current.ctx.close().catch(() => { /* browser already closed it */ });
  };

  const toggle = () => {
    if (active.current) { stop(); setPlaying(false); return; }
    try {
      const ctx = new AudioContext();
      const output = ctx.createGain();
      output.gain.value = duck || document.hidden ? 0 : volume * .12;
      output.connect(ctx.destination);
      const graph = makeGraph(ctx, output, ARENA_SOUND_PROFILES[mapId]);
      active.current = { ctx, output, graph };
      void ctx.resume().catch(() => { stop(); setPlaying(false); });
      setPlaying(true);
    } catch { stop(); setPlaying(false); }
  };

  useEffect(() => {
    const current = active.current;
    if (!current) return;
    current.graph.stop();
    current.graph = makeGraph(current.ctx, current.output, ARENA_SOUND_PROFILES[mapId]);
  }, [mapId]);

  useEffect(() => {
    const current = active.current;
    if (!current) return;
    current.output.gain.setTargetAtTime(duck || document.hidden ? 0 : volume * .12, current.ctx.currentTime, .12);
  }, [duck, volume, playing]);

  useEffect(() => {
    const onVisibility = () => {
      const current = active.current;
      if (!current) return;
      current.output.gain.setTargetAtTime(document.hidden || duckRef.current ? 0 : volumeRef.current * .12, current.ctx.currentTime, .12);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { document.removeEventListener("visibilitychange", onVisibility); stop(); };
    // Cleanup is intentionally tied to the component lifetime, not volume changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mapName = arenaMapById(mapId)?.name[language] ?? "";
  return (
    <div className={`inline-flex max-w-full items-center gap-2 rounded-xl border border-white/20 bg-slate-950/80 px-2.5 py-2 text-white shadow-lg backdrop-blur-sm ${compact ? "text-xs" : "text-sm"}`}>
      <button type="button" onClick={toggle} aria-pressed={playing} aria-label={playing ? t.pause : t.play}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-300 px-2.5 font-black text-slate-950 hover:bg-emerald-200">
        {playing ? <Volume2 size={16} /> : <VolumeX size={16} />}
        <span>{t.title}</span>
      </button>
      {!compact && <span className="hidden max-w-32 truncate text-xs font-bold text-white/75 sm:inline" title={mapName}>{mapName}</span>}
      <input type="range" min="0" max="1" step="0.05" value={volume} aria-label={t.volume}
        onChange={event => { const next = Number(event.target.value); setVolume(next); try { localStorage.setItem("vb-arena-ambience-volume", String(next)); } catch { /* storage blocked */ } }}
        className="w-14 accent-emerald-300 sm:w-20" />
    </div>
  );
}
