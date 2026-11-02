// Simulated recording and real playback. Audio never leaves the phone:
// blobs stay in memory or in this browser's IndexedDB, never in AppState or on the server.

import { useCallback, useEffect, useRef, useState } from 'react';

/** Placeholder for Ah Ma's real voice clip. Replace the file, keep the name, or change this path. */
export const AH_MA_CLIP_URL = '/audio/ah-ma-placeholder.m4a';

export type RecorderStatus = 'idle' | 'requesting' | 'recording' | 'stopped' | 'denied' | 'unsupported' | 'error';

export type Recorder = {
  status: RecorderStatus;
  /** Seconds since start. Freezes on stop. */
  elapsedSec: number;
  /** Recent input levels 0..1, newest last, about 10 per second. Feed it to <Waveform levels>. */
  levels: number[];
  /** The finished recording, after stop(). */
  blob: Blob | null;
  /** Object URL of blob, for <audio> or usePlayer. */
  url: string | null;
  /** Starts the simulated recording. */
  start: () => Promise<void>;
  /** Stops and resolves with the recording. */
  stop: () => Promise<Blob | null>;
  /** Stops and throws the audio away. */
  discard: () => void;
};

const MAX_LEVELS = 64;
const TICK_MS = 100;
/** The silent stand-in clip is never longer than this. */
const MAX_CLIP_SEC = 60;

/** A silent 8 kHz WAV file, so "play your recording" works without real audio. */
function silentWav(seconds: number): Blob {
  const rate = 8000;
  const samples = Math.max(1, Math.round(rate * Math.min(Math.max(seconds, 1), MAX_CLIP_SEC)));
  const buffer = new ArrayBuffer(44 + samples);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  text(36, 'data');
  view.setUint32(40, samples, true);
  new Uint8Array(buffer, 44).fill(128);
  return new Blob([buffer], { type: 'audio/wav' });
}

/** Next waveform level: a smooth random walk between 0.2 and 0.95, like speech. */
function nextLevel(prev: number): number {
  const target = 0.2 + Math.random() * 0.75;
  return Math.min(0.95, Math.max(0.2, prev + (target - prev) * 0.6));
}

/**
 * Simulated recorder. The prototype never asks for the microphone: the timer counts up,
 * the waveform moves on its own, and stop() returns a silent clip of the same length.
 * The brief allows simulated features, and a demo must not stop at a permission prompt.
 */
export function useRecorder(): Recorder {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [elapsedSec, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  const startedAt = useRef(0);
  const elapsedRef = useRef(0);

  // The timer and the waveform run while the status is "recording". Tying them to the status
  // (not to start()) keeps them running when React mounts the screen twice in development.
  useEffect(() => {
    if (status !== 'recording') return;
    let level = 0.5;
    const timer = window.setInterval(() => {
      level = nextLevel(level);
      const sampled = level;
      setLevels((prev) => [...prev.slice(-(MAX_LEVELS - 1)), sampled]);
      const seconds = Math.floor((performance.now() - startedAt.current) / 1000);
      elapsedRef.current = seconds;
      setElapsed(seconds);
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  const start = useCallback(async () => {
    setBlob(null);
    setUrl(null);
    setLevels([]);
    setElapsed(0);
    elapsedRef.current = 0;
    startedAt.current = performance.now();
    setStatus('recording');
  }, []);

  const stop = useCallback(async () => {
    if (status !== 'recording') return blob;
    const out = silentWav(elapsedRef.current);
    setBlob(out);
    setUrl(URL.createObjectURL(out));
    setStatus('stopped');
    return out;
  }, [blob, status]);

  const discard = useCallback(() => {
    setBlob(null);
    setUrl(null);
    setLevels([]);
    setElapsed(0);
    elapsedRef.current = 0;
    setStatus('idle');
  }, []);

  return { status, elapsedSec, levels, blob, url, start, stop, discard };
}

export type Player = {
  playing: boolean;
  /** 0..1 */
  progress: number;
  durationSec: number;
  toggle: () => void;
  stop: () => void;
  /** True when the file could not load. */
  failed: boolean;
};

/** Plays a URL (object URL or /audio/... file). Only one player plays at a time. */
export function usePlayer(src: string | null | undefined): Player {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [durationSec, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src) return;
    const a = new Audio(src);
    a.preload = 'metadata';
    audio.current = a;
    setFailed(false);
    const onTime = () => setProgress(a.duration ? a.currentTime / a.duration : 0);
    const onMeta = () => setDuration(Number.isFinite(a.duration) ? a.duration : 0);
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };
    const onPause = () => setPlaying(false);
    const onPlay = () => {
      setPlaying(true);
      window.dispatchEvent(new CustomEvent('kinvo:play', { detail: a }));
    };
    const onOther = (e: Event) => {
      if ((e as CustomEvent<HTMLAudioElement>).detail !== a) a.pause();
    };
    const onError = () => setFailed(true);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('ended', onEnd);
    a.addEventListener('pause', onPause);
    a.addEventListener('play', onPlay);
    a.addEventListener('error', onError);
    window.addEventListener('kinvo:play', onOther);
    return () => {
      a.pause();
      a.removeAttribute('src');
      window.removeEventListener('kinvo:play', onOther);
      audio.current = null;
      setPlaying(false);
      setProgress(0);
    };
  }, [src]);

  const toggle = useCallback(() => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) void a.play().catch(() => setFailed(true));
    else a.pause();
  }, []);

  const stop = useCallback(() => {
    const a = audio.current;
    if (!a) return;
    a.pause();
    a.currentTime = 0;
    setProgress(0);
  }, []);

  return { playing, progress, durationSec, toggle, stop, failed };
}

// IndexedDB: keep a recording on this phone across reloads. Key = story id or attempt id.
const DB_NAME = 'kinvo-audio';
const DB_STORE = 'clips';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveClip(key: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadClip(key: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    const out = await new Promise<Blob | null>((resolve, reject) => {
      const req = db.transaction(DB_STORE).objectStore(DB_STORE).get(key);
      req.onsuccess = () => resolve(req.result instanceof Blob ? req.result : null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return out;
  } catch {
    return null;
  }
}

export async function deleteClip(key: string): Promise<void> {
  try {
    const db = await openDb();
    db.transaction(DB_STORE, 'readwrite').objectStore(DB_STORE).delete(key);
    db.close();
  } catch {
    // Nothing to delete.
  }
}

/** Object URL for a saved clip, or null. Revokes it on unmount. */
export function useClipUrl(key: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!key) return;
    let made: string | null = null;
    let live = true;
    void loadClip(key).then((b) => {
      if (!live || !b) return;
      made = URL.createObjectURL(b);
      setUrl(made);
    });
    return () => {
      live = false;
      if (made) URL.revokeObjectURL(made);
      setUrl(null);
    };
  }, [key]);
  return url;
}
