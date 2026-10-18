import { useEffect, useState } from "react";
import type { MediaEvidence, MediaVersion } from "../core";
import { formatDuration } from "./format";
import { useHomeCheck } from "./homeCheckContext";

/** An object URL for one stored version of a photo or video, revoked when no longer shown. */
export function useMediaUrl(evidenceId: string, version: MediaVersion): string | null {
  const homeCheck = useHomeCheck();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    homeCheck.getMedia(evidenceId, version).then((blob) => {
      if (cancelled || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [homeCheck, evidenceId, version]);

  return url;
}

export function MediaImage({
  evidenceId,
  version,
  alt,
  className,
}: {
  evidenceId: string;
  version: MediaVersion;
  alt: string;
  className?: string;
}) {
  const url = useMediaUrl(evidenceId, version);
  return url ? <img src={url} alt={alt} className={className} /> : null;
}

/** The inside of a thumbnail tile: the thumbnail, plus a video's length. */
export function MediaThumbnail({ evidence }: { evidence: MediaEvidence }) {
  return (
    <>
      <MediaImage evidenceId={evidence.id} version="thumbnail" alt="" />
      {evidence.kind === "video" && <span className="video-badge">▶ {formatDuration(evidence.durationSeconds)}</span>}
    </>
  );
}
