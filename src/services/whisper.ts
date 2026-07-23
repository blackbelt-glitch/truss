// Whisper transcription service via backend proxy
// App sends audio to our server, server calls Whisper, returns text
// The API key stays on the server - never in the app

// In development, the proxy runs on localhost:3456
// The phone connects via the Mac's local IP
const PROXY_URL = 'http://192.168.4.58:3456';

export async function transcribeAudio(audioUri: string): Promise<string> {
  const formData = new FormData();
  formData.append('audio', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  } as any);

  const response = await fetch(`${PROXY_URL}/transcribe`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Transcription failed: ${response.status} — ${err}`);
  }

  const data = await response.json();
  return data.text || '';
}