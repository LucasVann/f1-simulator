import { useCallback, useRef } from 'react';

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 130;

const SYSTEM_CLASSIC = `Sos un locutor de carreras de Fórmula 1 de los años 50-70. Respondés solo con el comentario, sin comillas, sin preámbulos, en español rioplatense, máximo 2 oraciones breves, estilo dramático y apasionado. Usás términos de época.`;

const SYSTEM_MODERN = `Sos un comentarista de Fórmula 1 moderno. Respondés solo con el comentario, sin comillas, sin preámbulos, en español rioplatense, máximo 2 oraciones breves, estilo técnico y apasionado. Mencionás DRS, undercut, estrategia cuando corresponda.`;

export default function useCommentary({ era = 'classic' } = {}) {
  const loadingRef = useRef(false);
  const queueRef = useRef([]);

  const fetchNext = useCallback(async (onResult) => {
    if (loadingRef.current || !queueRef.current.length) return;
    const { prompt } = queueRef.current.shift();
    loadingRef.current = true;
    onResult({ loading: true, text: '' });

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: era === 'classic' ? SYSTEM_CLASSIC : SYSTEM_MODERN,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text?.trim() || '¡La acción continúa en la pista!';
      onResult({ loading: false, text });
    } catch {
      onResult({ loading: false, text: '¡Qué momento emocionante en la pista!' });
    } finally {
      loadingRef.current = false;
    }
  }, [era]);

  const request = useCallback((prompt, onResult) => {
    // max 1 in queue at a time
    if (queueRef.current.length < 1) {
      queueRef.current.push({ prompt });
      fetchNext(onResult);
    }
  }, [fetchNext]);

  return { request };
}
