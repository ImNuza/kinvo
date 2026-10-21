// Microphone recording and playback. Audio never leaves the phone:
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
  /** Asks for the mic (first time) and starts. */
  start: () => Promise<void>;
  /** Stops and resolves with the recording. */
  stop: () => Promise<Blob | null>;
  /** Stops and throws the audio away. */
  discard: () => void;
};

const MAX_LEVELS = 64;

export function useRecorder(): Recorder {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [elapsedSec, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  const media = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const raf = useRef<number | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const stopResolve = useRef<((b: Blob | null) => void) | null>(null);
  const keep = useRef(true);
  const mounted = useRef(true);

  const cleanup = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    void ctx.current?.close().catch(() => undefined);
    ctx.current = null;
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const rec = media.current;
      if (rec && rec.state !== 'inactive') {
        keep.current = false;
        rec.stop();
      }
      cleanup();
    };
  }, [cleanup]);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  const start = useCallback(async () => {
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported');
      return;
    }
    setStatus('requesting');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      // The screen closed while the permission prompt was open: release the mic at once.
      if (!mounted.current) {
        s.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = s;
      const rec = new MediaRecorder(s);
      media.current = rec;
      chunks.current = [];
      keep.current = true;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      rec.onstop = () => {
        const out = keep.current ? new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' }) : null;
        setBlob(out);
        setUrl(out ? URL.createObjectURL(out) : null);
        setStatus(out ? 'stopped' : 'idle');
        cleanup();
        stopResolve.current?.(out);
        stopResolve.current = null;
      };

      const audioCtx = new AudioContext();
      ctx.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      audioCtx.createMediaStreamSource(s).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      let lastPush = 0;
      const tick = (t: number) => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) sum += ((v - 128) / 128) ** 2;
        const rms = Math.sqrt(sum / data.length);
        if (t - lastPush > 100) {
          lastPush = t;
          setLevels((prev) => [...prev.slice(-(MAX_LEVELS - 1)), Math.min(1, rms * 6)]);
          setElapsed(Math.floor((performance.now() - startedAt.current) / 1000));
        }
        raf.current = requestAnimationFrame(tick);
      };

      setBlob(null);
      setUrl(null);
      setLevels([]);
      setElapsed(0);
      startedAt.current = performance.now();
      rec.start(250);
      raf.current = requestAnimationFrame(tick);
      setStatus('recording');
    } catch (err) {
      cleanup();
      setStatus(err instanceof DOMException && err.name === 'NotAllowedError' ? 'denied' : 'error');
    }
  }, [cleanup]);

  const stop = useCallback(() => {
    const rec = media.current;
    if (!rec || rec.state === 'inactive') return Promise.resolve(blob);
    return new Promise<Blob | null>((resolve) => {
      stopResolve.current = resolve;
      keep.current = true;
      rec.stop();
    });
  }, [blob]);

  const discard = useCallback(() => {
    const rec = media.current;
    keep.current = false;
    if (rec && rec.state !== 'inactive') rec.stop();
    else cleanup();
    setBlob(null);
    setUrl(null);
    setLevels([]);
    setElapsed(0);
    setStatus('idle');
  }, [cleanup]);

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
