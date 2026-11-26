import fs from 'node:fs';
import path from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import { pathToFileURL } from 'node:url';

// Executes the real handler with fake Deno env/serve; callers must stub fetch.
export async function loadEdgeHandler(feature, env) {
  let handler;
  const previous = globalThis.Deno;
  globalThis.Deno = { env: { get: (key) => env[key] }, serve: (callback) => { handler = callback; } };
  try {
    const file = path.resolve(import.meta.dirname, '../../..', 'supabase/functions', feature, 'index.ts');
    let source = fs.readFileSync(file, 'utf8');
    source = source.replace(/from\s+(['"])(\.[^'"]+)\1/g, (_, quote, spec) => `from ${quote}${pathToFileURL(path.resolve(path.dirname(file), spec)).href}${quote}`);
    source = 'const Deno = globalThis.Deno;\n' + stripTypeScriptTypes(source);
    await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}#${crypto.randomUUID()}`);
    return handler;
  } finally { globalThis.Deno = previous; }
}

export const request = (feature, body) => new Request(`https://test.invalid/${feature}`, {
  method: 'POST', headers: { origin: 'https://test.invalid', 'content-type': 'application/json' }, body: JSON.stringify(body),
});

export const geminiReply = (text) => Response.json({
  candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }],
  usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 },
});
