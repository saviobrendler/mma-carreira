// Som sintetizado (Web Audio): sem arquivos de audio. Tudo e gerado na hora.
(function () {
  'use strict';

  const Som = { ligado: true, ctx: null, mestre: null, ruido: null, torcida: null };
  try {
    Som.ligado = localStorage.getItem('mma-som') !== '0';
  } catch (e) {
    // sem armazenamento: som ligado
  }

  function contexto() {
    if (!Som.ligado) return null;
    if (!Som.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      Som.ctx = new C();
      Som.mestre = Som.ctx.createGain();
      Som.mestre.gain.value = 0.7;
      Som.mestre.connect(Som.ctx.destination);
      const n = Som.ctx.sampleRate * 2;
      const buf = Som.ctx.createBuffer(1, n, Som.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      Som.ruido = buf;
    }
    if (Som.ctx.state === 'suspended') Som.ctx.resume();
    return Som.ctx;
  }

  // Rajada de ruido filtrado (impactos, vento, torcida).
  function rajada(o) {
    const c = contexto();
    if (!c) return;
    const t0 = c.currentTime + (o.atraso || 0);
    const src = c.createBufferSource();
    src.buffer = Som.ruido;
    src.loop = true;
    const filtro = c.createBiquadFilter();
    filtro.type = o.tipo || 'lowpass';
    filtro.frequency.setValueAtTime(o.freq, t0);
    if (o.freqFim) filtro.frequency.exponentialRampToValueAtTime(o.freqFim, t0 + o.dur);
    filtro.Q.value = o.q || 0.8;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.ganho, t0 + (o.ataque || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(filtro);
    filtro.connect(g);
    g.connect(Som.mestre);
    src.start(t0, Math.random());
    src.stop(t0 + o.dur + 0.05);
  }

  // Tom (corpo do impacto, sino).
  function tom(o) {
    const c = contexto();
    if (!c) return;
    const t0 = c.currentTime + (o.atraso || 0);
    const osc = c.createOscillator();
    osc.type = o.tipo || 'sine';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.freqFim) osc.frequency.exponentialRampToValueAtTime(o.freqFim, t0 + o.dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.ganho, t0 + (o.ataque || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g);
    g.connect(Som.mestre);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.05);
  }

  Som.soco = function (forte) {
    rajada({ freq: 1800, freqFim: 250, dur: 0.14, ganho: forte ? 0.7 : 0.4, tipo: 'lowpass' });
    tom({ freq: forte ? 150 : 120, freqFim: 45, dur: 0.18, ganho: forte ? 0.9 : 0.55 });
  };
  Som.chute = function (forte) {
    rajada({ freq: 900, freqFim: 150, dur: 0.2, ganho: forte ? 0.8 : 0.5 });
    tom({ freq: 95, freqFim: 35, dur: 0.24, ganho: forte ? 1 : 0.7 });
  };
  Som.errou = function () {
    rajada({ freq: 900, freqFim: 3200, dur: 0.2, ganho: 0.12, tipo: 'bandpass', q: 1.2, ataque: 0.06 });
  };
  Som.queda = function () {
    tom({ freq: 70, freqFim: 28, dur: 0.45, ganho: 1 });
    rajada({ freq: 500, freqFim: 90, dur: 0.4, ganho: 0.6 });
  };
  Som.sino = function (vezes) {
    for (let i = 0; i < (vezes || 1); i++) {
      const a = i * 0.55;
      tom({ freq: 880, dur: 1.4, ganho: 0.25, atraso: a });
      tom({ freq: 1760, dur: 1.0, ganho: 0.12, atraso: a });
      tom({ freq: 2637, dur: 0.7, ganho: 0.06, atraso: a });
    }
  };
  Som.tap = function () {
    for (let i = 0; i < 3; i++) rajada({ freq: 700, dur: 0.07, ganho: 0.5, atraso: i * 0.16, tipo: 'bandpass', q: 2 });
  };
  Som.grito = function (nivel) {
    // Torcida: ruido de banda larga que sobe e desce.
    const n = nivel || 0.4;
    rajada({ freq: 700, freqFim: 1200, dur: 1.6, ganho: 0.18 * n + 0.05, tipo: 'bandpass', q: 0.5, ataque: 0.5 });
  };
  Som.ko = function () {
    tom({ freq: 60, freqFim: 22, dur: 0.9, ganho: 1.2 });
    rajada({ freq: 800, freqFim: 80, dur: 0.7, ganho: 0.9 });
    Som.grito(1.4);
  };

  // Fanfarras e jingles das celebracoes (vitoria, campeao, derrota, nivel).
  function nota(freq, atraso, dur, ganho, tipo) {
    tom({ freq: freq, dur: dur, ganho: ganho, atraso: atraso, tipo: tipo || 'triangle' });
    tom({ freq: freq * 2, dur: dur * 0.7, ganho: ganho * 0.3, atraso: atraso, tipo: 'sine' });
  }
  Som.vitoria = function () {
    [[523.3, 0], [659.3, 0.14], [784, 0.28], [1046.5, 0.44]].forEach((n) => nota(n[0], n[1], 0.55, 0.22));
    [523.3, 659.3, 784].forEach((f) => tom({ freq: f, dur: 1.2, ganho: 0.1, atraso: 0.46, tipo: 'sawtooth' }));
    Som.grito(1.1);
  };
  Som.campeao = function () {
    [[392, 0], [523.3, 0.16], [659.3, 0.32], [784, 0.48], [1046.5, 0.7], [1318.5, 0.95]].forEach((n) => nota(n[0], n[1], 0.7, 0.24));
    [523.3, 659.3, 784, 1046.5].forEach((f) => tom({ freq: f, dur: 2.2, ganho: 0.1, atraso: 0.95, tipo: 'sawtooth' }));
    Som.sino(2);
    Som.grito(1.6);
    setTimeout(() => Som.grito(1.2), 900);
  };
  Som.derrota = function () {
    [[392, 0], [349.2, 0.34], [311.1, 0.68], [261.6, 1.05]].forEach((n) => nota(n[0], n[1], 0.8, 0.16, 'sine'));
    tom({ freq: 70, freqFim: 40, dur: 1.8, ganho: 0.35, atraso: 0.2 });
  };
  Som.nivel = function () {
    [523.3, 659.3, 784, 1046.5, 1318.5, 1568].forEach((f, i) => nota(f, i * 0.08, 0.5, 0.18));
    tom({ freq: 2093, dur: 0.9, ganho: 0.06, atraso: 0.5 });
    tom({ freq: 2637, dur: 0.9, ganho: 0.05, atraso: 0.58 });
  };
  Som.raro = function (nivel) {
    const n = nivel || 1;
    nota(880, 0, 0.35, 0.16);
    nota(1318.5, 0.1, 0.5, 0.16);
    if (n > 1) nota(1760, 0.22, 0.7, 0.14);
  };

  // Ambiente da arena: murmurio constante de torcida, volume ajustavel.
  Som.ambiente = function (ligar, volume) {
    const c = contexto();
    if (!c) return;
    if (!ligar) {
      if (Som.torcida) {
        Som.torcida.gain.gain.linearRampToValueAtTime(0.0001, c.currentTime + 0.6);
        const s = Som.torcida.src;
        setTimeout(() => { try { s.stop(); } catch (e) { /* ja parou */ } }, 800);
        Som.torcida = null;
      }
      return;
    }
    if (!Som.torcida) {
      const src = c.createBufferSource();
      src.buffer = Som.ruido;
      src.loop = true;
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 600;
      f.Q.value = 0.4;
      const g = c.createGain();
      g.gain.value = 0.0001;
      src.connect(f);
      f.connect(g);
      g.connect(Som.mestre);
      src.start();
      Som.torcida = { src: src, gain: g };
    }
    Som.torcida.gain.gain.linearRampToValueAtTime(volume || 0.05, c.currentTime + 0.8);
  };

  Som.alternar = function () {
    Som.ligado = !Som.ligado;
    try {
      localStorage.setItem('mma-som', Som.ligado ? '1' : '0');
    } catch (e) {
      // sem armazenamento
    }
    if (!Som.ligado) {
      if (Som.torcida) {
        try { Som.torcida.src.stop(); } catch (e) { /* ja parou */ }
        Som.torcida = null;
      }
    }
    return Som.ligado;
  };

  // Navegadores so liberam audio depois de um gesto do usuario.
  Som.destravar = function () {
    contexto();
  };

  window.Som = Som;
})();
