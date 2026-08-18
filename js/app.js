/* One button. Press it, a dog runs.

   Everything below exists to make that sentence true even when the internet is
   being difficult: clips are drawn from a shuffled bag so nobody repeats until
   the deck is spent, the next one is preloaded while you watch the current one,
   and any clip that fails to load is dropped on the floor and replaced without
   the button ever appearing to fail. */

(function () {
  'use strict';

  var video   = document.getElementById('clip');
  var empty   = document.getElementById('empty');
  var plate   = document.getElementById('plate');
  var caption = document.getElementById('caption');
  var capName = document.getElementById('cap-name');
  var capMeta = document.getElementById('cap-meta');
  var capNote = document.getElementById('cap-note');
  var button  = document.getElementById('summon');
  var label   = button.querySelector('.summon-label');
  var hint    = document.getElementById('hint');

  var LABELS = [
    'Another good boy', 'Again', 'One more', 'Another', 'Keep them coming',
    'More dogs', 'Again please', 'Another elderly gentleman'
  ];

  var dead = {};        /* clip ids that failed to load this session */
  var bag  = [];        /* shuffled curated deck, drawn down then refilled */
  var live = [];        /* clips fetched from Giphy, if a key is configured */
  var busy = false;
  var seen = 0;
  var preloader = null;
  var preloaded = null;
  var noteBag = [];     /* shuffled notes, so none repeats until all have shown */
  var lastWasNote = false;

  /* ---- picking ------------------------------------------------------------ */

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function fromDeck() {
    var pool = DECK.filter(function (c) { return !dead[c.id]; });
    if (!pool.length) return null;
    if (!bag.length) bag = shuffle(pool);
    return bag.pop();
  }

  function pick() {
    var wantLive = live.length && Math.random() < CONFIG.LIVE_SHARE;
    if (wantLive) {
      var c = live.pop();
      if (c && !dead[c.id]) return c;
    }
    return fromDeck();
  }

  /* A note from him lands about one press in five — often enough to be a
     surprise, rare enough to stay one. Never first, never twice running. */
  function noteForThisPress(pressNumber) {
    if (typeof NOTES_FROM_YOU === 'undefined' || !NOTES_FROM_YOU.length) return null;
    if (pressNumber < 2 || lastWasNote) return null;
    if (Math.random() > 0.2) return null;
    if (!noteBag.length) noteBag = shuffle(NOTES_FROM_YOU);
    return noteBag.pop();
  }

  /* ---- loading ------------------------------------------------------------ */

  /* Resolve a clip to a *playable* video element, or reject. Six seconds is
     generous for a 100KB mp4; past that we assume it is not coming. */
  function load(clip) {
    return new Promise(function (resolve, reject) {
      var v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true;
      v.setAttribute('playsinline', '');
      v.preload = 'auto';
      var settled = false;
      var timer = setTimeout(function () { fail(); }, 6000);

      function done() {
        if (settled) return;
        settled = true; clearTimeout(timer);
        resolve({ clip: clip, el: v });
      }
      function fail() {
        if (settled) return;
        settled = true; clearTimeout(timer);
        dead[clip.id] = true;
        reject(clip);
      }

      v.addEventListener('canplay', done, { once: true });
      v.addEventListener('loadeddata', done, { once: true });
      v.addEventListener('error', fail, { once: true });
      v.src = clip.src;
      v.load();
    });
  }

  /* Try clips until one actually loads. */
  function nextPlayable(tries) {
    tries = tries || 0;
    var clip = pick();
    if (!clip || tries > 6) return Promise.reject();
    return load(clip).catch(function () { return nextPlayable(tries + 1); });
  }

  function prefetch() {
    if (preloader) return;
    preloader = nextPlayable().then(function (r) {
      preloaded = r; preloader = null;
    }).catch(function () { preloader = null; });
  }

  /* ---- showing ------------------------------------------------------------ */

  /* Browsers pause muted autoplay in a backgrounded tab and iOS sometimes wants
     a second ask. Nudging on canplay and on return-to-tab covers both. */
  function nudge() {
    if (!video.src) return;
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && video.paused) nudge();
  });

  function show(result) {
    var clip = result.clip;
    var card = catalogue(clip.id);

    video.src = clip.src;
    if (clip.poster) video.poster = clip.poster;
    video.load();
    nudge();
    video.addEventListener('canplay', nudge, { once: true });

    /* if this one dies mid-flight, quietly move on */
    video.onerror = function () {
      dead[clip.id] = true;
      video.onerror = null;
      summon();
    };

    empty.hidden = true;
    plate.classList.add('loaded');
    capName.textContent = card.name;
    capMeta.textContent = card.meta;
    caption.hidden = false;

    plate.classList.remove('turning');
    void plate.offsetWidth;
    plate.classList.add('arriving');
    setTimeout(function () { plate.classList.remove('arriving'); }, 600);

    seen++;

    var note = noteForThisPress(seen);
    lastWasNote = !!note;
    capNote.textContent = note || '';
    capNote.hidden = !note;
    document.body.classList.toggle('note-showing', !!note);
    document.body.classList.toggle('note-long', !!note && note.length > 110);

    label.textContent = LABELS[seen % LABELS.length];
    if (seen === 1) hint.textContent = 'Press it as many times as you need.';
    if (seen === 8) hint.textContent = 'There is no limit. That is the whole point.';
    if (seen === 20) hint.textContent = 'The Observatory has plenty more dogs.';
  }

  function summon() {
    if (busy) return;
    busy = true;
    button.disabled = true;
    plate.classList.add('turning');

    var ready = preloaded
      ? Promise.resolve(preloaded)
      : nextPlayable();
    preloaded = null;

    ready.then(function (r) {
      show(r);
    }).catch(function () {
      empty.hidden = false;
      plate.classList.remove('turning');
      hint.textContent = 'The sky is cloudy right now — try again in a moment.';
    }).then(function () {
      busy = false;
      button.disabled = false;
      plate.classList.remove('turning');
      prefetch();
    });
  }

  button.addEventListener('click', summon);

  /* Space and Enter already work on a <button>; this makes the whole page a
     button once you have started, because on a bad day that is easier. */
  document.addEventListener('keydown', function (e) {
    if ((e.key === ' ' || e.key === 'Enter') && document.activeElement !== button) {
      e.preventDefault();
      summon();
    }
  });

  /* ---- live search (only if a key is configured) --------------------------- */

  function refillLive() {
    var key = (CONFIG.GIPHY_API_KEY || '').trim();
    if (!key) return;
    var term = CONFIG.GIPHY_TERMS[Math.floor(Math.random() * CONFIG.GIPHY_TERMS.length)];
    var offset = Math.floor(Math.random() * 60);
    var url = 'https://api.giphy.com/v1/gifs/search?api_key=' + encodeURIComponent(key) +
              '&q=' + encodeURIComponent(term) + '&limit=25&offset=' + offset + '&rating=g&lang=en';

    fetch(url).then(function (r) { return r.ok ? r.json() : Promise.reject(); }).then(function (json) {
      var found = (json.data || []).map(function (g) {
        var im = g.images || {};
        var mp4 = (im.original_mp4 && im.original_mp4.mp4) ||
                  (im.downsized_small && im.downsized_small.mp4) || null;
        if (!mp4) return null;
        return {
          id: 'giphy-' + g.id,
          src: mp4,
          poster: (im.fixed_width_small_still && im.fixed_width_small_still.url) || ''
        };
      }).filter(Boolean);
      live = live.concat(shuffle(found)).slice(-60);
    }).catch(function () { /* stay on the curated deck */ });
  }

  if ((CONFIG.GIPHY_API_KEY || '').trim()) {
    refillLive();
    setInterval(function () { if (live.length < 8) refillLive(); }, 20000);
  }

  /* warm the first dog up so the very first press is instant */
  prefetch();

  /* Append ?nosw=1 while developing, or the service worker will keep serving
     yesterday's files and you will chase ghosts. */
  if ('serviceWorker' in navigator && location.search.indexOf('nosw') === -1) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
