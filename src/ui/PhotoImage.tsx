import { useEffect, useState } from "react";
import type { PhotoVersion } from "../core";
import { useHomeCheck } from "./homeCheckContext";

export function PhotoImage({
  evidenceId,
  version,
  alt,
  className,
}: {
  evidenceId: string;
  version: PhotoVersion;
  alt: string;
  className?: string;
}) {
  const homeCheck = useHomeCheck();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    homeCheck.getPhoto(evidenceId, version).then((blob) => {
      if (cancelled || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [homeCheck, evidenceId, version]);

  return url ? <img src={url} alt={alt} className={className} /> : null;
}
