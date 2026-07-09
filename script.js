(function () {
  'use strict';

  var STORE_KEY = 'ttt-v2';
  var SVG_NS = 'http://www.w3.org/2000/svg';

  /* board size -> marks in a row needed to win */
  var BOARDS = { 3: 3, 5: 4, 7: 5, 10: 5 };
  var NEED_WORD = { 3: 'Three', 4: 'Four', 5: 'Five' };
  var DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]]; /* [dc, dr] */

  var settings = { mode: 'pvp', diff: 'tricky', order: 'human', size: 3 };
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
    orderSeg: document.getElementById('orderSeg')
  };

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

    el.arena.classList.toggle('large', N >= 7);
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
  function immediateWin(b, mark) {
    var empties = emptyCells(b);
    for (var j = 0; j < empties.length; j++) {
      b[empties[j]] = mark;
      var won = !!findWin(b);
      b[empties[j]] = null;
      if (won) return empties[j];
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
    /* perfect: exact search on 3x3, strong heuristic on bigger boards */
    if (N === 3) return bestMove(board.slice(), cpuMark());
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
    } else {
      el.lblX.textContent = (humanMark() === 'x' ? 'You' : 'Computer') + ' · X';
      el.lblO.textContent = (humanMark() === 'o' ? 'You' : 'Computer') + ' · O';
    }
  }
  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ settings: settings, scores: scores }));
    } catch (e) { /* ignore */ }
  }
  function statusForTurn() {
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
    turn = 'x';
    over = false;
    el.strike.classList.remove('show', 'win-x', 'win-o');
    el.strikeLine.setAttribute('x1', 0); el.strikeLine.setAttribute('y1', 0);
    el.strikeLine.setAttribute('x2', 0); el.strikeLine.setAttribute('y2', 0);
    for (var j = 0; j < cells.length; j++) {
      cells[j].classList.remove('filled', 'dim', 'hit');
      var m = cells[j].querySelector('.mark');
      if (m) m.remove();
      cells[j].setAttribute('aria-label', cellLabel(j));
    }
    el.arena.classList.remove('locked', 'turn-o');
    el.arena.classList.add('turn-x');
    renderScores();
    statusForTurn();
    if (settings.mode === 'cpu' && turn === cpuMark()) scheduleCpu();
  }

  function onCell(e) {
    var i = +e.currentTarget.dataset.i;
    if (over || board[i]) return;
    if (settings.mode === 'cpu' && turn !== humanMark()) return;
    place(i);
  }

  function place(i) {
    board[i] = turn;
    drawMark(i, turn);
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
    over = true;
    el.arena.classList.add('locked');
    if (win) {
      scores[win.mark] += 1;
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
      scores.d += 1;
      setStatus('A draw. Nobody blinked.', '');
    }
    renderScores();
    persist();
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

  bindSeg(el.modeSeg, 'mode', function (v) {
    if (v === settings.mode) return;
    settings.mode = v;
    scores = { x: 0, o: 0, d: 0 };
    el.diffSeg.classList.toggle('hidden', v !== 'cpu');
    el.orderSeg.classList.toggle('hidden', v !== 'cpu');
    persist();
    newRound();
  });
  bindSeg(el.sizeSeg, 'size', function (v) {
    if (+v === +settings.size) return;
    settings.size = +v;
    scores = { x: 0, o: 0, d: 0 };
    persist();
    buildBoard();
    newRound();
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

  document.getElementById('newRound').addEventListener('click', newRound);
  document.getElementById('resetAll').addEventListener('click', function () {
    scores = { x: 0, o: 0, d: 0 };
    persist();
    newRound();
  });

  /* ----- boot ----- */
  syncSeg(el.modeSeg, 'mode', settings.mode);
  syncSeg(el.sizeSeg, 'size', String(settings.size));
  syncSeg(el.diffSeg, 'diff', settings.diff);
  syncSeg(el.orderSeg, 'order', settings.order);
  el.diffSeg.classList.toggle('hidden', settings.mode !== 'cpu');
  el.orderSeg.classList.toggle('hidden', settings.mode !== 'cpu');
  buildBoard();
  newRound();
})();
