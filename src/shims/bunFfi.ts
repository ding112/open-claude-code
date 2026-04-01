export function dlopen() {
  throw new Error('bun:ffi is not available in this build');
}

export const ptr = null;
export const CString = null;
export const FFIType = {};
