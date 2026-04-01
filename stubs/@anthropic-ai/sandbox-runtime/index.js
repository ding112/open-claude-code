export class SandboxManager {
  constructor(config) { this.config = config; }
  async start() { return this; }
  async stop() {}
  async checkViolation() { return null; }
}

export const SandboxRuntimeConfigSchema = {
  parse: (v) => v,
  safeParse: (v) => ({ success: true, data: v }),
};

export class SandboxViolationStore {
  constructor() { this.violations = []; }
  add(v) { this.violations.push(v); }
  getAll() { return this.violations; }
  clear() { this.violations = []; }
}

export default { SandboxManager, SandboxRuntimeConfigSchema, SandboxViolationStore };
