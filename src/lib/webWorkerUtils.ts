/**
 * Web Worker utilities for offloading heavy computations
 * Keeps the main thread responsive during expensive operations
 */

type WorkerFunction<TInput, TOutput> = (input: TInput) => TOutput;

/**
 * Create an inline web worker from a function
 * Useful for offloading CPU-intensive tasks
 */
export function createInlineWorker<TInput, TOutput>(
  fn: WorkerFunction<TInput, TOutput>
): (input: TInput) => Promise<TOutput> {
  // Convert function to string for worker
  const workerCode = `
    self.onmessage = function(e) {
      const fn = ${fn.toString()};
      const result = fn(e.data);
      self.postMessage(result);
    };
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);

  return (input: TInput): Promise<TOutput> => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(workerUrl);

      worker.onmessage = (e: MessageEvent<TOutput>) => {
        resolve(e.data);
        worker.terminate();
      };

      worker.onerror = (error) => {
        reject(new Error(error.message));
        worker.terminate();
      };

      worker.postMessage(input);
    });
  };
}

/**
 * Pool of reusable workers for a specific task
 */
export class WorkerPool<TInput, TOutput> {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private taskQueue: Array<{
    input: TInput;
    resolve: (output: TOutput) => void;
    reject: (error: Error) => void;
  }> = [];
  private workerUrl: string;

  constructor(
    fn: WorkerFunction<TInput, TOutput>,
    poolSize: number = navigator.hardwareConcurrency || 4
  ) {
    const workerCode = `
      self.onmessage = function(e) {
        const fn = ${fn.toString()};
        try {
          const result = fn(e.data);
          self.postMessage({ success: true, result });
        } catch (error) {
          self.postMessage({ success: false, error: error.message });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.workerUrl = URL.createObjectURL(blob);

    // Create worker pool
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(this.workerUrl);
      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }
  }

  exec(input: TInput): Promise<TOutput> {
    return new Promise((resolve, reject) => {
      const worker = this.availableWorkers.pop();

      if (worker) {
        this.runTask(worker, input, resolve, reject);
      } else {
        // Queue the task
        this.taskQueue.push({ input, resolve, reject });
      }
    });
  }

  private runTask(
    worker: Worker,
    input: TInput,
    resolve: (output: TOutput) => void,
    reject: (error: Error) => void
  ): void {
    const handler = (e: MessageEvent<{ success: boolean; result?: TOutput; error?: string }>) => {
      worker.removeEventListener('message', handler);

      if (e.data.success) {
        resolve(e.data.result!);
      } else {
        reject(new Error(e.data.error));
      }

      // Return worker to pool or process next task
      const nextTask = this.taskQueue.shift();
      if (nextTask) {
        this.runTask(worker, nextTask.input, nextTask.resolve, nextTask.reject);
      } else {
        this.availableWorkers.push(worker);
      }
    };

    worker.addEventListener('message', handler);
    worker.postMessage(input);
  }

  terminate(): void {
    this.workers.forEach((worker) => worker.terminate());
    this.workers = [];
    this.availableWorkers = [];
    URL.revokeObjectURL(this.workerUrl);
  }
}

/**
 * Run expensive computation off main thread
 * Falls back to main thread if workers unavailable
 */
export async function offloadComputation<TInput, TOutput>(
  fn: WorkerFunction<TInput, TOutput>,
  input: TInput,
  timeout: number = 5000
): Promise<TOutput> {
  // Check if workers are available
  if (typeof Worker === 'undefined') {
    return fn(input);
  }

  const workerFn = createInlineWorker(fn);

  // Race between worker and timeout
  return Promise.race([
    workerFn(input),
    new Promise<TOutput>((_, reject) =>
      setTimeout(() => reject(new Error('Worker timeout')), timeout)
    ),
  ]).catch(() => {
    // Fallback to main thread
    return fn(input);
  });
}

/**
 * Common heavy computations that benefit from workers
 */

// Sort large arrays off main thread
export function sortInWorker<T>(
  items: T[],
  compareFn: string // Must be a stringifiable comparison function
): Promise<T[]> {
  const sortFn = (data: { items: T[]; compareFn: string }) => {
    const fn = new Function('a', 'b', `return (${data.compareFn})(a, b)`) as (a: T, b: T) => number;
    return [...data.items].sort(fn);
  };

  return offloadComputation(sortFn as any, { items, compareFn });
}

// Filter large arrays off main thread
export function filterInWorker<T>(
  items: T[],
  predicateFn: string // Must be a stringifiable predicate function
): Promise<T[]> {
  const filterFn = (data: { items: T[]; predicateFn: string }) => {
    const fn = new Function('item', `return (${data.predicateFn})(item)`) as (item: T) => boolean;
    return data.items.filter(fn);
  };

  return offloadComputation(filterFn as any, { items, predicateFn });
}

// Search/fuzzy match in large datasets
export function searchInWorker(
  items: string[],
  query: string,
  maxResults: number = 50
): Promise<string[]> {
  const searchFn = (data: { items: string[]; query: string; maxResults: number }) => {
    const q = data.query.toLowerCase();
    const results: Array<{ item: string; score: number }> = [];

    for (const item of data.items) {
      const lower = item.toLowerCase();
      let score = 0;

      if (lower === q) {
        score = 100;
      } else if (lower.startsWith(q)) {
        score = 80;
      } else if (lower.includes(q)) {
        score = 60;
      } else {
        // Simple fuzzy match
        let queryIdx = 0;
        for (const char of lower) {
          if (queryIdx < q.length && char === q[queryIdx]) {
            queryIdx++;
          }
        }
        if (queryIdx === q.length) {
          score = 40;
        }
      }

      if (score > 0) {
        results.push({ item, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, data.maxResults)
      .map((r) => r.item);
  };

  return offloadComputation(searchFn, { items, query, maxResults });
}
