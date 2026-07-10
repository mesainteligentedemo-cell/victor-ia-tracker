/**
 * gen-audio-COMPLETO.cjs
 * ─────────────────────────────────────────────────────────────────────────
 * Genera un MP3 por cada botón del tour COMPLETO (voz Victor · ElevenLabs)
 * y RE-CALCULA los timestamps del JSON con la duración REAL de cada audio,
 * dejando el marcado dorado sincronizado al milisegundo.
 *
 *   node gen-audio-COMPLETO.cjs
 *
 * Salida: audio-completo/voz-01.mp3 … voz-53.mp3  (coincide con el default
 * de GoldenMarking.playSequence: `voz-NN.mp3`).
 * ─────────────────────────────────────────────────────────────────────────
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DIR = __dirname;
const AUDIO = path.join(DIR, 'audio-completo');
fs.mkdirSync(AUDIO, { recursive: true });

const EL_KEY = 'sk_87d5a7899d6c489c94232248c4880a0c4fe317adb3701e67';
const EL_VOICE = 'iDEmt5MnqUotdwCIVplo';
const EL_MODEL = 'eleven_multilingual_v2';
const PAUSE = 0.8; // pausa entre pasos (igual que el build)

const doc = JSON.parse(fs.readFileSync(path.join(DIR, 'tour-narrations-COMPLETO.json'), 'utf8'));

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
      text, model_id: EL_MODEL,
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.15, use_speaker_boost: true }
    })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await new Promise(r => setTimeout(r, 1500 * attempt));
      return tts(text, outFile, attempt + 1);
    }
    throw new Error('ElevenLabs ' + res.status + ' ' + body.slice(0, 160));
  }
  fs.writeFileSync(outFile, Buffer.from(await res.arrayBuffer()));
}

(async () => {
  let t = 0;
  for (const step of doc.steps) {
    const fname = `voz-${String(step.n).padStart(2, '0')}.mp3`;
    const outFile = path.join(AUDIO, fname);
    if (!(fs.existsSync(outFile) && fs.statSync(outFile).size > 5000)) {
      await tts(step.narration, outFile);
      await new Promise(r => setTimeout(r, 350));
    }
    const d = ffdur(outFile) || step.estDuration;
    step.audioFile = fname;
    step.audioDuration = d;
    // recalcular timestamps con duración REAL
    step.startTime = +t.toFixed(2);
    step.endTime = +(t + d).toFixed(2);
    step.markStart = +Math.max(0, step.startTime - 0.1).toFixed(3);
    step.markEnd = step.endTime;
    t = step.endTime + PAUSE;
    console.log('OK', fname, d + 's  ->  ' + step.startTime + '–' + step.endTime);
  }
  doc.meta.totalDurationSec = +t.toFixed(2);
  doc.meta.totalDurationFormatted = Math.floor(t / 60) + 'm ' + Math.round(t % 60) + 's';
  doc.meta.audioGenerated = new Date().toISOString();
  fs.writeFileSync(path.join(DIR, 'tour-narrations-COMPLETO.json'), JSON.stringify(doc, null, 2));
  console.log('\nTOTAL:', doc.meta.totalDurationFormatted, '· timestamps re-sincronizados con audio real.');
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
