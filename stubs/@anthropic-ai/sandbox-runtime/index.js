export class SandboxManager {
  constructor(config) { this.config = config; }
  async start() { return this; }
  async stop() {}
  async checkViolation() { return null; }

  static isSupportedPlatform() { return false; }
  static checkDependencies() { return { supported: false, missing: [] }; }
  static wrapWithSandbox(cmd, args, opts) { return { cmd, args, opts }; }
  static async initialize() {}
  static updateConfig() {}
  static async reset() {}
  static getFsReadConfig() { return undefined; }
  static getFsWriteConfig() { return undefined; }
  static getNetworkRestrictionConfig() { return undefined; }
  static getIgnoreViolations() { return false; }
  static getAllowUnixSockets() { return false; }
  static getAllowLocalBinding() { return false; }
  static getEnableWeakerNestedSandbox() { return false; }
  static getProxyPort() { return undefined; }
  static getSocksProxyPort() { return undefined; }
  static getLinuxHttpSocketPath() { return undefined; }
  static getLinuxSocksSocketPath() { return undefined; }
  static async waitForNetworkInitialization() {}
  static getSandboxViolationStore() { return new SandboxViolationStore(); }
  static annotateStderrWithSandboxFailures(_command, stderr) { return stderr; }
  static cleanupAfterCommand() {}
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
