export const McpbManifestSchema = {
  safeParse: (v) => ({ success: true, data: v }),
  parse: (v) => v,
};

export async function getMcpConfigForManifest() { return {}; }

export function createMcpb() { return {}; }

export default { McpbManifestSchema, getMcpConfigForManifest, createMcpb };
