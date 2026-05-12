import React, { useEffect, useRef, useState } from "react";

interface LazyBgVideoProps {
  src: string;
  className?: string;
}

// Below-fold ambient background videos.  We delay attaching the <source>
// until the section is near the viewport so the browser doesn't burn 3-8 MB
// of bandwidth on every landing-page load for footage that's two screens
// down.  When the user actually scrolls there, the gradient overlay above
// the video keeps the section looking right while the clip fetches.
const LazyBgVideo: React.FC<LazyBgVideoProps> = ({ src, className }) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shouldLoad) return;
    if (typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <video
      ref={ref}
      className={className}
      autoPlay
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
    >
      {shouldLoad && <source src={src} type="video/mp4" />}
    </video>
  );
};

export default LazyBgVideo;
