/**
 * Smart Image Preloader with priority queue and connection-aware loading
 */

type Priority = 'high' | 'normal' | 'low';

interface PreloadTask {
  src: string;
  priority: Priority;
  resolve: () => void;
  reject: (error: Error) => void;
}

class ImagePreloader {
  private queue: PreloadTask[] = [];
  private inProgress = new Set<string>();
  private loaded = new Set<string>();
  private failed = new Set<string>();
  private maxConcurrent = 4;
  private isProcessing = false;

  constructor() {
    // Adjust based on connection quality
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn?.saveData) {
        this.maxConcurrent = 1;
      } else if (conn?.effectiveType === '2g' || conn?.effectiveType === 'slow-2g') {
        this.maxConcurrent = 2;
      } else if (conn?.effectiveType === '3g') {
        this.maxConcurrent = 3;
      }
    }
  }

  /**
   * Preload a single image
   */
  preload(src: string, priority: Priority = 'normal'): Promise<void> {
    // Skip if already loaded or in progress
    if (this.loaded.has(src)) {
      return Promise.resolve();
    }

    if (this.inProgress.has(src)) {
      return new Promise((resolve) => {
        const checkLoaded = setInterval(() => {
          if (this.loaded.has(src) || this.failed.has(src)) {
            clearInterval(checkLoaded);
            resolve();
          }
        }, 50);
      });
    }

    return new Promise((resolve, reject) => {
      const task: PreloadTask = { src, priority, resolve, reject };
      this.addToQueue(task);
      this.processQueue();
    });
  }

  /**
   * Preload multiple images with same priority
   */
  preloadMany(srcs: string[], priority: Priority = 'normal'): Promise<void[]> {
    return Promise.all(srcs.map((src) => this.preload(src, priority)));
  }

  /**
   * Preload images for a specific viewport area (above the fold)
   */
  preloadAboveFold(srcs: string[]): Promise<void[]> {
    return this.preloadMany(srcs, 'high');
  }

  /**
   * Preload images during idle time
   */
  preloadOnIdle(srcs: string[]): void {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(
        () => {
          this.preloadMany(srcs, 'low');
        },
        { timeout: 5000 }
      );
    } else {
      setTimeout(() => {
        this.preloadMany(srcs, 'low');
      }, 1000);
    }
  }

  /**
   * Check if an image is already loaded
   */
  isLoaded(src: string): boolean {
    return this.loaded.has(src);
  }

  /**
   * Clear failed cache (to retry)
   */
  clearFailed(): void {
    this.failed.clear();
  }

  /**
   * Get loading statistics
   */
  getStats(): { loaded: number; inProgress: number; queued: number; failed: number } {
    return {
      loaded: this.loaded.size,
      inProgress: this.inProgress.size,
      queued: this.queue.length,
      failed: this.failed.size,
    };
  }

  private addToQueue(task: PreloadTask): void {
    // Insert based on priority
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    const taskPriority = priorityOrder[task.priority];

    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      if (priorityOrder[this.queue[i].priority] > taskPriority) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, task);
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0 && this.inProgress.size < this.maxConcurrent) {
      const task = this.queue.shift();
      if (!task) continue;

      // Skip if already loaded or failed
      if (this.loaded.has(task.src)) {
        task.resolve();
        continue;
      }
      if (this.failed.has(task.src)) {
        task.resolve(); // Don't retry failed images automatically
        continue;
      }

      this.inProgress.add(task.src);
      this.loadImage(task);
    }

    this.isProcessing = false;
  }

  private loadImage(task: PreloadTask): void {
    const img = new Image();

    img.onload = () => {
      this.inProgress.delete(task.src);
      this.loaded.add(task.src);
      task.resolve();
      this.processQueue();
    };

    img.onerror = () => {
      this.inProgress.delete(task.src);
      this.failed.add(task.src);
      task.resolve(); // Resolve instead of reject to prevent breaking Promise.all
      this.processQueue();
    };

    // Use fetchpriority if available
    if ('fetchPriority' in img) {
      (img as any).fetchPriority = task.priority === 'high' ? 'high' : 'auto';
    }

    img.src = task.src;
  }
}

// Singleton instance
export const imagePreloader = new ImagePreloader();

/**
 * React hook for preloading images
 */
export function useImagePreload(srcs: string[], priority: Priority = 'normal') {
  useEffect(() => {
    if (srcs.length === 0) return;
    imagePreloader.preloadMany(srcs, priority);
  }, [srcs.join(','), priority]);
}

/**
 * Preload images that are likely to be needed next
 */
export function preloadNextImages(srcs: string[]): void {
  imagePreloader.preloadOnIdle(srcs);
}

import { useEffect } from 'react';
