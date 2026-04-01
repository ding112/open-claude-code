export function isCachedMicrocompactEnabled() { return false; }
export function isModelSupportedForCacheEditing() { return false; }
export function getCachedMCConfig() { return null; }
export function createCachedMCState() { return {}; }
export function markToolsSentToAPI() {}
export function resetCachedMCState() {}
export function registerToolResult() {}
export function registerToolMessage() {}
export function getToolResultsToDelete() { return []; }
export function createCacheEditsBlock() { return null; }
export type CachedMCState = any;
export type CacheEditsBlock = any;
export type PinnedCacheEdits = any;
export default {};
