// ============================================================
// Genera 34 narraciones ElevenLabs (voz Victor) desde tour-narrations.json
// Mismos ajustes que el tour en produccion (index.html linea ~19264).
// ============================================================
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const OUT = 'C:/Users/inbou/victor-ia-tracker/tour-perfecto';
const AUDIO = path.join(OUT, 'audio');
fs.mkdirSync(AUDIO, { recursive: true });

const EL_KEY = 'sk_87d5a7899d6c489c94232248c4880a0c4fe317adb3701e67';
const EL_VOICE = 'iDEmt5MnqUotdwCIVplo';
const EL_MODEL = 'eleven_multilingual_v2';

const doc = JSON.parse(fs.readFileSync(path.join(OUT, 'tour-narrations.json'), 'utf8'));

function ffdur(file) {
  try {
    const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
    return parseFloat(out.trim());
  } catch (e) { return null; }
}

async function tts(text, outFile, attempt = 1) {
  const res = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + EL_VOICE, {
    method: 'POST',
    headers: { 'xi-api-key': EL_KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: EL_MODEL,
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.15, use_speaker_boost: true }
    })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await new Promise(r => setTimeout(r, 1500 * attempt));
      return tts(text, outFile, attempt + 1);
    }
    throw new Error('EL ' + res.status + ' ' + body.slice(0, 160));
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outFile, buf);
  return buf.length;
}

(async () => {
  let total = 0;
  for (const step of doc.steps) {
    const outFile = path.join(AUDIO, step.audioFile);
    if (fs.existsSync(outFile) && fs.statSync(outFile).size > 5000) {
      step.audioDuration = ffdur(outFile);
      total += step.audioDuration || 0;
      console.log('SKIP', step.audioFile, '(' + (step.audioDuration || '?') + 's)');
      continue;
    }
    const bytes = await tts(step.narration, outFile);
    const d = ffdur(outFile);
    step.audioDuration = d;
    total += d || 0;
    console.log('OK  ', step.audioFile, (bytes / 1024).toFixed(0) + 'KB', d + 's');
    await new Promise(r => setTimeout(r, 350));
  }
  doc.meta.totalAudioSeconds = Math.round(total * 10) / 10;
  doc.meta.totalAudioFormatted = Math.floor(total / 60) + 'm ' + Math.round(total % 60) + 's';
  fs.writeFileSync(path.join(OUT, 'tour-narrations.json'), JSON.stringify(doc, null, 2), 'utf8');
  console.log('\nTOTAL audio:', doc.meta.totalAudioFormatted, '(' + doc.meta.totalAudioSeconds + 's)');
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });