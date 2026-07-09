(function () {
  'use strict';

  var STORE_KEY = 'ttt-v2';
  var SVG_NS = 'http://www.w3.org/2000/svg';

  /* board size -> marks in a row needed to win */
  var BOARDS = { 3: 3, 5: 4, 7: 5, 10: 5, 15: 5, 20: 5 };
  var NEED_WORD = { 3: 'Three', 4: 'Four', 5: 'Five' };
  var DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]]; /* [dc, dr] */

  var settings = { mode: 'pvp', diff: 'tricky', order: 'human', size: 3, name: '', muted: false, theme: '' };
  var scores = { x: 0, o: 0, d: 0 };
  try {
    var saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    if (saved.settings) settings = Object.assign(settings, saved.settings);
    if (saved.scores) scores = Object.assign(scores, saved.scores);
  } catch (e) { /* private mode etc. */ }
  if (!BOARDS[settings.size]) settings.size = 3;

  var N = +settings.size;      /* board is N x N */
  var K = BOARDS[N];           /* K in a row wins */
  var board, turn, over, cpuTimer = null;
  var starter = Math.random() < 0.5 ? 'x' : 'o'; /* random side first; then loser starts, draws swap */
  var lastCell = -1;           /* most recent move, for the highlight */

  var el = {
    arena: document.getElementById('arena'),
    board: document.getElementById('board'),
    hash: document.getElementById('hash'),
    status: document.getElementById('status'),
    statusText: document.getElementById('statusText'),
    strike: document.getElementById('strike'),
    strikeLine: document.getElementById('strikeLine'),
    tagline: document.getElementById('tagline'),
    scoreX: document.getElementById('scoreX'),
    scoreO: document.getElementById('scoreO'),
    scoreD: document.getElementById('scoreD'),
    lblX: document.getElementById('lblX'),
    lblO: document.getElementById('lblO'),
    modeSeg: document.getElementById('modeSeg'),
    sizeSeg: document.getElementById('sizeSeg'),
    diffSeg: document.getElementById('diffSeg'),
    orderSeg: document.getElementById('orderSeg'),
    onlinePanel: document.getElementById('onlinePanel'),
    gameKey: document.getElementById('gameKey'),
    onlineNote: document.getElementById('onlineNote'),
    copyLink: document.getElementById('copyLink'),
    chat: document.getElementById('chat'),
    chatLog: document.getElementById('chatLog'),
    chatQuick: document.getElementById('chatQuick'),
    chatEmoji: document.getElementById('chatEmoji'),
    chatForm: document.getElementById('chatForm'),
    chatInput: document.getElementById('chatInput'),
    modal: document.getElementById('modal'),
    modalTitle: document.getElementById('modalTitle'),
    modalText: document.getElementById('modalText'),
    modalInput: document.getElementById('modalInput'),
    modalOk: document.getElementById('modalOk'),
    modalCancel: document.getElementById('modalCancel'),
    toasts: document.getElementById('toasts'),
    rematchBtn: document.getElementById('rematchBtn'),
    soundBtn: document.getElementById('soundBtn'),
    themeBtn: document.getElementById('themeBtn'),
    joinInput: document.getElementById('joinInput'),
    joinBtn: document.getElementById('joinBtn')
  };

  /* ----- theme toggle ----- */
  function effectiveTheme() {
    if (settings.theme === 'light' || settings.theme === 'dark') return settings.theme;
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (e) { return 'light'; }
  }
  function applyTheme() {
    if (settings.theme === 'light' || settings.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', settings.theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    var dark = effectiveTheme() === 'dark';
    el.themeBtn.textContent = dark ? '☀️' : '🌙';
    el.themeBtn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to night mode');
  }
  el.themeBtn.addEventListener('click', function () {
    settings.theme = effectiveTheme() === 'dark' ? 'light' : 'dark';
    persist();
    applyTheme();
  });

  /* ----- sound effects (Web Audio, no asset files) ----- */
  var audioCtx = null;
  var SFX = {
    placeX: [[340, 0.08, 0]],
    placeO: [[460, 0.08, 0]],
    win:    [[523, 0.12, 0], [659, 0.12, 0.09], [784, 0.2, 0.18]],
    lose:   [[392, 0.12, 0], [311, 0.12, 0.09], [233, 0.22, 0.18]],
    draw:   [[440, 0.1, 0], [440, 0.12, 0.14]],
    msg:    [[880, 0.05, 0], [1175, 0.07, 0.06]],
    join:   [[523, 0.08, 0], [784, 0.12, 0.08]]
  };
  function sfx(name) {
    if (settings.muted || !SFX[name]) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var t0 = audioCtx.currentTime;
      SFX[name].forEach(function (s) {
        var o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'sine';
        o.frequency.value = s[0];
        g.gain.setValueAtTime(0.0001, t0 + s[2]);
        g.gain.exponentialRampToValueAtTime(0.12, t0 + s[2] + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + s[2] + s[1]);
        o.connect(g);
        g.connect(audioCtx.destination);
        o.start(t0 + s[2]);
        o.stop(t0 + s[2] + s[1] + 0.05);
      });
    } catch (e) { /* no audio available */ }
  }
  function renderSoundBtn() {
    el.soundBtn.textContent = settings.muted ? '🔇' : '🔊';
    el.soundBtn.setAttribute('aria-label', settings.muted ? 'Unmute sounds' : 'Mute sounds');
  }
  el.soundBtn.addEventListener('click', function () {
    settings.muted = !settings.muted;
    persist();
    renderSoundBtn();
    sfx('placeO'); /* audible confirmation when unmuting */
  });

  /* ----- modal & toasts ----- */
  var modalHandlers = { ok: null, cancel: null };

  function showModal(o) {
    el.modalTitle.textContent = o.title || '';
    el.modalText.textContent = o.text || '';
    el.modalText.classList.toggle('hidden', !o.text);
    el.modalInput.classList.toggle('hidden', !o.input);
    if (o.input) {
      el.modalInput.value = o.value || '';
      el.modalInput.placeholder = o.placeholder || '';
    }
    el.modalOk.textContent = o.okText || 'OK';
    el.modalCancel.textContent = o.cancelText || 'Cancel';
    el.modalCancel.classList.toggle('hidden', !!o.hideCancel);
    modalHandlers.ok = o.onOk || null;
    modalHandlers.cancel = o.onCancel || null;
    el.modal.classList.remove('hidden');
    if (o.input) el.modalInput.focus(); else el.modalOk.focus();
  }
  function closeModal() { el.modal.classList.add('hidden'); }
  el.modalOk.addEventListener('click', function () {
    var v = el.modalInput.value, fn = modalHandlers.ok;
    modalHandlers.ok = modalHandlers.cancel = null;
    closeModal();
    if (fn) fn(v);
  });
  el.modalCancel.addEventListener('click', function () {
    var fn = modalHandlers.cancel;
    modalHandlers.ok = modalHandlers.cancel = null;
    closeModal();
    if (fn) fn();
  });
  el.modalInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); el.modalOk.click(); }
  });
  function confirmThen(title, text, onYes, okText, onNo) {
    showModal({ title: title, text: text, okText: okText || 'Yes', cancelText: 'Cancel', onOk: onYes, onCancel: onNo });
  }

  function toast(text) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    el.toasts.appendChild(t);
    while (el.toasts.children.length > 4) el.toasts.removeChild(el.toasts.firstChild);
    setTimeout(function () {
      t.classList.add('gone');
      setTimeout(function () { t.remove(); }, 450);
    }, 3200);
  }

  function cleanName(v, fallback) {
    return String(v || '').trim().slice(0, 20) || fallback;
  }
  function askName(done) {
    var suggested = settings.name || 'Player' + Math.floor(1 + Math.random() * 999);
    showModal({
      title: 'What should we call you?',
      text: 'Shown to your opponent in online games.',
      input: true,
      value: settings.name || '',
      placeholder: suggested,
      okText: "Let's play",
      hideCancel: true,
      onOk: function (v) {
        settings.name = cleanName(v, suggested);
        persist();
        renderScores();
        if (done) done();
      }
    });
  }

  /* ----- online play (WebRTC via PeerJS) ----- */
  var online = { peer: null, conn: null, role: null, key: null, ready: false, peerName: null,
    byed: false, reconnecting: false, reconnT: null, rejected: false };
  var pendingOut = { restart: false, reset: false, size: null };

  function friendName() { return online.peerName || 'Friend'; }
  var KEY_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  function genKey() {
    var k = '';
    for (var j = 0; j < 6; j++) k += KEY_CHARS[Math.floor(Math.random() * KEY_CHARS.length)];
    return k;
  }
  function myOnlineMark() { return online.role === 'host' ? 'x' : 'o'; }
  function inviteUrl() { return location.origin + location.pathname + '?join=' + online.key; }
  function send(msg) {
    if (online.conn && online.conn.open) online.conn.send(msg);
  }
  function note(text) { el.onlineNote.textContent = text; }

  function loadPeerJs(cb) {
    if (window.Peer) return cb();
    var s = document.createElement('script');
    s.src = './assets/peerjs.min.js';
    s.onload = cb;
    s.onerror = function () { note('Could not load the connection library. Check your internet and reload.'); };
    document.head.appendChild(s);
  }

  function startOnline(role, key) {
    teardownOnline();
    online.role = role;
    online.key = key || genKey();
    el.onlinePanel.classList.remove('hidden');
    el.gameKey.textContent = online.key;
    note(role === 'host' ? 'Creating game…' : 'Joining game…');
    loadPeerJs(function () {
      if (role === 'host') hostGame(); else joinGame();
    });
  }

  /* full game state, so a (re)joining guest can pick up exactly where things stand */
  function helloState() {
    return {
      t: 'hello',
      name: settings.name,
      size: settings.size,
      board: board.slice(),
      turn: turn,
      scores: { x: scores.x, o: scores.o, d: scores.d },
      starter: starter,
      over: over
    };
  }

  function hostGame() {
    online.peer = new Peer('ttt-' + online.key);
    online.peer.on('open', function () {
      note('Waiting for a friend to join…');
      statusForTurn();
    });
    online.peer.on('connection', function (c) {
      if (online.conn) {                                /* seat taken — tell them who's playing */
        c.on('open', function () {
          try { c.send({ t: 'full', players: [settings.name || 'Player 1', online.peerName || 'Player 2'] }); } catch (e) {}
          setTimeout(function () { try { c.close(); } catch (e) {} }, 300);
        });
        return;
      }
      online.conn = c;
      bindConn(c);
      c.on('open', function () {
        online.ready = true;
        online.byed = false;
        if (online.peerName) {
          note(friendName() + ' is back — game on!');
        } else {
          note('Friend joined! You are X — you start.');
        }
        c.send(helloState());
        showChat();
        statusForTurn();
      });
    });
    online.peer.on('disconnected', function () { /* lost the broker socket — revive it */
      try { online.peer.reconnect(); } catch (e) {}
    });
    online.peer.on('error', peerError);
  }

  function joinGame() {
    online.peer = new Peer();
    online.peer.on('open', function () {
      var c = online.peer.connect('ttt-' + online.key, { reliable: true });
      online.conn = c;
      bindConn(c);
      c.on('open', function () { note('Connected — setting up the board…'); });
    });
    online.peer.on('disconnected', function () {
      try { online.peer.reconnect(); } catch (e) {}
    });
    online.peer.on('error', peerError);
  }

  function bindConn(c) {
    var gone = function () {
      if (online.conn !== c) return;
      try { c.close(); } catch (e) {}
      online.conn = null;
      online.ready = false;
      pendingOut.restart = pendingOut.reset = false;
      pendingOut.size = null;
      if (settings.mode !== 'online') return;
      if (online.rejected) return;      /* seat was taken — the 'full' note stays up */
      if (online.byed) {                /* deliberate leave — no reconnect */
        note(online.role === 'host'
          ? friendName() + ' left the game. Share the key to play again.'
          : friendName() + ' left the game.');
        setStatus(friendName() + ' left', '');
        addChat('sys', friendName() + ' left the game');
        toast(friendName() + ' left the game');
        return;
      }
      /* connection dropped — try to recover */
      addChat('sys', 'Connection lost');
      setStatus('Connection lost', '');
      if (online.role === 'host') {
        note('Connection lost — waiting for ' + friendName() + ' to rejoin…');
        toast('Connection lost — waiting for ' + friendName() + ' to rejoin');
      } else {
        online.reconnecting = true;
        tryReconnect(1);
      }
    };
    c.on('data', onMessage);
    c.on('close', gone);
    /* 'close' alone misses abrupt exits (tab killed, network drop) — watch ICE too */
    c.on('iceStateChanged', function (state) {
      if (state === 'disconnected' || state === 'failed' || state === 'closed') gone();
    });
  }

  function tryReconnect(attempt) {
    if (settings.mode !== 'online' || online.conn || !online.peer || online.peer.destroyed) return;
    if (online.peer.disconnected) { try { online.peer.reconnect(); } catch (e) {} }
    if (attempt > 10) {
      online.reconnecting = false;
      note('Could not reconnect. Ask ' + friendName() + ' for a fresh invite link.');
      setStatus('Disconnected', '');
      return;
    }
    note('Connection lost — reconnecting… (try ' + attempt + ' of 10)');
    var c = online.peer.connect('ttt-' + online.key, { reliable: true });
    var opened = false;
    c.on('open', function () {
      opened = true;
      online.conn = c;
      online.byed = false;
      bindConn(c);
      note('Reconnected — restoring the game…');
    });
    c.on('error', function () { /* swallowed; retry below */ });
    setTimeout(function () {
      if (opened || online.conn) return;
      try { c.close(); } catch (e) {}
      online.reconnT = setTimeout(function () { tryReconnect(attempt + 1); }, 2000);
    }, 3000);
  }

  function peerError(err) {
    if (err.type === 'unavailable-id') { /* key collision: pick another */
      try { online.peer.destroy(); } catch (e) {}
      online.key = genKey();
      el.gameKey.textContent = online.key;
      hostGame();
      return;
    }
    if (err.type === 'peer-unavailable') {
      if (online.reconnecting) return; /* retry loop handles messaging */
      note('No game found for that key. Ask your friend for a fresh link.');
    } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') {
      note('Could not reach the matchmaking server. Check your internet and reload.');
    } else {
      note('Connection error (' + err.type + '). Reload and try again.');
    }
  }

  function teardownOnline() {
    if (online.reconnT) { clearTimeout(online.reconnT); online.reconnT = null; }
    if (online.conn) { try { online.conn.close(); } catch (e) {} }
    if (online.peer) { try { online.peer.destroy(); } catch (e) {} }
    online.peer = null;
    online.conn = null;
    online.role = null;
    online.ready = false;
    online.peerName = null;
    online.byed = false;
    online.reconnecting = false;
    online.rejected = false;
    pendingOut.restart = pendingOut.reset = false;
    pendingOut.size = null;
    el.onlinePanel.classList.add('hidden');
    hideChat();
  }

  function doReset() {
    scores = { x: 0, o: 0, d: 0 };
    renderScores();
  }

  /* guest: adopt the host's game state (fresh join or reconnect) */
  function restoreState(msg) {
    starter = msg.starter === 'o' ? 'o' : 'x';
    var s = msg.scores || {};
    scores = {
      x: s.x >= 0 ? s.x | 0 : 0,
      o: s.o >= 0 ? s.o | 0 : 0,
      d: s.d >= 0 ? s.d | 0 : 0
    };
    buildBoard();
    newRound();
    var b = Array.isArray(msg.board) ? msg.board : [];
    for (var i = 0; i < N * N; i++) {
      var v = b[i] === 'x' ? 'x' : (b[i] === 'o' ? 'o' : null);
      if (v) {
        board[i] = v;
        drawMark(i, v);
      }
    }
    turn = msg.turn === 'o' ? 'o' : 'x';
    el.arena.classList.remove('turn-x', 'turn-o');
    el.arena.classList.add('turn-' + turn);
    renderScores();
    if (msg.over) {
      var w = findWin(board);
      if (w || !emptyCells(board).length) {
        finishRound(w);
        el.rematchBtn.classList.remove('hidden');
      } else {
        statusForTurn();
      }
    } else {
      statusForTurn();
    }
  }

  function onMessage(msg) {
    if (!msg || typeof msg !== 'object' || settings.mode !== 'online') return;
    if (msg.t === 'hello') {          /* guest: host sent name + full game state */
      var wasReconnect = online.reconnecting;
      online.reconnecting = false;
      online.byed = false;
      online.peerName = cleanName(msg.name, 'Friend');
      if (BOARDS[msg.size]) settings.size = +msg.size;
      syncSeg(el.sizeSeg, 'size', String(settings.size));
      online.ready = true;
      send({ t: 'hi', name: settings.name, re: wasReconnect });
      showChat();
      if (wasReconnect) {
        addChat('sys', 'Reconnected');
        toast('Reconnected!');
        note('Reconnected — game on!');
      } else {
        addChat('sys', 'Connected with ' + friendName());
        toast('Connected with ' + friendName() + '!');
        note('Connected! You are O — ' + friendName() + ' plays X.');
        sfx('join');
      }
      restoreState(msg);
    } else if (msg.t === 'hi') {      /* host: guest introduced themselves */
      online.peerName = cleanName(msg.name, 'Friend');
      if (msg.re) {
        note(friendName() + ' is back — game on!');
        addChat('sys', friendName() + ' reconnected');
        toast(friendName() + ' reconnected!');
        statusForTurn();
      } else {
        note(friendName() + ' joined! You are X — you start.');
        addChat('sys', friendName() + ' joined');
        toast(friendName() + ' joined the game!');
        sfx('join');
      }
      renderScores();
    } else if (msg.t === 'sizeReq') {  /* host proposes a board change */
      if (online.role !== 'guest' || !BOARDS[msg.size]) return;
      var n = +msg.size;
      confirmThen('Change the board to ' + n + '×' + n + '?',
        friendName() + ' wants to switch the board to ' + n + '×' + n + '. Scores are kept.',
        function () {
          send({ t: 'sizeOk' });
          applySize(n);
        }, 'Accept', function () {
          send({ t: 'sizeNo' });
        });
    } else if (msg.t === 'sizeOk') {
      if (!pendingOut.size) return;
      var n2 = pendingOut.size;
      pendingOut.size = null;
      toast(friendName() + ' accepted — board is now ' + n2 + '×' + n2 + '.');
      applySize(n2);
    } else if (msg.t === 'sizeNo') {
      if (!pendingOut.size) return;
      pendingOut.size = null;
      toast(friendName() + ' declined the board change.');
    } else if (msg.t === 'move') {
      var i = msg.i | 0;
      if (over || !online.ready) return;
      if (turn === myOnlineMark()) return;          /* only on their turn */
      if (i < 0 || i >= board.length || board[i]) return;
      place(i);
    } else if (msg.t === 'restartReq') {
      if (pendingOut.restart) {       /* both asked — just agree */
        pendingOut.restart = false;
        send({ t: 'restartOk' });
        newRound();
        return;
      }
      confirmThen('New round?', friendName() + ' wants to start a new round.', function () {
        send({ t: 'restartOk' });
        newRound();
      }, 'Accept', function () {
        send({ t: 'restartNo' });
      });
    } else if (msg.t === 'restartOk') {
      if (!pendingOut.restart) return;
      pendingOut.restart = false;
      toast(friendName() + ' accepted — new round!');
      newRound();
    } else if (msg.t === 'restartNo') {
      if (!pendingOut.restart) return;
      pendingOut.restart = false;
      toast(friendName() + ' declined the new round.');
    } else if (msg.t === 'resetReq') {
      if (pendingOut.reset) {
        pendingOut.reset = false;
        send({ t: 'resetOk' });
        doReset();
        return;
      }
      confirmThen('Reset scores?', friendName() + ' wants to reset all scores to zero.', function () {
        send({ t: 'resetOk' });
        doReset();
      }, 'Accept', function () {
        send({ t: 'resetNo' });
      });
    } else if (msg.t === 'resetOk') {
      if (!pendingOut.reset) return;
      pendingOut.reset = false;
      toast(friendName() + ' accepted — scores reset.');
      doReset();
    } else if (msg.t === 'resetNo') {
      if (!pendingOut.reset) return;
      pendingOut.reset = false;
      toast(friendName() + ' declined the score reset.');
    } else if (msg.t === 'full') {    /* we were the third wheel */
      online.rejected = true;
      var who = Array.isArray(msg.players)
        ? msg.players.map(function (n) { return cleanName(n, 'Player'); }).join(' & ')
        : 'Two players';
      note('This game is full — ' + who + ' are already playing. Ask for a new key or start your own game.');
      setStatus('Game is full', '');
      toast('Game is full — ' + who + ' are already playing');
    } else if (msg.t === 'bye') {     /* opponent left deliberately */
      online.byed = true;
      if (online.conn) { try { online.conn.close(); } catch (e) {} }
    } else if (msg.t === 'chat') {
      if (!online.ready || typeof msg.v !== 'string') return;
      var text = msg.v.trim().slice(0, 120);
      if (text) {
        addChat('them', text);
        toast(friendName() + ': ' + (text.length > 60 ? text.slice(0, 60) + '…' : text));
        sfx('msg');
      }
    }
  }

  /* ----- chat ----- */
  var EMOJI_ONLY = null;
  try { EMOJI_ONLY = new RegExp('^[\\p{Extended_Pictographic}\\u200D\\uFE0F]{1,6}$', 'u'); } catch (e) { /* old browser */ }

  function addChat(who, text) {
    var div = document.createElement('div');
    div.className = 'chat-msg ' + who;                 /* 'me' | 'them' | 'sys' */
    var isEmoji = who !== 'sys' && EMOJI_ONLY && EMOJI_ONLY.test(text);
    if (who === 'them' && !isEmoji) {
      var nm = document.createElement('span');
      nm.className = 'chat-who';
      nm.textContent = friendName();
      div.appendChild(nm);
    }
    div.appendChild(document.createTextNode(text));    /* text node only — never HTML */
    if (isEmoji) div.classList.add('big');
    el.chatLog.appendChild(div);
    while (el.chatLog.children.length > 50) el.chatLog.removeChild(el.chatLog.firstChild);
    el.chatLog.scrollTop = el.chatLog.scrollHeight;
  }
  function sendChat(text) {
    text = String(text).trim().slice(0, 120);
    if (!text || !online.ready) return;
    send({ t: 'chat', v: text });
    addChat('me', text);
  }
  function showChat() {
    el.chat.classList.remove('hidden');
  }
  function hideChat() {
    el.chat.classList.add('hidden');
    el.chatLog.innerHTML = '';
    el.chatInput.value = '';
  }

  el.chatForm.addEventListener('submit', function (e) {
    e.preventDefault();
    sendChat(el.chatInput.value);
    el.chatInput.value = '';
    el.chatInput.focus();
  });
  function bindSayButtons(wrap) {
    wrap.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (btn && btn.dataset.say) sendChat(btn.dataset.say);
    });
  }
  bindSayButtons(el.chatQuick);
  bindSayButtons(el.chatEmoji);

  /* ----- join a friend's game by typing their key ----- */
  function joinByKey() {
    var k = el.joinInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    if (k.length < 4) {
      note('Enter the 6-character game key your friend shared.');
      el.joinInput.focus();
      return;
    }
    if (online.role === 'host' && k === online.key) {
      note("That's your own game key — send it to a friend instead!");
      return;
    }
    el.joinInput.value = '';
    if (online.ready) {
      confirmThen('Leave the current game?',
        'You are playing with ' + friendName() + '. Joining another game ends this one.',
        function () {
          send({ t: 'bye' });
          startOnline('guest', k);
        }, 'Join new game');
      return;
    }
    startOnline('guest', k);
  }
  el.joinBtn.addEventListener('click', joinByKey);
  el.joinInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); joinByKey(); }
  });

  el.copyLink.addEventListener('click', function () {
    var url = inviteUrl();
    var done = function () {
      el.copyLink.textContent = 'Copied!';
      setTimeout(function () { el.copyLink.textContent = 'Copy invite link'; }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () { window.prompt('Copy this link:', url); });
    } else {
      window.prompt('Copy this link:', url);
    }
  });

  var cells = [];
  var GX = '<svg class="ghost gx" viewBox="0 0 100 100" aria-hidden="true"><path d="M26 26 74 74"></path><path d="M74 26 26 74"></path></svg>';
  var GO = '<svg class="ghost go" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="26"></circle></svg>';

  function buildBoard() {
    N = +settings.size;
    K = BOARDS[N];
    var S = N * 100;

    el.board.style.gridTemplateColumns = 'repeat(' + N + ', 1fr)';
    el.board.style.gridTemplateRows = 'repeat(' + N + ', 1fr)';
    el.board.innerHTML = '';
    cells = [];
    for (var i = 0; i < N * N; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cell';
      b.setAttribute('role', 'gridcell');
      b.dataset.i = i;
      b.innerHTML = GX + GO;
      b.addEventListener('click', onCell);
      el.board.appendChild(b);
      cells.push(b);
    }

    el.hash.setAttribute('viewBox', '0 0 ' + S + ' ' + S);
    el.strike.setAttribute('viewBox', '0 0 ' + S + ' ' + S);
    el.hash.innerHTML = '';
    for (var g = 1; g < N; g++) {
      var v = document.createElementNS(SVG_NS, 'line');
      v.setAttribute('x1', g * 100); v.setAttribute('y1', 10);
      v.setAttribute('x2', g * 100); v.setAttribute('y2', S - 10);
      v.setAttribute('pathLength', '1');
      v.style.animationDelay = (0.15 + (g - 1) * 0.24 / N) + 's';
      el.hash.appendChild(v);
      var h = document.createElementNS(SVG_NS, 'line');
      h.setAttribute('x1', 10); h.setAttribute('y1', g * 100);
      h.setAttribute('x2', S - 10); h.setAttribute('y2', g * 100);
      h.setAttribute('pathLength', '1');
      h.style.animationDelay = (0.15 + 0.24 / 2 + (g - 1) * 0.24 / N) + 's';
      el.hash.appendChild(h);
    }

    el.arena.classList.toggle('large', N >= 7 && N < 15);
    el.arena.classList.toggle('huge', N >= 15);
    el.tagline.textContent = NEED_WORD[K] + ' in a row wins the round.';
  }

  el.board.addEventListener('keydown', function (e) {
    var idx = cells.indexOf(document.activeElement);
    if (idx < 0) return;
    var next = -1;
    if (e.key === 'ArrowRight') next = idx % N < N - 1 ? idx + 1 : idx - (N - 1);
    else if (e.key === 'ArrowLeft') next = idx % N > 0 ? idx - 1 : idx + (N - 1);
    else if (e.key === 'ArrowDown') next = (idx + N) % (N * N);
    else if (e.key === 'ArrowUp') next = (idx + N * N - N) % (N * N);
    if (next >= 0) { e.preventDefault(); cells[next].focus(); }
  });

  function humanMark() { return settings.mode === 'cpu' && settings.order === 'cpu' ? 'o' : 'x'; }
  function cpuMark() { return humanMark() === 'x' ? 'o' : 'x'; }
  function other(m) { return m === 'x' ? 'o' : 'x'; }

  function playerName(mark) {
    if (settings.mode === 'pvp') return mark.toUpperCase();
    if (settings.mode === 'online') return mark === myOnlineMark() ? 'You' : friendName();
    return mark === humanMark() ? 'You' : 'Computer';
  }

  function findWin(b) {
    for (var r = 0; r < N; r++) {
      for (var c = 0; c < N; c++) {
        var m = b[r * N + c];
        if (!m) continue;
        for (var d = 0; d < DIRS.length; d++) {
          var dc = DIRS[d][0], dr = DIRS[d][1];
          var pr = r - dr, pc = c - dc;
          if (pr >= 0 && pr < N && pc >= 0 && pc < N && b[pr * N + pc] === m) continue; /* not the start of the run */
          var line = [], rr = r, cc = c;
          while (rr >= 0 && rr < N && cc >= 0 && cc < N && b[rr * N + cc] === m) {
            line.push(rr * N + cc);
            rr += dr; cc += dc;
          }
          if (line.length >= K) return { mark: m, line: line };
        }
      }
    }
    return null;
  }
  function emptyCells(b) {
    var out = [];
    for (var j = 0; j < b.length; j++) if (!b[j]) out.push(j);
    return out;
  }

  /* ----- minimax with depth preference (win fast, lose slow) — 3x3 only ----- */
  function score(b, me, depth, alpha, beta, turnMark) {
    var w = findWin(b);
    if (w) return w.mark === me ? 10 - depth : depth - 10;
    var empties = emptyCells(b);
    if (!empties.length) return 0;
    var best = turnMark === me ? -Infinity : Infinity;
    for (var j = 0; j < empties.length; j++) {
      var idx = empties[j];
      b[idx] = turnMark;
      var s = score(b, me, depth + 1, alpha, beta, other(turnMark));
      b[idx] = null;
      if (turnMark === me) {
        if (s > best) best = s;
        if (best > alpha) alpha = best;
      } else {
        if (s < best) best = s;
        if (best < beta) beta = best;
      }
      if (alpha >= beta) break;
    }
    return best;
  }
  function bestMove(b, me) {
    var empties = emptyCells(b);
    var best = -Infinity, picks = [];
    for (var j = 0; j < empties.length; j++) {
      var idx = empties[j];
      b[idx] = me;
      var s = score(b, me, 1, -Infinity, Infinity, other(me));
      b[idx] = null;
      if (s > best) { best = s; picks = [idx]; }
      else if (s === best) picks.push(idx);
    }
    return picks[Math.floor(Math.random() * picks.length)];
  }
  /* would placing `mark` at i win? — checks only the 4 lines through i */
  function winsAt(b, i, mark) {
    var r0 = (i / N) | 0, c0 = i % N;
    for (var d = 0; d < DIRS.length; d++) {
      var dc = DIRS[d][0], dr = DIRS[d][1], cnt = 1;
      var r = r0 + dr, c = c0 + dc;
      while (r >= 0 && r < N && c >= 0 && c < N && b[r * N + c] === mark) { cnt++; r += dr; c += dc; }
      r = r0 - dr; c = c0 - dc;
      while (r >= 0 && r < N && c >= 0 && c < N && b[r * N + c] === mark) { cnt++; r -= dr; c -= dc; }
      if (cnt >= K) return true;
    }
    return false;
  }
  function immediateWin(b, mark) {
    var empties = emptyCells(b);
    for (var j = 0; j < empties.length; j++) {
      if (winsAt(b, empties[j], mark)) return empties[j];
    }
    return -1;
  }
  /* a move that leaves `mark` with two or more winning replies is unstoppable */
  function findDoubleThreat(b, mark) {
    var empties = emptyCells(b);
    for (var j = 0; j < empties.length; j++) {
      var i = empties[j];
      b[i] = mark;
      var threats = 0;
      for (var k = 0; k < empties.length && threats < 2; k++) {
        var e = empties[k];
        if (e !== i && winsAt(b, e, mark)) threats++;
      }
      b[i] = null;
      if (threats >= 2) return i;
    }
    return -1;
  }

  /* ----- heuristic for big boards: rate every K-window through a cell ----- */
  function cellValue(b, i, mark) {
    var r0 = Math.floor(i / N), c0 = i % N, total = 0;
    for (var d = 0; d < DIRS.length; d++) {
      var dc = DIRS[d][0], dr = DIRS[d][1];
      for (var off = 1 - K; off <= 0; off++) {
        var cnt = 0, open = true;
        for (var t = 0; t < K; t++) {
          var rr = r0 + (off + t) * dr, cc = c0 + (off + t) * dc;
          if (rr < 0 || rr >= N || cc < 0 || cc >= N) { open = false; break; }
          var v = b[rr * N + cc];
          if (v === mark) cnt++;
          else if (v) { open = false; break; }
        }
        if (open) total += Math.pow(5, cnt);
      }
    }
    return total;
  }
  function heuristicMove() {
    var me = cpuMark(), opp = humanMark();
    var best = -Infinity, picks = [];
    var mid = (N - 1) / 2;
    for (var i = 0; i < board.length; i++) {
      if (board[i]) continue;
      var s = cellValue(board, i, me) + cellValue(board, i, opp) * 0.9;
      s += (N - Math.abs(Math.floor(i / N) - mid) - Math.abs(i % N - mid)) * 0.01;
      if (s > best + 1e-9) { best = s; picks = [i]; }
      else if (s > best - 1e-9) picks.push(i);
    }
    return picks[Math.floor(Math.random() * picks.length)];
  }

  function pickCpuMove() {
    var empties = emptyCells(board);
    if (settings.diff === 'easy') {
      return empties[Math.floor(Math.random() * empties.length)];
    }
    var win = immediateWin(board, cpuMark());
    if (win >= 0) return win;
    var block = immediateWin(board, humanMark());
    if (block >= 0) return block;
    if (settings.diff === 'tricky') {
      return empties[Math.floor(Math.random() * empties.length)];
    }
    /* perfect: exact search on 3x3; on bigger boards, threat search + heuristic */
    if (N === 3) return bestMove(board.slice(), cpuMark());
    var myFork = findDoubleThreat(board, cpuMark());
    if (myFork >= 0) return myFork;
    var theirFork = findDoubleThreat(board, humanMark());
    if (theirFork >= 0) return theirFork;
    return heuristicMove();
  }

  /* ----- rendering ----- */
  function drawMark(i, mark) {
    var span = document.createElement('span');
    span.className = 'mark m' + mark;
    span.innerHTML = mark === 'x'
      ? '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M26 26 74 74" pathLength="1"></path><path d="M74 26 26 74" pathLength="1"></path></svg>'
      : '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="26" pathLength="1" transform="rotate(-90 50 50)"></circle></svg>';
    span.style.transform = 'rotate(' + (Math.random() * 6 - 3).toFixed(1) + 'deg)';
    cells[i].appendChild(span);
    cells[i].classList.add('filled');
    cells[i].setAttribute('aria-label', cellLabel(i));
  }
  function cellLabel(i) {
    var pos = 'row ' + (Math.floor(i / N) + 1) + ', column ' + (i % N + 1);
    return board[i] ? board[i].toUpperCase() + ', ' + pos : 'Empty, ' + pos;
  }
  function setStatus(text, cls) {
    el.statusText.textContent = text;
    el.status.className = 'status' + (cls ? ' ' + cls : '');
  }
  function renderScores() {
    el.scoreX.textContent = scores.x;
    el.scoreO.textContent = scores.o;
    el.scoreD.textContent = scores.d;
    if (settings.mode === 'pvp') {
      el.lblX.textContent = 'Player X';
      el.lblO.textContent = 'Player O';
    } else if (settings.mode === 'online') {
      var me = settings.name || 'You';
      el.lblX.textContent = (online.role === 'host' ? me : friendName()) + ' · X';
      el.lblO.textContent = (online.role === 'host' ? friendName() : me) + ' · O';
    } else {
      el.lblX.textContent = (humanMark() === 'x' ? (settings.name || 'You') : 'Computer') + ' · X';
      el.lblO.textContent = (humanMark() === 'o' ? (settings.name || 'You') : 'Computer') + ' · O';
    }
  }
  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ settings: settings, scores: scores }));
    } catch (e) { /* ignore */ }
  }
  function statusForTurn() {
    if (settings.mode === 'online') {
      if (!online.ready) {
        setStatus(online.role === 'guest' ? 'Connecting…' : 'Waiting for a friend…', '');
        return;
      }
      setStatus(turn === myOnlineMark() ? 'Your move' : friendName() + ' is thinking…',
        turn === myOnlineMark() ? 'turn-' + turn : 'turn-' + turn + ' thinking');
      return;
    }
    if (settings.mode === 'cpu') {
      setStatus(turn === humanMark() ? 'Your move' : 'Computer is thinking…',
        turn === humanMark() ? 'turn-' + turn : 'turn-' + turn + ' thinking');
    } else {
      setStatus(turn.toUpperCase() + ' to move', 'turn-' + turn);
    }
  }

  /* ----- game flow ----- */
  function newRound() {
    if (cpuTimer) { clearTimeout(cpuTimer); cpuTimer = null; }
    board = new Array(N * N).fill(null);
    turn = settings.mode === 'cpu' ? 'x' : starter; /* cpu mode: order picker decides via marks */
    over = false;
    lastCell = -1;
    el.rematchBtn.classList.add('hidden');
    el.strike.classList.remove('show', 'win-x', 'win-o');
    el.strikeLine.setAttribute('x1', 0); el.strikeLine.setAttribute('y1', 0);
    el.strikeLine.setAttribute('x2', 0); el.strikeLine.setAttribute('y2', 0);
    for (var j = 0; j < cells.length; j++) {
      cells[j].classList.remove('filled', 'dim', 'hit', 'last');
      var m = cells[j].querySelector('.mark');
      if (m) m.remove();
      cells[j].setAttribute('aria-label', cellLabel(j));
    }
    el.arena.classList.remove('locked', 'turn-o', 'turn-x');
    el.arena.classList.add('turn-' + turn);
    renderScores();
    statusForTurn();
    if (settings.mode === 'cpu' && turn === cpuMark()) scheduleCpu();
  }

  function onCell(e) {
    var i = +e.currentTarget.dataset.i;
    if (over || board[i]) return;
    if (settings.mode === 'cpu' && turn !== humanMark()) return;
    if (settings.mode === 'online') {
      if (!online.ready || turn !== myOnlineMark()) return;
      send({ t: 'move', i: i });
    }
    place(i);
  }

  function place(i) {
    board[i] = turn;
    drawMark(i, turn);
    sfx(turn === 'x' ? 'placeX' : 'placeO');
    if (lastCell >= 0 && cells[lastCell]) cells[lastCell].classList.remove('last');
    cells[i].classList.add('last');
    lastCell = i;
    var w = findWin(board);
    if (w) return endRound(w);
    if (!emptyCells(board).length) return endRound(null);
    turn = other(turn);
    el.arena.classList.remove('turn-x', 'turn-o');
    el.arena.classList.add('turn-' + turn);
    statusForTurn();
    if (settings.mode === 'cpu' && turn === cpuMark()) scheduleCpu();
  }

  function scheduleCpu() {
    el.arena.classList.add('locked');
    cpuTimer = setTimeout(function () {
      cpuTimer = null;
      el.arena.classList.remove('locked');
      if (!over) place(pickCpuMove());
    }, 500);
  }

  function endRound(win) {
    starter = win ? other(win.mark) : other(starter); /* loser starts next; draws swap — both peers run this in step */
    if (win) scores[win.mark] += 1; else scores.d += 1;
    finishRound(win);
    renderScores();
    persist();
    if (settings.mode !== 'online' || online.ready) el.rematchBtn.classList.remove('hidden');
    if (win) {
      var name = playerName(win.mark);
      sfx(name === 'You' || settings.mode === 'pvp' ? 'win' : 'lose');
    } else {
      sfx('draw');
    }
  }

  /* display-only round ending — also used when restoring a finished round */
  function finishRound(win) {
    over = true;
    el.arena.classList.add('locked');
    if (win) {
      var c = centers(win.line);
      el.strikeLine.setAttribute('x1', c.x1); el.strikeLine.setAttribute('y1', c.y1);
      el.strikeLine.setAttribute('x2', c.x2); el.strikeLine.setAttribute('y2', c.y2);
      el.strike.classList.add('show', 'win-' + win.mark);
      for (var j = 0; j < cells.length; j++) {
        if (win.line.indexOf(j) >= 0) cells[j].classList.add('hit');
        else if (board[j]) cells[j].classList.add('dim');
      }
      var name = playerName(win.mark);
      setStatus(name === 'You' ? 'You win the round!' :
        (name === 'Computer' ? 'Computer takes the round.' : name + ' wins the round!'),
        'turn-' + win.mark);
    } else {
      setStatus('A draw. Nobody blinked.', '');
    }
  }

  function centers(line) {
    var cx = function (i) { return 50 + (i % N) * 100; };
    var cy = function (i) { return 50 + Math.floor(i / N) * 100; };
    var a = line[0], b = line[line.length - 1];
    var x1 = cx(a), y1 = cy(a), x2 = cx(b), y2 = cy(b);
    var dx = x2 - x1, dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy);
    var ex = dx / len * 28, ey = dy / len * 28;
    return { x1: x1 - ex, y1: y1 - ey, x2: x2 + ex, y2: y2 + ey };
  }

  /* ----- controls ----- */
  function bindSeg(seg, attr, onPick) {
    seg.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      var val = btn.dataset[attr];
      seg.querySelectorAll('button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      onPick(val);
    });
  }
  function syncSeg(seg, attr, val) {
    seg.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset[attr] === val));
    });
  }

  function switchMode(v) {
    settings.mode = v;
    scores = { x: 0, o: 0, d: 0 };
    starter = Math.random() < 0.5 ? 'x' : 'o'; /* fresh opponent, fresh coin toss */
    el.diffSeg.classList.toggle('hidden', v !== 'cpu');
    el.orderSeg.classList.toggle('hidden', v !== 'cpu');
    if (v === 'online') {
      persist();
      startOnline('host');
      newRound();
    } else {
      teardownOnline();
      persist();
      newRound();
    }
  }
  bindSeg(el.modeSeg, 'mode', function (v) {
    if (v === settings.mode) return;
    if (settings.mode === 'online' && online.ready) {
      confirmThen('Leave the online game?',
        'You are playing with ' + friendName() + '. Leaving ends the game for both of you.',
        function () {
          send({ t: 'bye' });
          switchMode(v);
        }, 'Leave game', function () {
          syncSeg(el.modeSeg, 'mode', settings.mode); /* stay */
        });
      return;
    }
    switchMode(v);
  });
  function applySize(n) {
    settings.size = n;               /* scores are kept across board changes */
    persist();
    buildBoard();
    newRound();
    syncSeg(el.sizeSeg, 'size', String(n));
  }
  bindSeg(el.sizeSeg, 'size', function (v) {
    if (+v === +settings.size) return;
    if (settings.mode === 'online' && online.role === 'guest') {
      syncSeg(el.sizeSeg, 'size', String(settings.size)); /* host picks the board */
      note('Only the host can change the board size.');
      return;
    }
    if (settings.mode === 'online' && online.ready) {
      syncSeg(el.sizeSeg, 'size', String(settings.size)); /* stays put until friend accepts */
      if (pendingOut.size) return;
      pendingOut.size = +v;
      send({ t: 'sizeReq', size: +v });
      toast('Asked ' + friendName() + ' to switch to ' + v + '×' + v + '…');
      return;
    }
    applySize(+v);
  });
  bindSeg(el.diffSeg, 'diff', function (v) {
    if (v === settings.diff) return;
    settings.diff = v;
    persist();
    newRound();
  });
  bindSeg(el.orderSeg, 'order', function (v) {
    if (v === settings.order) return;
    settings.order = v;
    persist();
    newRound();
  });

  function requestNewRound() {
    if (settings.mode === 'online') {
      if (!online.ready || pendingOut.restart) return;
      pendingOut.restart = true;
      send({ t: 'restartReq' });
      toast('Asked ' + friendName() + ' to start a new round…');
      return;
    }
    if (!over && board.some(Boolean)) {
      confirmThen('Start a new round?', 'The current round will be abandoned.', newRound, 'New round');
    } else {
      newRound();
    }
  }
  document.getElementById('newRound').addEventListener('click', requestNewRound);
  el.rematchBtn.addEventListener('click', requestNewRound);
  document.getElementById('resetAll').addEventListener('click', function () {
    if (settings.mode === 'online') {
      if (!online.ready || pendingOut.reset) return;
      pendingOut.reset = true;
      send({ t: 'resetReq' });
      toast('Asked ' + friendName() + ' to reset the scores…');
      return;
    }
    confirmThen('Reset all scores?', 'X, O and draw counts go back to zero.', function () {
      scores = { x: 0, o: 0, d: 0 };
      persist();
      renderScores();
    }, 'Reset');
  });

  /* ----- boot ----- */
  var joinKey = null;
  try {
    var q = new URLSearchParams(location.search).get('join');
    if (q) joinKey = q.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || null;
  } catch (e) { /* ancient browser */ }

  if (joinKey) {
    settings.mode = 'online';
  } else if (settings.mode === 'online') {
    settings.mode = 'pvp'; /* an old key is useless after reload */
  }

  syncSeg(el.modeSeg, 'mode', settings.mode);
  syncSeg(el.sizeSeg, 'size', String(settings.size));
  syncSeg(el.diffSeg, 'diff', settings.diff);
  syncSeg(el.orderSeg, 'order', settings.order);
  el.diffSeg.classList.toggle('hidden', settings.mode !== 'cpu');
  el.orderSeg.classList.toggle('hidden', settings.mode !== 'cpu');
  window.addEventListener('beforeunload', function (e) {
    if (settings.mode === 'online' && online.ready) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  renderSoundBtn();
  applyTheme();
  buildBoard();
  newRound();
  askName(function () {
    if (joinKey) startOnline('guest', joinKey);
  });
})();
