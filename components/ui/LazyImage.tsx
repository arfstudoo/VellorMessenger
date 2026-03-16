import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const MImg = motion.img as any;

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  style?: React.CSSProperties;
}

export const LazyImage: React.FC<LazyImageProps> = ({ 
  src, 
  alt, 
  className = '', 
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23333" width="100" height="100"/%3E%3C/svg%3E',
  onLoad,
  style
}) => {
  const [imageSrc, setImageSrc] = useState<string>(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!src) return;

    // Use Intersection Observer for lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = new Image();
            img.src = src;
            img.onload = () => {
              setImageSrc(src);
              setIsLoaded(true);
              if (onLoad) onLoad();
            };
            img.onerror = () => {
              setImageSrc(placeholder);
            };
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [src, placeholder, onLoad]);

  return (
    <MImg
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={className}
      style={style}
      initial={{ opacity: 0 }}
      animate={{ opacity: isLoaded ? 1 : 0.5 }}
      transition={{ duration: 0.3 }}
      loading="lazy"
    />
  );
};
