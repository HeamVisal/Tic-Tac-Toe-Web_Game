(function () {
  'use strict';

  var STORE_KEY = 'ttt-v2';
  var SVG_NS = 'http://www.w3.org/2000/svg';

  /* board size -> marks in a row needed to win */
  var BOARDS = { 3: 3, 5: 4, 7: 5, 10: 5, 15: 5, 20: 5 };
  var DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]]; /* [dc, dr] */

  var settings = { mode: 'pvp', diff: 'tricky', order: 'human', size: 3, name: '', muted: false, theme: '', lang: 'en', timer: 0 };
  var scores = { x: 0, o: 0, d: 0 };
  try {
    var saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    if (saved.settings) settings = Object.assign(settings, saved.settings);
    if (saved.scores) scores = Object.assign(scores, saved.scores);
  } catch (e) { /* private mode etc. */ }
  if (!BOARDS[settings.size]) settings.size = 3;
  if ([0, 15, 30, 60].indexOf(+settings.timer) < 0) settings.timer = 0;

  /* ----- i18n ----- */
  var LANG = {
    en: {
      you: 'You', computer: 'Computer', friend: 'Friend',
      ok: 'OK', cancel: 'Cancel', accept: 'Accept', yes: 'Yes',
      modePvp: 'Two players', modeCpu: 'Vs computer', modeOnline: 'Online friend',
      diffEasy: 'Easy', diffTricky: 'Tricky', diffPerfect: 'Perfect',
      orderYou: 'You start', orderCpu: 'Computer starts', timerOff: 'No timer',
      gameKeyLbl: 'Game key', copyLink: 'Copy invite link', copied: 'Copied!',
      haveKeyLbl: 'Have a key?', joinBtn: 'Join',
      playAgain: 'Play again', newRoundBtn: 'New round', undoBtn: 'Undo', resetBtn: 'Reset scores',
      playerX: 'Player X', playerO: 'Player O', draws: 'Draws',
      tagline: '{n} in a row wins the round.', num3: 'Three', num4: 'Four', num5: 'Five',
      toMove: '{mark} to move', yourMove: 'Your move', thinking: '{name} is thinking…', cpuThinking: 'Computer is thinking…',
      youWin: 'You win the round!', cpuWins: 'Computer takes the round.', nameWins: '{name} wins the round!',
      draw: 'A draw. Nobody blinked.',
      timeUpYou: "Time's up — you win the round!", timeUpName: "Time's up — {name} wins the round!",
      askedTimer: 'Asked {name} for a {s}-second move timer…', askedTimerOff: 'Asked {name} to turn the move timer off…',
      wantsTimerTitle: 'Change the move timer?', wantsTimer: '{name} wants a {s}-second move timer.',
      wantsTimerOff: '{name} wants to turn the move timer off.',
      acceptedTimer: '{name} accepted — {s}s per move.', acceptedTimerOff: '{name} accepted — timer off.',
      declinedTimer: '{name} declined the timer change.',
      onlyHostTimer: 'Only the host can set the move timer.',
      waitingStatus: 'Waiting for a friend…', connectingStatus: 'Connecting…',
      creating: 'Creating game…', joiningGame: 'Joining game…', waitingNote: 'Waiting for a friend to join…',
      nameTitle: 'What should we call you?', nameText: 'Shown to your opponent in online games.', namePlay: "Let's play",
      newRoundTitle: 'Start a new round?', newRoundText: 'The current round will be abandoned.',
      resetTitle: 'Reset all scores?', resetText: 'X, O and draw counts go back to zero.', resetOk: 'Reset',
      leaveTitle: 'Leave the online game?', leaveText: 'You are playing with {name}. Leaving ends the game for both of you.', leaveOk: 'Leave game',
      joinLeaveText: 'You are playing with {name}. Joining another game ends this one.', joinLeaveOk: 'Join new game',
      wantsRestartTitle: 'New round?', wantsRestart: '{name} wants to start a new round.',
      askedRestart: 'Asked {name} to start a new round…', acceptedRestart: '{name} accepted — new round!', declinedRestart: '{name} declined the new round.',
      wantsResetTitle: 'Reset scores?', wantsReset: '{name} wants to reset all scores to zero.',
      askedReset: 'Asked {name} to reset the scores…', acceptedReset: '{name} accepted — scores reset.', declinedReset: '{name} declined the score reset.',
      wantsSizeTitle: 'Change the board to {s}×{s}?', wantsSize: '{name} wants to switch the board to {s}×{s}. Scores are kept.',
      askedSize: 'Asked {name} to switch to {s}×{s}…', acceptedSize: '{name} accepted — board is now {s}×{s}.', declinedSize: '{name} declined the board change.',
      onlyHostSize: 'Only the host can change the board size.',
      connectedNote: 'Connected! You are O — {name} plays X.', connectedSys: 'Connected with {name}', connectedToast: 'Connected with {name}!',
      joinedNote: '{name} joined! You play X.', joinedSys: '{name} joined', joinedToast: '{name} joined the game!',
      friendJoinedNote: 'Friend joined! You play X.',
      backNote: '{name} is back — game on!', backSys: '{name} reconnected', backToast: '{name} reconnected!',
      reconnNote: 'Reconnected — game on!', reconnSys: 'Reconnected', reconnToast: 'Reconnected!', restoringNote: 'Reconnected — restoring the game…',
      connSetupNote: 'Connected — setting up the board…',
      connLost: 'Connection lost',
      hostWaitNote: 'Connection lost — waiting for {name} to rejoin…', hostWaitToast: 'Connection lost — waiting for {name} to rejoin',
      reconnTryNote: 'Connection lost — reconnecting… (try {a} of 10)',
      reconnFailNote: 'Could not reconnect. Ask {name} for a fresh invite link.', disconnectedStatus: 'Disconnected',
      leftHostNote: '{name} left the game. Share the key to play again.', leftNote: '{name} left the game.',
      leftStatus: '{name} left', leftSys: '{name} left the game', leftToast: '{name} left the game',
      fullNote: 'This game is full — {who} are already playing. Ask for a new key or start your own game.',
      fullStatus: 'Game is full', fullToast: 'Game is full — {who} are already playing',
      noGameNote: 'No game found for that key. Ask your friend for a fresh link.',
      serverNote: 'Could not reach the matchmaking server. Check your internet and reload.',
      errNote: 'Connection error ({e}). Reload and try again.',
      libNote: 'Could not load the connection library. Check your internet and reload.',
      copyPrompt: 'Copy this link:',
      enterKeyNote: 'Enter the 6-character game key your friend shared.',
      ownKeyNote: "That's your own game key — send it to a friend instead!",
      chatPh: 'Say something…',
      rehostBtn: 'Start a new game',
      quick: ['Haha! 😂', "You're too slow 🐢", 'Noob 🤡', 'Nice move 👏', 'Lucky! 🍀', 'GG 🤝', 'Rematch? 🔁'],
      footTitle: 'How to play', privacyTitle: 'Your privacy',
      foot3: 'Playing online is easy: choose <strong>Online friend</strong>, then share your 6-character game key or the invite link. Your friend types the key (or opens the link) and the game starts instantly — with built-in chat, emoji taunts, an optional move timer, and automatic reconnection if the connection hiccups. If a round ends, hit <strong>Play again</strong> — the loser starts the next round.',
      foot4: 'No account, no tracking, no personal data collected. Your nickname and scores are stored only in your own browser. Online games connect the two browsers directly to each other (peer-to-peer), so moves and chat messages travel straight between you and your friend — they are never stored on any server.',
      foot1: 'Tic-tac-toe goes by many names — the XO game, XOX or OXO, the OOO game, Xs and Os, or noughts and crosses. It is a classic strategy game for two players, X and O, who take turns marking a square on the grid. The first player to line up enough marks in a row — horizontally, vertically or diagonally — wins the round. On the big boards it plays like Gomoku: five in a row wins.',
      foot2: 'Pick your challenge: the classic <strong>3×3</strong> board needs three in a row, <strong>5×5</strong> needs four, and the bigger boards — <strong>7×7</strong>, <strong>10×10</strong>, <strong>15×15</strong> and <strong>20×20</strong> — need five in a row. Play against a friend on the same device, invite an online friend with a shared link, or face the computer on easy, tricky or perfect difficulty. Scores are saved in your browser between visits. Free to play, no ads, no sign-up.'
    },
    km: {
      you: 'អ្នក', computer: 'កុំព្យូទ័រ', friend: 'មិត្ត',
      ok: 'យល់ព្រម', cancel: 'បោះបង់', accept: 'ទទួលយក', yes: 'យល់ព្រម',
      modePvp: 'អ្នកលេងពីរនាក់', modeCpu: 'ជាមួយកុំព្យូទ័រ', modeOnline: 'មិត្តអនឡាញ',
      diffEasy: 'ងាយ', diffTricky: 'ល្បិច', diffPerfect: 'ឥតខ្ចោះ',
      orderYou: 'អ្នកចាប់ផ្តើម', orderCpu: 'កុំព្យូទ័រចាប់ផ្តើម', timerOff: 'គ្មានម៉ោង',
      gameKeyLbl: 'លេខកូដហ្គេម', copyLink: 'ចម្លងតំណអញ្ជើញ', copied: 'បានចម្លង!',
      haveKeyLbl: 'មានលេខកូដ?', joinBtn: 'ចូលរួម',
      playAgain: 'លេងម្តងទៀត', newRoundBtn: 'ជុំថ្មី', undoBtn: 'ដើរថយក្រោយ', resetBtn: 'លុបពិន្ទុ',
      playerX: 'អ្នកលេង X', playerO: 'អ្នកលេង O', draws: 'ស្មើ',
      tagline: 'តម្រៀប {n} ក្នុងជួរ ដើម្បីឈ្នះ។', num3: '៣', num4: '៤', num5: '៥',
      toMove: 'វេន {mark}', yourMove: 'វេនរបស់អ្នក', thinking: '{name} កំពុងគិត…', cpuThinking: 'កុំព្យូទ័រកំពុងគិត…',
      youWin: 'អ្នកឈ្នះជុំនេះ!', cpuWins: 'កុំព្យូទ័រឈ្នះជុំនេះ។', nameWins: '{name} ឈ្នះជុំនេះ!',
      draw: 'ស្មើគ្នា!',
      timeUpYou: 'អស់ម៉ោង — អ្នកឈ្នះជុំនេះ!', timeUpName: 'អស់ម៉ោង — {name} ឈ្នះជុំនេះ!',
      askedTimer: 'បានស្នើ {name} កំណត់ម៉ោងដើរ {s} វិនាទី…', askedTimerOff: 'បានស្នើ {name} បិទម៉ោងដើរ…',
      wantsTimerTitle: 'ប្តូរម៉ោងដើរ?', wantsTimer: '{name} ចង់កំណត់ម៉ោងដើរ {s} វិនាទី។',
      wantsTimerOff: '{name} ចង់បិទម៉ោងដើរ។',
      acceptedTimer: '{name} យល់ព្រម — {s} វិនាទីក្នុងមួយដើរ។', acceptedTimerOff: '{name} យល់ព្រម — បិទម៉ោង។',
      declinedTimer: '{name} បដិសេធការប្តូរម៉ោង។',
      onlyHostTimer: 'មានតែម្ចាស់ហ្គេមទេដែលអាចកំណត់ម៉ោង។',
      waitingStatus: 'កំពុងរង់ចាំមិត្ត…', connectingStatus: 'កំពុងតភ្ជាប់…',
      creating: 'កំពុងបង្កើតហ្គេម…', joiningGame: 'កំពុងចូលរួម…', waitingNote: 'កំពុងរង់ចាំមិត្តចូលរួម…',
      nameTitle: 'តើឱ្យយើងហៅអ្នកថាអ្វី?', nameText: 'នឹងបង្ហាញដល់គូប្រកួតក្នុងហ្គេមអនឡាញ។', namePlay: 'ចាប់ផ្តើមលេង',
      newRoundTitle: 'ចាប់ផ្តើមជុំថ្មី?', newRoundText: 'ជុំបច្ចុប្បន្ននឹងត្រូវបោះបង់។',
      resetTitle: 'លុបពិន្ទុទាំងអស់?', resetText: 'ពិន្ទុ X, O និងស្មើ នឹងត្រឡប់ទៅសូន្យ។', resetOk: 'លុបពិន្ទុ',
      leaveTitle: 'ចាកចេញពីហ្គេមអនឡាញ?', leaveText: 'អ្នកកំពុងលេងជាមួយ {name}។ ការចាកចេញនឹងបញ្ចប់ហ្គេមទាំងសងខាង។', leaveOk: 'ចាកចេញ',
      joinLeaveText: 'អ្នកកំពុងលេងជាមួយ {name}។ ការចូលហ្គេមថ្មីនឹងបញ្ចប់ហ្គេមនេះ។', joinLeaveOk: 'ចូលហ្គេមថ្មី',
      wantsRestartTitle: 'ជុំថ្មី?', wantsRestart: '{name} ចង់ចាប់ផ្តើមជុំថ្មី។',
      askedRestart: 'បានស្នើ {name} ចាប់ផ្តើមជុំថ្មី…', acceptedRestart: '{name} យល់ព្រម — ជុំថ្មី!', declinedRestart: '{name} បដិសេធជុំថ្មី។',
      wantsResetTitle: 'លុបពិន្ទុ?', wantsReset: '{name} ចង់លុបពិន្ទុទាំងអស់។',
      askedReset: 'បានស្នើ {name} លុបពិន្ទុ…', acceptedReset: '{name} យល់ព្រម — ពិន្ទុត្រូវបានលុប។', declinedReset: '{name} បដិសេធការលុបពិន្ទុ។',
      wantsSizeTitle: 'ប្តូរក្តារទៅ {s}×{s}?', wantsSize: '{name} ចង់ប្តូរក្តារទៅ {s}×{s}។ ពិន្ទុនៅដដែល។',
      askedSize: 'បានស្នើ {name} ប្តូរទៅ {s}×{s}…', acceptedSize: '{name} យល់ព្រម — ក្តារ {s}×{s} ហើយ!', declinedSize: '{name} បដិសេធការប្តូរក្តារ។',
      onlyHostSize: 'មានតែម្ចាស់ហ្គេមទេដែលអាចប្តូរទំហំក្តារ។',
      connectedNote: 'បានតភ្ជាប់! អ្នកគឺ O — {name} លេង X។', connectedSys: 'បានតភ្ជាប់ជាមួយ {name}', connectedToast: 'បានតភ្ជាប់ជាមួយ {name}!',
      joinedNote: '{name} បានចូលរួម! អ្នកលេង X។', joinedSys: '{name} បានចូលរួម', joinedToast: '{name} បានចូលហ្គេម!',
      friendJoinedNote: 'មិត្តបានចូលរួម! អ្នកលេង X។',
      backNote: '{name} ត្រឡប់មកវិញ — លេងបន្ត!', backSys: '{name} បានតភ្ជាប់ឡើងវិញ', backToast: '{name} បានត្រឡប់មកវិញ!',
      reconnNote: 'តភ្ជាប់ឡើងវិញ — លេងបន្ត!', reconnSys: 'បានតភ្ជាប់ឡើងវិញ', reconnToast: 'បានតភ្ជាប់ឡើងវិញ!', restoringNote: 'តភ្ជាប់ឡើងវិញ — កំពុងស្តារហ្គេម…',
      connSetupNote: 'បានតភ្ជាប់ — កំពុងរៀបចំក្តារ…',
      connLost: 'ការតភ្ជាប់បានដាច់',
      hostWaitNote: 'ការតភ្ជាប់ដាច់ — កំពុងរង់ចាំ {name} ចូលវិញ…', hostWaitToast: 'ការតភ្ជាប់ដាច់ — រង់ចាំ {name} ចូលវិញ',
      reconnTryNote: 'ការតភ្ជាប់ដាច់ — កំពុងព្យាយាមម្តងទៀត… ({a}/10)',
      reconnFailNote: 'មិនអាចតភ្ជាប់វិញបានទេ។ សុំតំណថ្មីពី {name}។', disconnectedStatus: 'បានដាច់',
      leftHostNote: '{name} បានចាកចេញ។ ចែករំលែកលេខកូដដើម្បីលេងម្តងទៀត។', leftNote: '{name} បានចាកចេញ។',
      leftStatus: '{name} បានចាកចេញ', leftSys: '{name} បានចាកចេញ', leftToast: '{name} បានចាកចេញ',
      fullNote: 'ហ្គេមនេះពេញហើយ — {who} កំពុងលេង។ សុំលេខកូដថ្មី ឬបង្កើតហ្គេមផ្ទាល់ខ្លួន។',
      fullStatus: 'ហ្គេមពេញហើយ', fullToast: 'ហ្គេមពេញ — {who} កំពុងលេង',
      noGameNote: 'រកមិនឃើញហ្គេមសម្រាប់លេខកូដនេះទេ។ សុំតំណថ្មីពីមិត្ត។',
      serverNote: 'មិនអាចភ្ជាប់ទៅម៉ាស៊ីនមេបានទេ។ ពិនិត្យអ៊ីនធឺណិត រួចផ្ទុកឡើងវិញ។',
      errNote: 'បញ្ហាការតភ្ជាប់ ({e})។ ផ្ទុកទំព័រឡើងវិញ។',
      libNote: 'មិនអាចផ្ទុកបណ្ណាល័យតភ្ជាប់បានទេ។ ពិនិត្យអ៊ីនធឺណិត រួចផ្ទុកឡើងវិញ។',
      copyPrompt: 'ចម្លងតំណនេះ៖',
      enterKeyNote: 'បញ្ចូលលេខកូដ ៦ តួ ដែលមិត្តរបស់អ្នកចែករំលែក។',
      ownKeyNote: 'នេះជាលេខកូដរបស់អ្នកផ្ទាល់ — ផ្ញើវាទៅមិត្តវិញ!',
      chatPh: 'សរសេរអ្វីមួយ…',
      rehostBtn: 'បង្កើតហ្គេមថ្មី',
      quick: ['ហាហា! 😂', 'អ្នកយឺតណាស់ 🐢', 'ខ្សោយម្លេះ 🤡', 'ដើរស្អាត! 👏', 'សំណាងទេ! 🍀', 'GG 🤝', 'ប្រកួតម្តងទៀត? 🔁'],
      footTitle: 'របៀបលេង', privacyTitle: 'ឯកជនភាពរបស់អ្នក',
      foot3: 'ការលេងអនឡាញងាយណាស់៖ ជ្រើស <strong>មិត្តអនឡាញ</strong> រួចចែករំលែកលេខកូដហ្គេម ៦ តួ ឬតំណអញ្ជើញ។ មិត្តរបស់អ្នកបញ្ចូលលេខកូដ (ឬបើកតំណ) ហើយហ្គេមចាប់ផ្តើមភ្លាមៗ — មានឆាត សញ្ញាអារម្មណ៍ ម៉ោងដើរ និងការតភ្ជាប់ឡើងវិញស្វ័យប្រវត្តិ។ ចប់ជុំហើយ ចុច <strong>លេងម្តងទៀត</strong> — អ្នកចាញ់ចាប់ផ្តើមជុំបន្ទាប់។',
      foot4: 'គ្មានគណនី គ្មានការតាមដាន គ្មានការប្រមូលទិន្នន័យផ្ទាល់ខ្លួន។ ឈ្មោះ និងពិន្ទុរបស់អ្នក រក្សាទុកតែក្នុងកម្មវិធីរុករករបស់អ្នកប៉ុណ្ណោះ។ ហ្គេមអនឡាញ ភ្ជាប់កម្មវិធីរុករកទាំងពីរដោយផ្ទាល់ (peer-to-peer) — ការដើរ និងសារឆាត ទៅដល់មិត្តរបស់អ្នកផ្ទាល់ មិនដែលរក្សាទុកលើម៉ាស៊ីនមេណាមួយឡើយ។',
      foot1: 'ហ្គេម Tic-tac-toe មានឈ្មោះច្រើន — ហ្គេម XO, XOX ឬ OXO, ហ្គេម OOO ឬ noughts and crosses។ ជាហ្គេមយុទ្ធសាស្ត្របុរាណសម្រាប់អ្នកលេងពីរនាក់ X និង O ដែលដាក់សញ្ញាម្តងម្នាក់លើក្តារ។ អ្នកដែលតម្រៀបសញ្ញាគ្រប់ចំនួនក្នុងជួរមុនគេ — ផ្ដេក បញ្ឈរ ឬទ្រេត — ឈ្នះជុំនោះ។ លើក្តារធំ លេងដូច Gomoku៖ ៥ ក្នុងជួរឈ្នះ។',
      foot2: 'ជ្រើសរើសការប្រកួត៖ ក្តារ <strong>3×3</strong> បុរាណត្រូវការ ៣ ក្នុងជួរ, <strong>5×5</strong> ត្រូវការ ៤, ហើយក្តារធំ — <strong>7×7</strong>, <strong>10×10</strong>, <strong>15×15</strong> និង <strong>20×20</strong> — ត្រូវការ ៥ ក្នុងជួរ។ លេងជាមួយមិត្តលើឧបករណ៍តែមួយ អញ្ជើញមិត្តអនឡាញ ឬប្រកួតជាមួយកុំព្យូទ័រ។ ពិន្ទុរក្សាទុកក្នុងកម្មវិធីរុករករបស់អ្នក។ លេងឥតគិតថ្លៃ គ្មានពាណិជ្ជកម្ម គ្មានការចុះឈ្មោះ។'
    }
  };
  if (settings.lang !== 'km') settings.lang = 'en';
  function t(key, vars) {
    var pack = LANG[settings.lang] || LANG.en;
    var s = pack[key] != null ? pack[key] : LANG.en[key];
    if (s == null) return key;
    if (typeof s !== 'string') return s;
    if (vars) for (var k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }

  var N = +settings.size;      /* board is N x N */
  var K = BOARDS[N];           /* K in a row wins */
  var board, turn, over, cpuTimer = null;
  var starter = Math.random() < 0.5 ? 'x' : 'o'; /* random side first; then loser starts, draws swap */
  var lastCell = -1;           /* most recent move, for the highlight */
  var moveLog = [];            /* moves this round, for undo (vs computer) */

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
    lblD: document.getElementById('lblD'),
    undoBtn: document.getElementById('undoBtn'),
    timerSeg: document.getElementById('timerSeg'),
    timerPill: document.getElementById('timerPill'),
    langBtn: document.getElementById('langBtn'),
    themeBtn: document.getElementById('themeBtn'),
    joinInput: document.getElementById('joinInput'),
    joinBtn: document.getElementById('joinBtn'),
    rehostBtn: document.getElementById('rehostBtn')
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

  /* ----- language toggle ----- */
  function applyLang() {
    document.documentElement.lang = settings.lang === 'km' ? 'km' : 'en';
    el.langBtn.textContent = settings.lang === 'km' ? 'EN' : 'ខ្មែរ';
    document.querySelectorAll('[data-i18n]').forEach(function (n) {
      n.textContent = t(n.getAttribute('data-i18n'));
    });
    var quick = t('quick');
    var qb = el.chatQuick.querySelectorAll('button');
    for (var i = 0; i < qb.length && i < quick.length; i++) {
      qb[i].textContent = quick[i];
      qb[i].setAttribute('data-say', quick[i]);
    }
    el.chatInput.placeholder = t('chatPh');
    var ps = document.querySelectorAll('footer.about p');
    if (ps[0]) ps[0].innerHTML = t('foot1');
    if (ps[1]) ps[1].innerHTML = t('foot2');
    if (ps[2]) ps[2].innerHTML = t('foot3');
    if (ps[3]) ps[3].innerHTML = t('foot4');
    el.tagline.textContent = t('tagline', { n: t('num' + K) });
    renderScores();
    if (!over) statusForTurn();
  }
  el.langBtn.addEventListener('click', function () {
    settings.lang = settings.lang === 'km' ? 'en' : 'km';
    persist();
    applyLang();
  });

  /* ----- confetti (canvas, decorative) ----- */
  function confetti() {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      var cv = document.createElement('canvas');
      cv.className = 'confetti';
      cv.width = window.innerWidth;
      cv.height = window.innerHeight;
      document.body.appendChild(cv);
      var ctx = cv.getContext('2d');
      var colors = ['#E5471F', '#1F6FEB', '#FF6A3D', '#5EA0FF', '#F7C948', '#4CC38A'];
      var parts = [];
      for (var i = 0; i < 130; i++) {
        parts.push({
          x: cv.width / 2, y: cv.height * 0.35,
          vx: (Math.random() - 0.5) * 16,
          vy: -Math.random() * 13 - 3,
          s: 5 + Math.random() * 6,
          r: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3,
          c: colors[i % colors.length]
        });
      }
      var t0 = Date.now();
      (function frame() {
        var dt = Date.now() - t0;
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.globalAlpha = Math.max(0, 1 - dt / 1800);
        parts.forEach(function (p) {
          p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.r += p.vr;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.r);
          ctx.fillStyle = p.c;
          ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
          ctx.restore();
        });
        if (dt < 1900) requestAnimationFrame(frame); else cv.remove();
      })();
    } catch (e) { /* decorative only */ }
  }

  /* ----- move timer (online) ----- */
  var timerT = null;
  function stopTurnTimer() {
    if (timerT) { clearInterval(timerT); timerT = null; }
    el.timerPill.classList.add('hidden');
  }
  function startTurnTimer() {
    stopTurnTimer();
    if (settings.mode !== 'online' || !online.ready || over || !(+settings.timer)) return;
    var deadline = Date.now() + settings.timer * 1000;
    var tick = function () {
      var left = Math.ceil((deadline - Date.now()) / 1000);
      if (left <= 0) {
        stopTurnTimer();
        if (turn === myOnlineMark() && online.ready && !over) {
          send({ t: 'timeout' });
          forfeitRound(myOnlineMark());
        }
        return;
      }
      el.timerPill.textContent = left;
      el.timerPill.classList.toggle('urgent', left <= 5);
    };
    el.timerPill.classList.remove('hidden', 'urgent');
    el.timerPill.textContent = settings.timer;
    timerT = setInterval(tick, 250);
  }
  function forfeitRound(loserMark) {
    if (over) return;
    var winnerMark = other(loserMark);
    starter = loserMark;              /* loser starts the next round */
    scores[winnerMark] += 1;
    over = true;
    el.arena.classList.add('locked');
    stopTurnTimer();
    var kind = winnerKind(winnerMark);
    setStatus(kind === 'you' ? t('timeUpYou') : t('timeUpName', { name: playerName(winnerMark) }), 'turn-' + winnerMark);
    renderScores();
    persist();
    if (online.ready) el.rematchBtn.classList.remove('hidden');
    sfx(kind === 'you' ? 'win' : 'lose');
    if (kind === 'you') confetti();
  }

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
    el.modalOk.textContent = o.okText || t('ok');
    el.modalCancel.textContent = o.cancelText || t('cancel');
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
    showModal({ title: title, text: text, okText: okText || t('yes'), cancelText: t('cancel'), onOk: onYes, onCancel: onNo });
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
      title: t('nameTitle'),
      text: t('nameText'),
      input: true,
      value: settings.name || '',
      placeholder: suggested,
      okText: t('namePlay'),
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
  /* explicit ICE servers: PeerJS's bundled turn.peerjs.com relays are dead (verified
     2026-07 — zero relay candidates), so name working STUN ourselves. Players behind
     symmetric NAT / strict firewalls still need a TURN entry here (urls + username +
     credential from e.g. a free metered.ca account) to connect. */
  var PEER_CONF = {
    config: {
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
        { urls: 'stun:stun.cloudflare.com:3478' }
      ]
    }
  };
  var online = { peer: null, conn: null, role: null, key: null, ready: false, peerName: null,
    byed: false, reconnecting: false, reconnT: null, rejected: false };
  var pendingOut = { restart: false, reset: false, size: null, timer: null };

  function friendName() { return online.peerName || t('friend'); }
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
    s.onerror = function () { note(t('libNote')); };
    document.head.appendChild(s);
  }

  function startOnline(role, key) {
    teardownOnline();
    online.role = role;
    online.key = key || genKey();
    el.rehostBtn.classList.add('hidden');
    el.onlinePanel.classList.remove('hidden');
    el.gameKey.textContent = online.key;
    note(role === 'host' ? t('creating') : t('joiningGame'));
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
      over: over,
      timer: settings.timer
    };
  }

  function hostGame() {
    online.peer = new Peer('ttt-' + online.key, PEER_CONF);
    online.peer.on('open', function () {
      note(t('waitingNote'));
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
          note(t('backNote', { name: friendName() }));
        } else {
          note(t('friendJoinedNote'));
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
    online.peer = new Peer(PEER_CONF);
    online.peer.on('open', function () {
      var c = online.peer.connect('ttt-' + online.key, { reliable: true });
      online.conn = c;
      bindConn(c);
      c.on('open', function () { note(t('connSetupNote')); });
    });
    online.peer.on('disconnected', function () {
      try { online.peer.reconnect(); } catch (e) {}
    });
    online.peer.on('error', peerError);
  }

  function bindConn(c) {
    var iceGraceT = null;
    var gone = function () {
      if (iceGraceT) { clearTimeout(iceGraceT); iceGraceT = null; }
      if (online.conn !== c) return;
      try { c.close(); } catch (e) {}
      online.conn = null;
      online.ready = false;
      pendingOut.restart = pendingOut.reset = false;
      pendingOut.size = null;
      pendingOut.timer = null;
      if (settings.mode !== 'online') return;
      if (online.rejected) return;      /* seat was taken — the 'full' note stays up */
      stopTurnTimer();
      if (online.byed) {                /* deliberate leave — no reconnect */
        note(t(online.role === 'host' ? 'leftHostNote' : 'leftNote', { name: friendName() }));
        setStatus(t('leftStatus', { name: friendName() }), '');
        addChat('sys', t('leftSys', { name: friendName() }));
        toast(t('leftToast', { name: friendName() }));
        if (online.role === 'guest') el.rehostBtn.classList.remove('hidden'); /* their key is dead — offer a fresh game */
        return;
      }
      /* connection dropped — try to recover */
      addChat('sys', t('connLost'));
      setStatus(t('connLost'), '');
      if (online.role === 'host') {
        note(t('hostWaitNote', { name: friendName() }));
        toast(t('hostWaitToast', { name: friendName() }));
      } else {
        online.reconnecting = true;
        tryReconnect(1);
      }
    };
    c.on('data', onMessage);
    c.on('close', gone);
    /* 'close' alone misses abrupt exits (tab killed, network drop) — watch ICE too.
       'disconnected' is often a transient blip that recovers on its own, so give it
       a grace window; only 'failed'/'closed' are terminal right away. */
    c.on('iceStateChanged', function (state) {
      if (state === 'failed' || state === 'closed') { gone(); return; }
      if (state === 'disconnected') {
        if (!iceGraceT) iceGraceT = setTimeout(gone, 4000);
      } else if (state === 'connected' || state === 'completed') {
        if (iceGraceT) { clearTimeout(iceGraceT); iceGraceT = null; }
      }
    });
  }

  function tryReconnect(attempt) {
    if (settings.mode !== 'online' || online.conn || !online.peer || online.peer.destroyed) return;
    if (online.peer.disconnected) { try { online.peer.reconnect(); } catch (e) {} }
    if (attempt > 10) {
      online.reconnecting = false;
      note(t('reconnFailNote', { name: friendName() }));
      setStatus(t('disconnectedStatus'), '');
      el.rehostBtn.classList.remove('hidden');
      return;
    }
    note(t('reconnTryNote', { a: attempt }));
    var c = online.peer.connect('ttt-' + online.key, { reliable: true });
    var opened = false;
    c.on('open', function () {
      opened = true;
      online.conn = c;
      online.byed = false;
      bindConn(c);
      note(t('restoringNote'));
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
      note(t('noGameNote'));
    } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') {
      note(t('serverNote'));
    } else {
      note(t('errNote', { e: err.type }));
    }
  }

  function teardownOnline() {
    stopTurnTimer();
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
    pendingOut.timer = null;
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
    settings.timer = [0, 15, 30, 60].indexOf(+msg.timer) >= 0 ? +msg.timer : 0;
    syncSeg(el.timerSeg, 'timer', String(settings.timer));
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
        addChat('sys', t('reconnSys'));
        toast(t('reconnToast'));
        note(t('reconnNote'));
      } else {
        addChat('sys', t('connectedSys', { name: friendName() }));
        toast(t('connectedToast', { name: friendName() }));
        note(t('connectedNote', { name: friendName() }));
        sfx('join');
      }
      restoreState(msg);
    } else if (msg.t === 'hi') {      /* host: guest introduced themselves */
      online.peerName = cleanName(msg.name, 'Friend');
      if (msg.re) {
        note(t('backNote', { name: friendName() }));
        addChat('sys', t('backSys', { name: friendName() }));
        toast(t('backToast', { name: friendName() }));
        statusForTurn();
      } else {
        note(t('joinedNote', { name: friendName() }));
        addChat('sys', t('joinedSys', { name: friendName() }));
        toast(t('joinedToast', { name: friendName() }));
        sfx('join');
      }
      renderScores();
    } else if (msg.t === 'sizeReq') {  /* host proposes a board change */
      if (online.role !== 'guest' || !BOARDS[msg.size]) return;
      var n = +msg.size;
      confirmThen(t('wantsSizeTitle', { s: n }),
        t('wantsSize', { name: friendName(), s: n }),
        function () {
          send({ t: 'sizeOk' });
          applySize(n);
        }, t('accept'), function () {
          send({ t: 'sizeNo' });
        });
    } else if (msg.t === 'sizeOk') {
      if (!pendingOut.size) return;
      var n2 = pendingOut.size;
      pendingOut.size = null;
      toast(t('acceptedSize', { name: friendName(), s: n2 }));
      applySize(n2);
    } else if (msg.t === 'sizeNo') {
      if (!pendingOut.size) return;
      pendingOut.size = null;
      toast(t('declinedSize', { name: friendName() }));
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
      confirmThen(t('wantsRestartTitle'), t('wantsRestart', { name: friendName() }), function () {
        send({ t: 'restartOk' });
        newRound();
      }, t('accept'), function () {
        send({ t: 'restartNo' });
      });
    } else if (msg.t === 'restartOk') {
      if (!pendingOut.restart) return;
      pendingOut.restart = false;
      toast(t('acceptedRestart', { name: friendName() }));
      newRound();
    } else if (msg.t === 'restartNo') {
      if (!pendingOut.restart) return;
      pendingOut.restart = false;
      toast(t('declinedRestart', { name: friendName() }));
    } else if (msg.t === 'resetReq') {
      if (pendingOut.reset) {
        pendingOut.reset = false;
        send({ t: 'resetOk' });
        doReset();
        return;
      }
      confirmThen(t('wantsResetTitle'), t('wantsReset', { name: friendName() }), function () {
        send({ t: 'resetOk' });
        doReset();
      }, t('accept'), function () {
        send({ t: 'resetNo' });
      });
    } else if (msg.t === 'resetOk') {
      if (!pendingOut.reset) return;
      pendingOut.reset = false;
      toast(t('acceptedReset', { name: friendName() }));
      doReset();
    } else if (msg.t === 'resetNo') {
      if (!pendingOut.reset) return;
      pendingOut.reset = false;
      toast(t('declinedReset', { name: friendName() }));
    } else if (msg.t === 'full') {    /* we were the third wheel */
      online.rejected = true;
      var who = Array.isArray(msg.players)
        ? msg.players.map(function (n) { return cleanName(n, 'Player'); }).join(' & ')
        : 'Two players';
      note(t('fullNote', { who: who }));
      setStatus(t('fullStatus'), '');
      toast(t('fullToast', { who: who }));
      el.rehostBtn.classList.remove('hidden');
    } else if (msg.t === 'timerReq') { /* host proposes a timer change */
      if (online.role !== 'guest' || [0, 15, 30, 60].indexOf(+msg.secs) < 0) return;
      var secs = +msg.secs;
      confirmThen(t('wantsTimerTitle'),
        secs ? t('wantsTimer', { name: friendName(), s: secs }) : t('wantsTimerOff', { name: friendName() }),
        function () {
          send({ t: 'timerOk' });
          settings.timer = secs;
          syncSeg(el.timerSeg, 'timer', String(secs));
          startTurnTimer();
        }, t('accept'), function () {
          send({ t: 'timerNo' });
        });
    } else if (msg.t === 'timerOk') {
      if (pendingOut.timer === null) return;
      settings.timer = pendingOut.timer;
      pendingOut.timer = null;
      persist();
      syncSeg(el.timerSeg, 'timer', String(settings.timer));
      toast(settings.timer
        ? t('acceptedTimer', { name: friendName(), s: settings.timer })
        : t('acceptedTimerOff', { name: friendName() }));
      startTurnTimer();
    } else if (msg.t === 'timerNo') {
      if (pendingOut.timer === null) return;
      pendingOut.timer = null;
      toast(t('declinedTimer', { name: friendName() }));
    } else if (msg.t === 'timeout') { /* the player to move ran out of time */
      if (turn === myOnlineMark() || !online.ready) return;
      forfeitRound(other(myOnlineMark()));
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
      note(t('enterKeyNote'));
      el.joinInput.focus();
      return;
    }
    if (online.role === 'host' && k === online.key) {
      note(t('ownKeyNote'));
      return;
    }
    el.joinInput.value = '';
    if (online.ready) {
      confirmThen(t('leaveTitle'),
        t('joinLeaveText', { name: friendName() }),
        function () {
          send({ t: 'bye' });
          startOnline('guest', k);
        }, t('joinLeaveOk'));
      return;
    }
    startOnline('guest', k);
  }
  el.rehostBtn.addEventListener('click', function () {
    scores = { x: 0, o: 0, d: 0 };
    starter = Math.random() < 0.5 ? 'x' : 'o';
    startOnline('host');
    newRound();
  });
  el.joinBtn.addEventListener('click', joinByKey);
  el.joinInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); joinByKey(); }
  });

  el.copyLink.addEventListener('click', function () {
    var url = inviteUrl();
    var done = function () {
      el.copyLink.textContent = t('copied');
      setTimeout(function () { el.copyLink.textContent = t('copyLink'); }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () { window.prompt(t('copyPrompt'), url); });
    } else {
      window.prompt(t('copyPrompt'), url);
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
    el.tagline.textContent = t('tagline', { n: t('num' + K) });
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
    if (settings.mode === 'online') return mark === myOnlineMark() ? t('you') : friendName();
    return mark === humanMark() ? t('you') : t('computer');
  }
  /* who is this mark from my point of view: 'you' | 'cpu' | 'other' */
  function winnerKind(mark) {
    if (settings.mode === 'online') return mark === myOnlineMark() ? 'you' : 'other';
    if (settings.mode === 'cpu') return mark === humanMark() ? 'you' : 'cpu';
    return 'other';
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
      el.lblX.textContent = t('playerX');
      el.lblO.textContent = t('playerO');
    } else if (settings.mode === 'online') {
      var me = settings.name || t('you');
      el.lblX.textContent = (online.role === 'host' ? me : friendName()) + ' · X';
      el.lblO.textContent = (online.role === 'host' ? friendName() : me) + ' · O';
    } else {
      el.lblX.textContent = (humanMark() === 'x' ? (settings.name || t('you')) : t('computer')) + ' · X';
      el.lblO.textContent = (humanMark() === 'o' ? (settings.name || t('you')) : t('computer')) + ' · O';
    }
    el.lblD.textContent = t('draws');
  }
  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ settings: settings, scores: scores }));
    } catch (e) { /* ignore */ }
  }
  function statusForTurn() {
    startTurnTimer();
    if (settings.mode === 'online') {
      if (!online.ready) {
        setStatus(online.role === 'guest' ? t('connectingStatus') : t('waitingStatus'), '');
        return;
      }
      setStatus(turn === myOnlineMark() ? t('yourMove') : t('thinking', { name: friendName() }),
        turn === myOnlineMark() ? 'turn-' + turn : 'turn-' + turn + ' thinking');
      return;
    }
    if (settings.mode === 'cpu') {
      setStatus(turn === humanMark() ? t('yourMove') : t('cpuThinking'),
        turn === humanMark() ? 'turn-' + turn : 'turn-' + turn + ' thinking');
    } else {
      setStatus(t('toMove', { mark: turn.toUpperCase() }), 'turn-' + turn);
    }
  }

  /* ----- game flow ----- */
  function newRound() {
    if (cpuTimer) { clearTimeout(cpuTimer); cpuTimer = null; }
    board = new Array(N * N).fill(null);
    turn = settings.mode === 'cpu' ? 'x' : starter; /* cpu mode: order picker decides via marks */
    over = false;
    lastCell = -1;
    moveLog = [];
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
    moveLog.push({ i: i, mark: turn });
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
    stopTurnTimer();
    if (win) {
      var kind = winnerKind(win.mark);
      sfx(kind === 'you' || settings.mode === 'pvp' ? 'win' : 'lose');
      if (kind === 'you' || settings.mode === 'pvp') confetti();
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
      var kind = winnerKind(win.mark);
      setStatus(kind === 'you' ? t('youWin') :
        (kind === 'cpu' ? t('cpuWins') : t('nameWins', { name: playerName(win.mark) })),
        'turn-' + win.mark);
    } else {
      setStatus(t('draw'), '');
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
    el.undoBtn.classList.toggle('hidden', v !== 'cpu');
    el.timerSeg.classList.toggle('hidden', v !== 'online');
    stopTurnTimer();
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
      confirmThen(t('leaveTitle'),
        t('leaveText', { name: friendName() }),
        function () {
          send({ t: 'bye' });
          switchMode(v);
        }, t('leaveOk'), function () {
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
      note(t('onlyHostSize'));
      return;
    }
    if (settings.mode === 'online' && online.ready) {
      syncSeg(el.sizeSeg, 'size', String(settings.size)); /* stays put until friend accepts */
      if (pendingOut.size) return;
      pendingOut.size = +v;
      send({ t: 'sizeReq', size: +v });
      toast(t('askedSize', { name: friendName(), s: v }));
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
      toast(t('askedRestart', { name: friendName() }));
      return;
    }
    if (!over && board.some(Boolean)) {
      confirmThen(t('newRoundTitle'), t('newRoundText'), newRound, t('newRoundBtn'));
    } else {
      newRound();
    }
  }
  bindSeg(el.timerSeg, 'timer', function (v) {
    if (+v === +settings.timer) return;
    if (settings.mode === 'online' && online.role === 'guest') {
      syncSeg(el.timerSeg, 'timer', String(settings.timer));
      note(t('onlyHostTimer'));
      return;
    }
    if (settings.mode === 'online' && online.ready) {
      syncSeg(el.timerSeg, 'timer', String(settings.timer)); /* stays put until friend accepts */
      if (pendingOut.timer !== null) return;
      pendingOut.timer = +v;
      send({ t: 'timerReq', secs: +v });
      toast(+v ? t('askedTimer', { name: friendName(), s: +v }) : t('askedTimerOff', { name: friendName() }));
      return;
    }
    settings.timer = +v;
    persist();
    startTurnTimer();
  });

  /* ----- undo (vs computer) ----- */
  function undoOne() {
    var m = moveLog.pop();
    board[m.i] = null;
    var mk = cells[m.i].querySelector('.mark');
    if (mk) mk.remove();
    cells[m.i].classList.remove('filled', 'last');
    cells[m.i].setAttribute('aria-label', cellLabel(m.i));
  }
  el.undoBtn.addEventListener('click', function () {
    if (settings.mode !== 'cpu' || over || !moveLog.length) return;
    if (cpuTimer) { clearTimeout(cpuTimer); cpuTimer = null; el.arena.classList.remove('locked'); }
    if (moveLog.length && moveLog[moveLog.length - 1].mark === cpuMark()) undoOne();
    if (moveLog.length && moveLog[moveLog.length - 1].mark === humanMark()) undoOne();
    lastCell = moveLog.length ? moveLog[moveLog.length - 1].i : -1;
    if (lastCell >= 0) cells[lastCell].classList.add('last');
    turn = humanMark();
    el.arena.classList.remove('turn-x', 'turn-o');
    el.arena.classList.add('turn-' + turn);
    statusForTurn();
  });

  document.getElementById('newRound').addEventListener('click', requestNewRound);
  el.rematchBtn.addEventListener('click', requestNewRound);
  document.getElementById('resetAll').addEventListener('click', function () {
    if (settings.mode === 'online') {
      if (!online.ready || pendingOut.reset) return;
      pendingOut.reset = true;
      send({ t: 'resetReq' });
      toast(t('askedReset', { name: friendName() }));
      return;
    }
    confirmThen(t('resetTitle'), t('resetText'), function () {
      scores = { x: 0, o: 0, d: 0 };
      persist();
      renderScores();
    }, t('resetOk'));
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
  syncSeg(el.timerSeg, 'timer', String(settings.timer));
  el.diffSeg.classList.toggle('hidden', settings.mode !== 'cpu');
  el.orderSeg.classList.toggle('hidden', settings.mode !== 'cpu');
  el.undoBtn.classList.toggle('hidden', settings.mode !== 'cpu');
  el.timerSeg.classList.toggle('hidden', settings.mode !== 'online');
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
  applyLang();
  askName(function () {
    if (joinKey) startOnline('guest', joinKey);
  });
})();
