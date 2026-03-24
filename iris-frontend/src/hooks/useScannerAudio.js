import { useCallback } from "react";

export function useScannerAudio() {
  const playMelody = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      const playNote = (freq, startTime, duration) => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(freq, startTime);

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      const now = audioCtx.currentTime;
      const melodyType = localStorage.getItem("scannerMelody") || "tech";

      if (melodyType === "tech") {
        playNote(1046.5, now, 0.15);
        playNote(1318.51, now + 0.1, 0.15);
        playNote(1567.98, now + 0.2, 0.15);
        playNote(2093.0, now + 0.3, 0.4);
      } else if (melodyType === "chime") {
        playNote(1046.5, now, 0.4);
        playNote(2093.0, now + 0.2, 0.6);
      } else {
        playNote(800, now, 0.8);
      }
    } catch (e) {
      console.error("Audio melody failed", e);
    }
  }, []);

  const playGreeting = useCallback((name) => {
    const ttsEnabled = localStorage.getItem("ttsEnabled") !== "false";
    if (!ttsEnabled) return;

    try {
      // Cancel any in-progress speech to prevent overlapping voices
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(`Welcome, ${name}`);
      const voices = window.speechSynthesis.getVoices();
      const savedVoice = localStorage.getItem("ttsVoice");

      if (voices.length > 0) {
        // If user has picked a voice in settings, use that
        if (savedVoice) {
          const match = voices.find((v) => v.name === savedVoice);
          if (match) utterance.voice = match;
        } else {
          // Default: first English voice
          const englishVoices = voices.filter((v) => v.lang.startsWith("en"));
          if (englishVoices.length > 0) utterance.voice = englishVoices[0];
        }
      }

      utterance.rate = parseFloat(localStorage.getItem("ttsRate") || "1.0");
      utterance.pitch = parseFloat(localStorage.getItem("ttsPitch") || "1.1");
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("TTS failed", e);
    }
  }, []);

  return { playMelody, playGreeting };
}
