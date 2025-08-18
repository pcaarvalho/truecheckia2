import React, { useState, useRef, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  priority?: boolean;
  lazy?: boolean;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  objectPosition?: string;
  onLoad?: () => void;
  onError?: (error: Event) => void;
  fallbackSrc?: string;
  className?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  quality = 75,
  placeholder = 'empty',
  blurDataURL,
  priority = false,
  lazy = true,
  objectFit = 'cover',
  objectPosition = 'center',
  onLoad,
  onError,
  fallbackSrc,
  className = '',
  style,
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState<string>(priority ? src : '');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  const { ref: inViewRef, inView } = useInView({
    threshold: 0,
    triggerOnce: true,
    skip: priority || !lazy,
  });

  // Combine refs
  const setRefs = (element: HTMLImageElement | null) => {
    imgRef.current = element;
    inViewRef(element);
  };

  // Load image when in view or priority
  useEffect(() => {
    if ((inView || priority) && !imageSrc) {
      setImageSrc(src);
    }
  }, [inView, priority, src, imageSrc]);

  // Handle image load
  const handleLoad = () => {
    setImageLoaded(true);
    setShowPlaceholder(false);
    onLoad?.();
  };

  // Handle image error
  const handleError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    setImageError(true);
    setShowPlaceholder(false);
    
    if (fallbackSrc && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      setImageError(false);
      return;
    }
    
    onError?.(event.nativeEvent);
  };

  // Generate placeholder styles
  const placeholderStyles: React.CSSProperties = {
    backgroundColor: '#f3f4f6',
    backgroundImage: placeholder === 'blur' && blurDataURL ? `url(${blurDataURL})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: placeholder === 'blur' ? 'blur(8px)' : undefined,
  };

  // Generate image styles
  const imageStyles: React.CSSProperties = {
    objectFit,
    objectPosition,
    transition: 'opacity 0.3s ease-in-out',
    opacity: imageLoaded ? 1 : 0,
    ...style,
  };

  // Generate container styles
  const containerStyles: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : 'auto',
    aspectRatio: width && height ? `${width} / ${height}` : undefined,
  };

  return (
    <div style={containerStyles} className={className}>
      {/* Placeholder */}
      {showPlaceholder && !imageError && (
        <div
          style={{
            ...placeholderStyles,
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-hidden="true"
        >
          {placeholder === 'empty' && (
            <div className="text-gray-400">
              <svg
                className="w-8 h-8"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {imageError && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f3f4f6',
            color: '#9ca3af',
          }}
        >
          <div className="text-center">
            <svg
              className="w-8 h-8 mx-auto mb-2"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm">Erro ao carregar</span>
          </div>
        </div>
      )}

      {/* Actual image */}
      {imageSrc && !imageError && (
        <img
          ref={setRefs}
          src={imageSrc}
          alt={alt}
          style={imageStyles}
          onLoad={handleLoad}
          onError={handleError}
          loading={lazy && !priority ? 'lazy' : 'eager'}
          decoding="async"
          {...props}
        />
      )}

      {/* Loading indicator */}
      {imageSrc && !imageLoaded && !imageError && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1,
          }}
        >
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600" />
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;

// Utility function to generate blur data URL
export const generateBlurDataURL = (width: number = 8, height: number = 8): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  // Create a simple gradient for blur effect
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f3f4f6');
  gradient.addColorStop(1, '#e5e7eb');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL();
};

// Hook for progressive image loading
export const useProgressiveImage = (src: string, fallbackSrc?: string) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    
    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setLoading(false);
    };
    
    img.onerror = () => {
      if (fallbackSrc) {
        setImageSrc(fallbackSrc);
      } else {
        setError(true);
      }
      setLoading(false);
    };
    
    img.src = src;
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, fallbackSrc]);

  return { imageSrc, loading, error };
};

// Image optimization utilities
export const ImageUtils = {
  // Generate srcSet for responsive images
  generateSrcSet: (baseUrl: string, sizes: number[]): string => {
    return sizes
      .map(size => `${baseUrl}?w=${size}&q=75 ${size}w`)
      .join(', ');
  },

  // Generate sizes attribute for responsive images
  generateSizes: (breakpoints: { [key: string]: string }): string => {
    return Object.entries(breakpoints)
      .map(([breakpoint, size]) => `(${breakpoint}) ${size}`)
      .join(', ');
  },

  // Optimize image URL (for external services like Cloudinary, Vercel, etc.)
  optimizeUrl: (
    url: string,
    { width, height, quality = 75, format = 'auto' }: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'auto' | 'webp' | 'avif' | 'jpeg' | 'png';
    }
  ): string => {
    const params = new URLSearchParams();
    
    if (width) params.set('w', width.toString());
    if (height) params.set('h', height.toString());
    params.set('q', quality.toString());
    params.set('f', format);
    
    return `${url}?${params.toString()}`;
  },

  // Check if WebP is supported
  supportsWebP: (): Promise<boolean> => {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  },

  // Check if AVIF is supported
  supportsAVIF: (): Promise<boolean> => {
    return new Promise((resolve) => {
      const avif = new Image();
      avif.onload = avif.onerror = () => {
        resolve(avif.height === 2);
      };
      avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
    });
  },
};