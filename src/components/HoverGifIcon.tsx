import React, { useState, useEffect, useRef } from 'react';

interface HoverGifIconProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

export const HoverGifIcon: React.FC<HoverGifIconProps> = ({
  src,
  alt,
  className,
  style,
}) => {
  const [staticSrc, setStaticSrc] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [playId, setPlayId] = useState<number>(0);
  const imgRef = useRef<HTMLImageElement>(null);

  // 1. Capture static first frame on initial load using an offscreen canvas
  useEffect(() => {
    let active = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 48;
        canvas.height = img.naturalHeight || 48;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          if (active) setStaticSrc(dataUrl);
        }
      } catch {
        // Fallback to gif directly if canvas conversion fails
      }
    };

    return () => {
      active = false;
    };
  }, [src]);

  // 2. Attach hover listeners to the closest interactive parent container (link, button, or nav item)
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    const parent =
      el.closest<HTMLElement>(
        'a, button, .sidebar-nav-item, .ec-btn, div[role="button"]'
      ) || el;

    const handleMouseEnter = () => {
      setPlayId(Date.now());
      setIsHovered(true);
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
    };

    parent.addEventListener('mouseenter', handleMouseEnter);
    parent.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      parent.removeEventListener('mouseenter', handleMouseEnter);
      parent.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const currentSrc = isHovered
    ? `${src}?t=${playId}`
    : staticSrc || src;

  return (
    <img
      ref={imgRef}
      src={currentSrc}
      alt={alt}
      className={className}
      style={style}
      loading="eager"
    />
  );
};
