let audioCtx: AudioContext | null = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playTabClick() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 1200;
    gain.gain.value = 0.08;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  } catch {}

  // Also unlock speechSynthesis (once)
  if (!(playTabClick as unknown as { _ttsUnlocked: boolean })._ttsUnlocked) {
    (playTabClick as unknown as { _ttsUnlocked: boolean })._ttsUnlocked = true;
    try {
      const utter = new SpeechSynthesisUtterance(".");
      utter.volume = 0.01;
      utter.rate = 2;
      speechSynthesis.speak(utter);
    } catch {}
  }
}
