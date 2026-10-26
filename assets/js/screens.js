import {
  action,
  addLibraryOpen,
  buildQuestions,
  closeModal,
  campaignStars,
  categoryFor,
  copyText,
  dateKey,
  dailyVerse,
  esc,
  formatDate,
  hasAchievement,
  icon,
  input,
  levelInfo,
  levelFor,
  navigate,
  openHelp,
  openModal,
  openSettings,
  rankInfo,
  registerScreen,
  resetSave,
  save,
  setSetting,
  sfx,
  stageFor,
  starsMarkup,
  toast,
  todayQuestions,
  updateChrome,
  PLAYER_COLORS
} from './core.js';
import { ACHIEVEMENTS, CAMPAIGN, CATEGORIES, LEVELS, QUESTIONS, VERSE_LIBRARY } from './data.js';
import { startLocalGame, startSolo } from './game.js';

let categoryFilter = 'ALL';
let quick = { cat: 'all', level: 0, count: 10 };
let localSetup = { count: 2, names: [save.profile.name || 'Player 1', 'Player 2', 'Player 3', 'Player 4'], rounds: 4, cat: 'all' };
let libraryQuery = '';
let libraryTheme = 'All';

function rebuild(route) {
  navigate(route, { replace: true });
}

function sectionHead(title, sub, link = '', linkLabel = '') {
  return `<div class="section-head"><div><h2 class="section-title">${title}</h2>${sub ? `<p class="section-sub">${sub}</p>` : ''}</div>${link ? `<button class="link-btn" type="button" data-nav="${link}">${linkLabel} ${icon('arrow')}</button>` : ''}</div>`;
}

function categoryCard(cat, actionName = 'category-open') {
  const played = save.stats.categories[cat.id] || 0;
  return `<button class="cat-card" type="button" data-action="${actionName}" data-value="${cat.id}">
    <div class="cat-art">
      <span class="cat-badge chip ${cat.testament === 'OT' ? 'gold' : cat.testament === 'NT' ? 'blue' : 'pink'}">${cat.testament === 'ALL' ? 'Whole Bible' : cat.testament}</span>
      <img src="${cat.icon}" alt="${esc(cat.name)}" loading="lazy">
    </div>
    <div class="cat-body">
      <div class="cat-name">${esc(cat.short)}</div>
      <div class="cat-meta"><span>${played ? `${played} played` : '12 questions'}</span><span class="dot"></span><span class="cat-levels">${LEVELS.map(l => `<i class="${played ? 'on' : ''}"></i>`).join('')}</span></div>
    </div>
  </button>`;
}

function nextCampaignStage() {
  return CAMPAIGN.find(stage => !save.campaign[stage.id]?.stars) || CAMPAIGN[CAMPAIGN.length - 1];
}

function renderHome() {
  const nextStage = nextCampaignStage();
  const nextCat = categoryFor(nextStage.art);
  const dailyDone = save.daily.dates.includes(dateKey());
  const totalStars = CAMPAIGN.reduce((sum, stage) => sum + (save.campaign[stage.id]?.stars || 0), 0);
  const verse = dailyVerse();
  return `<div class="screen"><div class="shell">
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow">A journey through Scripture</div>
        <h1 class="hero-title"><span class="line">Ancient truth.</span><span class="line grad-gold"><em>Modern play.</em></span></h1>
        <p class="hero-desc">240 questions. Twenty worlds. One unfolding story. Play solo, follow the campaign, or gather friends for a live showdown.</p>
        <div class="hero-actions">
          <button class="btn btn-primary btn-lg" type="button" data-nav="quickplay">${icon('play')}Start playing</button>
          <button class="btn btn-gold btn-lg" type="button" data-nav="campaign">${icon('path')}The campaign</button>
        </div>
        <div class="hero-meta"><span>240 questions</span><span>20 categories</span><span>12 chapters</span><span>KJV verses</span></div>
        <div class="quick-stats">
          <div class="quick-stat"><div class="qs-value">${save.stats.played}</div><div class="qs-label">Rounds played</div></div>
          <div class="quick-stat"><div class="qs-value">${save.stats.correct}</div><div class="qs-label">Correct answers</div></div>
          <div class="quick-stat"><div class="qs-value">${totalStars}</div><div class="qs-label">Campaign stars</div></div>
          <div class="quick-stat"><div class="qs-value">${save.daily.streak}</div><div class="qs-label">Daily streak</div></div>
        </div>
      </div>
      <div class="hero-art">
        <div class="window-wrap"><div class="hero-window"><img src="assets/img/hero-window.svg" alt="A luminous stained-glass window"></div></div>
        <div class="float-card verse"><div class="fc-label">${icon('book')}Verse of the day</div><div class="fc-verse">“${esc(verse.text.length > 130 ? `${verse.text.slice(0, 127)}…` : verse.text)}”</div><div class="fc-ref">${esc(verse.ref)}</div></div>
        <div class="float-card daily"><div class="fc-label">${icon('flame')}Daily streak</div><div class="fc-big">${save.daily.streak}</div><div class="fc-small">${dailyDone ? 'Today is complete' : 'Today is waiting'}</div></div>
      </div>
    </section>

    <section class="section">
      ${sectionHead('Choose your path', 'Three ways into the story — all of them rooted in Scripture.')}
      <div class="mode-grid">
        <button class="mode-card featured" type="button" data-nav="quickplay">
          <span class="mode-art"><img src="assets/img/categories/gospels.svg" alt=""></span>
          <span class="mode-icon">${icon('target')}</span>
          <span class="mode-title">Quick Play</span>
          <span class="mode-desc">Pick a category or wander the whole Bible. Ten questions, four options, and a verse behind every answer.</span>
          <span class="mode-foot"><span class="mode-tag">240 questions · solo</span><span class="mode-arrow">${icon('arrow')}</span></span>
        </button>
        <button class="mode-card" type="button" data-nav="campaign">
          <span class="mode-icon">${icon('path')}</span>
          <span class="mode-title">Campaign</span>
          <span class="mode-desc">Twelve chapters from Creation to Revelation. Earn stars and open the road ahead.</span>
          <span class="mode-foot"><span class="mode-tag">${totalStars} / 36 stars</span><span class="mode-arrow">${icon('arrow')}</span></span>
        </button>
      </div>
      <div class="mode-grid mt-2">
        <button class="mode-card" type="button" data-nav="daily">
          <span class="mode-icon">${icon('sun')}</span>
          <span class="mode-title">Daily Challenge</span>
          <span class="mode-desc">Ten fresh questions each day, built to keep the Word in front of you.</span>
          <span class="mode-foot"><span class="mode-tag">${dailyDone ? 'Complete today' : 'Play today'}</span><span class="mode-arrow">${icon('arrow')}</span></span>
        </button>
        <button class="mode-card" type="button" data-nav="local">
          <span class="mode-icon">${icon('users')}</span>
          <span class="mode-title">Pass & Play</span>
          <span class="mode-desc">One device, two to four friends, and a friendly race through Scripture.</span>
          <span class="mode-foot"><span class="mode-tag">2–4 players</span><span class="mode-arrow">${icon('arrow')}</span></span>
        </button>
        <button class="mode-card" type="button" data-nav="online">
          <span class="mode-icon">${icon('globe')}</span>
          <span class="mode-title">Online Rivals</span>
          <span class="mode-desc">Create a room, share a code, and play live from anywhere with a connection.</span>
          <span class="mode-foot"><span class="mode-tag">Room codes</span><span class="mode-arrow">${icon('arrow')}</span></span>
        </button>
      </div>
    </section>

    <section class="section">
      ${sectionHead('Continue the journey', `Stage ${nextStage.id} · ${esc(nextStage.name)}`, 'campaign', 'View all chapters')}
      <div class="panel">
        <div class="flex gap-2" style="align-items:center;flex-wrap:wrap">
          <div class="stage-num">${nextStage.id}</div>
          <div class="grow">
            <div class="stage-kicker">${esc(levelFor(nextStage.level).name)} · ${nextStage.count} questions</div>
            <div class="stage-name">${esc(nextStage.name)}</div>
            <div class="stage-story">${esc(nextStage.story)}</div>
          </div>
          <button class="btn btn-primary" type="button" data-action="campaign-open" data-value="${nextStage.id}">${icon('play')}Continue</button>
        </div>
      </div>
    </section>

    <section class="section">
      ${sectionHead('Explore the library', 'Twenty categories, from Genesis to Revelation.', 'categories', 'All categories')}
      <div class="cat-grid">${CATEGORIES.slice(0, 8).map(cat => categoryCard(cat, 'home-category')).join('')}</div>
    </section>

    <section class="section">
      ${sectionHead('A word for today', 'Read, copy, and carry it with you.', 'library', 'Open the library')}
      <div class="verse-panel">
        <div class="vp-label">${esc(verse.theme)}</div>
        <p class="vp-text">“${esc(verse.text)}”</p>
        <div class="vp-ref">${esc(verse.ref)} · KJV</div>
        <div class="result-actions"><button class="btn btn-soft btn-sm" type="button" data-action="library-open" data-value="${esc(verse.ref)}">${icon('book')}Read & copy</button></div>
      </div>
    </section>
  </div></div>`;
}

function renderQuickplay() {
  const cat = quick.cat === 'all' ? null : categoryFor(quick.cat);
  const level = quick.level ? levelFor(quick.level) : null;
  const pool = QUESTIONS.filter(q => (quick.cat === 'all' || q.cat === quick.cat) && (!quick.level || q.level === quick.level));
  return `<div class="screen"><div class="shell mid">
    <div class="page-top">
      <div class="page-head"><div class="eyebrow">Quick play</div><h1 class="page-title">Set the <em>table</em></h1><p class="page-sub">Choose a category, a depth, and a length. Every answer opens a verse.</p></div>
      <button class="btn btn-ghost btn-sm" type="button" data-nav="home">${icon('arrow')}Home</button>
    </div>
    <div class="setup-grid">
      <div>
        <div class="panel">
          <div class="panel-title">Category</div>
          <div class="panel-sub">Stay in one world, or take the whole sweep of Scripture.</div>
          <div class="cat-pick-grid">
            <button class="cat-pick all ${quick.cat === 'all' ? 'active' : ''}" type="button" data-action="quick-cat" data-value="all">${icon('globe')}Whole Bible</button>
            ${CATEGORIES.map(c => `<button class="cat-pick ${quick.cat === c.id ? 'active' : ''}" type="button" data-action="quick-cat" data-value="${c.id}"><img src="${c.icon}" alt="" loading="lazy"><span class="cp-name">${esc(c.short)}</span></button>`).join('')}
          </div>
        </div>
        <div class="panel">
          <div class="panel-title">Difficulty</div>
          <div class="panel-sub">Every level draws on the same faithful question bank.</div>
          <div class="segmented">
            <button class="${!quick.level ? 'active' : ''}" type="button" data-action="quick-level" data-value="0">All levels</button>
            ${LEVELS.map(l => `<button class="${quick.level === l.n ? 'active' : ''}" type="button" data-action="quick-level" data-value="${l.n}">${esc(l.name)}</button>`).join('')}
          </div>
          <div class="option-row">
            <div><span class="field-label">Number of questions</span><div class="segmented">
              ${[10, 15, 20].map(n => `<button class="${quick.count === n ? 'active' : ''}" type="button" data-action="quick-count" data-value="${n}">${n}</button>`).join('')}
            </div></div>
            <div><span class="field-label">Surprise</span><button class="btn btn-soft" type="button" data-action="quick-random" style="width:100%">${icon('spark')}Surprise me</button></div>
          </div>
        </div>
      </div>
      <aside class="panel summary-card">
        <div class="panel-title">Your round</div>
        <div class="panel-sub">A clean start, built around the Word.</div>
        <div class="summary-line"><span>Category</span><strong>${cat ? esc(cat.name) : 'Whole Bible'}</strong></div>
        <div class="summary-line"><span>Difficulty</span><strong>${level ? esc(level.name) : 'All levels'}</strong></div>
        <div class="summary-line"><span>Questions</span><strong>${quick.count}</strong></div>
        <div class="summary-line"><span>Available</span><strong>${pool.length}</strong></div>
        <div class="summary-line"><span>Time per question</span><strong>${save.settings.timer ? '20 seconds' : 'Untimed'}</strong></div>
        <button class="btn btn-primary btn-block btn-lg mt-3" type="button" data-action="quick-start">${icon('play')}Begin quiz</button>
        <p class="muted mt-2" style="font-size:11px">Lifelines: fifty-fifty, a Scripture hint, and one skip.</p>
      </aside>
    </div>
  </div></div>`;
}

function renderCategories() {
  const filters = [{ id: 'ALL', label: 'All' }, { id: 'OT', label: 'Old Testament' }, { id: 'NT', label: 'New Testament' }, { id: 'ALL2', label: 'Whole Bible' }];
  const shown = CATEGORIES.filter(c => categoryFilter === 'ALL' || (categoryFilter === 'ALL2' ? c.testament === 'ALL' : c.testament === categoryFilter));
  return `<div class="screen"><div class="shell">
    <div class="page-top">
      <div class="page-head"><div class="eyebrow">The library</div><h1 class="page-title">Twenty <em>worlds</em></h1><p class="page-sub">Every category holds twelve questions across four depths. Choose a world and begin.</p></div>
      <button class="btn btn-ghost btn-sm" type="button" data-nav="home">${icon('arrow')}Home</button>
    </div>
    <div class="filters">
      ${filters.map(f => `<button class="filter-chip ${categoryFilter === f.id ? 'active' : ''}" type="button" data-action="cat-filter" data-value="${f.id}">${f.label}</button>`).join('')}
    </div>
    <div class="cat-grid">${shown.map(cat => categoryCard(cat)).join('')}</div>
  </div></div>`;
}

function renderCampaign() {
  const completed = CAMPAIGN.filter(stage => save.campaign[stage.id]?.stars).length;
  const totalStars = CAMPAIGN.reduce((sum, stage) => sum + (save.campaign[stage.id]?.stars || 0), 0);
  return `<div class="screen"><div class="shell">
    <div class="page-top">
      <div class="page-head"><div class="eyebrow">The campaign</div><h1 class="page-title">The whole <em>story</em></h1><p class="page-sub">Twelve chapters from the first light to the new creation. Earn stars, unlock the road, and finish the journey.</p></div>
      <button class="btn btn-ghost btn-sm" type="button" data-nav="home">${icon('arrow')}Home</button>
    </div>
    <div class="campaign-head">
      <div>
        <div class="eyebrow">Pilgrim’s progress</div>
        <h2 class="section-title">${completed} of 12 chapters complete</h2>
        <div class="campaign-progress-wrap">
          <div class="campaign-progress-label"><span>${totalStars} stars earned</span><span>${Math.round((completed / CAMPAIGN.length) * 100)}%</span></div>
          <div class="campaign-progress"><i style="width:${(completed / CAMPAIGN.length) * 100}%"></i></div>
        </div>
      </div>
      <div class="chip gold">${icon('star')}${totalStars} / 36</div>
    </div>
    <div class="journey">
      ${CAMPAIGN.map(stage => {
        const unlocked = stage.id === 1 || Boolean(save.campaign[stage.id - 1]?.stars);
        const stars = campaignStars(stage);
        const isCurrent = unlocked && !stars;
        return `<button class="stage-row ${unlocked ? '' : 'locked'} ${isCurrent ? 'is-current' : ''}" type="button" data-action="campaign-open" data-value="${stage.id}">
          <span class="stage-num">${unlocked ? stage.id : icon('lock')}</span>
          <span class="stage-art"><img src="assets/img/categories/${stage.art}.svg" alt="" loading="lazy"></span>
          <span class="stage-info">
            <span class="stage-kicker">Stage ${stage.id} · ${esc(levelFor(stage.level).name)}</span>
            <span class="stage-name">${esc(stage.name)}</span>
            <span class="stage-story">${esc(stage.story)}</span>
          </span>
          <span class="stage-right">
            ${stars ? starsMarkup(stars) : `<span class="chip ${isCurrent ? 'gold' : ''}">${isCurrent ? 'Continue' : 'Locked'}</span>`}
            <span class="stage-cta ${unlocked ? '' : 'lock'}">${unlocked ? (stars ? 'Replay' : 'Begin chapter') : `${icon('lock')}Complete stage ${stage.id - 1}`}</span>
          </span>
        </button>`;
      }).join('')}
    </div>
  </div></div>`;
}

function renderDaily() {
  const key = dateKey();
  const done = save.daily.dates.includes(key);
  const verse = dailyVerse();
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const k = d.toISOString().slice(0, 10);
    days.push({ key: k, label: d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2), done: save.daily.dates.includes(k), today: k === key });
  }
  return `<div class="screen"><div class="shell mid">
    <div class="page-top">
      <div class="page-head"><div class="eyebrow">Daily challenge</div><h1 class="page-title">Today’s <em>portion</em></h1><p class="page-sub">${formatDate(new Date())}</p></div>
      <button class="btn btn-ghost btn-sm" type="button" data-nav="home">${icon('arrow')}Home</button>
    </div>
    <div class="daily-hero">
      <div class="eyebrow">${done ? 'Completed today' : 'Ten questions waiting'}</div>
      <h2 class="section-title">${done ? 'The flame is still burning.' : 'Keep the flame alive.'}</h2>
      <p class="lede mt-2" style="max-width:600px">A fresh ten-question set, the same for everyone, drawn across the whole Bible. Finish it to extend your streak.</p>
      <div class="flex gap-1 mt-3" style="flex-wrap:wrap">
        <button class="btn btn-primary" type="button" data-action="daily-start">${icon(done ? 'refresh' : 'play')}${done ? 'Play again for practice' : 'Begin daily challenge'}</button>
        <button class="btn btn-soft" type="button" data-nav="library">${icon('book')}Verse library</button>
      </div>
      ${done ? `<div class="daily-result-badge">${icon('check')}Today’s challenge complete</div>` : ''}
    </div>
    <div class="daily-grid">
      <div class="daily-card">
        <div class="panel-title">Your streak</div>
        <div class="streak-card mt-2">
          <div class="streak-flame">${icon('flame')}</div>
          <div><div class="streak-val">${save.daily.streak}</div><div class="streak-label">days in a row</div></div>
          <div class="streak-mult">${save.daily.streak >= 7 ? 'Faithful' : 'Keep going'}</div>
        </div>
        <div class="streak-days">
          ${days.map(d => `<div class="streak-day ${d.done ? 'done' : ''} ${d.today ? 'today' : ''}">${d.label}</div>`).join('')}
        </div>
      </div>
      <div class="daily-card">
        <div class="vp-label">Today’s verse</div>
        <p class="vp-text" style="font-family:var(--font-display);font-style:italic;font-size:23px;line-height:1.4;margin:10px 0 8px">“${esc(verse.text)}”</p>
        <div class="vp-ref">${esc(verse.ref)} · ${esc(verse.theme)}</div>
      </div>
    </div>
    <div class="panel mt-3">
      <div class="panel-title">Why a daily challenge?</div>
      <p class="muted mt-1">Small, repeated encounters with Scripture build lasting memory. Ten questions take only a few minutes, and every answer gives you the verse itself.</p>
      <div class="summary-line"><span>Questions</span><strong>10</strong></div>
      <div class="summary-line"><span>Difficulty mix</span><strong>4 easy · 4 medium · 2 hard</strong></div>
      <div class="summary-line"><span>Reward</span><strong>XP + streak + daily achievement</strong></div>
    </div>
  </div></div>`;
}

function verseGridMarkup() {
  const q = libraryQuery.trim().toLowerCase();
  const verses = VERSE_LIBRARY.filter(v => {
    const matchesTheme = libraryTheme === 'All' || v.theme === libraryTheme;
    const matchesQuery = !q || v.text.toLowerCase().includes(q) || v.ref.toLowerCase().includes(q) || v.theme.toLowerCase().includes(q);
    return matchesTheme && matchesQuery;
  });
  if (!verses.length) return `<div class="empty-state">No verses match that search. Try another word or theme.</div>`;
  return verses.map(v => `<button class="verse-tile" type="button" data-action="library-open" data-value="${esc(v.ref)}">
    <span class="vt-theme">${esc(v.theme)}</span>
    <span class="vt-text">“${esc(v.text.length > 150 ? `${v.text.slice(0, 147)}…` : v.text)}”</span>
    <span class="vt-foot"><span class="vt-ref">${esc(v.ref)}</span><span class="copy-btn" aria-hidden="true">${icon('copy')}</span></span>
    <span class="vt-mark">”</span>
  </button>`).join('');
}

function renderLibrary() {
  const themes = ['All', ...new Set(VERSE_LIBRARY.map(v => v.theme))];
  return `<div class="screen"><div class="shell">
    <div class="page-top">
      <div class="page-head"><div class="eyebrow">Verse library</div><h1 class="page-title">Hidden <em>word</em></h1><p class="page-sub">Forty passages to read, copy, and return to. Open a verse to mark it read.</p></div>
      <button class="btn btn-ghost btn-sm" type="button" data-nav="home">${icon('arrow')}Home</button>
    </div>
    <div class="lib-hero">
      <div class="votd">
        <div class="eyebrow">Verse of the day</div>
        <p class="vp-text">“${esc(dailyVerse().text)}”</p>
        <div class="vp-ref">${esc(dailyVerse().ref)} · ${esc(dailyVerse().theme)}</div>
      </div>
      <div class="lib-side">
        <div class="lib-stat"><div class="ls-val">${VERSE_LIBRARY.length}</div><div class="ls-label">Passages</div></div>
        <div class="lib-stat"><div class="ls-val">${save.library.read.length}</div><div class="ls-label">Marked as read</div></div>
        <div class="lib-stat"><div class="ls-val">${save.library.opened}</div><div class="ls-label">Times opened</div></div>
      </div>
    </div>
    <div class="search-box">${icon('search')}<input class="input" type="search" placeholder="Search by word, reference, or theme…" value="${esc(libraryQuery)}" data-input="library-query" aria-label="Search verses"></div>
    <div class="filters">
      ${themes.map(theme => `<button class="filter-chip ${libraryTheme === theme ? 'active' : ''}" type="button" data-action="library-theme" data-value="${esc(theme)}">${esc(theme)}</button>`).join('')}
    </div>
    <div class="verse-grid" id="verse-grid">${verseGridMarkup()}</div>
  </div></div>`;
}

function orbMarkup() {
  const rank = rankInfo();
  const level = levelInfo();
  const pct = rank.progress;
  const circumference = 439.82;
  return `<div class="level-orb">
    <svg viewBox="0 0 160 160" aria-hidden="true">
      <circle class="lo-track" cx="80" cy="80" r="70"></circle>
      <circle class="lo-bar" cx="80" cy="80" r="70" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference * (1 - pct)}"></circle>
    </svg>
    <div class="level-orb-inner"><div class="lo-level">${level.level}</div><div class="lo-label">${esc(rank.name)}</div></div>
  </div>`;
}

function renderProfile() {
  const rank = rankInfo();
  const level = levelInfo();
  const accuracy = save.stats.answered ? Math.round((save.stats.correct / save.stats.answered) * 100) : 0;
  const next = rank.next ? `Next rank: ${rank.next.name} at ${rank.next.min} XP` : 'Highest rank reached';
  return `<div class="screen"><div class="shell mid">
    <div class="page-top">
      <div class="page-head"><div class="eyebrow">Pilgrim profile</div><h1 class="page-title">Your <em>journey</em></h1><p class="page-sub">Every answer adds a little light.</p></div>
      <button class="btn btn-ghost btn-sm" type="button" data-nav="home">${icon('arrow')}Home</button>
    </div>
    <div class="profile-head">
      ${orbMarkup()}
      <div>
        <div class="eyebrow">${esc(rank.name)}</div>
        <div class="profile-name">${esc(save.profile.name)}</div>
        <div class="profile-rank">Level ${level.level} · ${save.xp} XP</div>
        <div class="xp-line"><div class="xp-track"><i style="width:${Math.round(rank.progress * 100)}%"></i></div><span>${next}</span></div>
      </div>
      <div class="flex gap-1" style="flex-wrap:wrap">
        <button class="btn btn-soft btn-sm" type="button" data-action="profile-edit">${icon('eye')}Edit name</button>
        <button class="btn btn-ghost btn-sm" type="button" data-action="profile-help">${icon('help')}How to play</button>
        <button class="btn btn-ghost btn-sm" type="button" data-action="profile-settings">${icon('settings')}Settings</button>
      </div>
    </div>
    <div class="profile-stats">
      <div class="stat-box"><div class="sb-value">${save.stats.played}</div><div class="sb-label">Rounds</div></div>
      <div class="stat-box"><div class="sb-value">${accuracy}%</div><div class="sb-label">Accuracy</div></div>
      <div class="stat-box"><div class="sb-value">${save.stats.bestStreak}</div><div class="sb-label">Best streak</div></div>
      <div class="stat-box"><div class="sb-value">${save.stats.totalScore}</div><div class="sb-label">Total points</div></div>
    </div>
    <div class="grid" style="display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,.65fr);gap:18px;align-items:start">
      <div class="panel">
        <div class="panel-title">Achievements</div>
        <div class="panel-sub">${save.achievements.length} of ${ACHIEVEMENTS.length} unlocked</div>
        <div class="achievement-grid">
          ${ACHIEVEMENTS.map(a => {
            const unlocked = hasAchievement(a.id);
            return `<div class="achievement ${unlocked ? '' : 'locked'}">
              <div class="achievement-icon">${icon(unlocked ? a.icon : 'lock')}</div>
              <div><div class="achievement-name">${esc(a.name)}</div><div class="achievement-desc">${esc(a.desc)}</div></div>
              <div class="achievement-state">${unlocked ? 'Unlocked' : 'Locked'}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div>
        <div class="panel">
          <div class="panel-title">Recent rounds</div>
          <div class="panel-sub">Your latest ten games.</div>
          ${save.history.length ? save.history.slice(0, 6).map(h => `<div class="summary-line"><span>${esc(h.label || 'Quiz')} · ${new Date(h.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span><strong>${h.correct}/${h.total} · ${h.score}</strong></div>`).join('') : `<div class="empty-state">No rounds yet. Your story starts with one question.</div>`}
        </div>
        <div class="panel">
          <div class="panel-title">Multiplayer</div>
          <div class="summary-line"><span>Pass & play wins</span><strong>${save.stats.localWins}</strong></div>
          <div class="summary-line"><span>Online wins</span><strong>${save.stats.onlineWins}</strong></div>
          <div class="summary-line"><span>Daily streak</span><strong>${save.daily.streak} days</strong></div>
          <button class="btn btn-soft btn-sm btn-block mt-2" type="button" data-nav="multiplayer">${icon('users')}Find a match</button>
        </div>
        <div class="panel">
          <div class="panel-title">Danger zone</div>
          <p class="muted" style="font-size:11.5px">Reset XP, streaks, achievements, and history on this device.</p>
          <button class="btn btn-ghost btn-sm mt-2" type="button" data-action="profile-reset">${icon('trash')}Reset all progress</button>
        </div>
      </div>
    </div>
  </div></div>`;
}

function renderMultiplayer() {
  return `<div class="screen"><div class="shell mid">
    <div class="page-top">
      <div class="page-head"><div class="eyebrow">Multiplayer</div><h1 class="page-title">Gather the <em>room</em></h1><p class="page-sub">Pass one device around the table, or open a live room with a code.</p></div>
      <button class="btn btn-ghost btn-sm" type="button" data-nav="home">${icon('arrow')}Home</button>
    </div>
    <div class="online-grid">
      <button class="online-card" type="button" data-nav="local">
        <div class="online-icon">${icon('users')}</div>
        <div class="online-title">Pass & Play</div>
        <div class="online-desc">Two to four players share one screen. Each player gets the same number of questions; hand the device on after every answer.</div>
        <span class="btn btn-soft btn-sm">${icon('play')}Set up locally</span>
      </button>
      <button class="online-card" type="button" data-nav="online">
        <div class="online-icon">${icon('globe')}</div>
        <div class="online-title">Online Rivals</div>
        <div class="online-desc">Create a private room, share the four-letter code, and answer the same questions live. The host keeps every score in sync.</div>
        <span class="btn btn-soft btn-sm">${icon('wifi')}Create or join</span>
      </button>
    </div>
    <div class="panel mt-3">
      <div class="panel-title">Good to know</div>
      <div class="summary-line"><span>Local players</span><strong>2–4</strong></div>
      <div class="summary-line"><span>Online players</span><strong>2–8</strong></div>
      <div class="summary-line"><span>Online connection</span><strong>Peer-to-peer · WebRTC</strong></div>
      <div class="summary-line"><span>Your multiplayer record</span><strong>${save.stats.localWins + save.stats.onlineWins} wins</strong></div>
      <p class="muted mt-2" style="font-size:11.5px">Online play needs an internet connection to introduce the players. Once connected, the round is synchronized by the host.</p>
    </div>
  </div></div>`;
}

function localPlayerRow(name, index) {
  return `<div class="player-edit-row">
    <span class="color-dot" style="color:${PLAYER_COLORS[index]};background:${PLAYER_COLORS[index]}"></span>
    <input class="input" type="text" maxlength="18" value="${esc(name)}" placeholder="Player ${index + 1}" data-input="local-name" data-value="${index}" aria-label="Player ${index + 1} name">
    ${index >= 2 ? `<button class="remove-player" type="button" data-action="local-remove" data-value="${index}" aria-label="Remove player ${index + 1}">${icon('trash')}</button>` : ''}
  </div>`;
}

function renderLocal() {
  const players = localSetup.names.slice(0, localSetup.count);
  const cat = localSetup.cat === 'all' ? 'Whole Bible' : categoryFor(localSetup.cat).name;
  return `<div class="screen"><div class="shell mid">
    <div class="page-top">
      <div class="page-head"><div class="eyebrow">Pass & play</div><h1 class="page-title">Set the <em>table</em></h1><p class="page-sub">One device, two to four friends, and a question rotation that keeps everyone guessing.</p></div>
      <button class="btn btn-ghost btn-sm" type="button" data-nav="multiplayer">${icon('arrow')}Back</button>
    </div>
    <div class="setup-grid">
      <div>
        <div class="panel">
          <div class="panel-title">Players</div>
          <div class="panel-sub">Names stay on this device. Player one starts.</div>
          ${players.map((name, i) => localPlayerRow(name, i)).join('')}
          ${localSetup.count < 4 ? `<button class="add-player" type="button" data-action="local-add">${icon('plus')}Add player</button>` : ''}
        </div>
        <div class="panel">
          <div class="panel-title">Round settings</div>
          <div class="panel-sub">Questions rotate evenly through the table.</div>
          <span class="field-label">Category</span>
          <select class="input" data-change="local-cat">
            <option value="all" ${localSetup.cat === 'all' ? 'selected' : ''}>Whole Bible</option>
            ${CATEGORIES.map(c => `<option value="${c.id}" ${localSetup.cat === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select>
          <span class="field-label mt-2" style="display:block">Questions per player</span>
          <div class="segmented">
            ${[3, 4, 5].map(n => `<button class="${localSetup.rounds === n ? 'active' : ''}" type="button" data-action="local-rounds" data-value="${n}">${n}</button>`).join('')}
          </div>
        </div>
      </div>
      <aside class="panel summary-card">
        <div class="panel-title">Match card</div>
        <div class="panel-sub">Everyone gets the same chance.</div>
        <div class="summary-line"><span>Players</span><strong>${players.length}</strong></div>
        <div class="summary-line"><span>Category</span><strong id="local-cat-label">${esc(cat)}</strong></div>
        <div class="summary-line"><span>Each player</span><strong>${localSetup.rounds} questions</strong></div>
        <div class="summary-line"><span>Total</span><strong>${players.length * localSetup.rounds} questions</strong></div>
        <div class="avatars mt-3">${players.map((name, i) => `<span class="mini-avatar" style="background:${PLAYER_COLORS[i]}">${esc(name.slice(0, 1).toUpperCase() || (i + 1))}</span>`).join('')}</div>
        <button class="btn btn-primary btn-block btn-lg mt-3" type="button" data-action="local-start">${icon('play')}Start match</button>
        <p class="muted mt-2" style="font-size:11px">A pass screen hides each question until the right player is ready.</p>
      </aside>
    </div>
  </div></div>`;
}

action('home-category', ({ value }) => {
  quick.cat = value;
  navigate('quickplay');
});

action('category-open', ({ value }) => {
  const cat = categoryFor(value);
  quick.cat = value;
  openModal({
    title: cat.name,
    sub: cat.blurb,
    body: `<div class="q-meta"><div class="q-cat-art"><img src="${cat.icon}" alt=""></div><div><div class="q-cat-name">${esc(cat.short)}</div><div class="q-cat-sub">12 questions · four levels</div></div><div class="q-meta-right"><span class="chip ${cat.testament === 'OT' ? 'gold' : cat.testament === 'NT' ? 'blue' : 'pink'}">${cat.testament === 'ALL' ? 'Whole Bible' : cat.testament}</span></div></div>
      <div class="summary-line mt-2"><span>Easy</span><strong>3 questions</strong></div>
      <div class="summary-line"><span>Medium</span><strong>3 questions</strong></div>
      <div class="summary-line"><span>Hard</span><strong>3 questions</strong></div>
      <div class="summary-line"><span>Expert</span><strong>3 questions</strong></div>`,
    actions: `<button class="btn btn-soft btn-sm" type="button" data-modal-close>Not yet</button><button class="btn btn-primary btn-sm" type="button" data-action="category-play" data-value="${cat.id}">${icon('play')}Quick play this</button>`
  });
});

action('category-play', ({ value }) => {
  quick.cat = value;
  quick.level = 0;
  quick.count = 10;
  closeModal();
  startSolo({ mode: 'quick', label: categoryFor(value).short, cat: value, levels: [1, 2, 3, 4], count: 10 });
});

action('cat-filter', ({ value }) => {
  categoryFilter = value;
  rebuild('categories');
});

action('quick-cat', ({ value }) => {
  quick.cat = value;
  rebuild('quickplay');
});

action('quick-level', ({ value }) => {
  quick.level = Number(value);
  rebuild('quickplay');
});

action('quick-count', ({ value }) => {
  quick.count = Number(value);
  rebuild('quickplay');
});

action('quick-random', () => {
  const cats = ['all', ...CATEGORIES.map(c => c.id)];
  quick.cat = cats[Math.floor(Math.random() * cats.length)];
  quick.level = Math.floor(Math.random() * 5);
  quick.count = [10, 15, 20][Math.floor(Math.random() * 3)];
  sfx.play('click');
  rebuild('quickplay');
});

action('quick-start', () => {
  startSolo({
    mode: 'quick',
    label: quick.cat === 'all' ? 'Quick Play' : categoryFor(quick.cat).short,
    cat: quick.cat,
    levels: quick.level ? [quick.level] : [1, 2, 3, 4],
    count: quick.count
  });
});

action('campaign-open', ({ value }) => {
  const stage = stageFor(value);
  if (stage.id !== 1 && !save.campaign[stage.id - 1]?.stars) {
    toast(`Complete stage ${stage.id - 1} to unlock this chapter.`);
    return;
  }
  const stars = campaignStars(stage);
  openModal({
    title: `Stage ${stage.id}: ${stage.name}`,
    sub: stage.story,
    body: `<div class="stage-art" style="width:100%;height:150px;border-radius:14px;overflow:hidden;margin-bottom:16px"><img src="assets/img/categories/${stage.art}.svg" alt="" style="width:100%;height:100%;object-fit:cover"></div>
      <div class="summary-line"><span>Difficulty</span><strong>${esc(levelFor(stage.level).name)}</strong></div>
      <div class="summary-line"><span>Questions</span><strong>${stage.count}</strong></div>
      <div class="summary-line"><span>Categories</span><strong>${stage.cats.map(id => esc(categoryFor(id).short)).join(' · ')}</strong></div>
      <div class="summary-line"><span>Your stars</span><strong>${stars} / 3</strong></div>
      ${stars ? `<div class="mt-2">${starsMarkup(stars, 'big')}</div>` : ''}`,
    actions: `<button class="btn btn-soft btn-sm" type="button" data-modal-close>Back</button><button class="btn btn-primary btn-sm" type="button" data-action="campaign-start" data-value="${stage.id}">${icon(stars ? 'refresh' : 'play')}${stars ? 'Replay chapter' : 'Begin chapter'}</button>`
  });
});

action('campaign-start', ({ value }) => {
  closeModal();
  const stage = stageFor(value);
  startSolo({ mode: 'campaign', label: `Stage ${stage.id}`, stage: stage.id, count: stage.count });
});

action('daily-start', () => {
  startSolo({ mode: 'daily', label: 'Daily Challenge', count: 10 });
});

action('library-open', ({ value }) => {
  const verse = VERSE_LIBRARY.find(v => v.ref === value);
  if (!verse) return;
  addLibraryOpen(verse.ref);
  openModal({
    title: verse.ref,
    sub: `${verse.theme} · King James Version`,
    body: `<blockquote class="vp-text" style="font-family:var(--font-display);font-style:italic;font-size:26px;line-height:1.45;margin:6px 0 18px;color:var(--ink-soft)">“${esc(verse.text)}”</blockquote>
      <div class="online-note">Marked as read. Read 25 different verses to unlock the Hidden Word achievement.</div>`,
    actions: `<button class="btn btn-soft btn-sm" type="button" data-modal-close>Close</button><button class="btn btn-primary btn-sm" type="button" data-action="library-copy" data-value="${esc(verse.ref)}">${icon('copy')}Copy verse</button>`
  });
});

action('library-copy', async ({ value }) => {
  const verse = VERSE_LIBRARY.find(v => v.ref === value);
  if (!verse) return;
  try {
    await copyText(`“${verse.text}” — ${verse.ref} (KJV)`);
    toast('Verse copied.');
    sfx.play('click');
  } catch {
    toast('Could not copy automatically.');
  }
});

action('library-theme', ({ value }) => {
  libraryTheme = value;
  rebuild('library');
});

input('library-query', value => {
  libraryQuery = value;
  const grid = document.getElementById('verse-grid');
  if (grid) grid.innerHTML = verseGridMarkup();
});

action('profile-edit', () => {
  openModal({
    title: 'Your name',
    sub: 'This is how you appear in online rooms.',
    body: `<label class="field-label">Display name</label><input class="input" id="profile-name-input" type="text" maxlength="18" value="${esc(save.profile.name)}" autocomplete="nickname">`,
    actions: `<button class="btn btn-soft btn-sm" type="button" data-modal-close>Cancel</button><button class="btn btn-primary btn-sm" type="button" data-action="profile-save">Save name</button>`,
    onMount: modal => {
      const inputEl = modal.querySelector('#profile-name-input');
      inputEl?.addEventListener('keydown', event => {
        if (event.key === 'Enter') document.querySelector('[data-action="profile-save"]')?.click();
      });
    }
  });
});

action('profile-save', () => {
  const field = document.getElementById('profile-name-input');
  const name = field?.value.trim().slice(0, 18);
  if (!name) {
    toast('Please enter a name.');
    return;
  }
  save.profile.name = name;
  localSetup.names[0] = name;
  import('./core.js').then(({ persist }) => persist());
  updateChrome();
  closeModal();
  toast(`Welcome, ${name}.`);
  rebuild('profile');
});

action('profile-help', () => openHelp());
action('profile-settings', () => openSettings());
action('profile-reset', () => {
  openModal({
    title: 'Reset all progress?',
    sub: 'This cannot be undone.',
    body: `<p class="lede">Your XP, campaign stars, achievements, verse history, and daily streak will be cleared on this device.</p>`,
    actions: `<button class="btn btn-soft btn-sm" type="button" data-modal-close>Keep my progress</button><button class="btn btn-gold btn-sm" type="button" data-action="profile-reset-confirm">Reset everything</button>`
  });
});

action('profile-reset-confirm', () => {
  resetSave();
  closeModal();
  toast('Progress reset. A fresh road ahead.');
  rebuild('home');
});

action('local-add', () => {
  if (localSetup.count >= 4) return;
  localSetup.count += 1;
  if (!localSetup.names[localSetup.count - 1]) localSetup.names[localSetup.count - 1] = `Player ${localSetup.count}`;
  rebuild('local');
});

action('local-remove', ({ value }) => {
  if (localSetup.count <= 2) return;
  const index = Number(value);
  localSetup.names.splice(index, 1);
  localSetup.names.push(`Player ${localSetup.names.length + 1}`);
  localSetup.count -= 1;
  rebuild('local');
});

action('local-rounds', ({ value }) => {
  localSetup.rounds = Number(value);
  rebuild('local');
});

action('local-start', () => {
  const players = localSetup.names.slice(0, localSetup.count).map((name, i) => ({
    name: name.trim() || `Player ${i + 1}`,
    color: PLAYER_COLORS[i]
  }));
  startLocalGame({ players, rounds: localSetup.rounds, cat: localSetup.cat });
});

input('local-name', (value, event, target) => {
  const index = Number(target.dataset.value);
  localSetup.names[index] = value;
  const avatars = document.querySelectorAll('.avatars .mini-avatar');
  if (avatars[index]) avatars[index].textContent = (value.trim() || String(index + 1)).slice(0, 1).toUpperCase();
});

import { change } from './core.js';

change('local-cat', value => {
  localSetup.cat = value;
  const label = document.getElementById('local-cat-label');
  if (label) label.textContent = value === 'all' ? 'Whole Bible' : categoryFor(value).name;
});

registerScreen('home', { render: renderHome });
registerScreen('quickplay', { render: renderQuickplay });
registerScreen('categories', { render: renderCategories });
registerScreen('campaign', { render: renderCampaign });
registerScreen('daily', { render: renderDaily });
registerScreen('library', { render: renderLibrary });
registerScreen('profile', { render: renderProfile });
registerScreen('multiplayer', { render: renderMultiplayer });
registerScreen('local', { render: renderLocal });
