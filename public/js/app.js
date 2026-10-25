import {
  CATEGORIES, DIFFICULTIES, QUESTIONS, JOURNAL, ACHIEVEMENTS,
  getCategory, getDifficulty, pickQuestions, dailyChallenge, dailyVerse, dailyKey,
  dailySeed, mulberry32, scoreAnswer, starsFor, xpForGame, levelInfo, titleForLevel,
  categoryMastery, nextJourneyLevel, journeyUnlocked, achievementProgress,
  dateLabel, shortDate, timeAgo, todayKey, streakDays
} from './engine.js';
import {
  loadProfile, saveProfile, updateProfile, recordGame, resetProfile, setSetting
} from './store.js';
import { icon, avatarMark, avatarOf, AVATARS } from './icons.js';
import {
  $, $$, esc, formatNumber, toast, openModal, closeModal, confirmDialog,
  confetti, copyText, shareContent, scrollTop, plural, progressRing
} from './ui.js';
import {
  playSound, setSoundEnabled, startMusic, stopMusic, vibrate
} from './audio.js';
import { ArenaClient, isOnlineSupported } from './online.js';

const APP = () => document.getElementById('app');
const MODE_LABELS = {
  solo: 'Solo Quest',
  daily: 'Daily Challenge',
  journey: 'Journey',
  bot: 'Rival Match',
  pass: 'Pass & Play',
  online: 'Online Arena'
};
const MODE_ICONS = {
  solo: 'book',
  daily: 'sun',
  journey: 'compass',
  bot: 'robot',
  pass: 'users',
  online: 'swords'
};
const BOT_PROFILES = [
  { name: 'Sparrow', avatar: 'dove', accuracy: 0.7, speed: 0.55 },
  { name: 'Tirzah', avatar: 'harp', accuracy: 0.64, speed: 0.48 },
  { name: 'Boaz', avatar: 'lion', accuracy: 0.58, speed: 0.42 },
  { name: 'Huldah', avatar: 'scroll', accuracy: 0.52, speed: 0.36 }
];
const REACTION_META = {
  amen: { icon: 'dove', label: 'Amen' },
  fire: { icon: 'flame', label: 'Fire' },
  heart: { icon: 'spark', label: 'Love' },
  wow: { icon: 'star', label: 'Wow' },
  pray: { icon: 'book', label: 'Praying' },
  hallelujah: { icon: 'crown', label: 'Hallelujah' }
};

const state = {
  route: { name: 'home', param: '' },
  profile: loadProfile(),
  game: null,
  results: null,
  leaderboard: { scope: 'all', entries: [], loading: false, loaded: false, error: false },
  bankFilter: 'all',
  navOpen: false,
  localTimer: null,
  onlineTimer: null,
  onlineRevealTimer: null,
  lastTick: null,
  online: {
    client: new ArenaClient(),
    status: 'idle',
    onlineCount: 0,
    room: null,
    playerId: null,
    game: null,
    tab: 'create',
    recorded: false,
    joinCode: '',
    names: {},
    wired: false,
    deadline: 0,
    finalRanking: [],
    record: null
  },
  installPrompt: null
};

// ── Utilities ───────────────────────────────────────────────────────────────
function routeTo(name, param = '') {
  const hash = `#/${name}${param ? `/${param}` : ''}`;
  if (location.hash === hash) {
    state.route = parseRoute();
    render();
  } else {
    location.hash = hash;
  }
}

function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, '') || 'home';
  const [name, ...rest] = raw.split('/');
  return { name: name || 'home', param: rest.join('/') };
}

function currentScreen() {
  if (state.route.name === 'play' && state.game) {
    return state.game.phase === 'results' ? renderLocalResults() : renderLocalGame();
  }
  switch (state.route.name) {
    case 'journey': return renderJourney();
    case 'categories': return renderCategories();
    case 'daily': return renderDaily();
    case 'arena': return renderArena();
    case 'profile': return renderProfile();
    case 'leaderboard': return renderLeaderboard();
    case 'play': return renderHome();
    case 'home':
    default: return renderHome();
  }
}

function render() {
  const content = currentScreen();
  const isGame = state.route.name === 'play' && state.game;
  const isOnlineGame = state.route.name === 'arena' && state.online.room && ['question', 'reveal', 'results'].includes(state.online.room.state);
  const showFooter = !isGame && !isOnlineGame;
  APP().innerHTML = `${headerHTML()}<main id="screen">${content}</main>${showFooter ? footerHTML() : ''}`;
  document.title = pageTitle();
  afterRender();
}

function pageTitle() {
  const name = state.route.name;
  if (name === 'play') return `Quiz — Scripture Showdown`;
  if (name === 'journey') return `Journey — Scripture Showdown`;
  if (name === 'categories') return `Categories — Scripture Showdown`;
  if (name === 'daily') return `Daily Challenge — Scripture Showdown`;
  if (name === 'arena') return `Online Arena — Scripture Showdown`;
  if (name === 'profile') return `Your Profile — Scripture Showdown`;
  if (name === 'leaderboard') return `Hall of Fame — Scripture Showdown`;
  return 'Scripture Showdown — Bible Trivia Arena';
}

function headerHTML() {
  const level = levelInfo(state.profile.xp);
  const active = key => state.route.name === key ? 'is-active' : '';
  const nav = [
    ['home', 'Home', 'home'],
    ['journey', 'Journey', 'compass'],
    ['categories', 'Categories', 'grid'],
    ['arena', 'Arena', 'swords'],
    ['leaderboard', 'Hall of Fame', 'trophy']
  ];
  return `
  <header class="site-header">
    <a class="brand" href="#/home" aria-label="Scripture Showdown home">
      <span class="brand__mark">${icon('book', 26)}</span>
      <span class="brand__text"><strong>Scripture</strong><span>Showdown</span></span>
    </a>
    <nav class="site-nav ${state.navOpen ? 'is-open' : ''}" aria-label="Primary">
      ${nav.map(([key, label, iconName]) => `<a class="nav-link ${active(key)}" href="#/${key}">${icon(iconName, 17)}${label}</a>`).join('')}
    </nav>
    <div class="header-actions">
      <button class="icon-btn ${state.profile.settings.sound ? 'is-active' : ''}" data-action="toggle-sound" aria-label="${state.profile.settings.sound ? 'Mute sound' : 'Enable sound'}" title="Sound">
        ${icon(state.profile.settings.sound ? 'volume' : 'mute', 18)}
      </button>
      <button class="icon-btn" data-action="open-settings" aria-label="Settings" title="Settings">${icon('settings', 18)}</button>
      <a class="profile-chip" href="#/profile" aria-label="Your profile">
        ${avatarMark(state.profile.avatar, 'sm')}
        <span class="profile-chip__text"><strong>${esc(state.profile.name)}</strong><span>Level ${level.level} · ${esc(titleForLevel(level.level))}</span></span>
      </a>
      <button class="icon-btn nav-toggle" data-action="toggle-nav" aria-label="Open menu" aria-expanded="${state.navOpen}">${icon('grid', 19)}</button>
    </div>
  </header>`;
}

function footerHTML() {
  return `
  <footer class="site-footer">
    <div>
      <div class="site-footer__verse">“Thy word is a lamp unto my feet, and a light unto my path.” — Psalm 119:105</div>
      <div style="margin-top:8px">Scripture Showdown · ${QUESTIONS.length} questions · KJV public-domain text</div>
    </div>
    <div class="site-footer__links">
      <a href="#/categories">Categories</a>
      <a href="#/leaderboard">Hall of Fame</a>
      <button class="btn btn--small btn--ghost" data-action="open-how">How to play</button>
    </div>
  </footer>`;
}

function afterRender() {
  if (state.route.name === 'play' && state.game && state.game.phase === 'question') {
    syncLocalTimerDisplay();
  }
  if (state.route.name === 'arena' && state.online.game?.phase === 'question') {
    startOnlineTimer();
  } else if (state.route.name === 'arena') {
    stopOnlineTimers();
  }
  if (state.route.name === 'home') {
    hydrateHomeExtras();
  }
  if (state.route.name === 'arena') {
    maybeConnectArena();
  }
  if (state.route.name === 'leaderboard' && !state.leaderboard.loaded && !state.leaderboard.loading) {
    loadLeaderboard(state.leaderboard.scope);
  }
}

// ── Home ────────────────────────────────────────────────────────────────────
function renderHome() {
  const profile = state.profile;
  const level = levelInfo(profile.xp);
  const verse = dailyVerse();
  const done = (profile.dailyDates || []).includes(todayKey());
  const next = nextJourneyLevel(profile);
  const completedLevels = Object.keys(profile.campaign?.stars || {}).length;
  const days = streakDays(profile);
  const featured = CATEGORIES.slice(0, 8);
  const accuracy = profile.questionsAnswered ? Math.round((profile.totalCorrect / profile.questionsAnswered) * 100) : 0;
  const onlineLabel = state.online.onlineCount ? `${state.online.onlineCount} online` : 'Live rooms';
  return `
  <section class="hero">
    <div class="hero__copy">
      <span class="eyebrow"><span class="pulse-dot"></span> ${QUESTIONS.length} questions · ${CATEGORIES.length} categories · ${onlineLabel}</span>
      <h1 class="hero__title">Know the Word.<span>Own the Showdown.</span></h1>
      <p class="hero__lede">From Genesis to Revelation, test what you know, discover what you’ve missed, and trace every answer back to Scripture. Play solo, gather friends, or step into a live arena.</p>
      <div class="hero__actions">
        <button class="btn btn--gold btn--large" data-action="open-setup" data-mode="solo">${icon('play', 18)} Play now</button>
        <a class="btn btn--ghost btn--large" href="#/arena">${icon('swords', 18)} Enter online arena</a>
      </div>
      <div class="hero__meta">
        <div class="hero__stat"><strong>${QUESTIONS.length}</strong><span>Questions</span></div>
        <div class="hero__stat"><strong>${CATEGORIES.length}</strong><span>Categories</span></div>
        <div class="hero__stat"><strong>24</strong><span>Journey levels</span></div>
        <div class="hero__stat"><strong>${accuracy}%</strong><span>Your accuracy</span></div>
      </div>
    </div>
    <div class="hero__art">
      <div class="hero__frame"><img src="/assets/hero.svg" alt="Sunrise over an open Bible with a dove descending" width="900" height="720"></div>
      <div class="hero__float hero__float--streak">
        ${avatarMark(profile.avatar, 'sm')}
        <div><strong>${done ? 'Daily complete' : 'Daily challenge'}${profile.dailyStreak ? ` · ${profile.dailyStreak} day streak` : ''}</strong><span>${dateLabel()}</span></div>
      </div>
      <div class="hero__float hero__float--verse">
        <p>“${esc(verse.text.length > 96 ? `${verse.text.slice(0, 96)}…` : verse.text)}”</p>
        <span>${esc(verse.ref)}</span>
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="modes-title">
    <div class="section-head">
      <div class="section-head__copy">
        <span class="eyebrow eyebrow--muted">Choose your table</span>
        <h2 class="section-title" id="modes-title">Four ways to take the field</h2>
      </div>
      <button class="btn btn--small btn--ghost" data-action="open-how">${icon('compass', 15)} How it works</button>
    </div>
    <div class="mode-grid">
      <button class="mode-card" style="--mode-color:var(--gold)" data-action="open-setup" data-mode="solo">
        <span class="mode-card__icon">${icon('book', 24)}</span>
        <span class="mode-card__meta">Solo quest ${icon('arrow', 13)}</span>
        <h3>Choose your depth</h3>
        <p>Any category, four levels of difficulty, and Scripture revealed after every answer.</p>
      </button>
      <a class="mode-card" style="--mode-color:var(--teal)" href="#/daily">
        <span class="mode-card__icon">${icon('sun', 24)}</span>
        <span class="mode-card__meta">Daily challenge ${icon('arrow', 13)}</span>
        <h3>Ten for today</h3>
        <p>The same ten questions for everyone. Keep the flame alive with a daily streak.</p>
      </a>
      <button class="mode-card" style="--mode-color:var(--rose)" data-action="open-setup" data-mode="pass">
        <span class="mode-card__icon">${icon('users', 24)}</span>
        <span class="mode-card__meta">Pass & play ${icon('arrow', 13)}</span>
        <h3>One device, many minds</h3>
        <p>Gather two to four players, pass the device, and see who knows the Word.</p>
      </button>
      <a class="mode-card" style="--mode-color:var(--violet)" href="#/arena">
        <span class="mode-card__icon">${icon('swords', 24)}</span>
        <span class="mode-card__meta">Online arena <span class="pulse-dot"></span></span>
        <h3>Live, room by room</h3>
        <p>Create a private room, share the code, or quick-match with a rival anywhere.</p>
      </a>
    </div>
  </section>

  <section class="section">
    <div class="home-grid">
      <div class="card continue-card">
        <div class="continue-card__bg"><img src="/assets/categories/${getCategory(next.category).art}.svg" alt="" aria-hidden="true"></div>
        <div>
          <span class="eyebrow">${icon('compass', 14)} Continue the journey</span>
          <div class="continue-card__row" style="margin-top:12px">
            <div class="continue-card__level">${next.level}</div>
            <div style="flex:1">
              <h3>${esc(next.title)}</h3>
              <p class="muted" style="font-size:.82rem">${esc(next.subtitle)} · ${getCategory(next.category).name} · ${getDifficulty(next.difficulty).name}</p>
              <div class="continue-card__bar" style="margin-top:10px"><i style="width:${Math.round((completedLevels / JOURNAL.length) * 100)}%"></i></div>
            </div>
          </div>
        </div>
        <div class="continue-card__chips">
          <span class="chip">${icon('check', 14)} ${completedLevels} of ${JOURNAL.length} levels</span>
          <span class="chip chip--gold">${icon('star', 14)} ${Object.values(profile.campaign?.stars || {}).reduce((a, b) => a + b, 0)} stars</span>
          <span class="chip">${icon('bolt', 14)} ${level.xp} XP</span>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap">
          <button class="btn btn--gold" data-action="start-level" data-level="${next.level}">${icon('play', 16)} Continue level ${next.level}</button>
          <a class="btn btn--ghost" href="#/journey">View the map</a>
        </div>
      </div>
      <div class="home-grid__side">
        <div class="card daily-card ${done ? 'daily-card--done' : ''}">
          <div class="daily-card__head">
            <span class="eyebrow">${icon('sun', 14)} Daily challenge</span>
            <span class="daily-card__streak">${icon('flame', 15)} ${profile.dailyStreak || 0} day${profile.dailyStreak === 1 ? '' : 's'}</span>
          </div>
          <div>
            <h3>${done ? 'Today’s scroll is sealed' : 'Ten questions. One day.'}</h3>
            <p>${done ? 'You have already completed today’s challenge. Practice again freely — your streak is safe.' : 'A fresh set chosen for the whole community. Complete it to keep your streak alive.'}</p>
          </div>
          <div class="daily-card__days">
            ${days.map(day => `<span class="day-dot ${day.done ? 'is-done' : ''} ${day.key === todayKey() ? 'is-today' : ''}" title="${day.key}">${day.label}</span>`).join('')}
          </div>
          <div class="daily-card__actions">
            <a class="btn ${done ? 'btn--ghost' : 'btn--gold'}" href="#/daily">${done ? 'Practice again' : 'Begin today'} ${icon('arrow', 15)}</a>
          </div>
        </div>
        <div class="card verse-card">
          <div class="verse-card__glow"></div>
          <div class="verse-card__quote">“</div>
          <blockquote>${esc(verse.text)}</blockquote>
          <div class="verse-card__ref">${esc(verse.ref)} · KJV</div>
        </div>
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="categories-title">
    <div class="section-head">
      <div class="section-head__copy">
        <span class="eyebrow eyebrow--muted">From Genesis to Revelation</span>
        <h2 class="section-title" id="categories-title">Every corner of the Story</h2>
        <p class="section-sub">Fifteen categories, each with its own artwork, scripture anchor, and mastery path.</p>
      </div>
      <a class="link-arrow" href="#/categories">All ${CATEGORIES.length} categories ${icon('arrow', 16)}</a>
    </div>
    <div class="category-grid">
      ${featured.map(categoryCardHTML).join('')}
    </div>
  </section>

  <section class="section" aria-labelledby="cloud-title">
    <div class="section-head">
      <div class="section-head__copy">
        <span class="eyebrow eyebrow--muted">The great cloud of witnesses</span>
        <h2 class="section-title" id="cloud-title">Hall of Fame</h2>
      </div>
      <a class="link-arrow" href="#/leaderboard">Full leaderboard ${icon('arrow', 16)}</a>
    </div>
    <div class="home-grid">
      <div class="card" style="padding:22px" id="home-board">
        ${leaderboardSkeleton()}
      </div>
      <div class="card" style="padding:22px">
        <div class="section-head" style="margin-bottom:14px"><div><span class="eyebrow eyebrow--muted">Your record</span><h3 class="serif" style="font-size:1.3rem;margin-top:4px">A lamp to your path</h3></div>${avatarMark(profile.avatar, 'md')}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="result-stat"><strong>${formatNumber(profile.bestScore)}</strong><span>Best score</span></div>
          <div class="result-stat"><strong>${profile.bestStreak || 0}</strong><span>Best streak</span></div>
          <div class="result-stat"><strong>${profile.questionsAnswered || 0}</strong><span>Answered</span></div>
          <div class="result-stat"><strong>${profile.gamesPlayed || 0}</strong><span>Quizzes</span></div>
        </div>
        <a class="btn btn--ghost btn--block" style="margin-top:14px" href="#/profile">${icon('user', 16)} Open your profile</a>
      </div>
    </div>
  </section>`;
}

function categoryCardHTML(category) {
  const mastery = categoryMastery(state.profile, category.key);
  return `
  <button class="category-card" style="--cat-color:${category.color}" data-action="open-category" data-cat="${category.key}">
    <span class="category-card__art"><img src="/assets/categories/${category.art}.svg" alt="${esc(category.name)} artwork" loading="lazy" width="640" height="440"></span>
    <span class="category-card__body">
      <span class="category-card__top">
        <h3>${esc(category.name)}</h3>
        <span class="chip" style="padding:4px 8px">${icon(category.icon, 13)}</span>
      </span>
      <p>${esc(category.subtitle)}</p>
      <span class="category-card__footer">
        <span class="category-card__count">${category.count} questions</span>
        <span class="mastery-bar"><i style="width:${Math.round(mastery * 100)}%"></i></span>
      </span>
    </span>
  </button>`;
}

function leaderboardSkeleton() {
  return `<div class="loading"><span class="loading-dots"><i></i><i></i><i></i></span> Gathering the cloud…</div>`;
}

async function hydrateHomeExtras() {
  if (!state.leaderboard.loaded && !state.leaderboard.loading) {
    await loadLeaderboard(state.leaderboard.scope);
  }
  const board = document.getElementById('home-board');
  if (board) board.innerHTML = homeBoardHTML();
}

function homeBoardHTML() {
  if (state.leaderboard.loading) return leaderboardSkeleton();
  if (state.leaderboard.error) {
    return `<div class="empty-state" style="padding:24px"><span>${icon('wifi', 30)}</span><h3>Hall offline</h3><p>Scores on this device are safe. Reconnect to see the community.</p></div>`;
  }
  const entries = state.leaderboard.entries.slice(0, 5);
  if (!entries.length) return `<div class="empty-state" style="padding:24px"><h3>No scores yet</h3><p>Be the first name written in the hall.</p></div>`;
  return `<div class="leaderboard-list">${entries.map((entry, index) => leaderboardRowHTML(entry, index + 1)).join('')}</div>`;
}

// ── Journey ─────────────────────────────────────────────────────────────────
function renderJourney() {
  const completed = Object.keys(state.profile.campaign?.stars || {}).length;
  const totalStars = Object.values(state.profile.campaign?.stars || {}).reduce((a, b) => a + b, 0);
  const current = nextJourneyLevel(state.profile);
  const level = levelInfo(state.profile.xp);
  return `
  <section class="page-head">
    <span class="eyebrow">${icon('compass', 14)} The pilgrim’s map</span>
    <h1>Your Journey through the Word</h1>
    <p>Twenty-four levels from first light to the final crown. Earn a star for every level you finish and unlock the road ahead.</p>
  </section>
  <div class="card journey-banner">
    <div class="journey-banner__glow"></div>
    <div>
      <span class="eyebrow eyebrow--muted">Next waypoint</span>
      <h2 class="serif" style="font-size:clamp(1.6rem,3vw,2.2rem)">${esc(current.title)}</h2>
      <p>${esc(current.subtitle)} · ${getCategory(current.category).name} · ${getDifficulty(current.difficulty).name}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
        <button class="btn btn--gold" data-action="start-level" data-level="${current.level}">${icon('play', 16)} Begin level ${current.level}</button>
        <span class="chip">${icon('star', 14)} ${totalStars} stars earned</span>
        <span class="chip">${icon('bolt', 14)} Level ${level.level} ${titleForLevel(level.level)}</span>
      </div>
    </div>
    <div class="journey-banner__progress">
      <div class="journey-banner__ring">
        ${progressRing(completed / JOURNAL.length, 'var(--gold)', 96, 6)}
        <strong>${Math.round((completed / JOURNAL.length) * 100)}%</strong>
      </div>
    </div>
  </div>
  <div class="journey-map">
    ${JOURNAL.map(levelItem => journeyLevelHTML(levelItem)).join('')}
  </div>`;
}

function journeyLevelHTML(level) {
  const stars = state.profile.campaign?.stars?.[level.level] || 0;
  const unlocked = journeyUnlocked(state.profile, level.level);
  const current = nextJourneyLevel(state.profile).level === level.level;
  const cls = [stars ? 'is-complete' : '', unlocked ? '' : 'is-locked', current ? 'is-current' : ''].filter(Boolean).join(' ');
  const category = getCategory(level.category);
  return `
  <button class="level-card ${cls}" data-action="${unlocked ? 'start-level' : 'locked-level'}" data-level="${level.level}" ${unlocked ? '' : 'aria-disabled="true"'}>
    <span class="level-card__num">${stars ? icon('check', 20) : level.level}</span>
    <span class="level-card__copy">
      <h3>${esc(level.title)}</h3>
      <p>${esc(category.name)} · ${getDifficulty(level.difficulty).name} · ${esc(level.subtitle)}</p>
    </span>
    <span class="level-card__stars" aria-label="${stars} of 3 stars">
      ${[1, 2, 3].map(n => `<span class="${n <= stars ? '' : 'is-empty'}">${icon('star', 14)}</span>`).join('')}
    </span>
    ${unlocked ? '' : `<span class="level-card__lock">${icon('lock', 15)}</span>`}
  </button>`;
}

// ── Categories ──────────────────────────────────────────────────────────────
function renderCategories() {
  const filters = [
    { key: 'all', label: 'All categories' },
    { key: 'Old Testament', label: 'Old Testament' },
    { key: 'New Testament', label: 'New Testament' },
    { key: 'Both Testaments', label: 'Both' }
  ];
  const visible = state.bankFilter === 'all' ? CATEGORIES : CATEGORIES.filter(c => c.testament === state.bankFilter);
  return `
  <section class="page-head">
    <span class="eyebrow">${icon('grid', 14)} All sorts and seasons</span>
    <h1>Choose a corner of the Story</h1>
    <p>Every card opens a quiz tuned to your chosen depth. The mastery bar remembers how you have done in each category.</p>
  </section>
  <div class="category-toolbar">
    ${filters.map(filter => `<button class="filter-btn ${state.bankFilter === filter.key ? 'is-active' : ''}" data-action="category-filter" data-filter="${filter.key}">${filter.label}</button>`).join('')}
    <span class="chip" style="margin-left:auto">${icon('book', 14)} ${QUESTIONS.length} questions in the bank</span>
  </div>
  <div class="category-grid">
    ${visible.map(categoryCardHTML).join('')}
  </div>`;
}

// ── Daily ───────────────────────────────────────────────────────────────────
function renderDaily() {
  const done = (state.profile.dailyDates || []).includes(todayKey());
  const days = streakDays(state.profile);
  const verse = dailyVerse();
  return `
  <section class="page-head">
    <span class="eyebrow">${icon('sun', 14)} ${dateLabel()}</span>
    <h1>${done ? 'Today’s scroll is sealed' : 'Ten questions for today'}</h1>
    <p>${done ? 'You have already run today’s course. You can practice again as often as you like, but your streak only counts once.' : 'The same ten questions are waiting for every player today. Finish them to build your daily streak.'}</p>
  </section>
  <div class="home-grid" style="align-items:stretch">
    <div class="card daily-card ${done ? 'daily-card--done' : ''}" style="padding:clamp(24px,4vw,38px)">
      <div class="daily-card__head">
        <span class="eyebrow">${icon('calendar', 14)} Daily challenge</span>
        <span class="daily-card__streak">${icon('flame', 16)} ${state.profile.dailyStreak || 0} day streak</span>
      </div>
      <div style="display:flex;align-items:center;gap:16px">
        <div class="continue-card__level" style="width:70px;height:70px;font-size:1.6rem">${done ? icon('check', 28) : icon('sun', 30)}</div>
        <div>
          <h3 style="font-size:clamp(1.5rem,3vw,2rem)">${done ? 'Completed with honour' : 'A fresh set, chosen today'}</h3>
          <p>10 questions · Mixed categories · 20 seconds each · No lifelines</p>
        </div>
      </div>
      <div class="daily-card__days">
        ${days.map(day => `<span class="day-dot ${day.done ? 'is-done' : ''} ${day.key === todayKey() ? 'is-today' : ''}" title="${day.key}">${day.label}</span>`).join('')}
      </div>
      <div class="daily-card__actions">
        <button class="btn ${done ? 'btn--ghost' : 'btn--gold btn--large'}" data-action="start-daily">${icon(done ? 'refresh' : 'play', 17)} ${done ? 'Practice again' : 'Begin today’s challenge'}</button>
        <a class="btn btn--small btn--ghost" href="#/leaderboard">Hall of Fame</a>
      </div>
      <p style="font-size:.7rem;color:var(--dim)">${done ? 'Practice runs still count toward your overall stats and XP.' : 'One completion per day counts toward your streak. Replays are always welcome.'}</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card verse-card">
        <div class="verse-card__glow"></div>
        <span class="eyebrow">${icon('book', 14)} Verse for today</span>
        <div class="verse-card__quote" style="margin-top:14px">“</div>
        <blockquote>${esc(verse.text)}</blockquote>
        <div class="verse-card__ref">${esc(verse.ref)} · KJV</div>
      </div>
      <div class="card" style="padding:22px">
        <div class="section-head" style="margin-bottom:12px"><div><span class="eyebrow eyebrow--muted">Keep the flame</span><h3 class="serif" style="font-size:1.3rem;margin-top:4px">Streak record</h3></div>${icon('flame', 28)}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="result-stat"><strong>${state.profile.dailyStreak || 0}</strong><span>Current streak</span></div>
          <div class="result-stat"><strong>${(state.profile.dailyDates || []).length}</strong><span>Days completed</span></div>
        </div>
      </div>
    </div>
  </div>`;
}

// __PART_TWO__

// ── Setup & modals ──────────────────────────────────────────────────────────
function categoryOptions(selected = 'all') {
  return `<option value="all" ${selected === 'all' ? 'selected' : ''}>All Scripture · every category</option>` +
    CATEGORIES.map(c => `<option value="${c.key}" ${selected === c.key ? 'selected' : ''}>${esc(c.name)} · ${c.count} questions</option>`).join('');
}

function difficultyOptions(selected = 2) {
  return DIFFICULTIES.map(d => `<option value="${d.level}" ${Number(selected) === d.level ? 'selected' : ''}>${d.name} — ${d.label}</option>`).join('') +
    `<option value="mixed" ${selected === 'mixed' ? 'selected' : ''}>Mixed — a little of everything</option>`;
}

function setupFormHTML({ mode = 'solo', category = 'all', difficulty = 2, count = 10, timer = 20, opponents = 0, showCategory = true } = {}) {
  const pass = mode === 'pass';
  const playerNames = [
    state.profile.name,
    'Friend 2',
    'Friend 3',
    'Friend 4'
  ];
  return `
  <form id="setup-form" data-mode="${mode}">
    ${pass ? `
    <div class="field">
      <span class="field-label">How many players?</span>
      <div class="segmented" data-setup-group="players">
        ${[2, 3, 4].map(n => `<button type="button" class="${n === 2 ? 'is-active' : ''}" data-action="setup-segment" data-group="players" data-value="${n}">${n} players</button>`).join('')}
      </div>
      <input type="hidden" name="players" value="2">
    </div>
    <div class="setup-players">
      ${playerNames.map((name, i) => `
        <div class="setup-player-row ${i >= 2 ? 'is-hidden' : ''}" data-player-row="${i}">
          ${avatarMark(i === 0 ? state.profile.avatar : AVATARS[(i + 4) % AVATARS.length].id, 'sm')}
          <input class="setup-player-input" name="player${i + 1}" maxlength="18" value="${esc(name)}" aria-label="Player ${i + 1} name" autocomplete="off">
          <span class="setup-player-tag">P${i + 1}</span>
        </div>`).join('')}
    </div>` : ''}
    ${showCategory ? `
    <div class="field">
      <label for="setup-category">Category</label>
      <select id="setup-category" name="category">${categoryOptions(category)}</select>
    </div>` : `<input type="hidden" name="category" value="${esc(category)}">`}
    <div class="field">
      <span class="field-label">Difficulty</span>
      <div class="segmented" data-setup-group="difficulty">
        ${DIFFICULTIES.map(d => `<button type="button" class="${Number(difficulty) === d.level ? 'is-active' : ''}" data-action="setup-segment" data-group="difficulty" data-value="${d.level}">${d.name}</button>`).join('')}
      </div>
      <input type="hidden" name="difficulty" value="${difficulty}">
    </div>
    <div class="field-row">
      <div class="field">
        <label for="setup-count">Questions</label>
        <select id="setup-count" name="count">
          ${[5, 8, 10, 15, 20].map(n => `<option value="${n}" ${Number(count) === n ? 'selected' : ''}>${n} questions</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="setup-timer">Timer per question</label>
        <select id="setup-timer" name="timer">
          ${[15, 20, 30, 45].map(n => `<option value="${n}" ${Number(timer) === n ? 'selected' : ''}>${n} seconds</option>`).join('')}
        </select>
      </div>
    </div>
    ${!pass ? `
    <div class="field">
      <span class="field-label">Rivals</span>
      <div class="segmented" data-setup-group="opponents">
        ${[0, 1, 2, 3].map(n => `<button type="button" class="${Number(opponents) === n ? 'is-active' : ''}" data-action="setup-segment" data-group="opponents" data-value="${n}">${n === 0 ? 'Just me' : `${n} rival${n > 1 ? 's' : ''}`}</button>`).join('')}
      </div>
      <input type="hidden" name="opponents" value="${opponents}">
      <span class="form-hint">Rivals play offline with their own pace and accuracy.</span>
    </div>` : ''}
    <button class="btn btn--gold btn--large btn--block" type="submit">${icon('play', 17)} Begin ${pass ? 'pass & play' : opponents > 0 ? 'rival match' : 'quiz'}</button>
  </form>`;
}

function openSetupModal(mode = 'solo') {
  const pass = mode === 'pass';
  const title = pass ? 'Gather the table' : 'Set your depth';
  const intro = pass
    ? 'Add two to four players. Each person answers in secret, then the device passes to the next player.'
    : 'Choose a category, set the pace, and decide whether to walk alone or invite a rival.';
  openModal(`
    <button class="icon-btn icon-btn--ghost modal__close" data-modal-close aria-label="Close">${icon('x', 18)}</button>
    <div class="modal__head">
      <span class="modal__icon">${icon(pass ? 'users' : 'book', 26)}</span>
      <div>
        <span class="eyebrow">${pass ? 'Pass & play' : 'Solo quest'}</span>
        <h2 id="modal-title">${title}</h2>
        <p>${intro}</p>
      </div>
    </div>
    ${setupFormHTML({ mode, category: 'all', difficulty: 2, count: pass ? 10 : 10, timer: state.profile.settings.timer || 20, opponents: 0 })}
  `, { className: 'modal--setup' });
}

function openCategoryModal(categoryKey) {
  const category = getCategory(categoryKey);
  const counts = [1, 2, 3, 4].map(level => QUESTIONS.filter(q => q.cat === categoryKey && q.diff === level).length);
  openModal(`
    <button class="icon-btn icon-btn--ghost modal__close" data-modal-close aria-label="Close">${icon('x', 18)}</button>
    <div class="modal__head">
      <span class="modal__icon">${icon(category.icon, 26)}</span>
      <div>
        <span class="eyebrow">${esc(category.testament)}</span>
        <h2 id="modal-title">${esc(category.name)}</h2>
        <p>${esc(category.blurb)}</p>
      </div>
    </div>
    <div class="setup-brief">
      <img src="/assets/categories/${category.art}.svg" alt="${esc(category.name)} artwork">
      <div class="setup-brief__overlay">
        <span class="chip chip--gold">${icon('book', 13)} ${category.count} questions</span>
        <span class="chip">${icon('star', 13)} ${counts.map((n, i) => `${DIFFICULTIES[i].label}: ${n}`).join(' · ')}</span>
      </div>
    </div>
    <blockquote class="setup-quote">“${esc(category.verse.text)}”<cite>${esc(category.verse.ref)}</cite></blockquote>
    ${setupFormHTML({ mode: 'solo', category: categoryKey, difficulty: 2, count: 10, timer: state.profile.settings.timer || 20, showCategory: false })}
  `, { className: 'modal--wide' });
}

function openLevelModal(levelNumber) {
  const levelItem = JOURNAL.find(l => l.level === Number(levelNumber));
  if (!levelItem) return;
  if (!journeyUnlocked(state.profile, levelItem.level)) {
    toast('Finish the previous level to unlock this waypoint.', { type: 'info', iconName: 'lock' });
    return;
  }
  const category = getCategory(levelItem.category);
  const stars = state.profile.campaign?.stars?.[levelItem.level] || 0;
  openModal(`
    <button class="icon-btn icon-btn--ghost modal__close" data-modal-close aria-label="Close">${icon('x', 18)}</button>
    <div class="modal__head">
      <span class="modal__icon">${icon(levelItem.icon, 26)}</span>
      <div>
        <span class="eyebrow">Journey level ${levelItem.level} · ${esc(category.name)}</span>
        <h2 id="modal-title">${esc(levelItem.title)}</h2>
        <p>${esc(levelItem.subtitle)}. ${getDifficulty(levelItem.difficulty).name} difficulty, eight questions. Earn up to three stars.</p>
      </div>
    </div>
    <div class="level-brief-stars">${[1, 2, 3].map(n => `<span class="${n <= stars ? '' : 'is-empty'}">${icon('star', 22)}</span>`).join('')}<span>${stars ? `${stars} star${stars > 1 ? 's' : ''} earned` : 'Not yet completed'}</span></div>
    <div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:20px">
      <button class="btn btn--gold btn--large" data-action="launch-level" data-level="${levelItem.level}">${icon('play', 17)} Begin level</button>
      <button class="btn btn--ghost" data-modal-close>Not now</button>
    </div>
  `);
}

function openProfileModal() {
  openModal(`
    <button class="icon-btn icon-btn--ghost modal__close" data-modal-close aria-label="Close">${icon('x', 18)}</button>
    <div class="modal__head">
      <span class="modal__icon">${icon('user', 26)}</span>
      <div><span class="eyebrow">Your pilgrim</span><h2 id="modal-title">Name and emblem</h2><p>Your name appears on leaderboards and in online rooms.</p></div>
    </div>
    <form id="profile-form">
      <div class="field"><label for="profile-name">Display name</label><input id="profile-name" name="name" maxlength="18" value="${esc(state.profile.name)}" required autocomplete="nickname"></div>
      <div class="field">
        <span class="field-label">Choose an emblem</span>
        <div class="avatar-picker">
          ${AVATARS.map(a => `<button type="button" class="avatar-option ${a.id === state.profile.avatar ? 'is-selected' : ''}" data-action="pick-avatar" data-avatar="${a.id}" aria-label="${esc(a.name)}">${avatarMark(a.id, 'md')}</button>`).join('')}
        </div>
        <input type="hidden" name="avatar" value="${state.profile.avatar}">
      </div>
      <div class="modal__actions">
        <button type="button" class="btn btn--ghost" data-modal-close>Cancel</button>
        <button type="submit" class="btn btn--gold">Save pilgrim</button>
      </div>
    </form>
  `);
}

function openHowTo() {
  openModal(`
    <button class="icon-btn icon-btn--ghost modal__close" data-modal-close aria-label="Close">${icon('x', 18)}</button>
    <div class="modal__head">
      <span class="modal__icon">${icon('compass', 26)}</span>
      <div><span class="eyebrow">The field guide</span><h2 id="modal-title">How to play</h2><p>Four modes, one Story. Every answer opens a window back into Scripture.</p></div>
    </div>
    <div class="help-grid" style="margin-top:22px">
      <div class="help-card"><div class="help-card__num">1</div><h4>Choose a mode</h4><p>Play solo, take the daily set, pass one device around, or join a live room.</p></div>
      <div class="help-card"><div class="help-card__num">2</div><h4>Answer under time</h4><p>Tap a choice or press 1–4. Faster correct answers score more, and streaks add bonus points.</p></div>
      <div class="help-card"><div class="help-card__num">3</div><h4>Read the Word</h4><p>Each answer reveals the correct choice, the KJV verse, and a short explanation.</p></div>
    </div>
    <div class="side-card" style="margin-top:16px">
      <div class="side-card__head"><span>Scoring</span><span>${icon('bolt', 14)}</span></div>
      <div class="rule" style="margin-bottom:8px"><span>${icon('target', 17)}</span><span><strong>Base:</strong> 700–1,000 points depending on difficulty.</span></div>
      <div class="rule" style="margin-bottom:8px"><span>${icon('clock', 17)}</span><span><strong>Speed:</strong> up to 400 extra points for a quick answer.</span></div>
      <div class="rule"><span>${icon('flame', 17)}</span><span><strong>Streak:</strong> 100 bonus points per consecutive correct answer, up to 500.</span></div>
    </div>
    <div class="side-card" style="margin-top:12px">
      <div class="side-card__head"><span>Lifelines · solo modes</span><span>${icon('spark', 14)}</span></div>
      <div class="rule" style="margin-bottom:8px"><span>${icon('target', 17)}</span><span><strong>50:50</strong> removes two wrong choices.</span></div>
      <div class="rule" style="margin-bottom:8px"><span>${icon('eye', 17)}</span><span><strong>Clue</strong> reveals the first letter and a Scripture pointer.</span></div>
      <div class="rule"><span>${icon('arrow', 17)}</span><span><strong>Skip</strong> moves on without scoring.</span></div>
    </div>
    <div class="modal__actions"><button class="btn btn--gold" data-modal-close>${icon('play', 16)} Ready</button></div>
  `, { className: 'modal--wide' });
}

function openSettings() {
  const settings = state.profile.settings;
  openModal(`
    <button class="icon-btn icon-btn--ghost modal__close" data-modal-close aria-label="Close">${icon('x', 18)}</button>
    <div class="modal__head">
      <span class="modal__icon">${icon('settings', 26)}</span>
      <div><span class="eyebrow">Preferences</span><h2 id="modal-title">Set the atmosphere</h2><p>Your choices are saved on this device and work offline.</p></div>
    </div>
    <div class="settings-list">
      ${settingRow('sound', 'Sound effects', 'Chimes for answers, streaks, and victories.', settings.sound)}
      ${settingRow('music', 'Ambient music', 'A quiet generated soundscape while you browse.', settings.music)}
      ${settingRow('reducedMotion', 'Reduce motion', 'Turn down drifting, confetti, and longer animations.', settings.reducedMotion)}
      <div class="setting-row">
        <div class="setting-row__copy"><strong>Theme</strong><span>Daylight parchment or midnight study.</span></div>
        <div class="segmented" style="width:190px">
          <button type="button" class="${settings.theme !== 'light' ? 'is-active' : ''}" data-action="set-theme" data-theme="dark">Midnight</button>
          <button type="button" class="${settings.theme === 'light' ? 'is-active' : ''}" data-action="set-theme" data-theme="light">Daylight</button>
        </div>
      </div>
    </div>
    <div style="margin-top:18px;padding-top:16px;border-top:1px solid var(--line);display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn btn--ghost btn--small" data-action="edit-profile">${icon('user', 15)} Edit pilgrim</button>
      <button class="btn btn--ghost btn--small" data-action="reset-progress">${icon('refresh', 15)} Reset progress</button>
      <button class="btn btn--ghost btn--small" data-action="install-app">${icon('book', 15)} Install app</button>
    </div>
    <p class="form-hint" style="margin-top:16px">Scripture Showdown v1.0 · KJV text is public domain · Artwork is original to this app.</p>
  `);
}

function settingRow(key, title, description, value) {
  return `
  <div class="setting-row">
    <div class="setting-row__copy"><strong>${title}</strong><span>${description}</span></div>
    <button class="switch" role="switch" aria-checked="${Boolean(value)}" aria-label="${title}" data-action="setting-toggle" data-key="${key}"></button>
  </div>`;
}

// ── Local game engine ───────────────────────────────────────────────────────
function buildPlayers(mode, config) {
  if (mode === 'pass') {
    const source = config.players?.length ? config.players : [{ name: state.profile.name, avatar: state.profile.avatar }];
    return source.map((player, index) => ({
      id: `local-${index}`,
      name: player.name,
      avatar: player.avatar || AVATARS[(index + 4) % AVATARS.length].id,
      isBot: false,
      score: 0,
      streak: 0,
      correct: 0,
      answered: false,
      answeredIndex: null,
      lastCorrect: null,
      lastDelta: 0,
      bestStreak: 0
    }));
  }
  const players = [{
    id: 'local-0',
    name: state.profile.name,
    avatar: state.profile.avatar,
    isBot: false,
    score: 0,
    streak: 0,
    correct: 0,
    answered: false,
    answeredIndex: null,
    lastCorrect: null,
    lastDelta: 0,
    bestStreak: 0
  }];
  if (mode === 'bot') {
    const rivals = config.bots?.length ? config.bots : BOT_PROFILES.slice(0, config.opponents || 1);
    for (const bot of rivals) {
      players.push({
        id: `bot-${players.length}`,
        name: bot.name,
        avatar: bot.avatar,
        isBot: true,
        accuracy: bot.accuracy,
        speed: bot.speed,
        score: 0,
        streak: 0,
        correct: 0,
        answered: false,
        answeredIndex: null,
        lastCorrect: null,
        lastDelta: 0,
        bestStreak: 0
      });
    }
  }
  return players;
}

function startLocalGame(config) {
  stopLocalTimers();
  const mode = config.mode || 'solo';
  let questions;
  if (mode === 'daily') {
    questions = dailyChallenge(new Date());
  } else {
    questions = pickQuestions({
      category: config.category || 'all',
      difficulty: config.difficulty || 2,
      count: config.count || 10
    });
  }
  if (!questions.length) {
    toast('No questions matched that setup. Try another category or depth.', { type: 'error', iconName: 'x' });
    return;
  }
  const players = buildPlayers(mode, config);
  const timer = mode === 'daily' ? 20 : Number(config.timer) || 20;
  state.game = {
    mode,
    setup: {
      ...config,
      mode,
      timer,
      players: (config.players || []).map(player => ({ name: player.name, avatar: player.avatar })),
      bots: (config.bots || []).map(bot => ({ name: bot.name, avatar: bot.avatar, accuracy: bot.accuracy, speed: bot.speed }))
    },
    category: config.category || 'all',
    difficulty: config.difficulty || 'mixed',
    questions,
    players,
    index: 0,
    activePlayer: 0,
    phase: mode === 'pass' ? 'handoff' : 'question',
    selected: null,
    locked: false,
    reveal: null,
    disabledChoices: [],
    hintShown: false,
    hintText: '',
    lifelines: {
      fifty: mode !== 'daily' && mode !== 'pass',
      clue: mode !== 'daily' && mode !== 'pass',
      skip: mode !== 'daily' && mode !== 'pass'
    },
    used: { fifty: false, clue: false, skip: false },
    timer,
    timerMs: timer * 1000,
    deadline: 0,
    turnStartedAt: 0,
    startedAt: Date.now(),
    lastTickSecond: null,
    mainAnswers: [],
    perQuestionMain: new Set(),
    botsApplied: false,
    results: null,
    recorded: false,
    questionStartedAt: 0
  };
  playSound('select');
  routeTo('play');
  if (mode === 'pass') {
    render();
  }
}

function startDaily() {
  const done = (state.profile.dailyDates || []).includes(todayKey());
  startLocalGame({
    mode: 'daily',
    category: 'all',
    difficulty: 'mixed',
    count: 10,
    timer: 20,
    replay: done
  });
}

function startJourneyLevel(levelNumber) {
  const level = JOURNAL.find(item => item.level === Number(levelNumber));
  if (!level) return;
  if (!journeyUnlocked(state.profile, level.level)) {
    toast('That waypoint is still locked.', { type: 'info', iconName: 'lock' });
    return;
  }
  startLocalGame({
    mode: 'journey',
    category: level.category,
    difficulty: level.difficulty,
    count: 8,
    timer: state.profile.settings.timer || 20,
    level: level.level
  });
}

function startQuickSolo() {
  startLocalGame({
    mode: 'solo',
    category: 'all',
    difficulty: 2,
    count: 10,
    timer: state.profile.settings.timer || 20
  });
}

function currentLocalPlayer() {
  return state.game?.players[state.game.activePlayer] || state.game?.players[0];
}

function startLocalTimer() {
  stopLocalTimers();
  const game = state.game;
  if (!game) return;
  game.deadline = Date.now() + game.timerMs;
  game.questionStartedAt = Date.now();
  game.lastTickSecond = null;
  state.localTimer = setInterval(() => {
    if (!state.game || state.game.phase !== 'question') return;
    const remaining = Math.max(0, state.game.deadline - Date.now());
    updateLocalTimerDisplay(remaining);
    const seconds = Math.ceil(remaining / 1000);
    if (seconds <= 5 && seconds > 0 && seconds !== state.game.lastTickSecond) {
      state.game.lastTickSecond = seconds;
      playSound('tick');
    }
    if (remaining <= 0) {
      answerLocal(null, true);
    }
  }, 100);
  updateLocalTimerDisplay(game.timerMs);
}

function stopLocalTimers() {
  clearInterval(state.localTimer);
  state.localTimer = null;
}

function updateLocalTimerDisplay(remaining = null) {
  const game = state.game;
  if (!game || game.phase !== 'question') return;
  const ms = remaining == null ? Math.max(0, game.deadline - Date.now()) : remaining;
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const timer = document.getElementById('game-timer');
  if (timer) {
    timer.style.setProperty('--timer-progress', Math.max(0, Math.min(1, ms / game.timerMs)));
    timer.classList.toggle('is-danger', seconds <= 5);
    const value = timer.querySelector('span');
    if (value) value.textContent = seconds;
  }
}

function syncLocalTimerDisplay() {
  const game = state.game;
  if (!game || game.phase !== 'question' || !game.deadline) return;
  updateLocalTimerDisplay();
}

function beginPassTurn() {
  const game = state.game;
  if (!game || game.phase !== 'handoff') return;
  playSound('select');
  game.phase = 'question';
  game.selected = null;
  game.locked = false;
  game.disabledChoices = [];
  game.hintShown = false;
  render();
  startLocalTimer();
}

function answerLocal(choice, timedOut = false, skipped = false) {
  const game = state.game;
  if (!game || game.phase !== 'question' || game.locked) return;
  game.locked = true;
  stopLocalTimers();
  const question = game.questions[game.index];
  const player = currentLocalPlayer();
  const remainingMs = timedOut ? 0 : Math.max(0, game.deadline - Date.now());
  const correct = choice !== null && choice === question.answer;

  player.answered = true;
  player.answeredIndex = choice;
  player.lastCorrect = correct;
  player.lastDelta = 0;
  player.skipped = Boolean(skipped);
  player.answerMs = timedOut ? game.timerMs : Math.max(0, game.deadline - Date.now());

  if (correct) {
    const points = scoreAnswer({
      difficulty: question.diff,
      remainingMs,
      timerMs: game.timerMs,
      streak: player.streak
    }).total;
    player.score += points;
    player.correct += 1;
    player.streak += 1;
    player.bestStreak = Math.max(player.bestStreak, player.streak);
    player.lastDelta = points;
  } else {
    player.streak = 0;
  }

  if (game.activePlayer === 0 || game.mode === 'pass') {
    logMainAnswer(game, player, question, correct, timedOut, skipped);
  }

  game.selected = choice;
  if (game.mode === 'pass') {
    if (game.activePlayer < game.players.length - 1) {
      game.activePlayer += 1;
      game.phase = 'handoff';
      game.locked = false;
      render();
      return;
    }
    revealLocalRound();
    return;
  }

  if (game.mode === 'bot') applyBotAnswers(game);
  revealLocalRound();
}

function logMainAnswer(game, player, question, correct, timedOut, skipped) {
  if (game.perQuestionMain.has(game.index)) return;
  game.perQuestionMain.add(game.index);
  const ms = timedOut ? game.timerMs : Math.max(0, game.deadline - Date.now());
  game.mainAnswers.push({
    cat: question.cat,
    correct: Boolean(correct),
    skipped: Boolean(skipped),
    ms
  });
}

function applyBotAnswers(game) {
  if (game.botsApplied) return;
  game.botsApplied = true;
  const question = game.questions[game.index];
  for (const bot of game.players) {
    if (!bot.isBot) continue;
    const penalty = Math.max(0, question.diff - 2) * 0.06;
    const accuracy = Math.max(0.22, Math.min(0.88, (bot.accuracy || 0.58) - penalty));
    const correct = Math.random() < accuracy;
    const wrong = [0, 1, 2, 3].filter(i => i !== question.answer);
    bot.answered = true;
    bot.answeredIndex = correct ? question.answer : wrong[Math.floor(Math.random() * wrong.length)];
    bot.lastCorrect = correct;
    bot.lastDelta = 0;
    if (correct) {
      const speedRatio = 0.3 + Math.random() * 0.6 * (bot.speed || 0.5);
      const points = scoreAnswer({
        difficulty: question.diff,
        remainingMs: game.timerMs * speedRatio,
        timerMs: game.timerMs,
        streak: bot.streak
      }).total;
      bot.score += points;
      bot.correct += 1;
      bot.streak += 1;
      bot.bestStreak = Math.max(bot.bestStreak || 0, bot.streak);
      bot.lastDelta = points;
    } else {
      bot.streak = 0;
    }
  }
}

function revealLocalRound() {
  const game = state.game;
  if (!game) return;
  game.phase = 'reveal';
  stopLocalTimers();
  if (game.mode === 'bot') applyBotAnswers(game);
  const question = game.questions[game.index];
  const answerCounts = [0, 0, 0, 0];
  for (const player of game.players) {
    if (player.answeredIndex !== null && player.answeredIndex !== undefined) answerCounts[player.answeredIndex] += 1;
    if (!player.answered) {
      player.answered = true;
      player.answeredIndex = null;
      player.lastCorrect = false;
      player.streak = 0;
    }
  }
  const main = game.players[0];
  const mainCorrect = Boolean(main.lastCorrect);
  if (game.phase === 'reveal') {
    playSound(mainCorrect ? 'correct' : 'wrong');
    vibrate(mainCorrect ? 18 : [12, 50, 12]);
  }
  game.reveal = {
    correctIndex: question.answer,
    ref: question.ref,
    verse: question.verse,
    why: question.why,
    counts: answerCounts,
    playerResults: game.players.map(player => ({
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      score: player.score,
      delta: player.lastDelta || 0,
      correct: Boolean(player.lastCorrect),
      skipped: player.answeredIndex === null && !player.isBot
    }))
  };
  render();
}

function nextLocalQuestion() {
  const game = state.game;
  if (!game || game.phase !== 'reveal') return;
  if (game.index + 1 >= game.questions.length) {
    finishLocalGame();
    return;
  }
  game.index += 1;
  game.activePlayer = 0;
  game.phase = game.mode === 'pass' ? 'handoff' : 'question';
  game.selected = null;
  game.locked = false;
  game.reveal = null;
  game.disabledChoices = [];
  game.hintShown = false;
  game.botsApplied = false;
  for (const player of game.players) {
    player.answered = false;
    player.answeredIndex = null;
    player.lastCorrect = null;
    player.lastDelta = 0;
    player.skipped = false;
  }
  playSound('select');
  render();
  if (game.phase === 'question') startLocalTimer();
}

function finishLocalGame() {
  const game = state.game;
  if (!game || game.recorded) return;
  game.recorded = true;
  game.phase = 'results';
  stopLocalTimers();
  const ranking = [...game.players].sort((a, b) => b.score - a.score || b.correct - a.correct);
  const winner = ranking[0];
  const main = game.players[0];
  const total = game.questions.length;
  const accuracy = total ? main.correct / total : 0;
  const stars = starsFor(main.correct, total);
  const breakdown = {};
  for (const answer of game.mainAnswers) {
    if (!breakdown[answer.cat]) breakdown[answer.cat] = { correct: 0, total: 0 };
    breakdown[answer.cat].total += 1;
    if (answer.correct) breakdown[answer.cat].correct += 1;
  }
  const result = {
    mode: game.mode,
    category: game.category,
    difficulty: game.difficulty === 'mixed' ? 2 : Number(game.difficulty),
    correct: main.correct,
    total,
    score: main.score,
    bestStreak: main.bestStreak || 0,
    answerTimes: game.mainAnswers.filter(answer => !answer.skipped).map(answer => answer.ms),
    breakdown,
    level: game.setup.level || null,
    dailyKey: game.mode === 'daily' ? todayKey() : null,
    won: game.mode === 'bot' || game.mode === 'pass' ? winner.id === main.id : stars >= 1
  };
  const record = recordGame(state.profile, result);
  state.profile = record.profile;
  const lastQuestion = game.questions[game.questions.length - 1];
  game.results = {
    ranking,
    winner,
    main,
    accuracy,
    stars,
    record,
    result,
    mode: game.mode,
    setup: game.setup,
    total,
    lastVerse: { ref: lastQuestion.ref, verse: lastQuestion.verse },
    dailyDone: game.mode === 'daily'
  };
  state.results = game.results;
  if (result.score > 0 && game.mode !== 'online') {
    postScore({
      name: state.profile.name,
      avatar: state.profile.avatar,
      score: result.score,
      correct: result.correct,
      total: result.total,
      category: result.category,
      difficulty: result.difficulty,
      mode: result.mode === 'bot' ? 'bot' : result.mode
    });
  }
  if (result.won || stars >= 2) confetti(stars === 3 ? 120 : 70);
  playSound(result.won || stars >= 2 ? 'win' : 'lose');
  notifyProgress(record);
  render();
  scrollTop();
}

function replayLocalGame() {
  const game = state.game;
  if (!game) return;
  const config = { ...game.setup };
  startLocalGame(config);
}

function quitGame() {
  const game = state.game;
  if (!game) {
    routeTo('home');
    return;
  }
  if (game.phase === 'results') {
    state.game = null;
    routeTo('home');
    return;
  }
  confirmDialog({
    title: 'Leave this quiz?',
    body: 'Your answers so far will not be saved to your record.',
    confirmText: 'Leave quiz',
    iconName: 'x',
    danger: true
  }).then(confirmed => {
    if (!confirmed) return;
    stopLocalTimers();
    state.game = null;
    routeTo('home');
  });
}

// ── Local game view ─────────────────────────────────────────────────────────
function gameTopbarHTML(title, subtitle) {
  return `
  <div class="game-topbar">
    <button class="icon-btn" data-action="quit-game" aria-label="Leave quiz">${icon('chevron', 19)}</button>
    <div class="game-topbar__meta"><strong>${esc(title)}</strong><span>${esc(subtitle)}</span></div>
    <button class="icon-btn" data-action="toggle-sound" aria-label="Toggle sound">${icon(state.profile.settings.sound ? 'volume' : 'mute', 18)}</button>
  </div>`;
}

function timerHTML() {
  return `<div class="timer" id="game-timer" style="--timer-progress:1"><span>${state.game?.timer || 20}</span></div>`;
}

function localHudHTML() {
  const game = state.game;
  const player = currentLocalPlayer();
  const difficulty = game.difficulty === 'mixed' ? null : getDifficulty(game.difficulty);
  return `
  <div class="game-hud">
    <span class="hud-pill">${icon('trophy', 15)} <strong>${formatNumber(player.score)}</strong> pts</span>
    <span class="hud-pill hud-pill--streak">${icon('flame', 15)} <strong>${player.streak}</strong> streak</span>
    <span class="chip">${avatarMark(player.avatar, 'sm')} ${esc(player.name)}</span>
    <span class="chip">${icon('book', 14)} ${esc(getCategory(game.questions[game.index].cat).name)}</span>
    ${difficulty ? `<span class="chip" style="color:${difficulty.color};border-color:${difficulty.color}55">${icon('star', 14)} ${difficulty.name}</span>` : ''}
    <span class="hud-spacer"></span>
    ${game.phase === 'question' ? timerHTML() : ''}
  </div>`;
}

function progressHTML(current, total) {
  return `<div class="progress-track" aria-hidden="true"><i style="width:${Math.round((current / Math.max(1, total)) * 100)}%"></i></div>`;
}

function choiceHTML(text, index, { answer, selected, phase, disabledChoices = [], locked = false, reveal = null, interactive = true }) {
  const classes = ['choice'];
  if (reveal) {
    if (index === reveal.correctIndex) classes.push('is-correct');
    else if (index === selected) classes.push('is-wrong');
    else classes.push('is-dim');
    classes.push('is-disabled');
  } else if (selected === index) {
    classes.push('is-selected');
  }
  if (disabledChoices.includes(index)) classes.push('is-removed');
  if (locked || !interactive) classes.push('is-disabled');
  const disabled = locked || !interactive || Boolean(reveal) || disabledChoices.includes(index);
  return `
  <button type="button" class="${classes.join(' ')}" data-action="answer" data-choice="${index}" ${disabled ? 'disabled' : ''} aria-label="Choice ${index + 1}: ${esc(text)}">
    <span class="choice__key">${index + 1}</span>
    <span class="choice__text">${esc(text)}</span>
    <span class="choice__mark">${reveal && index === reveal.correctIndex ? icon('check', 18) : reveal && index === selected ? icon('x', 18) : ''}</span>
  </button>`;
}

function questionCardHTML(game, current) {
  const question = game.questions[game.index];
  const category = getCategory(question.cat);
  const difficulty = getDifficulty(question.diff);
  const reveal = game.phase === 'reveal' ? game.reveal : null;
  const selected = reveal ? current.answeredIndex : game.selected;
  const phase = game.phase;
  return `
  <article class="card question-card">
    <div class="question-card__art">
      <img src="/assets/categories/${category.art}.svg" alt="" aria-hidden="true">
      <span class="question-cat"><span class="chip">${icon(category.icon, 13)} ${esc(category.name)}</span></span>
    </div>
    <div class="question-body">
      <div class="question-kicker" style="--diff-color:${difficulty.color}">
        <span class="diff-dot"></span>
        Question ${game.index + 1} of ${game.questions.length}
        <span style="color:var(--dim)">·</span>
        <span style="color:${difficulty.color}">${difficulty.name}</span>
      </div>
      <h2 class="question-text">${esc(question.question)}</h2>
      <div class="choices">
        ${question.choices.map((choice, index) => choiceHTML(choice, index, {
          answer: question.answer,
          selected,
          phase,
          disabledChoices: game.disabledChoices,
          locked: phase !== 'question' || game.locked,
          reveal,
          interactive: phase === 'question' && !game.locked
        })).join('')}
      </div>
      ${game.hintShown ? `<div class="hint-box">${icon('eye', 15)} <strong>Clue:</strong> ${esc(game.hintText)}</div>` : ''}
    </div>
  </article>`;
}

function revealPanelHTML(game) {
  const reveal = game.reveal;
  if (!reveal) return '';
  const player = currentLocalPlayer();
  const correct = game.mode === 'pass'
    ? game.players[0].lastCorrect
    : Boolean(player.lastCorrect);
  const lastPlayer = game.players[game.activePlayer];
  const isPass = game.mode === 'pass';
  const answered = lastPlayer.answeredIndex;
  const gotIt = isPass ? lastPlayer.lastCorrect : correct;
  const skipped = Boolean(lastPlayer.skipped);
  const timedOut = answered === null || answered === undefined;
  return `
  <section class="reveal-panel">
    <div class="reveal-panel__label">${icon('book', 15)} The Word says</div>
    <blockquote class="scripture">${esc(reveal.verse)}</blockquote>
    <div class="scripture-ref">${esc(reveal.ref)} · KJV</div>
    <p class="reveal-why">${esc(reveal.why)}</p>
    <div class="answer-banner ${gotIt ? 'is-correct' : 'is-wrong'}" style="margin-top:18px">
      ${icon(gotIt ? 'check' : skipped ? 'arrow' : timedOut ? 'clock' : 'x', 18)}
      <span>${gotIt ? 'Correct' : skipped ? 'Skipped' : timedOut ? 'Time expired' : 'Not this time'}${isPass ? ` — ${esc(lastPlayer.name)}` : ''}</span>
      <span class="answer-banner__points">${gotIt ? `+${formatNumber(lastPlayer.lastDelta || 0)}` : '0'} pts</span>
    </div>
    ${isPass ? `
    <div style="margin-top:14px">
      ${reveal.playerResults.map(result => `
        <div class="player-result">
          ${avatarMark(result.avatar, 'sm')}
          <span>${esc(result.name)}</span>
          <span class="player-result__tag ${result.correct ? 'is-correct' : 'is-wrong'}">${result.correct ? '+ ' + formatNumber(result.delta) : '—'}</span>
        </div>`).join('')}
    </div>` : ''}
    <div class="reveal-actions">
      <button class="btn btn--gold" data-action="next-question">${icon('arrow', 16)} ${game.index + 1 >= game.questions.length ? 'See results' : 'Next question'}</button>
      <span class="next-hint">Press Enter to continue</span>
    </div>
  </section>`;
}

function lifelinesHTML(game) {
  if (game.mode === 'daily' || game.mode === 'pass') {
    return `
    <div class="side-card">
      <div class="side-card__head"><span>${game.mode === 'daily' ? 'Daily rules' : 'Pass & play'}</span>${icon(game.mode === 'daily' ? 'sun' : 'users', 14)}</div>
      <div class="rule">${icon('clock', 16)}<span>${game.timer} seconds per question</span></div>
      <div class="rule" style="margin-top:8px">${icon('book', 16)}<span>${game.mode === 'daily' ? 'No lifelines. One clean run through the day.' : 'Answers stay hidden until every player has locked in.'}</span></div>
      ${game.mode === 'pass' ? `<div class="rule" style="margin-top:8px">${icon('users', 16)}<span>${game.players.length} players · ${esc(game.players.map(p => p.name).join(', '))}</span></div>` : ''}
    </div>`;
  }
  return `
  <div class="side-card">
    <div class="side-card__head"><span>Lifelines</span><span>${icon('spark', 14)}</span></div>
    <div class="lifelines">
      <button class="lifeline ${game.used.fifty ? 'is-used' : ''}" data-action="lifeline" data-lifeline="fifty" ${game.used.fifty || !game.lifelines.fifty || game.phase !== 'question' || game.locked ? 'disabled' : ''}>${icon('target', 17)} 50:50 <span>${game.used.fifty ? 'used' : 'once'}</span></button>
      <button class="lifeline ${game.used.clue ? 'is-used' : ''}" data-action="lifeline" data-lifeline="clue" ${game.used.clue || !game.lifelines.clue || game.phase !== 'question' || game.locked ? 'disabled' : ''}>${icon('eye', 17)} Clue <span>${game.used.clue ? 'used' : 'once'}</span></button>
      <button class="lifeline ${game.used.skip ? 'is-used' : ''}" data-action="lifeline" data-lifeline="skip" ${game.used.skip || !game.lifelines.skip || game.phase !== 'question' || game.locked ? 'disabled' : ''}>${icon('arrow', 17)} Skip <span>${game.used.skip ? 'used' : 'once'}</span></button>
    </div>
    <p class="form-hint" style="margin-top:10px">Press F, H, or S during a question.</p>
  </div>`;
}

function miniBoardHTML(game) {
  const sorted = [...game.players].sort((a, b) => b.score - a.score);
  return `
  <div class="side-card">
    <div class="side-card__head"><span>${game.mode === 'pass' ? 'The table' : 'Scoreboard'}</span><span>${icon('trophy', 14)}</span></div>
    <div class="mini-board">
      ${sorted.map(player => `
        <div class="mini-player ${player.id === game.players[game.activePlayer]?.id ? 'is-you' : ''}">
          ${avatarMark(player.avatar, 'sm')}
          <span class="mini-player__name">${esc(player.name)}${player.isBot ? ' · rival' : ''}${player.id === game.players[game.activePlayer]?.id ? ' · now' : ''}</span>
          <span class="mini-player__score">${formatNumber(player.score)}</span>
          ${game.phase === 'reveal' ? `<span class="mini-player__flag ${player.lastCorrect ? 'is-answered' : ''}">${player.lastCorrect ? icon('check', 13) : icon('x', 13)}</span>` : ''}
        </div>`).join('')}
    </div>
  </div>`;
}

function sessionCardHTML(game) {
  const category = getCategory(game.questions[game.index].cat);
  return `
  <div class="side-card">
    <div class="side-card__head"><span>Session</span>${icon('book', 14)}</div>
    <div class="mini-board">
      <div class="mini-player"><span class="mini-player__name">Mode</span><span class="mini-player__score" style="font-family:var(--sans);font-size:.72rem;color:var(--muted)">${MODE_LABELS[game.mode]}</span></div>
      <div class="mini-player"><span class="mini-player__name">Questions</span><span class="mini-player__score">${game.index + 1} / ${game.questions.length}</span></div>
      <div class="mini-player"><span class="mini-player__name">Category</span><span class="mini-player__score" style="font-family:var(--sans);font-size:.72rem;color:var(--muted)">${esc(category.name)}</span></div>
      <div class="mini-player"><span class="mini-player__name">Timer</span><span class="mini-player__score">${game.timer}s</span></div>
    </div>
  </div>`;
}

function passScreenHTML(game) {
  const player = currentLocalPlayer();
  const question = game.questions[game.index];
  const category = getCategory(question.cat);
  return `
  <div class="card pass-screen">
    <div class="pass-screen__avatar">${avatarMark(player.avatar, 'xl')}</div>
    <span class="eyebrow">Question ${game.index + 1} of ${game.questions.length} · ${esc(category.name)}</span>
    <h2>Pass to ${esc(player.name)}</h2>
    <p>Hand the device to ${esc(player.name)}. Keep their answer private until everyone has locked in. The ${game.timer}-second timer is ready when they are.</p>
    <button class="btn btn--gold btn--large" data-action="pass-ready">${icon('play', 17)} I’m ${esc(player.name.split(' ')[0])} — ready</button>
    <div class="pass-screen__count">${game.players.map((p, i) => `<span class="chip ${i === game.activePlayer ? 'chip--gold' : ''}" style="margin:0 3px">${esc(p.name)} · ${formatNumber(p.score)}</span>`).join('')}</div>
  </div>`;
}

function renderLocalGame() {
  const game = state.game;
  if (!game) return renderHome();
  const question = game.questions[game.index];
  const category = getCategory(question.cat);
  const isPassHandoff = game.phase === 'handoff';
  const title = `${MODE_LABELS[game.mode]}${game.setup.level ? ` · Level ${game.setup.level}` : ''}`;
  const subtitle = `${category.name} · ${game.timer}s · ${game.questions.length} questions`;
  if (isPassHandoff) {
    return `<div class="game-shell">
      ${gameTopbarHTML(title, subtitle)}
      ${progressHTML(game.index, game.questions.length)}
      ${passScreenHTML(game)}
    </div>`;
  }
  return `
  <div class="game-shell">
    ${gameTopbarHTML(title, subtitle)}
    ${localHudHTML()}
    ${progressHTML(game.index + (game.phase === 'reveal' ? 1 : 0), game.questions.length)}
    <div class="game-layout">
      <div>
        ${questionCardHTML(game, currentLocalPlayer())}
        ${game.phase === 'reveal' ? revealPanelHTML(game) : ''}
      </div>
      <aside class="game-side">
        ${lifelinesHTML(game)}
        ${miniBoardHTML(game)}
        ${game.players.length === 1 ? sessionCardHTML(game) : ''}
        <button class="btn btn--small btn--ghost btn--block" data-action="quit-game">${icon('x', 14)} Leave quiz</button>
      </aside>
    </div>
  </div>`;
}

// ── Local results ───────────────────────────────────────────────────────────
function resultTitle(results) {
  if (results.ranking.length > 1) {
    return results.winner.id === results.main.id ? 'You take the crown' : `${results.winner.name} takes the crown`;
  }
  if (results.accuracy >= 0.9) return 'A masterful run';
  if (results.accuracy >= 0.7) return 'Well run, pilgrim';
  if (results.accuracy >= 0.5) return 'The road is opening';
  return 'Every step counts';
}

function resultsPodiumHTML(ranking) {
  if (ranking.length < 2) return '';
  const order = [ranking[1], ranking[0], ranking[2]].filter(Boolean);
  const place = p => ranking.indexOf(p) + 1;
  return `<div class="podium">
    ${order.map(player => `
      <div class="podium__step ${place(player) === 1 ? 'podium__step--first' : ''}">
        <div class="podium__rank">${place(player) === 1 ? 'First' : place(player) === 2 ? 'Second' : 'Third'}</div>
        <div class="podium__avatar">${avatarMark(player.avatar, 'lg')}</div>
        <div class="podium__name">${esc(player.name)}</div>
        <div class="podium__score">${formatNumber(player.score)}</div>
      </div>`).join('')}
  </div>`;
}

function renderLocalResults() {
  const game = state.game;
  const results = game?.results;
  if (!results) return renderHome();
  const { main, ranking, stars, accuracy, record } = results;
  const level = levelInfo(state.profile.xp);
  const newAchievements = (record.newAchievements || []).map(key => ACHIEVEMENTS.find(a => a.key === key)).filter(Boolean);
  return `
  <div class="results-shell">
    <section class="card results-hero">
      <div class="results-hero__glow"></div>
      <span class="eyebrow">${icon(MODE_ICONS[results.mode] || 'book', 14)} ${MODE_LABELS[results.mode]} complete</span>
      <h1>${esc(resultTitle(results))}</h1>
      <p>${results.mode === 'daily' ? `Daily streak: ${state.profile.dailyStreak || 0} day${state.profile.dailyStreak === 1 ? '' : 's'}.` : results.accuracy >= 0.7 ? 'The Word is taking root. Keep going.' : 'The scroll is not finished with you yet.'}</p>
      <div class="results-score">${formatNumber(main.score)}<span>points</span></div>
      <div class="results-stars" aria-label="${stars} of 3 stars">
        ${[1, 2, 3].map(n => `<span class="${n <= stars ? '' : 'is-empty'}">${icon('star', 34)}</span>`).join('')}
      </div>
      <div class="results-stats">
        <div class="result-stat"><strong>${Math.round(accuracy * 100)}%</strong><span>Accuracy</span></div>
        <div class="result-stat"><strong>${main.correct} / ${results.total}</strong><span>Correct</span></div>
        <div class="result-stat"><strong>${main.bestStreak || main.streak}</strong><span>Best streak</span></div>
        <div class="result-stat"><strong>+${formatNumber(record.xpGained)}</strong><span>XP earned</span></div>
      </div>
      <div class="results-actions">
        <button class="btn btn--gold" data-action="replay-game">${icon('refresh', 16)} Play again</button>
        <a class="btn btn--ghost" href="#/home">${icon('home', 16)} Home</a>
        <button class="btn btn--ghost" data-action="share-result">${icon('share', 16)} Share</button>
      </div>
    </section>
    ${resultsPodiumHTML(ranking)}
    <div class="home-grid" style="margin-top:16px;align-items:start">
      <div class="card" style="padding:24px">
        <div class="section-head" style="margin-bottom:14px"><div><span class="eyebrow eyebrow--muted">Your record</span><h2 class="serif" style="font-size:1.4rem;margin-top:4px">Level ${level.level} · ${esc(titleForLevel(level.level))}</h2></div><span class="chip chip--gold">${formatNumber(level.xp)} XP</span></div>
        <div class="xp-summary" style="margin-top:0">
          <div style="min-width:88px"><strong>+${formatNumber(record.xpGained)} XP</strong><br><span>${level.nextFloor - level.xp} to next level</span></div>
          <div class="xp-summary__bar"><i style="width:${Math.round(level.progress * 100)}%"></i></div>
          <span>${Math.round(level.progress * 100)}%</span>
        </div>
        ${results.mode === 'journey' ? `<div class="answer-banner ${stars ? 'is-correct' : 'is-wrong'}" style="margin-top:14px">${icon('compass', 18)}<span>Level ${results.setup.level} ${stars ? `cleared with ${stars} star${stars > 1 ? 's' : ''}` : 'not yet cleared — try again to unlock the next waypoint'}</span></div>` : ''}
        ${results.mode === 'daily' ? `<div class="answer-banner is-correct" style="margin-top:14px">${icon('sun', 18)}<span>Daily streak: ${state.profile.dailyStreak || 0} day${state.profile.dailyStreak === 1 ? '' : 's'} ${results.setup.replay ? '(practice run — streak unchanged)' : ''}</span></div>` : ''}
        ${newAchievements.length ? `<div style="margin-top:16px"><span class="eyebrow eyebrow--muted">New achievements</span><div class="achievement-grid" style="margin-top:8px">${newAchievements.map(a => `<div class="achievement is-unlocked"><div class="achievement__icon">${icon(a.icon, 20)}</div><div><h4>${esc(a.name)}</h4><p>${esc(a.desc)}</p></div></div>`).join('')}</div></div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card verse-card">
          <span class="eyebrow">${icon('book', 14)} Carry this with you</span>
          <div class="verse-card__quote" style="margin-top:12px">“</div>
          <blockquote>${esc(results.lastVerse.verse)}</blockquote>
          <div class="verse-card__ref">${esc(results.lastVerse.ref)} · KJV</div>
        </div>
        <div class="card" style="padding:20px">
          <div class="side-card__head"><span>Final table</span>${icon('trophy', 14)}</div>
          <div class="mini-board">
            ${[...ranking].sort((a, b) => b.score - a.score).map((player, index) => `
              <div class="mini-player ${player.id === results.main.id ? 'is-you' : ''}">
                <span style="width:18px;color:var(--dim);font-size:.7rem">${index + 1}</span>
                ${avatarMark(player.avatar, 'sm')}
                <span class="mini-player__name">${esc(player.name)}${player.isBot ? ' · rival' : ''}</span>
                <span class="mini-player__score">${formatNumber(player.score)}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

// ── Online arena ────────────────────────────────────────────────────────────
function onlineStatusHTML() {
  const status = state.online.status;
  const labels = { idle: 'Ready', connecting: 'Connecting', online: 'Connected', offline: 'Offline' };
  const count = state.online.onlineCount;
  return `<span class="online-status ${status === 'online' ? 'is-online' : status === 'connecting' ? 'is-connecting' : status === 'offline' ? 'is-offline' : ''}"><i></i>${labels[status] || 'Ready'}${count ? ` · ${count} online` : ''}</span>`;
}

function arenaRefresh() {
  if (state.route.name === 'arena') render();
}

function maybeConnectArena() {
  if (!isOnlineSupported()) return;
  const client = state.online.client;
  if (client.status === 'idle' || client.status === 'offline') client.connect();
}

function onlineMe() {
  const room = state.online.room;
  return room?.players?.find(player => player.id === state.online.playerId) || null;
}

function onlineIsHost() {
  return Boolean(state.online.room && state.online.room.hostId === state.online.playerId);
}

function arenaAvatarPickerHTML(form, selected = state.profile.avatar) {
  return `
    <div class="avatar-picker">
      ${AVATARS.map(avatar => `<button type="button" class="avatar-option ${avatar.id === selected ? 'is-selected' : ''}" data-action="arena-avatar" data-form="${form}" data-avatar="${avatar.id}" aria-label="${esc(avatar.name)}">${avatarMark(avatar.id, 'md')}</button>`).join('')}
    </div>
    <input type="hidden" name="avatar" value="${esc(selected)}">`;
}

function arenaSettingsFieldsHTML(settings = {}, editable = true) {
  const disabled = editable ? '' : 'disabled';
  const difficulty = settings.difficulty ?? 2;
  return `
    <div class="field">
      <label for="arena-category">Category</label>
      <select id="arena-category" data-arena-setting="category" ${disabled}>${categoryOptions(settings.category || 'all')}</select>
    </div>
    <div class="field-row">
      <div class="field">
        <label for="arena-difficulty">Difficulty</label>
        <select id="arena-difficulty" data-arena-setting="difficulty" ${disabled}>${difficultyOptions(difficulty)}</select>
      </div>
      <div class="field">
        <label for="arena-count">Questions</label>
        <select id="arena-count" data-arena-setting="count" ${disabled}>
          ${[5, 8, 10, 12].map(n => `<option value="${n}" ${Number(settings.count) === n ? 'selected' : ''}>${n} questions</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="field">
      <label for="arena-timer">Timer per question</label>
      <select id="arena-timer" data-arena-setting="timer" ${disabled}>
        ${[15, 20, 30, 45].map(n => `<option value="${n}" ${Number(settings.timer) === n ? 'selected' : ''}>${n} seconds</option>`).join('')}
      </select>
    </div>`;
}

function renderArena() {
  if (!isOnlineSupported()) {
    return `
    <section class="page-head">
      <span class="eyebrow">${icon('swords', 14)} Online arena</span>
      <h1>Live rooms need a connected browser</h1>
      <p>This browser does not expose WebSocket support. Every offline mode still works normally.</p>
    </section>
    <div class="card">
      <div class="empty-state">
        <span>${icon('wifi', 34)}</span>
        <h3>The arena is offline</h3>
        <p>Try a modern browser, or gather friends around one device with Pass &amp; Play.</p>
        <a class="btn btn--gold" href="#/home">Return home</a>
      </div>
    </div>`;
  }
  if (!state.online.room && state.route.param && !state.online.joinCode) {
    state.online.tab = 'join';
    state.online.joinCode = state.route.param.toUpperCase().slice(0, 8);
  }
  if (!state.online.room) return renderArenaLanding();
  if (state.online.room.state === 'lobby') return renderArenaLobby();
  if (state.online.room.state === 'results') return renderOnlineResults();
  return renderOnlineGame();
}

function renderArenaLanding() {
  const tab = state.online.tab;
  const code = state.online.joinCode || state.route.param || '';
  return `
  <section class="page-head">
    <span class="eyebrow">${icon('swords', 14)} Live rooms</span>
    <h1>Take the field with friends</h1>
    <p>Create a private room, share the code, or quick-match into an open table. Scores are settled by the server and every answer opens the Scripture.</p>
  </section>
  <div class="arena-layout">
    <div class="card arena-panel">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div>
          <span class="eyebrow eyebrow--muted">The arena</span>
          <h2 style="font-size:1.65rem;margin-top:4px">Set your table</h2>
        </div>
        ${onlineStatusHTML()}
      </div>
      <div class="arena-tabs" role="tablist" aria-label="Arena options">
        <button class="${tab === 'create' ? 'is-active' : ''}" data-action="arena-tab" data-tab="create" role="tab" aria-selected="${tab === 'create'}">Create a room</button>
        <button class="${tab === 'join' ? 'is-active' : ''}" data-action="arena-tab" data-tab="join" role="tab" aria-selected="${tab === 'join'}">Join with code</button>
      </div>
      ${tab === 'join' ? `
      <form id="arena-join-form" class="arena-form">
        <div class="field">
          <label for="arena-join-code">Room code</label>
          <input id="arena-join-code" name="code" maxlength="8" value="${esc(code)}" placeholder="e.g. KINGDOM" autocapitalize="characters" autocomplete="off" required>
        </div>
        <div class="field">
          <label for="arena-join-name">Your display name</label>
          <input id="arena-join-name" name="name" maxlength="18" value="${esc(state.online.names.name || state.profile.name)}" required autocomplete="nickname">
        </div>
        <div class="field">
          <span class="field-label">Your emblem</span>
          ${arenaAvatarPickerHTML('join', state.online.names.avatar || state.profile.avatar)}
        </div>
        <button class="btn btn--gold btn--large btn--block" type="submit">${icon('swords', 17)} Enter the room</button>
      </form>` : `
      <form id="arena-create-form" class="arena-form">
        <div class="field">
          <label for="arena-create-name">Your display name</label>
          <input id="arena-create-name" name="name" maxlength="18" value="${esc(state.online.names.name || state.profile.name)}" required autocomplete="nickname">
        </div>
        <div class="field">
          <span class="field-label">Your emblem</span>
          ${arenaAvatarPickerHTML('create', state.online.names.avatar || state.profile.avatar)}
        </div>
        <div class="field-row">
          <div class="field">
            <label for="arena-create-category">Category</label>
            <select id="arena-create-category" name="category">${categoryOptions('all')}</select>
          </div>
          <div class="field">
            <label for="arena-create-difficulty">Difficulty</label>
            <select id="arena-create-difficulty" name="difficulty">${difficultyOptions(2)}</select>
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="arena-create-count">Questions</label>
            <select id="arena-create-count" name="count">${[5, 8, 10, 12].map(n => `<option value="${n}" ${n === 8 ? 'selected' : ''}>${n} questions</option>`).join('')}</select>
          </div>
          <div class="field">
            <label for="arena-create-timer">Timer</label>
            <select id="arena-create-timer" name="timer">${[15, 20, 30, 45].map(n => `<option value="${n}" ${n === 20 ? 'selected' : ''}>${n} seconds</option>`).join('')}</select>
          </div>
        </div>
        <div style="display:flex;gap:9px;flex-wrap:wrap">
          <button class="btn btn--gold btn--large" type="button" data-action="arena-create">${icon('play', 17)} Create private room</button>
          <button class="btn btn--ghost btn--large" type="button" data-action="arena-quick">${icon('bolt', 17)} Quick match</button>
        </div>
        <p class="form-hint">Quick match joins an open public room or starts one for you. Bots can be added in the lobby.</p>
      </form>`}
    </div>
    <aside class="card arena-panel">
      <span class="eyebrow eyebrow--muted">How live rooms work</span>
      <h2 style="font-size:1.45rem;margin-top:4px">A fair field, every time</h2>
      <div class="online-rules">
        <div class="rule">${icon('users', 18)}<span><strong>Two to eight players.</strong> Invite friends with the room code or add a rival bot.</span></div>
        <div class="rule">${icon('clock', 18)}<span><strong>The server keeps time.</strong> Every player receives the same question and deadline.</span></div>
        <div class="rule">${icon('lock', 18)}<span><strong>Answers stay sealed.</strong> Correctness is revealed together after everyone answers or time expires.</span></div>
        <div class="rule">${icon('book', 18)}<span><strong>Scripture after every round.</strong> The KJV verse and explanation appear in the reveal.</span></div>
      </div>
      <div class="side-card" style="margin-top:20px">
        <div class="side-card__head"><span>Connection</span>${icon('wifi', 14)}</div>
        ${onlineStatusHTML()}
        <p class="form-hint" style="margin-top:8px">A dropped connection will retry automatically. Offline modes never need the network.</p>
      </div>
      <a class="btn btn--ghost btn--block" style="margin-top:16px" href="#/home">${icon('home', 16)} Back to the study</a>
    </aside>
  </div>`;
}

function renderArenaLobby() {
  const room = state.online.room;
  const host = onlineIsHost();
  const players = room.players || [];
  const canStart = players.length >= 2;
  const categoryName = room.settings.category === 'all' ? 'All Scripture' : getCategory(room.settings.category).name;
  return `
  <div class="game-topbar">
    <button class="icon-btn" data-action="arena-leave" aria-label="Leave arena">${icon('chevron', 19)}</button>
    <div class="game-topbar__meta"><strong>Online Arena</strong><span>Lobby · ${esc(room.code)}</span></div>
    ${onlineStatusHTML()}
    <button class="icon-btn" data-action="toggle-sound" aria-label="Toggle sound">${icon(state.profile.settings.sound ? 'volume' : 'mute', 18)}</button>
  </div>
  <div class="arena-layout">
    <div class="card arena-panel">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap">
        <div>
          <span class="eyebrow">${icon('users', 14)} ${players.length} of 8 at the table</span>
          <h1 style="font-size:clamp(1.7rem,3vw,2.25rem)">Room ${esc(room.code)}</h1>
          <p>${room.isPublic ? 'Public quick-match room. Others may join while the lobby is open.' : 'Private room. Share the code with the people you want at the table.'}</p>
        </div>
        <span class="chip chip--live"><span class="pulse-dot"></span> Live lobby</span>
      </div>
      <div class="room-code" style="margin-top:18px">
        <div>
          <div class="room-code__label">Invite code</div>
          <div class="room-code__value">${esc(room.code)}</div>
        </div>
        <div style="display:flex;gap:7px;flex-wrap:wrap">
          <button class="btn btn--small btn--gold" data-action="copy-room">${icon('copy', 15)} Copy</button>
          <button class="btn btn--small btn--ghost" data-action="share-room">${icon('share', 15)} Share</button>
        </div>
      </div>
      <div class="player-list">
        ${players.map(player => `
          <div class="player-row ${player.id === state.online.playerId ? 'is-you' : ''}">
            ${avatarMark(player.avatar, 'sm')}
            <div>
              <div class="player-row__name">${esc(player.name)}${player.id === state.online.playerId ? ' · you' : ''}</div>
              <div class="player-row__meta">${player.isBot ? 'Rival bot' : player.connected === false ? 'Reconnecting' : 'Ready'}</div>
            </div>
            <div class="player-row__tag">
              ${player.isHost ? '<span class="chip chip--gold">Host</span>' : player.isBot ? '<span class="chip">Rival</span>' : '<span class="chip">Guest</span>'}
              ${host && player.isBot ? `<button class="remove-bot" data-action="arena-remove-bot" data-bot="${player.id}" aria-label="Remove ${esc(player.name)}">${icon('x', 13)}</button>` : ''}
            </div>
          </div>`).join('')}
      </div>
      <div class="lobby-actions">
        ${host ? `<button class="btn btn--ghost" data-action="arena-add-bot" ${players.length >= 8 ? 'disabled' : ''}>${icon('robot', 16)} Add a rival bot</button>` : ''}
        <button class="btn btn--ghost" data-action="arena-leave">${icon('x', 15)} Leave room</button>
      </div>
      <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--line)">
        <div class="section-head" style="margin-bottom:14px">
          <div><span class="eyebrow eyebrow--muted">Room settings</span><h3 class="serif" style="font-size:1.25rem;margin-top:3px">${host ? 'Set the depth' : 'The host sets the depth'}</h3></div>
          ${host ? `<span class="chip">${icon('settings', 13)} Host controls</span>` : ''}
        </div>
        <div id="arena-settings" class="arena-form" style="margin-top:0">${arenaSettingsFieldsHTML(room.settings, host)}</div>
        ${host ? `<button class="btn btn--gold btn--large btn--block" style="margin-top:16px" data-action="arena-start" ${canStart ? '' : 'disabled'}>${icon('play', 17)} ${canStart ? 'Start the showdown' : 'Add a rival to begin'}</button>` : '<p class="lobby-hint" style="text-align:center">Waiting for the host to begin. The room settings update live.</p>'}
      </div>
    </div>
    <aside class="card arena-panel">
      <span class="eyebrow eyebrow--muted">At a glance</span>
      <h2 style="font-size:1.45rem;margin-top:4px">${esc(categoryName)}</h2>
      <div class="mini-board" style="margin-top:16px">
        <div class="mini-player"><span class="mini-player__name">Questions</span><span class="mini-player__score">${room.settings.count}</span></div>
        <div class="mini-player"><span class="mini-player__name">Timer</span><span class="mini-player__score">${room.settings.timer}s</span></div>
        <div class="mini-player"><span class="mini-player__name">Depth</span><span class="mini-player__score" style="font-family:var(--sans);font-size:.72rem;color:var(--muted)">${room.settings.difficulty === 'mixed' ? 'Mixed' : getDifficulty(room.settings.difficulty).name}</span></div>
        <div class="mini-player"><span class="mini-player__name">Players</span><span class="mini-player__score">${players.length}</span></div>
      </div>
      <div class="side-card" style="margin-top:16px">
        <div class="side-card__head"><span>Invite a friend</span>${icon('share', 14)}</div>
        <p style="font-size:.78rem;color:var(--muted);line-height:1.55">Send them the room code and ask them to open Online Arena, then choose “Join with code”.</p>
        <button class="btn btn--small btn--ghost btn--block" style="margin-top:10px" data-action="share-room">${icon('share', 14)} Share invite</button>
      </div>
      <div class="side-card" style="margin-top:12px">
        <div class="side-card__head"><span>Connection</span>${icon('wifi', 14)}</div>
        ${onlineStatusHTML()}
      </div>
      <button class="btn btn--ghost btn--block" style="margin-top:14px" data-action="open-how">${icon('compass', 15)} How scoring works</button>
    </aside>
  </div>`;
}

function onlineTimerHTML() {
  const game = state.online.game;
  const remaining = game?.deadline ? Math.max(0, game.deadline - Date.now()) : 0;
  const timerMs = (game?.question?.timer || 20) * 1000;
  return `<div class="timer" id="online-timer" style="--timer-progress:${Math.max(0, Math.min(1, remaining / timerMs))}"><span>${Math.max(0, Math.ceil(remaining / 1000))}</span></div>`;
}

function syncOnlineTimerDisplay() {
  const game = state.online.game;
  const timer = document.getElementById('online-timer');
  if (!game || !timer || game.phase !== 'question') return;
  const ms = Math.max(0, game.deadline - Date.now());
  const timerMs = (game.question?.timer || 20) * 1000;
  const seconds = Math.ceil(ms / 1000);
  timer.style.setProperty('--timer-progress', Math.max(0, Math.min(1, ms / timerMs)));
  timer.classList.toggle('is-danger', seconds <= 5);
  const value = timer.querySelector('span');
  if (value) value.textContent = seconds;
}

function startOnlineTimer() {
  stopOnlineTimers();
  const game = state.online.game;
  if (!game || game.phase !== 'question') return;
  state.online.lastTick = null;
  syncOnlineTimerDisplay();
  state.onlineTimer = setInterval(() => {
    const active = state.online.game;
    if (!active || active.phase !== 'question') {
      stopOnlineTimers();
      return;
    }
    const remaining = Math.max(0, active.deadline - Date.now());
    syncOnlineTimerDisplay();
    const seconds = Math.ceil(remaining / 1000);
    if (seconds <= 5 && seconds > 0 && seconds !== state.online.lastTick) {
      state.online.lastTick = seconds;
      playSound('tick');
    }
    if (remaining <= 0) {
      clearInterval(state.onlineTimer);
      state.onlineTimer = null;
      syncOnlineTimerDisplay();
    }
  }, 100);
}

function stopOnlineTimers() {
  clearInterval(state.onlineTimer);
  state.onlineTimer = null;
  state.online.lastTick = null;
}

function onlineHudHTML() {
  const game = state.online.game;
  const question = game.question;
  const me = onlineMe();
  const difficulty = getDifficulty(question.diff);
  return `
  <div class="game-hud">
    <span class="hud-pill">${icon('trophy', 15)} <strong>${formatNumber(me?.score || 0)}</strong> pts</span>
    <span class="hud-pill hud-pill--streak">${icon('flame', 15)} <strong>${me?.streak || 0}</strong> streak</span>
    <span class="chip">${avatarMark(me?.avatar || state.profile.avatar, 'sm')} ${esc(me?.name || state.profile.name)}</span>
    <span class="chip">${icon('book', 14)} ${esc(getCategory(question.cat).name)}</span>
    <span class="chip" style="color:${difficulty.color};border-color:${difficulty.color}55">${icon('star', 14)} ${difficulty.name}</span>
    <span class="hud-spacer"></span>
    ${game.phase === 'question' ? onlineTimerHTML() : ''}
  </div>`;
}

function onlineQuestionCardHTML(game) {
  const question = game.question;
  const category = getCategory(question.cat);
  const difficulty = getDifficulty(question.diff);
  const reveal = game.phase === 'reveal' ? game.reveal : null;
  const selected = game.selected;
  return `
  <article class="card question-card">
    <div class="question-card__art">
      <img src="/assets/categories/${category.art}.svg" alt="" aria-hidden="true">
      <span class="question-cat"><span class="chip">${icon(category.icon, 13)} ${esc(category.name)}</span></span>
    </div>
    <div class="question-body">
      <div class="question-kicker" style="--diff-color:${difficulty.color}">
        <span class="diff-dot"></span>
        Question ${question.index + 1} of ${question.total}
        <span style="color:var(--dim)">·</span>
        <span style="color:${difficulty.color}">${difficulty.name}</span>
      </div>
      <h2 class="question-text">${esc(question.question)}</h2>
      <div class="choices">
        ${question.choices.map((choice, index) => choiceHTML(choice, index, {
          selected,
          phase: game.phase,
          locked: game.phase !== 'question' || game.selected !== null,
          reveal,
          interactive: game.phase === 'question' && game.selected === null
        })).join('')}
      </div>
    </div>
  </article>`;
}

function onlineRevealPanelHTML(game) {
  const reveal = game.reveal;
  if (!reveal) return '';
  const me = reveal.players?.find(player => player.id === state.online.playerId);
  const gotIt = Boolean(me?.lastCorrect);
  const noAnswer = me && !me.answered && me.lastCorrect === null;
  return `
  <section class="reveal-panel">
    <div class="reveal-panel__label">${icon('book', 15)} The Word says</div>
    <blockquote class="scripture">${esc(reveal.verse)}</blockquote>
    <div class="scripture-ref">${esc(reveal.ref)} · KJV</div>
    <p class="reveal-why">${esc(reveal.why)}</p>
    <div class="answer-banner ${gotIt ? 'is-correct' : 'is-wrong'}" style="margin-top:18px">
      ${icon(gotIt ? 'check' : noAnswer ? 'clock' : 'x', 18)}
      <span>${gotIt ? 'Correct' : noAnswer ? 'No answer this round' : 'Not this time'}</span>
      <span class="answer-banner__points">${gotIt ? `+${formatNumber(me?.lastDelta || 0)}` : '0'} pts</span>
    </div>
    <div class="reveal-actions">
      <span class="chip">${icon('clock', 14)} Next question in a moment</span>
      <span class="next-hint">The room moves together</span>
    </div>
  </section>`;
}

function onlineScoreboardHTML(reveal = null) {
  const players = [...(reveal?.players || state.online.room?.players || [])].sort((a, b) => b.score - a.score);
  return `
  <div class="side-card online-opponents">
    <div class="side-card__head"><span>The table</span>${icon('trophy', 14)}</div>
    <div class="mini-board">
      ${players.map((player, index) => `
        <div class="mini-player ${player.id === state.online.playerId ? 'is-you' : ''}">
          <span style="width:16px;color:var(--dim);font-size:.68rem">${index + 1}</span>
          ${avatarMark(player.avatar, 'sm')}
          <span class="mini-player__name">${esc(player.name)}${player.isBot ? ' · rival' : ''}${player.isHost ? ' · host' : ''}</span>
          <span class="mini-player__score">${formatNumber(player.score)}</span>
          ${reveal ? `<span class="mini-player__flag ${player.lastCorrect ? 'is-answered' : ''}">${player.lastCorrect ? icon('check', 13) : icon('x', 13)}</span>` : ''}
        </div>`).join('')}
    </div>
  </div>`;
}

function onlineReactionHTML() {
  return `
  <div class="side-card">
    <div class="side-card__head"><span>Send a word</span>${icon('spark', 14)}</div>
    <div class="reaction-bar">
      ${Object.entries(REACTION_META).map(([key, meta]) => `<button class="reaction-btn" data-action="reaction" data-reaction="${key}" title="${meta.label}">${icon(meta.icon, 15)} ${meta.label}</button>`).join('')}
    </div>
  </div>`;
}

function renderOnlineGame() {
  const room = state.online.room;
  const game = state.online.game;
  if (!room) return renderArenaLanding();
  if (!game?.question) {
    return `
    <div class="game-shell">
      <div class="game-topbar">
        <button class="icon-btn" data-action="quit-online" aria-label="Leave online game">${icon('chevron', 19)}</button>
        <div class="game-topbar__meta"><strong>Online Arena</strong><span>Room ${esc(room.code)}</span></div>
        ${onlineStatusHTML()}
      </div>
      <div class="card locked-screen" style="padding:70px 24px">
        <span class="eyebrow">${onlineStatusHTML()}</span>
        <h2>Preparing the scroll</h2>
        <p>The next question is on its way to every player at the table.</p>
      </div>
    </div>`;
  }
  const question = game.question;
  const category = getCategory(question.cat);
  return `
  <div class="game-shell">
    <div class="game-topbar">
      <button class="icon-btn" data-action="quit-online" aria-label="Leave online game">${icon('chevron', 19)}</button>
      <div class="game-topbar__meta"><strong>Online Arena · ${esc(room.code)}</strong><span>${esc(category.name)} · ${question.timer}s · ${question.total} questions</span></div>
      ${onlineStatusHTML()}
      <button class="icon-btn" data-action="toggle-sound" aria-label="Toggle sound">${icon(state.profile.settings.sound ? 'volume' : 'mute', 18)}</button>
    </div>
    ${onlineHudHTML()}
    ${progressHTML(question.index + (game.phase === 'reveal' ? 1 : 0), question.total)}
    <div class="game-layout">
      <div>
        ${onlineQuestionCardHTML(game)}
        ${game.phase === 'reveal' ? onlineRevealPanelHTML(game) : ''}
      </div>
      <aside class="game-side">
        ${onlineScoreboardHTML(game.reveal)}
        ${game.phase === 'question' ? onlineReactionHTML() : ''}
        <div class="side-card">
          <div class="side-card__head"><span>Room</span>${icon('users', 14)}</div>
          <div class="mini-board">
            <div class="mini-player"><span class="mini-player__name">Code</span><span class="mini-player__score" style="font-family:var(--serif);letter-spacing:.1em">${esc(room.code)}</span></div>
            <div class="mini-player"><span class="mini-player__name">Players</span><span class="mini-player__score">${room.players.length}</span></div>
            <div class="mini-player"><span class="mini-player__name">Host</span><span class="mini-player__score" style="font-family:var(--sans);font-size:.72rem;color:var(--muted)">${esc(room.players.find(p => p.id === room.hostId)?.name || '—')}</span></div>
          </div>
        </div>
        <button class="btn btn--small btn--ghost btn--block" data-action="quit-online">${icon('x', 14)} Leave arena</button>
      </aside>
    </div>
  </div>`;
}

function recordOnlineResult(ranking = []) {
  if (state.online.recorded) return;
  const room = state.online.room;
  const me = ranking.find(player => player.id === state.online.playerId);
  if (!room || !me || !room.total) return;
  state.online.recorded = true;
  const won = ranking[0]?.id === state.online.playerId;
  const result = {
    mode: 'online',
    category: room.settings.category,
    difficulty: room.settings.difficulty === 'mixed' ? 3 : Number(room.settings.difficulty),
    correct: me.correct || 0,
    total: room.total,
    score: me.score || 0,
    bestStreak: me.streak || 0,
    answerTimes: [],
    won
  };
  const record = recordGame(state.profile, result);
  state.profile = record.profile;
  state.online.record = { ...record, won, result };
  if (won) confetti(110);
  playSound(won ? 'win' : 'lose');
  notifyProgress(record);
}

function renderOnlineResults() {
  const room = state.online.room;
  if (!room) return renderArenaLanding();
  const ranking = state.online.finalRanking?.length
    ? state.online.finalRanking
    : [...room.players].sort((a, b) => b.score - a.score);
  const me = ranking.find(player => player.id === state.online.playerId) || ranking[0];
  const winner = ranking[0];
  const won = winner?.id === state.online.playerId;
  const total = room.total || 1;
  const accuracy = me ? me.correct / total : 0;
  const record = state.online.record;
  const newAchievements = (record?.newAchievements || []).map(key => ACHIEVEMENTS.find(a => a.key === key)).filter(Boolean);
  const level = levelInfo(state.profile.xp);
  const host = onlineIsHost();
  return `
  <div class="results-shell">
    <section class="card results-hero">
      <div class="results-hero__glow"></div>
      <span class="eyebrow">${icon('swords', 14)} Online Arena · Room ${esc(room.code)}</span>
      <h1>${won ? 'You take the crown' : `${esc(winner?.name || 'The room')} takes the crown`}</h1>
      <p>${won ? 'A live field, a clear word, and your name at the top.' : 'The room has spoken. The Scripture remains the reward.'}</p>
      <div class="results-score">${formatNumber(me?.score || 0)}<span>points</span></div>
      <div class="results-stats">
        <div class="result-stat"><strong>${Math.round(accuracy * 100)}%</strong><span>Accuracy</span></div>
        <div class="result-stat"><strong>${me?.correct || 0} / ${total}</strong><span>Correct</span></div>
        <div class="result-stat"><strong>${me?.streak || 0}</strong><span>Final streak</span></div>
        <div class="result-stat"><strong>+${formatNumber(record?.xpGained || 0)}</strong><span>XP earned</span></div>
      </div>
      <div class="results-actions">
        ${host ? `<button class="btn btn--gold" data-action="arena-rematch">${icon('refresh', 16)} Rematch</button>` : '<span class="chip">Waiting for the host to rematch</span>'}
        <button class="btn btn--ghost" data-action="share-online-result">${icon('share', 16)} Share</button>
        <button class="btn btn--ghost" data-action="arena-leave">${icon('home', 16)} Leave arena</button>
      </div>
    </section>
    ${resultsPodiumHTML(ranking)}
    <div class="home-grid" style="margin-top:16px;align-items:start">
      <div class="card" style="padding:24px">
        <div class="section-head" style="margin-bottom:14px"><div><span class="eyebrow eyebrow--muted">Your record</span><h2 class="serif" style="font-size:1.4rem;margin-top:4px">Level ${level.level} · ${esc(titleForLevel(level.level))}</h2></div><span class="chip chip--gold">${formatNumber(level.xp)} XP</span></div>
        <div class="xp-summary" style="margin-top:0">
          <div style="min-width:88px"><strong>+${formatNumber(record?.xpGained || 0)} XP</strong><br><span>${level.nextFloor - level.xp} to next level</span></div>
          <div class="xp-summary__bar"><i style="width:${Math.round(level.progress * 100)}%"></i></div>
          <span>${Math.round(level.progress * 100)}%</span>
        </div>
        ${newAchievements.length ? `<div style="margin-top:16px"><span class="eyebrow eyebrow--muted">New achievements</span><div class="achievement-grid" style="margin-top:8px">${newAchievements.map(a => `<div class="achievement is-unlocked"><div class="achievement__icon">${icon(a.icon, 20)}</div><div><h4>${esc(a.name)}</h4><p>${esc(a.desc)}</p></div></div>`).join('')}</div></div>` : ''}
        <p class="form-hint" style="margin-top:16px">The winning score is written to the Hall of Fame automatically. Every room member receives XP and stats on this device.</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card verse-card">
          <span class="eyebrow">${icon('book', 14)} Carry this with you</span>
          <div class="verse-card__quote" style="margin-top:12px">“</div>
          <blockquote>${esc(state.online.game?.reveal?.verse || dailyVerse().text)}</blockquote>
          <div class="verse-card__ref">${esc(state.online.game?.reveal?.ref || dailyVerse().ref)} · KJV</div>
        </div>
        <div class="card" style="padding:20px">
          <div class="side-card__head"><span>Final table</span>${icon('trophy', 14)}</div>
          <div class="mini-board">
            ${ranking.map((player, index) => `
              <div class="mini-player ${player.id === state.online.playerId ? 'is-you' : ''}">
                <span style="width:18px;color:var(--dim);font-size:.7rem">${index + 1}</span>
                ${avatarMark(player.avatar, 'sm')}
                <span class="mini-player__name">${esc(player.name)}${player.isBot ? ' · rival' : ''}</span>
                <span class="mini-player__score">${formatNumber(player.score)}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

// ── Scores, progress & the hall ─────────────────────────────────────────────
async function postScore(payload) {
  try {
    const mode = payload.mode === 'pass' ? 'passplay' : payload.mode;
    const response = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        mode,
        name: state.profile.name,
        avatar: state.profile.avatar
      })
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (Array.isArray(data.entries) && state.leaderboard.scope === 'all') {
      state.leaderboard.entries = data.entries;
      state.leaderboard.loaded = true;
      if (state.route.name === 'home') {
        const board = document.getElementById('home-board');
        if (board) board.innerHTML = homeBoardHTML();
      }
    }
    return data.entry || null;
  } catch {
    return null;
  }
}

function notifyProgress(record) {
  if (!record) return;
  if (record.levelUp) {
    toast(`You reached level ${record.levelUp} · ${titleForLevel(record.levelUp)}.`, {
      type: 'gold',
      iconName: 'crown',
      title: 'Level up',
      duration: 4600
    });
  }
  const achievements = (record.newAchievements || [])
    .map(key => ACHIEVEMENTS.find(item => item.key === key))
    .filter(Boolean);
  if (achievements.length) {
    const names = achievements.map(item => item.name).join(', ');
    toast(achievements.length === 1 ? achievements[0].desc : `Unlocked: ${names}.`, {
      type: 'success',
      iconName: achievements[0].icon,
      title: achievements.length === 1 ? `Achievement: ${achievements[0].name}` : `${achievements.length} achievements unlocked`,
      duration: 5200
    });
  }
}

function leaderboardRowHTML(entry, rank) {
  const isYou = entry.name === state.profile.name;
  const modeLabel = entry.mode === 'passplay' ? 'Pass & Play' : MODE_LABELS[entry.mode] || 'Solo Quest';
  const categoryLabel = entry.category === 'all' ? 'All Scripture' : getCategory(entry.category).name;
  const rankClass = rank === 1 ? 'is-gold' : rank === 2 ? 'is-silver' : rank === 3 ? 'is-bronze' : '';
  return `
  <div class="leaderboard-row ${isYou ? 'is-you' : ''}">
    <span class="leaderboard-row__rank ${rankClass}">${rank}</span>
    ${avatarMark(entry.avatar, 'sm')}
    <span class="leaderboard-row__name">
      ${esc(entry.name)}${isYou ? ' <span class="leaderboard-row__badge">You</span>' : ''}
      <span class="leaderboard-row__meta">${esc(modeLabel)} · ${esc(categoryLabel)} · ${entry.correct}/${entry.total}${entry.createdAt ? ` · ${timeAgo(entry.createdAt)}` : ''}</span>
    </span>
    <span class="leaderboard-row__score">${formatNumber(entry.score)}</span>
  </div>`;
}

function leaderboardContentHTML() {
  const board = state.leaderboard;
  if (board.loading) return leaderboardSkeleton();
  if (board.error) {
    return `<div class="empty-state"><span>${icon('wifi', 34)}</span><h3>Hall offline</h3><p>The community board could not be reached. Your local record is safe.</p><button class="btn btn--ghost" style="margin-top:14px" data-action="retry-leaderboard">${icon('refresh', 15)} Try again</button></div>`;
  }
  if (!board.entries.length) {
    return `<div class="empty-state"><span>${icon('trophy', 34)}</span><h3>No scores in this window</h3><p>Finish a quiz and the first name in the hall could be yours.</p><a class="btn btn--gold" style="margin-top:14px" href="#/home">${icon('play', 15)} Play a round</a></div>`;
  }
  return `<div class="leaderboard-list">${board.entries.map((entry, index) => leaderboardRowHTML(entry, entry.rank || index + 1)).join('')}</div>`;
}

async function loadLeaderboard(scope = state.leaderboard.scope) {
  const board = state.leaderboard;
  if (board.loading && board.scope === scope) return;
  const sequence = (board.sequence || 0) + 1;
  board.sequence = sequence;
  board.scope = scope;
  board.loading = true;
  board.error = false;
  if (state.route.name === 'leaderboard') render();
  try {
    const response = await fetch(`/api/leaderboard?scope=${encodeURIComponent(scope)}`, {
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error('Leaderboard unavailable');
    const data = await response.json();
    if (sequence !== board.sequence) return;
    board.entries = Array.isArray(data.entries) ? data.entries : [];
  } catch {
    if (sequence !== board.sequence) return;
    board.entries = [];
    board.error = true;
  } finally {
    if (sequence !== board.sequence) return;
    board.loading = false;
    board.loaded = true;
    if (state.route.name === 'leaderboard') {
      render();
    } else if (state.route.name === 'home') {
      const homeBoard = document.getElementById('home-board');
      if (homeBoard) homeBoard.innerHTML = homeBoardHTML();
    }
  }
}

function switchLeaderboardScope(scope) {
  if (!['day', 'week', 'all'].includes(scope)) return;
  if (state.leaderboard.scope === scope && state.leaderboard.loaded) {
    render();
    return;
  }
  state.leaderboard.scope = scope;
  state.leaderboard.loaded = false;
  loadLeaderboard(scope);
}

function renderLeaderboard() {
  const board = state.leaderboard;
  const myEntry = board.entries.find(entry => entry.name === state.profile.name);
  return `
  <section class="page-head">
    <span class="eyebrow">${icon('trophy', 14)} The great cloud of witnesses</span>
    <h1>Hall of Fame</h1>
    <p>Scores from solo quests, daily runs, journeys, rival matches, pass-and-play tables, and online rooms. The board refreshes with the community.</p>
  </section>
  <div class="card" style="padding:clamp(18px,3vw,28px)">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:18px">
      <div class="leaderboard-tabs" role="tablist" aria-label="Leaderboard period">
        ${[['day', 'Today'], ['week', 'This week'], ['all', 'All time']].map(([key, label]) => `<button class="${board.scope === key ? 'is-active' : ''}" data-action="leaderboard-scope" data-scope="${key}" role="tab" aria-selected="${board.scope === key}">${label}</button>`).join('')}
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        ${myEntry ? `<span class="chip chip--gold">${icon('user', 13)} Your rank: ${myEntry.rank}</span>` : `<span class="chip">${icon('bolt', 13)} ${formatNumber(state.profile.bestScore)} personal best</span>`}
        <button class="btn btn--small btn--ghost" data-action="retry-leaderboard" ${board.loading ? 'disabled' : ''}>${icon('refresh', 14)} Refresh</button>
      </div>
    </div>
    ${leaderboardContentHTML()}
    <p class="form-hint" style="margin-top:16px;text-align:center">Rankings are kept on this app’s server. Names are capped at 18 characters and scores are validated before entry.</p>
  </div>`;
}

function renderProfile() {
  const profile = state.profile;
  const level = levelInfo(profile.xp);
  const accuracy = profile.questionsAnswered ? Math.round((profile.totalCorrect / profile.questionsAnswered) * 100) : 0;
  const achievements = achievementProgress(profile).sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || b.progress - a.progress);
  const categoryStats = CATEGORIES.map(category => {
    const stat = profile.categoryStats?.[category.key] || { played: 0, correct: 0 };
    return { ...category, played: stat.played || 0, correct: stat.correct || 0, mastery: categoryMastery(profile, category.key) };
  }).sort((a, b) => b.played - a.played || a.name.localeCompare(b.name));
  const unlocked = achievements.filter(item => item.unlocked).length;
  return `
  <section class="card profile-hero">
    <div class="profile-hero__glow"></div>
    <div style="position:relative">${avatarMark(profile.avatar, 'xl')}</div>
    <div class="profile-hero__copy">
      <span class="eyebrow">${icon('user', 14)} Your pilgrim record</span>
      <h1>${esc(profile.name)}</h1>
      <p>Level ${level.level} · ${esc(titleForLevel(level.level))} · ${formatNumber(profile.xp)} XP</p>
      <div class="profile-hero__tags">
        <span class="chip chip--gold">${icon('star', 13)} ${unlocked} of ${achievements.length} achievements</span>
        <span class="chip">${icon('flame', 13)} ${profile.dailyStreak || 0} day streak</span>
        <span class="chip">${icon('target', 13)} ${accuracy}% accuracy</span>
      </div>
      <div class="results-actions" style="justify-content:flex-start;margin-top:16px">
        <button class="btn btn--gold btn--small" data-action="edit-profile">${icon('feather', 15)} Edit pilgrim</button>
        <button class="btn btn--ghost btn--small" data-action="open-settings">${icon('settings', 15)} Settings</button>
        <a class="btn btn--ghost btn--small" href="#/leaderboard">${icon('trophy', 15)} Hall of Fame</a>
      </div>
    </div>
    <div class="profile-level" style="position:relative">
      ${progressRing(level.progress, 'var(--gold)', 96, 6)}
      <div style="position:relative;text-align:center"><strong>${level.level}</strong><span>Level</span></div>
    </div>
  </section>
  <div class="stat-grid">
    <div class="stat-card">${icon('trophy', 20)}<strong>${formatNumber(profile.bestScore)}</strong><span>Best score</span></div>
    <div class="stat-card">${icon('flame', 20)}<strong>${profile.bestStreak || 0}</strong><span>Best streak</span></div>
    <div class="stat-card">${icon('book', 20)}<strong>${formatNumber(profile.questionsAnswered)}</strong><span>Questions answered</span></div>
    <div class="stat-card">${icon('swords', 20)}<strong>${profile.onlineWins || 0}</strong><span>Online wins</span></div>
  </div>
  <div class="home-grid" style="margin-top:16px;align-items:start">
    <div class="card" style="padding:clamp(20px,3vw,28px)">
      <div class="section-head" style="margin-bottom:16px">
        <div><span class="eyebrow eyebrow--muted">The race marked out</span><h2 class="serif" style="font-size:1.45rem;margin-top:4px">Achievements</h2></div>
        <span class="chip chip--gold">${unlocked} / ${achievements.length}</span>
      </div>
      <div class="achievement-grid">
        ${achievements.map(item => `
          <div class="achievement ${item.unlocked ? 'is-unlocked' : ''}">
            <div class="achievement__icon">${icon(item.icon, 20)}</div>
            <div style="flex:1;min-width:0">
              <h4>${esc(item.name)}</h4>
              <p>${esc(item.desc)}</p>
              ${!item.unlocked ? `<div class="achievement__progress"><i style="width:${Math.round(item.progress * 100)}%"></i></div>` : ''}
            </div>
          </div>`).join('')}
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="card" style="padding:22px">
        <div class="side-card__head"><span>Level progress</span>${icon('bolt', 14)}</div>
        <div class="xp-summary" style="margin-top:0">
          <div style="min-width:82px"><strong>${formatNumber(level.xp)} XP</strong><br><span>${level.nextFloor - level.xp} to next</span></div>
          <div class="xp-summary__bar"><i style="width:${Math.round(level.progress * 100)}%"></i></div>
          <span>${Math.round(level.progress * 100)}%</span>
        </div>
        <div class="mini-board" style="margin-top:14px">
          <div class="mini-player"><span class="mini-player__name">Quizzes completed</span><span class="mini-player__score">${profile.gamesPlayed || 0}</span></div>
          <div class="mini-player"><span class="mini-player__name">Daily days</span><span class="mini-player__score">${(profile.dailyDates || []).length}</span></div>
          <div class="mini-player"><span class="mini-player__name">Online games</span><span class="mini-player__score">${profile.onlineGames || 0}</span></div>
          <div class="mini-player"><span class="mini-player__name">Total score</span><span class="mini-player__score">${formatNumber(profile.totalScore)}</span></div>
        </div>
      </div>
      <div class="card" style="padding:22px">
        <div class="side-card__head"><span>Category mastery</span>${icon('grid', 14)}</div>
        <div class="mastery-list">
          ${categoryStats.map(category => `
            <div class="mastery-row" style="--cat-color:${category.color}">
              <span class="mastery-row__name"><i></i>${esc(category.name)}</span>
              <span class="mastery-track"><i style="width:${Math.round(category.mastery * 100)}%"></i></span>
              <span class="mastery-row__pct">${category.played ? Math.round(category.mastery * 100) + '%' : '—'}</span>
            </div>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

// ── Online event wiring ─────────────────────────────────────────────────────
function clearOnlineRoom() {
  stopOnlineTimers();
  state.online.room = null;
  state.online.playerId = null;
  state.online.game = null;
  state.online.finalRanking = [];
  state.online.record = null;
  state.online.recorded = false;
}

function showReaction(reaction, name = '') {
  const meta = REACTION_META[reaction];
  if (!meta) return;
  const el = document.createElement('div');
  el.className = 'reaction-float';
  el.style.left = `${14 + Math.random() * 66}%`;
  el.style.bottom = '100px';
  el.innerHTML = `<span style="display:flex;flex-direction:column;align-items:center;gap:2px;color:var(--gold)">${icon(meta.icon, 28)}<small style="font-size:.58rem;letter-spacing:.08em;text-transform:uppercase;color:var(--text)">${esc(name || meta.label)}</small></span>`;
  document.body.append(el);
  setTimeout(() => el.remove(), 2300);
  playSound('message');
}

function wireArena() {
  if (state.online.wired) return;
  state.online.wired = true;
  const client = state.online.client;
  client.on('status', ({ status }) => {
    state.online.status = status;
    if (status === 'offline' && state.online.room && state.route.name === 'arena' && !state.online.offlineToastShown) {
      state.online.offlineToastShown = true;
      toast('The arena connection dropped. Retrying while your room is held.', { type: 'error', iconName: 'wifi' });
    }
    if (status === 'online') {
      state.online.offlineToastShown = false;
      const pending = state.online.pending;
      state.online.pending = null;
      if (pending) setTimeout(() => pending(), 80);
    }
    if (state.route.name === 'arena') render();
  });
  client.on('hello', data => {
    state.online.onlineCount = Number(data.online) || 0;
    state.online.status = 'online';
    if (state.route.name === 'home' && !document.body.classList.contains('has-modal')) render();
  });
  client.on('presence', data => {
    state.online.onlineCount = Number(data.online) || 0;
    if (state.route.name === 'home' || (state.route.name === 'arena' && (!state.online.room || state.online.room.state === 'lobby'))) render();
  });
  client.on('joined', data => {
    state.online.status = 'online';
    state.online.room = data.room;
    state.online.playerId = data.playerId;
    state.online.game = null;
    state.online.recorded = false;
    state.online.record = null;
    state.online.finalRanking = [];
    state.online.joinCode = '';
    state.online.tab = 'create';
    if (state.route.param) {
      history.replaceState(null, '', `${location.pathname}${location.search}#/arena`);
      state.route = parseRoute();
    }
    playSound('join');
    if (state.route.name === 'arena') render();
  });
  client.on('room', data => {
    const previous = state.online.room?.state;
    state.online.room = data.room;
    if (data.room.state === 'lobby') {
      state.online.game = null;
      state.online.finalRanking = [];
      state.online.record = null;
      state.online.recorded = false;
      if (previous === 'results') toast('The host has opened a fresh lobby.', { iconName: 'refresh' });
    }
    if (data.room.state === 'results' && state.online.game) state.online.game.phase = 'results';
    arenaRefresh();
  });
  client.on('gameStarted', data => {
    state.online.room = data.room;
    state.online.game = { phase: 'question', question: null, reveal: null, selected: null, deadline: 0 };
    state.online.recorded = false;
    state.online.record = null;
    state.online.finalRanking = [];
    arenaRefresh();
  });
  client.on('question', data => {
    const question = data.question;
    const previous = state.online.game;
    state.online.room = data.room;
    state.online.game = {
      phase: 'question',
      question,
      reveal: null,
      selected: null,
      deadline: Date.now() + Math.max(0, question.endsAt - question.serverNow),
      index: question.index,
      total: question.total,
      previous: previous?.phase
    };
    stopOnlineTimers();
    if (state.route.name === 'arena') {
      playSound('select');
      render();
    }
  });
  client.on('reveal', data => {
    stopOnlineTimers();
    state.online.room = data.room;
    const previous = state.online.game || {};
    state.online.game = {
      ...previous,
      phase: 'reveal',
      reveal: {
        correctIndex: data.correctIndex,
        ref: data.ref,
        verse: data.verse,
        why: data.why,
        answerCounts: data.answerCounts,
        players: data.players,
        nextIn: data.nextIn
      }
    };
    const me = data.players?.find(player => player.id === state.online.playerId);
    playSound(me?.lastCorrect ? 'correct' : 'wrong');
    vibrate(me?.lastCorrect ? 18 : [12, 50, 12]);
    arenaRefresh();
  });
  client.on('answerAck', data => {
    if (!state.online.game) return;
    state.online.game.selected = data.choice;
    state.online.game.acknowledged = true;
    arenaRefresh();
  });
  client.on('answerProgress', data => {
    state.online.answered = { answered: data.answered, total: data.total };
  });
  client.on('gameOver', data => {
    stopOnlineTimers();
    state.online.room = data.room;
    state.online.finalRanking = Array.isArray(data.ranking) ? data.ranking : [];
    if (state.online.game) state.online.game.phase = 'results';
    recordOnlineResult(state.online.finalRanking);
    arenaRefresh();
  });
  client.on('reaction', data => {
    if (state.route.name !== 'arena') return;
    showReaction(data.emoji, data.name);
  });
  client.on('playerLeft', data => {
    if (data.room) state.online.room = data.room;
    toast(`${data.name || 'A player'} left the room.`, { iconName: 'users' });
    arenaRefresh();
  });
  client.on('joinError', data => {
    state.online.tab = 'join';
    toast(data.message || 'That room is not available.', { type: 'error', iconName: 'x' });
    arenaRefresh();
  });
  client.on('error', data => {
    toast(data.message || 'The arena sent an error.', { type: 'error', iconName: 'x' });
  });
  client.on('sendError', data => {
    toast(data.message || 'You are not connected to the arena.', { type: 'error', iconName: 'wifi' });
  });
  client.on('socketError', () => {
    if (state.route.name === 'arena') {
      toast('The arena connection was interrupted. Reconnecting...', { type: 'error', iconName: 'wifi' });
    }
  });
  client.on('left', () => {
    clearOnlineRoom();
    if (state.route.name === 'arena') render();
  });
}

// ── Actions, forms & boot ───────────────────────────────────────────────────
function cleanDisplayName(value, fallback = 'Pilgrim') {
  const cleaned = String(value || '').replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 18);
  return cleaned.length >= 2 ? cleaned : fallback;
}

function applySettings() {
  const settings = state.profile.settings;
  document.documentElement.dataset.theme = settings.theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.motion = settings.reducedMotion ? 'reduced' : '';
  setSoundEnabled(Boolean(settings.sound));
  if (settings.music && settings.sound) startMusic();
  else stopMusic();
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', settings.theme === 'light' ? '#f6efdf' : '#0a0e20');
}

function queueArenaAction(action) {
  const client = state.online.client;
  if (client.status === 'online') {
    action();
    return true;
  }
  state.online.pending = action;
  maybeConnectArena();
  toast('Connecting to the arena. Your table will open in a moment.', { iconName: 'wifi', title: 'One moment' });
  return true;
}

function arenaCreateFormData(form) {
  const data = new FormData(form);
  const name = cleanDisplayName(data.get('name'), '');
  const avatar = AVATARS.some(item => item.id === data.get('avatar')) ? data.get('avatar') : state.profile.avatar;
  return {
    name,
    avatar,
    settings: {
      category: String(data.get('category') || 'all'),
      difficulty: String(data.get('difficulty') || '2') === 'mixed' ? 'mixed' : Number(data.get('difficulty') || 2),
      count: Number(data.get('count') || 8),
      timer: Number(data.get('timer') || 20)
    }
  };
}

function submitArenaCreate(quick = false) {
  const form = document.getElementById('arena-create-form');
  if (!form) return;
  if (!form.reportValidity()) return;
  const values = arenaCreateFormData(form);
  if (!values.name) {
    toast('Choose a display name of at least two characters.', { type: 'error', iconName: 'user' });
    return;
  }
  state.profile = updateProfile(state.profile, { name: values.name, avatar: values.avatar });
  state.online.names = { name: values.name, avatar: values.avatar };
  const client = state.online.client;
  queueArenaAction(() => quick ? client.quick(values) : client.create(values));
}

function submitArenaJoin(form) {
  const data = new FormData(form);
  const code = String(data.get('code') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const name = cleanDisplayName(data.get('name'), '');
  const avatar = AVATARS.some(item => item.id === data.get('avatar')) ? data.get('avatar') : state.profile.avatar;
  if (code.length < 4) {
    toast('Enter the full room code from your host.', { type: 'error', iconName: 'x' });
    return;
  }
  if (!name) {
    toast('Choose a display name of at least two characters.', { type: 'error', iconName: 'user' });
    return;
  }
  state.profile = updateProfile(state.profile, { name, avatar });
  state.online.names = { name, avatar };
  state.online.joinCode = code;
  const client = state.online.client;
  queueArenaAction(() => client.join({ code, name, avatar }));
}

async function leaveOnlineArena() {
  const room = state.online.room;
  if (!room) {
    clearOnlineRoom();
    if (state.route.name === 'arena') render();
    return;
  }
  if (['question', 'reveal'].includes(room.state)) {
    const confirmed = await confirmDialog({
      title: 'Leave the live room?',
      body: 'This game is still in progress. Your score will not be added to your local record.',
      confirmText: 'Leave arena',
      iconName: 'x',
      danger: true
    });
    if (!confirmed) return;
  }
  if (state.online.client.status === 'online') state.online.client.leave();
  clearOnlineRoom();
  if (state.route.name === 'arena') {
    if (location.hash !== '#/arena') routeTo('arena');
    else render();
  }
}

function useLifeline(key) {
  const game = state.game;
  if (!game || game.phase !== 'question' || game.locked) return;
  if (!game.lifelines[key] || game.used[key]) return;
  const question = game.questions[game.index];
  if (key === 'fifty') {
    const wrong = [0, 1, 2, 3].filter(index => index !== question.answer);
    const removed = wrong.sort(() => Math.random() - 0.5).slice(0, 2);
    game.disabledChoices = [...new Set([...game.disabledChoices, ...removed])];
    game.used.fifty = true;
  } else if (key === 'clue') {
    const answerText = question.choices[question.answer] || '';
    game.hintShown = true;
    game.hintText = `The answer begins with “${answerText.charAt(0).toUpperCase()}” and is anchored in ${question.ref}.`;
    game.used.clue = true;
  } else if (key === 'skip') {
    game.used.skip = true;
    playSound('select');
    answerLocal(null, false, true);
    return;
  } else {
    return;
  }
  playSound('select');
  render();
}

function answerOnline(choice) {
  const game = state.online.game;
  if (!game || game.phase !== 'question' || game.selected !== null) return;
  if (state.online.room?.state !== 'question') return;
  const remaining = Math.max(0, game.deadline - Date.now());
  game.selected = choice;
  const sent = state.online.client.answer(choice, remaining);
  if (!sent) {
    game.selected = null;
    return;
  }
  playSound('select');
  render();
}

function shareLocalResult() {
  const results = state.results;
  if (!results) return;
  const text = `I scored ${formatNumber(results.main.score)} in Scripture Showdown with ${Math.round(results.accuracy * 100)}% accuracy. ${results.main.correct}/${results.total} correct.`;
  shareContent({
    title: 'Scripture Showdown',
    text,
    url: location.origin + location.pathname
  });
}

function shareOnlineResult() {
  const room = state.online.room;
  const ranking = state.online.finalRanking;
  const me = ranking.find(player => player.id === state.online.playerId);
  if (!room || !me) return;
  const won = ranking[0]?.id === state.online.playerId;
  const text = `${won ? 'I won' : 'I played'} a live Scripture Showdown room with ${formatNumber(me.score)} points and ${me.correct}/${room.total} correct.`;
  shareContent({
    title: 'Scripture Showdown — Online Arena',
    text,
    url: location.origin + location.pathname
  });
}

function shareRoom() {
  const room = state.online.room;
  if (!room) return;
  const url = `${location.origin}${location.pathname}#/arena/${room.code}`;
  shareContent({
    title: 'Join my Scripture Showdown room',
    text: `Join room ${room.code} for a live Bible trivia match.`,
    url
  });
}

async function copyRoomCode() {
  const room = state.online.room;
  if (!room) return;
  if (await copyText(room.code)) toast(`Room code ${room.code} copied.`, { type: 'success', iconName: 'copy' });
  else toast('Copy the room code manually.', { type: 'error', iconName: 'copy' });
}

async function installApp() {
  if (state.installPrompt) {
    const prompt = state.installPrompt;
    state.installPrompt = null;
    const result = await prompt.prompt();
    await prompt.userChoice;
    if (result?.outcome === 'accepted') toast('Scripture Showdown is being installed.', { type: 'success', iconName: 'book' });
    else toast('Installation dismissed. You can use the browser menu any time.', { iconName: 'book' });
    return;
  }
  toast('Use your browser’s “Install app” or “Add to Home Screen” command to install Scripture Showdown.', {
    iconName: 'book',
    title: 'Install the app',
    duration: 6000
  });
}

async function handleAction(action, element) {
  const data = element.dataset;
  switch (action) {
    case 'open-setup':
      openSetupModal(data.mode || 'solo');
      break;
    case 'start-daily':
      closeModal();
      startDaily();
      break;
    case 'start-level':
      openLevelModal(data.level);
      break;
    case 'launch-level':
      closeModal();
      startJourneyLevel(data.level);
      break;
    case 'locked-level':
      toast('Finish the previous level to unlock this waypoint.', { type: 'info', iconName: 'lock' });
      break;
    case 'open-category':
      openCategoryModal(data.cat);
      break;
    case 'category-filter':
      state.bankFilter = data.filter || 'all';
      render();
      break;
    case 'open-how':
      openHowTo();
      break;
    case 'open-settings':
      openSettings();
      break;
    case 'edit-profile':
      openProfileModal();
      break;
    case 'toggle-nav':
      state.navOpen = !state.navOpen;
      render();
      break;
    case 'toggle-sound': {
      const next = !state.profile.settings.sound;
      state.profile = setSetting(state.profile, 'sound', next);
      applySettings();
      if (next) playSound('click');
      render();
      break;
    }
    case 'setup-segment': {
      const form = element.closest('form');
      const group = data.group;
      const value = data.value;
      form.querySelectorAll(`[data-setup-group="${group}"] button`).forEach(button => {
        button.classList.toggle('is-active', button.dataset.value === value);
      });
      const hidden = form.querySelector(`input[name="${group}"]`);
      if (hidden) hidden.value = value;
      if (group === 'players') {
        const count = Number(value) || 2;
        form.querySelectorAll('[data-player-row]').forEach(row => {
          row.classList.toggle('is-hidden', Number(row.dataset.playerRow) >= count);
        });
      }
      break;
    }
    case 'pick-avatar': {
      const modal = element.closest('.modal');
      const hidden = modal?.querySelector('input[name="avatar"]');
      if (hidden) hidden.value = data.avatar;
      modal?.querySelectorAll('.avatar-option').forEach(button => button.classList.toggle('is-selected', button.dataset.avatar === data.avatar));
      break;
    }
    case 'arena-avatar': {
      const form = document.getElementById(data.form === 'join' ? 'arena-join-form' : 'arena-create-form');
      if (!form) break;
      const hidden = form.querySelector('input[name="avatar"]');
      if (hidden) hidden.value = data.avatar;
      form.querySelectorAll('.avatar-option').forEach(button => button.classList.toggle('is-selected', button.dataset.avatar === data.avatar));
      state.online.names.avatar = data.avatar;
      break;
    }
    case 'setting-toggle': {
      const key = data.key;
      if (!key || !(key in state.profile.settings)) break;
      state.profile = setSetting(state.profile, key, !state.profile.settings[key]);
      applySettings();
      element.setAttribute('aria-checked', String(Boolean(state.profile.settings[key])));
      render();
      break;
    }
    case 'set-theme':
      state.profile = setSetting(state.profile, 'theme', data.theme === 'light' ? 'light' : 'dark');
      applySettings();
      render();
      break;
    case 'reset-progress': {
      const confirmed = await confirmDialog({
        title: 'Reset all progress?',
        body: 'Your level, XP, achievements, streaks, journey stars, and local records will be erased. This cannot be undone.',
        confirmText: 'Reset everything',
        iconName: 'refresh',
        danger: true
      });
      if (!confirmed) break;
      state.profile = resetProfile();
      state.game = null;
      state.results = null;
      applySettings();
      routeTo('home');
      toast('Progress reset. A new road begins.', { iconName: 'refresh' });
      break;
    }
    case 'install-app':
      await installApp();
      break;
    case 'answer':
      if (state.route.name === 'arena') answerOnline(Number(data.choice));
      else answerLocal(Number(data.choice));
      break;
    case 'lifeline':
      useLifeline(data.lifeline);
      break;
    case 'next-question':
      nextLocalQuestion();
      break;
    case 'pass-ready':
      beginPassTurn();
      break;
    case 'quit-game':
      quitGame();
      break;
    case 'replay-game':
      replayLocalGame();
      break;
    case 'share-result':
      shareLocalResult();
      break;
    case 'leaderboard-scope':
      switchLeaderboardScope(data.scope);
      break;
    case 'retry-leaderboard':
      state.leaderboard.loaded = false;
      loadLeaderboard(state.leaderboard.scope);
      break;
    case 'arena-tab':
      state.online.tab = data.tab === 'join' ? 'join' : 'create';
      render();
      break;
    case 'arena-create':
      submitArenaCreate(false);
      break;
    case 'arena-quick':
      submitArenaCreate(true);
      break;
    case 'arena-start':
      if (!state.online.room || state.online.room.players.length < 2) {
        toast('Add a rival bot or invite a friend before starting.', { type: 'info', iconName: 'users' });
        break;
      }
      state.online.client.start();
      break;
    case 'arena-add-bot':
      state.online.client.addBot();
      break;
    case 'arena-remove-bot':
      state.online.client.removeBot(data.bot);
      break;
    case 'arena-rematch':
      state.online.client.rematch();
      break;
    case 'arena-leave':
    case 'quit-online':
      await leaveOnlineArena();
      break;
    case 'copy-room':
      await copyRoomCode();
      break;
    case 'share-room':
      shareRoom();
      break;
    case 'share-online-result':
      shareOnlineResult();
      break;
    case 'reaction':
      state.online.client.react(data.reaction);
      break;
    default:
      break;
  }
}

function handleSetupSubmit(form) {
  const data = new FormData(form);
  const baseMode = form.dataset.mode || 'solo';
  const opponents = baseMode === 'pass' ? 0 : Math.min(3, Math.max(0, Number(data.get('opponents') || 0)));
  let mode = baseMode;
  let players = [];
  let bots = [];
  if (baseMode === 'pass') {
    const count = Math.min(4, Math.max(2, Number(data.get('players') || 2)));
    players = Array.from({ length: count }, (_, index) => ({
      name: cleanDisplayName(data.get(`player${index + 1}`), index === 0 ? state.profile.name : `Friend ${index + 1}`),
      avatar: index === 0 ? state.profile.avatar : AVATARS[(index + 4) % AVATARS.length].id
    }));
  } else if (opponents > 0) {
    mode = 'bot';
    bots = BOT_PROFILES.slice(0, opponents).map(bot => ({ ...bot }));
  }
  const timer = Number(data.get('timer') || state.profile.settings.timer || 20);
  const config = {
    mode,
    category: String(data.get('category') || 'all'),
    difficulty: String(data.get('difficulty') || '2') === 'mixed' ? 'mixed' : Number(data.get('difficulty') || 2),
    count: Number(data.get('count') || 10),
    timer,
    players,
    bots,
    opponents
  };
  state.profile = setSetting(state.profile, 'timer', timer);
  closeModal();
  startLocalGame(config);
}

function handleProfileSubmit(form) {
  const data = new FormData(form);
  const name = cleanDisplayName(data.get('name'), '');
  const avatar = AVATARS.some(item => item.id === data.get('avatar')) ? data.get('avatar') : state.profile.avatar;
  if (!name) {
    toast('Choose a name with at least two letters or numbers.', { type: 'error', iconName: 'user' });
    return;
  }
  state.profile = updateProfile(state.profile, { name, avatar });
  state.online.names = { name, avatar };
  closeModal();
  playSound('select');
  toast(`Saved. Welcome, ${name}.`, { type: 'success', iconName: 'user' });
  render();
}

function wireGlobalEvents() {
  if (state.wired) return;
  state.wired = true;

  document.addEventListener('click', event => {
    const element = event.target.closest('[data-action]');
    if (!element || element.disabled) return;
    event.preventDefault();
    handleAction(element.dataset.action, element).catch(error => {
      console.error(error);
      toast('Something went wrong. Please try again.', { type: 'error', iconName: 'x' });
    });
  });

  document.addEventListener('submit', event => {
    const form = event.target;
    if (!['setup-form', 'profile-form', 'arena-create-form', 'arena-join-form'].includes(form.id)) return;
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (form.id === 'setup-form') handleSetupSubmit(form);
    else if (form.id === 'profile-form') handleProfileSubmit(form);
    else if (form.id === 'arena-create-form') submitArenaCreate(false);
    else if (form.id === 'arena-join-form') submitArenaJoin(form);
  });

  document.addEventListener('change', event => {
    const control = event.target.closest('[data-arena-setting]');
    if (!control || !onlineIsHost()) return;
    const wrapper = control.closest('#arena-settings');
    if (!wrapper) return;
    const settings = {};
    wrapper.querySelectorAll('[data-arena-setting]').forEach(field => {
      const value = field.value;
      settings[field.dataset.arenaSetting] = field.dataset.arenaSetting === 'difficulty' && value !== 'mixed' ? Number(value) : field.dataset.arenaSetting === 'count' || field.dataset.arenaSetting === 'timer' ? Number(value) : value;
    });
    state.online.client.updateSettings(settings);
  });

  document.addEventListener('input', event => {
    if (event.target.id === 'arena-join-code') {
      event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      state.online.joinCode = event.target.value;
    }
  });

  document.addEventListener('keydown', event => {
    if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
    if (document.getElementById('modal-root')?.classList.contains('is-open')) return;
    const tag = document.activeElement?.tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || document.activeElement?.isContentEditable) return;
    if (state.route.name === 'play' && state.game) {
      const game = state.game;
      if (game.phase === 'handoff' && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        beginPassTurn();
        return;
      }
      if (game.phase === 'question' && ['1', '2', '3', '4'].includes(event.key)) {
        event.preventDefault();
        answerLocal(Number(event.key) - 1);
        return;
      }
      if (game.phase === 'question') {
        const key = event.key.toLowerCase();
        if (key === 'f' || key === 'h' || key === 's') {
          event.preventDefault();
          useLifeline(key === 'f' ? 'fifty' : key === 'h' ? 'clue' : 'skip');
          return;
        }
      }
      if (game.phase === 'reveal' && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        nextLocalQuestion();
        return;
      }
    }
    if (state.route.name === 'arena' && state.online.game?.phase === 'question' && ['1', '2', '3', '4'].includes(event.key)) {
      event.preventDefault();
      answerOnline(Number(event.key) - 1);
    }
  });

  window.addEventListener('hashchange', () => {
    state.route = parseRoute();
    state.navOpen = false;
    closeModal();
    render();
    scrollTop();
  });

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    state.installPrompt = event;
  });

  window.addEventListener('appinstalled', () => {
    state.installPrompt = null;
    toast('Scripture Showdown is installed.', { type: 'success', iconName: 'book' });
  });

  window.addEventListener('offline', () => {
    toast('You are offline. Local play, the journey, and the daily challenge still work.', { iconName: 'wifi', title: 'Offline mode' });
  });

  document.addEventListener('pointerdown', () => {
    if (state.profile.settings.music && state.profile.settings.sound) startMusic();
  }, { once: true });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      syncLocalTimerDisplay();
      syncOnlineTimerDisplay();
    }
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

function init() {
  state.route = parseRoute();
  applySettings();
  wireArena();
  wireGlobalEvents();
  render();
  registerServiceWorker();
  if (navigator.onLine && state.route.name !== 'arena') {
    setTimeout(() => maybeConnectArena(), 1400);
  }
}

init();

