'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Volume2 } from 'lucide-react';
import { useLanguage } from '../../lib/LanguageContext';
import { copy } from '../../lib/assist-copy';

export function ReadAloud({ text }: { text: string }) {
  const { language } = useLanguage();
  const [speaking, setSpeaking] = useState(false),
    [message, setMessage] = useState('');
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  useEffect(
    () => () => {
      if (utterance.current) window.speechSynthesis?.cancel();
    },
    [language]
  );
  function speak() {
    if (!('speechSynthesis' in window)) {
      setMessage(copy(language, 'Audio is unavailable on this device. Please read the text.'));
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) => v.lang.toLowerCase().startsWith(language));
    if (voices.length && !voice && language !== 'en') {
      setMessage(copy(language, 'A voice for this language is not installed on this device.'));
      return;
    }
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    utterance.current = speech;
    speech.lang = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' }[language];
    if (voice) speech.voice = voice;
    speech.rate = 0.85;
    speech.onend = () => setSpeaking(false);
    speech.onerror = () => {
      setSpeaking(false);
      setMessage(copy(language, 'Audio is unavailable on this device. Please read the text.'));
    };
    setMessage('');
    setSpeaking(true);
    window.speechSynthesis.speak(speech);
  }
  return (
    <div>
      <button type="button" className="ks-button secondary" onClick={speak} aria-pressed={speaking}>
        <Volume2 size={19} />
        {copy(language, speaking ? 'Stop' : 'Listen')}
      </button>
      {message && (
        <p role="status" className="ks-note">
          {message}
        </p>
      )}
    </div>
  );
}

export default function VoiceInput({ onText }: { onText: (text: string) => void }) {
  const { language } = useLanguage();
  const [listening, setListening] = useState(false),
    [message, setMessage] = useState('');
  const recognition = useRef<any>(null);
  useEffect(
    () => () => {
      recognition.current?.abort();
    },
    [language]
  );
  function start() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const Speech = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Speech || !window.isSecureContext) {
      setMessage(
        copy(language, 'Microphone unavailable. Type your sentence or use the crop buttons.')
      );
      return;
    }
    const instance = new Speech();
    recognition.current = instance;
    instance.lang = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' }[language];
    instance.interimResults = false;
    instance.continuous = false;
    instance.onresult = (event: any) => {
      const text = event.results[0]?.[0]?.transcript;
      if (text) onText(text);
    };
    instance.onerror = (event: any) => {
      setMessage(
        copy(
          language,
          event.error === 'not-allowed'
            ? 'Microphone permission denied. You can still type.'
            : 'Speech was not captured. Try again or type.'
        )
      );
      setListening(false);
    };
    instance.onend = () => setListening(false);
    try {
      setMessage('');
      setListening(true);
      instance.start();
    } catch {
      setListening(false);
      setMessage(
        copy(language, 'Microphone unavailable. Type your sentence or use the crop buttons.')
      );
    }
  }
  return (
    <div className="ks-voice">
      <button type="button" className="ks-button" onClick={start} aria-pressed={listening}>
        {listening ? <Square size={20} /> : <Mic size={20} />}{' '}
        {copy(language, listening ? 'Listening…' : 'Speak to fill')}
      </button>
      <p className="ks-subtitle">
        {copy(
          language,
          'Your browser may process speech using its speech service. Tap Speak only if you agree.'
        )}
      </p>
      {message && (
        <p className="ks-note" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
