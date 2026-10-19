import { useEffect, useRef, useState } from "react";
import { VIDEO_TIME_LIMIT_SECONDS } from "../core";
import { formatDuration, refusalMessage } from "./format";
import { useHomeCheck } from "./homeCheckContext";

type Phase = "starting" | "ready" | "recording" | "saving";

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function cameraProblem(): string | null {
  if (!window.isSecureContext) return "Recording video needs the app opened from its https:// link.";
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    return "This browser can't record video.";
  }
  return null;
}

/**
 * Records video with sound and stops by itself at the core's time limit. Asks for up to 1080p
 * (browsers otherwise default to 640×480) and leaves the bitrate to the browser; the recording
 * is never re-encoded. Closing while recording discards the recording.
 */
export function VideoRecorder({ itemId, onSaved, onClose }: { itemId: string; onSaved: () => void; onClose: () => void }) {
  const homeCheck = useHomeCheck();
  const preview = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stopRecording = useRef<() => void>(() => {});
  const discarded = useRef(false);
  const [phase, setPhase] = useState<Phase>("starting");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const problem = cameraProblem();
    if (problem) {
      setError(problem);
      return;
    }
    let cancelled = false;
    discarded.current = false;
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true,
      })
      .then((opened) => {
        if (cancelled) return stopTracks(opened);
        stream.current = opened;
        if (preview.current) preview.current.srcObject = opened;
        setPhase("ready");
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        const denied = reason instanceof DOMException && reason.name === "NotAllowedError";
        setError(denied ? "Allow the camera and microphone for Home Check, then try again." : "Couldn't open the camera. Close any other app using it, then try again.");
      });
    return () => {
      cancelled = true;
      discarded.current = true;
      if (recorder.current?.state === "recording") recorder.current.stop();
      stopTracks(stream.current);
      stream.current = null;
    };
  }, []);

  useEffect(() => {
    if (phase !== "recording") return;
    const startedAt = performance.now();
    const tick = setInterval(() => setElapsed((performance.now() - startedAt) / 1000), 250);
    return () => clearInterval(tick);
  }, [phase]);

  function record() {
    if (!stream.current) return;
    const chunks: Blob[] = [];
    const started = new MediaRecorder(stream.current);
    let startedAt = 0;
    let stoppedAt: number | null = null;
    let limit: ReturnType<typeof setTimeout> | undefined;

    started.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    started.onstart = () => {
      startedAt = performance.now();
      setElapsed(0);
      setPhase("recording");
      limit = setTimeout(stop, VIDEO_TIME_LIMIT_SECONDS * 1000);
    };
    // Measured when the stop is asked for, not when the recorder finishes writing.
    const stop = () => {
      stoppedAt ??= performance.now();
      if (started.state === "recording") started.stop();
    };
    started.onstop = async () => {
      clearTimeout(limit);
      if (discarded.current) return;
      const durationSeconds = ((stoppedAt ?? performance.now()) - startedAt) / 1000;
      setPhase("saving");
      stopTracks(stream.current);
      const original = new Blob(chunks, { type: started.mimeType || chunks[0]?.type });
      try {
        const result = await homeCheck.addVideo(itemId, original, durationSeconds);
        if (result.ok) onSaved();
        else setError(refusalMessage[result.reason]);
      } finally {
        setPhase((current) => (current === "saving" ? "ready" : current));
      }
    };
    stopRecording.current = stop;
    recorder.current = started;
    started.start();
  }

  return (
    <div className="viewer" role="dialog" aria-label="Record video">
      <div className="viewer-bar">
        <button type="button" className="link on-dark" onClick={onClose} disabled={phase === "saving"}>
          {phase === "recording" ? "Discard" : "Close"}
        </button>
        <span className="on-dark" role="timer">
          {formatDuration(phase === "recording" ? Math.floor(elapsed) : 0)} / {formatDuration(VIDEO_TIME_LIMIT_SECONDS)}
        </span>
      </div>
      {error && <p className="error on-dark-error">{error}</p>}
      <video ref={preview} className="viewer-image square" autoPlay muted playsInline />
      <div className="recorder-controls">
        {phase === "recording" ? (
          <button type="button" className="record-button recording" onClick={() => stopRecording.current()} aria-label="Stop recording" />
        ) : (
          <button
            type="button"
            className="record-button"
            onClick={record}
            disabled={phase !== "ready" || error !== null}
            aria-label="Start recording"
          />
        )}
        <p className="on-dark muted-on-dark">
          {phase === "saving"
            ? "Saving…"
            : phase === "recording"
              ? `Stops by itself at ${VIDEO_TIME_LIMIT_SECONDS} seconds.`
              : "Records with sound."}
        </p>
      </div>
    </div>
  );
}
