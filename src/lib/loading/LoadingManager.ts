/**
 * Centralised loading manager.
 *
 * Runs a dependency graph of initialisation tasks (API, fonts, assets, 3D
 * modules) with real progress reporting. The experience is only allowed to
 * start when every *critical* task has actually succeeded. Failed tasks are
 * re-run on `retry()`; completed tasks are never repeated.
 */

export const LOADING_STAGES = ["INITIALIZING", "CONNECTING", "LOADING ASSETS", "PREPARING THEATER", "READY"] as const;
export type LoadingStage = (typeof LOADING_STAGES)[number];

export interface TaskContext<C> {
  ctx: C;
  signal: AbortSignal;
  /** Report partial progress for this task, 0 → 1. */
  report: (fraction: number) => void;
}

export interface LoadTask<C> {
  id: string;
  stage: LoadingStage;
  weight: number;
  /** Critical tasks block the experience. Non-critical failures are logged and skipped. */
  critical: boolean;
  dependsOn?: string[];
  timeoutMs?: number;
  run: (t: TaskContext<C>) => Promise<void>;
}

type TaskState = "pending" | "running" | "done" | "failed" | "skipped";

export interface LoadingSnapshotData {
  status: "idle" | "running" | "success" | "error";
  progress: number;
  stage: LoadingStage;
  errors: { task: string; message: string }[];
}

export class LoadingManager<C> {
  private states = new Map<string, TaskState>();
  private partial = new Map<string, number>();
  private errors = new Map<string, string>();
  private listeners = new Set<(s: LoadingSnapshotData) => void>();
  private runPromise: Promise<boolean> | null = null;
  private controller: AbortController | null = null;
  private status: LoadingSnapshotData["status"] = "idle";

  constructor(
    private readonly tasks: LoadTask<C>[],
    private readonly ctx: C,
    private readonly defaultTimeoutMs = 15000,
  ) {
    for (const t of tasks) {
      this.states.set(t.id, "pending");
      for (const dep of t.dependsOn ?? []) {
        if (!tasks.some((x) => x.id === dep)) throw new Error(`Task "${t.id}" depends on unknown task "${dep}"`);
      }
    }
  }

  get context() {
    return this.ctx;
  }

  subscribe(listener: (s: LoadingSnapshotData) => void) {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  snapshot(): LoadingSnapshotData {
    const total = this.tasks.reduce((sum, t) => sum + t.weight, 0);
    let done = 0;
    for (const t of this.tasks) {
      const s = this.states.get(t.id);
      if (s === "done" || s === "skipped") done += t.weight;
      else if (s === "running") done += t.weight * (this.partial.get(t.id) ?? 0);
    }
    return {
      status: this.status,
      progress: total ? done / total : 1,
      stage: this.currentStage(),
      errors: [...this.errors].map(([task, message]) => ({ task, message })),
    };
  }

  private currentStage(): LoadingStage {
    if (this.status === "success") return "READY";
    // Earliest stage that still has unfinished work.
    for (const stage of LOADING_STAGES) {
      if (this.tasks.some((t) => t.stage === stage && this.states.get(t.id) !== "done" && this.states.get(t.id) !== "skipped")) {
        return stage;
      }
    }
    return "READY";
  }

  private emit() {
    const snap = this.snapshot();
    this.listeners.forEach((l) => l(snap));
  }

  /** Starts (or joins) a run. Resolves true when all critical tasks succeeded. */
  start(): Promise<boolean> {
    if (this.runPromise) return this.runPromise;
    if (this.status === "success") return Promise.resolve(true);

    for (const t of this.tasks) {
      if (this.states.get(t.id) === "failed") this.states.set(t.id, "pending");
    }
    this.errors.clear();
    this.status = "running";
    this.controller = new AbortController();
    this.emit();

    this.runPromise = this.execute(this.controller.signal).finally(() => {
      this.runPromise = null;
    });
    return this.runPromise;
  }

  retry() {
    return this.start();
  }

  abort() {
    this.controller?.abort();
  }

  private execute(signal: AbortSignal): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const settled = (s: TaskState | undefined) => s === "done" || s === "skipped";

      const launch = () => {
        // 1. Propagate dependency failures until stable (order-independent).
        let changed = true;
        while (changed) {
          changed = false;
          for (const task of this.tasks) {
            if (this.states.get(task.id) !== "pending") continue;
            if ((task.dependsOn ?? []).some((d) => this.states.get(d) === "failed")) {
              this.states.set(task.id, task.critical ? "failed" : "skipped");
              if (task.critical) this.errors.set(task.id, "Blocked by a failed dependency");
              changed = true;
            }
          }
        }

        // 2. Launch every task whose dependencies are satisfied.
        for (const task of this.tasks) {
          if (this.states.get(task.id) !== "pending") continue;
          if (!(task.dependsOn ?? []).every((d) => settled(this.states.get(d)))) continue;
          this.runTask(task, signal).then(() => {
            this.emit();
            launch();
          });
        }

        // 3. Finish once nothing is running. Anything still pending here is unsatisfiable.
        const running = this.tasks.some((t) => this.states.get(t.id) === "running");
        if (running) return;
        for (const task of this.tasks) {
          if (this.states.get(task.id) === "pending") {
            this.states.set(task.id, "failed");
            this.errors.set(task.id, "Unsatisfiable dependencies");
          }
        }
        const criticalFailed = this.tasks.some((t) => t.critical && this.states.get(t.id) === "failed");
        this.status = criticalFailed ? "error" : "success";
        this.emit();
        resolve(!criticalFailed);
      };
      launch();
    });
  }

  private async runTask(task: LoadTask<C>, signal: AbortSignal) {
    this.states.set(task.id, "running");
    this.partial.set(task.id, 0);
    this.emit();

    const timeoutMs = task.timeoutMs ?? this.defaultTimeoutMs;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const taskController = new AbortController();
    const onAbort = () => taskController.abort();
    signal.addEventListener("abort", onAbort);

    try {
      await Promise.race([
        task.run({
          ctx: this.ctx,
          signal: taskController.signal,
          report: (f) => {
            this.partial.set(task.id, Math.min(1, Math.max(0, f)));
            this.emit();
          },
        }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            taskController.abort();
            reject(new Error(`Timed out after ${Math.round(timeoutMs / 1000)}s`));
          }, timeoutMs);
        }),
      ]);
      this.states.set(task.id, "done");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (task.critical) {
        this.states.set(task.id, "failed");
        this.errors.set(task.id, message);
      } else {
        this.states.set(task.id, "skipped");
        console.warn(`[loading] non-critical task "${task.id}" skipped:`, message);
      }
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
    }
  }
}
