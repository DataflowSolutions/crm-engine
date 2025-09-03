// Performance optimization utility
'use client';

import React, { useEffect } from 'react';

interface PerformanceConfig {
  enableWebVitals?: boolean;
  enableRenderTracking?: boolean;
  enableNavigationTiming?: boolean;
}

export function usePerformanceOptimization(config: PerformanceConfig = {}) {
  const {
    enableWebVitals = true,
    enableRenderTracking = false, // Only enable in development
    enableNavigationTiming = true
  } = config;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Web Vitals tracking
    if (enableWebVitals) {
      import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
        onCLS(console.log);
        onINP(console.log);
        onFCP(console.log);
        onLCP(console.log);
        onTTFB(console.log);
      });
    }

    // Navigation timing
    if (enableNavigationTiming) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            console.log('Navigation timing:', {
              domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
              loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
              firstPaint: navEntry.responseEnd - navEntry.requestStart,
            });
          }
        }
      });
      
      observer.observe({ entryTypes: ['navigation'] });
      
      return () => observer.disconnect();
    }
  }, [enableWebVitals, enableRenderTracking, enableNavigationTiming]);
}

// Component-level performance wrapper
export function withPerformanceTracking<T extends Record<string, unknown>>(
  WrappedComponent: React.ComponentType<T>,
  componentName: string
): React.ComponentType<T> {
  return function PerformanceWrapper(props: T) {
    useEffect(() => {
      const startTime = performance.now();
      
      return () => {
        const endTime = performance.now();
        if (process.env.NODE_ENV === 'development') {
          console.log(`${componentName} render time: ${endTime - startTime}ms`);
        }
      };
    });

    return React.createElement(WrappedComponent, props);
  };
}

// Preload critical resources
export function preloadCriticalResources() {
  if (typeof window === 'undefined') return;

  // Preload fonts
  const fontLinks = [
    '/fonts/inter.woff2',
    // Add your font files here
  ];

  fontLinks.forEach(font => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = font;
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });

  // Prefetch likely next pages
  const prefetchLinks = [
    '/api/organizations',
    // Add likely next API routes here
  ];

  prefetchLinks.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  });
}
