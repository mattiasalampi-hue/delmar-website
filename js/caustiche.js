/* ── Le due campiture della sezione contatti ─────
   Dipinge la meta' scura, la meta' chiara e le caustiche che battono sul
   confine, e DICE dove passa quel confine — perche' i pesciolini devono
   cambiare colore esattamente li'. Una funzione sola per tutte e due le
   cose: se fossero due, i pesci virerebbero in un punto e il fondo
   cambierebbe in un altro, e a occhio si vede subito.

   PERCHE' SU TELA E NON NEL FOGLIO DI STILE. Al primo tentativo erano
   sfumature CSS: su una sezione alta settecento pixel la luce restava
   una macchia schiacciata a meta' altezza, con sopra e sotto spenti.
   Una campitura viva per tutta l'altezza, che si muove, il CSS non la fa.

   Le cinque varianti restano tutte qui anche se il sito ne usa una: sono
   dieci righe l'una, e servono al banco di prova in prove/ per
   riguardarle quando si vorra' cambiare. Cancellarle vorrebbe dire
   riscriverle.

   window.DelMarCaustiche(tela, { tipo }) -> { confine(y), ferma() }
*/
window.DelMarCaustiche = function (cvs, opzioni) {
  const o = Object.assign({ tipo: 'larghe', scala: .5 }, opzioni || {});
  const ctx = cvs.getContext('2d');

  /* Le caustiche si disegnano su una tela a parte e si incollano
     attraverso una maschera. Senza, invadevano tutta la meta' chiara e
     passavano sopra i recapiti rendendoli faticosi da leggere — e non
     era nemmeno onesto: se la luce entra dal taglio, lontano dal taglio
     deve spegnersi. */
  const app = document.createElement('canvas');
  const dctx = app.getContext('2d');

  let W = 0, H = 0, t = 0, raf = null;

  /* Le righe curve che quasi tutte le varianti usano: scritta una volta
     perche' quattro copie della stessa doppia sinusoide sarebbero
     quattro posti dove sbagliarla */
  function righe(w, h, p) {
    dctx.lineWidth = p.spess;
    const cx = w * .5;
    const meta = (p.quante - 1) / 2;
    for (let i = 0; i < p.quante; i++) {
      const f = i * 1.7;
      const amp = p.amp(i);
      dctx.beginPath();
      for (let y = -10; y <= h + 10; y += 8) {
        const x = cx
          + Math.sin(y * p.v1 + t * p.t1 + f) * amp
          + Math.sin(y * p.v2 - t * p.t2 + f) * amp * .45
          + (i - meta) * p.passo;
        y === -10 ? dctx.moveTo(x, y) : dctx.lineTo(x, y);
      }
      /* Si spengono allontanandosi dal confine: nascono dalla luce che
         passa dal taglio, non da tutta la sezione */
      const lontano = Math.abs(i - meta) / meta;
      dctx.strokeStyle = `rgba(190,225,255,${(1 - lontano) * p.alfa})`;
      dctx.stroke();
    }
  }

  const TIPI = {

    /* Fitte — tante righe sottili e nervose, strette attorno al taglio */
    fitte: {
      largo: 190,
      confine: () => W * .5,
      disegna(w, h) {
        righe(w, h, { quante: 26, passo: 11, amp: i => 26 + (i % 5) * 16,
                      v1: .014, v2: .031, t1: .8, t2: .55, alfa: .26, spess: 1.4 });
      }
    },

    /* Larghe e lente — QUELLA IN USO SUL SITO (Mattias, 15/08/2026).
       Poche fasce ampie: su una sezione alta respirano invece di
       vibrare. Le fitte erano piu' vistose ma dietro un modulo da
       compilare diventavano un fondo che si agita mentre scrivi. */
    larghe: {
      largo: 240,
      confine: () => W * .5,
      disegna(w, h) {
        righe(w, h, { quante: 9, passo: 34, amp: i => 54 + (i % 3) * 30,
                      v1: .0068, v2: .015, t1: .3, t2: .19, alfa: .34, spess: 3.4 });
      }
    },

    /* Rete — due famiglie incrociate: dove si sovrappongono la luce si
       somma da sola e nascono le maglie, che e' come sono fatte davvero
       sul fondo di una piscina */
    rete: {
      largo: 210,
      confine: () => W * .5,
      disegna(w, h) {
        righe(w, h, { quante: 16, passo: 17, amp: i => 34 + (i % 4) * 18,
                      v1: .012, v2: .027, t1: .55, t2: .4, alfa: .2, spess: 1.6 });
        dctx.lineWidth = 1.6;
        const cx = w * .5;
        for (let i = 0; i < 13; i++) {
          const f = i * 2.1;
          dctx.beginPath();
          for (let x = cx - 230; x <= cx + 230; x += 10) {
            const y = (i / 12) * h
              + Math.sin(x * .017 + t * .46 + f) * 26
              + Math.sin(x * .009 - t * .3 + f) * 16;
            x === cx - 230 ? dctx.moveTo(x, y) : dctx.lineTo(x, y);
          }
          dctx.strokeStyle = 'rgba(200,230,255,.16)';
          dctx.stroke();
        }
      }
    },

    /* Raggi — fasci che partono dal taglio e si aprono a ventaglio */
    raggi: {
      largo: 300,
      confine: () => W * .5,
      disegna(w, h) {
        const cx = w * .5;
        for (let i = 0; i < 18; i++) {
          const base = (i / 17) * h;
          const ond = Math.sin(t * .5 + i * .55) * .16;
          const apri = 34 + Math.sin(i * 1.3) * 16;
          for (const verso of [-1, 1]) {
            const g = dctx.createLinearGradient(cx, base, cx + verso * w * .5, base + ond * h);
            g.addColorStop(0,   'rgba(210,234,255,.34)');
            g.addColorStop(.35, 'rgba(170,210,255,.11)');
            g.addColorStop(1,   'rgba(150,195,255,0)');
            dctx.fillStyle = g;
            dctx.beginPath();
            dctx.moveTo(cx, base);
            dctx.lineTo(cx + verso * w * .5, base + ond * h - apri);
            dctx.lineTo(cx + verso * w * .5, base + ond * h + apri);
            dctx.closePath();
            dctx.fill();
          }
        }
      }
    },

    /* PROFONDITA' — l'unica senza taglio verticale.
       Le altre quattro nascono dalla sezione contatti, dove meta' schermo
       e' chiaro e meta' scuro e la luce esce dalla cucitura. Il blocco di
       chiusura dei cataloghi invece e' scuro per intero: li' un taglio
       luminoso al centro finirebbe esattamente dietro il titolo.

       Qui la luce entra DALL'ALTO e si spegne scendendo — la superficie
       dell'acqua vista da sotto. Per farlo servono un fondo e una maschera
       diversi, e infatti questa variante porta le sue: 'sfondo' e
       'maschera' sostituiscono quelli predefiniti quando ci sono. */
    profondita: {
      largo: 0,
      confine: () => 0,
      sfondo(c, w, h) {
        const g = c.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#1d2c80');
        g.addColorStop(.42, '#151d61');
        g.addColorStop(1, '#080c2c');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
      },
      /* La luce sta STRETTA in alto, non diffusa a mezza altezza: sotto il
         titolo passa la riga piu' importante della pagina, e una banda
         chiara che ci corre dietro la fa faticare. Cosi' invece il testo
         galleggia sul blu profondo e la luce resta un accento sopra. */
      maschera(c, w, h) {
        const m = c.createLinearGradient(0, 0, 0, h * .95);
        m.addColorStop(0,   'rgba(0,0,0,1)');
        m.addColorStop(.2,  'rgba(0,0,0,.44)');
        m.addColorStop(.5,  'rgba(0,0,0,.11)');
        m.addColorStop(.82, 'rgba(0,0,0,0)');
        c.globalCompositeOperation = 'destination-in';
        c.fillStyle = m;
        c.fillRect(0, 0, w, h);
      },
      disegna(w, h) {
        /* Bande orizzontali e larghe, non righe verticali: e' lo stesso
           motivo per cui sul sito si usa 'larghe' invece di 'fitte' —
           dietro un titolo da leggere il fondo deve respirare, non vibrare.

           TUTTO IN PROPORZIONE, NIENTE PIXEL FISSI. Alla prima scrittura la
           frequenza era in pixel: su una tela larga come un telefono la
           sinusoide non arrivava a completare un sesto di periodo, e le
           bande diventavano righe quasi dritte in diagonale. Con x
           normalizzato fra 0 e 1 la forma e' la stessa a ogni larghezza; le
           ampiezze e lo spessore seguono altezza e larghezza per lo stesso
           motivo. */
        dctx.lineWidth = Math.max(1.6, w * .0073);
        for (let i = 0; i < 11; i++) {
          const f = i * 1.6;
          const base = (i / 10) * h * .78;
          dctx.beginPath();
          for (let x = -12; x <= w + 12; x += 8) {
            const u = x / w;
            const y = base
              + Math.sin(u * 2.58 + t * .24 + f) * h * .16
              + Math.sin(u * 6.35 - t * .16 + f) * h * .068;
            x === -12 ? dctx.moveTo(x, y) : dctx.lineTo(x, y);
          }
          dctx.strokeStyle = `rgba(190,225,255,${(1 - i / 10) * .26})`;
          dctx.stroke();
        }
      }
    },

    /* Superficie — la luce entra dall'alto e il confine ondeggia, che e'
       la stessa superficie vista di taglio */
    superficie: {
      largo: 220,
      confine: (y) => W * .5
        + Math.sin(y * .0062 + t * .42) * W * .038
        + Math.sin(y * .0154 - t * .27) * W * .015,
      disegna(w, h) {
        dctx.lineWidth = 1.5;
        const cx = w * .5;
        for (let i = 0; i < 22; i++) {
          const f = i * 1.9;
          dctx.beginPath();
          for (let y = -10; y <= h + 10; y += 8) {
            const x = cx
              + Math.sin(y * .011 + t * .6 + f) * (30 + (i % 4) * 20)
              + (i - 11) * 13;
            y === -10 ? dctx.moveTo(x, y) : dctx.lineTo(x, y);
          }
          dctx.strokeStyle = `rgba(205,232,255,${.22 * (1 - Math.abs(i - 11) / 11)})`;
          dctx.stroke();
        }
        const v = dctx.createLinearGradient(0, 0, 0, h);
        v.addColorStop(0,   'rgba(190,225,255,.26)');
        v.addColorStop(.42, 'rgba(190,225,255,.06)');
        v.addColorStop(1,   'rgba(190,225,255,0)');
        dctx.fillStyle = v;
        dctx.fillRect(0, 0, w, h);
      }
    }
  };

  let tipo = TIPI[o.tipo] || TIPI.larghe;

  function misura() {
    W = cvs.offsetWidth;
    H = cvs.offsetHeight;
    /* A meta' risoluzione, stirata dal foglio di stile: e' tutto
       sfumato, la differenza non si vede, e la sfocatura costa un quarto */
    cvs.width  = app.width  = Math.max(1, Math.round(W * o.scala));
    cvs.height = app.height = Math.max(1, Math.round(H * o.scala));
  }

  function dipingi() {
    const w = cvs.width, h = cvs.height, S = o.scala;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);

    /* Una variante puo' portarsi il fondo suo — vedi 'profondita', che non
       ha due campiture da dividere. Le altre usano quello qui sotto. */
    if (tipo.sfondo) {
      tipo.sfondo(ctx, w, h);
    } else {
      const chiaro = ctx.createLinearGradient(0, 0, 0, h);
      chiaro.addColorStop(0, '#f4f6f9');
      chiaro.addColorStop(1, '#e4e7ee');
      ctx.fillStyle = chiaro;
      ctx.fillRect(0, 0, w, h);

      /* La meta' scura e' una FORMA che segue il confine riga per riga,
         sfocata sul bordo: cosi' le due campiture si fondono invece di
         toccarsi con una linea */
      ctx.save();
      ctx.filter = 'blur(9px)';
      ctx.beginPath();
      ctx.moveTo(-30, -30);
      for (let y = -20; y <= h + 20; y += 6) {
        ctx.lineTo(tipo.confine(y / S) * S, y);
      }
      ctx.lineTo(-30, h + 30);
      ctx.closePath();
      const scuro = ctx.createLinearGradient(0, 0, 0, h);
      scuro.addColorStop(0, '#0e1445');
      scuro.addColorStop(.55, '#1a2270');
      scuro.addColorStop(1, '#0d1240');
      ctx.fillStyle = scuro;
      ctx.fill();
      ctx.restore();
    }

    dctx.setTransform(1, 0, 0, 1, 0, 0);
    dctx.clearRect(0, 0, w, h);
    dctx.globalCompositeOperation = 'source-over';
    tipo.disegna(w, h);

    /* La maschera: piena sul taglio, trasparente a 'largo' pixel da li'.
       destination-in tiene solo quello che ci sta dentro.
       Anche questa una variante puo' sostituirla: 'profondita' spegne la
       luce scendendo invece che allontanandosi dal centro. */
    if (tipo.maschera) {
      tipo.maschera(dctx, w, h);
    } else {
      const cx = w * .5;
      const m = dctx.createLinearGradient(cx - tipo.largo, 0, cx + tipo.largo, 0);
      m.addColorStop(0,   'rgba(0,0,0,0)');
      m.addColorStop(.28, 'rgba(0,0,0,.55)');
      m.addColorStop(.5,  'rgba(0,0,0,1)');
      m.addColorStop(.72, 'rgba(0,0,0,.55)');
      m.addColorStop(1,   'rgba(0,0,0,0)');
      dctx.globalCompositeOperation = 'destination-in';
      dctx.fillStyle = m;
      dctx.fillRect(0, 0, w, h);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(app, 0, 0);
    ctx.restore();
  }

  /* A 30 fotogrammi e non a 60: e' tutto sfumato e lentissimo, nessuno
     vede la differenza, e si risparmia meta' del lavoro su una tela
     grande quanto la sezione */
  let alterno = false;
  function giro() {
    t += .016;
    alterno = !alterno;
    if (alterno) dipingi();
    raf = requestAnimationFrame(giro);
  }

  let attesa;
  function suRidimensiona() {
    clearTimeout(attesa);
    attesa = setTimeout(misura, 130);
  }
  window.addEventListener('resize', suRidimensiona);

  const occhio = new IntersectionObserver(e => {
    if (e[0].isIntersecting) { if (!raf) giro(); }
    else { cancelAnimationFrame(raf); raf = null; }
  }, { threshold: 0.01 });
  occhio.observe(cvs);

  misura();

  return {
    /* Il confine in pixel di SCHERMO, non della tela dimezzata: chi lo
       chiede ragiona in coordinate visibili */
    confine: (y) => tipo.confine(y),
    cambia(n) { tipo = TIPI[n] || tipo; },
    ferma() {
      cancelAnimationFrame(raf);
      raf = null;
      occhio.disconnect();
      window.removeEventListener('resize', suRidimensiona);
    }
  };
};
