import { useCallback, useEffect, useRef, useState } from "react";

interface UseSpeechOptions {
  onTranscript?: (text: string) => void;
}

const PREFERRED_VOICES = [
  "Google UK English Male",
  "Microsoft Ryan - English (United Kingdom)",
  "Microsoft George - English (United Kingdom)",
  "Microsoft Guy - English (United States)",
  "Daniel",
  "Arthur",
  "Oliver",
  "Google US English",
];

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  if (!voices.length) return undefined;
  for (const name of PREFERRED_VOICES) {
    const found = voices.find((v) => v.name === name);
    if (found) return found;
  }
  const gb = voices.find((v) => /en-GB/i.test(v.lang));
  if (gb) return gb;
  const en = voices.find((v) => /^en/i.test(v.lang));
  return en || voices[0];
}

export function useSpeech({ onTranscript }: UseSpeechOptions = {}) {
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [synthesisSupported] = useState(
    () => typeof window !== "undefined" && "speechSynthesis" in window
  );
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string>("");
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const callbackRef = useRef(onTranscript);
  const wantListeningRef = useRef(false); // single-shot intent
  const wakeActiveRef = useRef(false); // continuous intent
  const langRef = useRef("en-GB");

  useEffect(() => {
    callbackRef.current = onTranscript;
  }, [onTranscript]);

  // Detect support + load voices.
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setRecognitionSupported(!!SR);

    if ("speechSynthesis" in window) {
      const load = () => {
        const v = window.speechSynthesis.getVoices();
        if (v.length) {
          setVoices(v);
          setVoiceURI((cur) => cur || pickVoice(v)?.voiceURI || "");
        }
      };
      load();
      window.speechSynthesis.onvoiceschanged = load;
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  const createRecognition = useCallback((continuous: boolean): SpeechRecognition | null => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const rec = new SR();
    rec.lang = langRef.current;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.continuous = continuous;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interimText += res[0].transcript;
      }
      setInterim(interimText);

      if (finalText) {
        const phrase = finalText.trim();
        setInterim("");

        if (wakeActiveRef.current) {
          const lower = phrase.toLowerCase();
          if (lower.includes("jarvis")) {
            // Strip wake word + filler, forward the remainder.
            const cmd = lower
              .replace(/^.*?jarvis[\s,]*/, "")
              .replace(/^(please|hey|can you|could you|would you)[\s,]*/i, "")
              .trim();
            callbackRef.current?.(cmd || "jarvis");
          }
        } else {
          wantListeningRef.current = false;
          try {
            rec.stop();
          } catch {
            /* noop */
          }
          callbackRef.current?.(phrase);
        }
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone access denied. Please allow microphone permission.");
        wakeActiveRef.current = false;
        wantListeningRef.current = false;
        setListening(false);
      } else if (event.error === "network") {
        setError("Speech recognition needs an internet connection.");
      }
    };

    rec.onend = () => {
      setInterim("");
      if (wakeActiveRef.current) {
        // Restart to keep hands-free mode alive (browsers auto-stop on silence).
        try {
          rec.start();
          return;
        } catch {
          /* fall through */
        }
      }
      setListening(false);
    };

    return rec;
  }, []);

  /** Single-shot: listen for one utterance. */
  const listen = useCallback(() => {
    setError(null);
    if (speaking) window.speechSynthesis?.cancel();
    if (listening || wakeActiveRef.current) return;
    const rec = createRecognition(false);
    if (!rec) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }
    recognitionRef.current = rec;
    wantListeningRef.current = true;
    try {
      rec.start();
      setListening(true);
    } catch {
      setError("Could not start the microphone.");
    }
  }, [createRecognition, listening, speaking]);

  /** Continuous hands-free mode triggered by the wake word "Jarvis". */
  const startWakeMode = useCallback(() => {
    setError(null);
    if (listening) return false;
    const rec = createRecognition(true);
    if (!rec) {
      setError("Speech recognition is not supported in this browser.");
      return false;
    }
    recognitionRef.current = rec;
    wakeActiveRef.current = true;
    try {
      rec.start();
      setListening(true);
      return true;
    } catch {
      setError("Could not start background listening.");
      return false;
    }
  }, [createRecognition, listening]);

  const stopWakeMode = useCallback(() => {
    wakeActiveRef.current = false;
    wantListeningRef.current = false;
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.abort();
      } catch {
        /* noop */
      }
    }
    setListening(false);
    setInterim("");
  }, []);

  const stopListening = useCallback(() => {
    wakeActiveRef.current = false;
    wantListeningRef.current = false;
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    }
    setListening(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!synthesisSupported || !text) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const v = voices.find((vc) => vc.voiceURI === voiceURI) || pickVoice(voices);
      if (v) {
        u.voice = v;
        u.lang = v.lang;
      } else {
        u.lang = langRef.current;
      }
      u.rate = 1.02;
      u.pitch = 0.9;
      u.volume = 1;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      // Slight delay helps some browsers apply the chosen voice.
      window.setTimeout(() => window.speechSynthesis.speak(u), 60);
    },
    [synthesisSupported, voices, voiceURI]
  );

  const cancelSpeak = useCallback(() => {
    if (synthesisSupported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [synthesisSupported]);

  const setVoice = useCallback(
    (uri: string) => {
      setVoiceURI(uri);
      const v = voices.find((vc) => vc.voiceURI === uri);
      if (v) langRef.current = v.lang.startsWith("en") ? "en-GB" : v.lang;
    },
    [voices]
  );

  return {
    recognitionSupported,
    synthesisSupported,
    voices,
    voiceURI,
    setVoice,
    speaking,
    listening,
    interim,
    error,
    listen,
    stopListening,
    startWakeMode,
    stopWakeMode,
    speak,
    cancelSpeak,
  };
}
