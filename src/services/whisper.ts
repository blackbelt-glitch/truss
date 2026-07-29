// Whisper transcription service via backend proxy
// App sends audio to our server, server calls Whisper, returns text
// The API key stays on the server - never in the app

import { NativeModules } from 'react-native';

const PROXY_PORT = 3456;

/**
 * The proxy runs on the same machine as the Metro dev server, so derive its
 * host from the bundle URL rather than hardcoding an IP — a hardcoded address
 * goes stale the moment the dev machine or network changes.
 */
function devServerHost(): string | null {
  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  if (!scriptURL) return null;
  const match = scriptURL.match(/^https?:\/\/([^/:]+)/);
  return match ? match[1] : null;
}

export function getProxyUrl(): string {
  const host = devServerHost() ?? 'localhost';
  return `http://${host}:${PROXY_PORT}`;
}

export async function transcribeAudio(audioUri: string): Promise<string> {
  const proxyUrl = getProxyUrl();
  const formData = new FormData();
  formData.append('audio', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  } as any);

  let response: Response;
  try {
    response = await fetch(`${proxyUrl}/transcribe`, {
      method: 'POST',
      body: formData,
    });
  } catch (e) {
    // Distinguish "server isn't running" from "server rejected the audio" —
    // otherwise this surfaces as an opaque network failure.
    throw new Error(
      `Can't reach the transcription server at ${proxyUrl}. Start it with: node server/proxy.js`
    );
  }

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Transcription failed: ${response.status} — ${err}`);
  }

  const data = await response.json();
  return data.text || '';
}
