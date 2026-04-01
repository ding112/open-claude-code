export function isNativeAudioAvailable() { return false; }
export function isNativeRecordingActive() { return false; }
export async function startNativeRecording() {}
export async function stopNativeRecording() { return null; }
export default { isNativeAudioAvailable, isNativeRecordingActive, startNativeRecording, stopNativeRecording };
