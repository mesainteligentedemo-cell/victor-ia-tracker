const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const OUT = 'C:/Users/inbou/victor-ia-tracker/tour-perfecto';
const AUDIO = path.join(OUT, 'audio');

const EL_KEY = 'sk_87d5a7899d6c489c94232248c4880a0c4fe317adb3701e67';
const EL_VOICE = 'iDEmt5MnqUotdwCIVplo';
const EL_MODEL = 'eleven_multilingual_v2';

const cfg = JSON.parse(fs.readFileSync(path.join(OUT, 'marking-config.json'), 'utf8'));
const targets = cfg.markings.filter(m => m.step >= 61 && m.step <= 63);

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
    throw new Error('EL ' + res.status + ' ' + body.slice(0, 200));
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outFile, buf);
  return buf.length;
}

(async () => {
  const results = [];
  for (const m of targets) {
    const fname = 'voz-step-' + String(m.step).padStart(2, '0') + '.mp3';
    const outFile = path.join(AUDIO, fname);
    const bytes = await tts(m.narration, outFile);
    const d = ffdur(outFile);
    results.push({ step: m.step, file: fname, kb: +(bytes / 1024).toFixed(0), duration: d });
    console.log('OK  ', fname, (bytes / 1024).toFixed(0) + 'KB', d + 's');
    await new Promise(r => setTimeout(r, 400));
  }
  fs.writeFileSync(path.join(OUT, 'audio-61-63-report.json'), JSON.stringify(results, null, 2), 'utf8');
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });