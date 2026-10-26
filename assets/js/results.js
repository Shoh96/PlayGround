import {
  action,
  copyText,
  dailyVerse,
  esc,
  icon,
  navigate,
  toast,
  starsMarkup,
  stageFor,
  sfx
} from './core.js';

function percentage(result) {
  if (Number.isFinite(result.accuracy)) return result.accuracy;
  return result.total ? Math.round((result.correct / result.total) * 100) : 0;
}

function resultTitle(result, pct) {
  if (result.mode === 'local') return result.winners?.length > 1 ? 'A shared crown' : `${esc(result.winners?.[0] || 'Winner')} wins`;
  if (result.mode === 'online') return result.won ? 'Victory among friends' : 'A worthy round';
  if (pct === 100) return 'Flawless';
  if (pct >= 85) return 'Illuminated';
  if (pct >= 60) return 'Steady in the Word';
  return 'Keep seeking';
}

function resultSub(result, pct) {
  if (result.mode === 'local') return 'The device passes, the stories stay. Play another round and chase a new high score.';
  if (result.mode === 'online') return result.won ? 'You led the room. Every answer was a shared study.' : 'The room is still glowing. Review the verses and go again.';
  if (result.mode === 'daily') return 'Today’s challenge is complete. Return tomorrow to keep the flame alive.';
  if (result.mode === 'campaign') return pct >= 90 ? 'A stage mastered. The next chapter is open.' : 'The stage is complete. Replay it to earn three stars.';
  return pct >= 80 ? 'A strong round. Your Scripture memory is sharpening.' : 'Every answer is a step deeper into the story.';
}

function reviewMarkup(result) {
  if (!result.review?.length) return '';
  return `<section class="review" id="result-review">
    <div class="section-head">
      <div><h2 class="section-title">Answer review</h2><p class="section-sub">The verse behind every question.</p></div>
      <button class="link-btn" type="button" data-nav="library">Open library ${icon('arrow')}</button>
    </div>
    <div class="review-list">
      ${result.review.map(a => {
        const choice = a.choice === null || a.choice === undefined ? 'No answer' : a.options?.[a.choice];
        const answer = a.options?.[a.answer];
        const mark = a.correct ? `<span class="review-mark ok">${icon('check')}</span>` : `<span class="review-mark no">${icon('x')}</span>`;
        return `<div class="review-item">${mark}<div><div class="review-q">${esc(a.q)}</div><div class="review-a">Your answer: <b>${esc(choice || 'Skipped')}</b> · Correct: <b>${esc(answer || '')}</b>${a.ref ? ` · ${esc(a.ref)}` : ''}</div></div></div>`;
      }).join('')}
    </div>
  </section>`;
}

function podiumMarkup(players = []) {
  if (!players.length) return '';
  const sorted = [...players].sort((a, b) => b.score - a.score || b.correct - a.correct);
  const order = [];
  if (sorted.length === 2) {
    order.push({ player: sorted[0], place: 1, cls: 'first' });
    order.push({ player: sorted[1], place: 2, cls: 'second' });
  } else {
    if (sorted[1]) order.push({ player: sorted[1], place: 2, cls: 'second' });
    if (sorted[0]) order.push({ player: sorted[0], place: 1, cls: 'first' });
    if (sorted[2]) order.push({ player: sorted[2], place: 3, cls: 'third' });
  }
  return `<div class="podium ${sorted.length === 2 ? 'duo' : ''}">
    ${order.map(({ player, place, cls }) => `<div class="podium-place ${cls}">
      <div class="pp-avatar" style="background:${player.color}">${esc((player.name || '?').slice(0, 1).toUpperCase())}</div>
      <div class="pp-name">${esc(player.name)}</div>
      <div class="pp-score">${player.score}</div>
      <div class="pp-bar"></div>
      <div class="pp-rank">${place === 1 ? 'First' : place === 2 ? 'Second' : 'Third'}</div>
    </div>`).join('')}
  </div>`;
}

function onlineScoreboard(result) {
  if (!result.players?.length) return '';
  return `<div class="panel mt-3">
    <div class="panel-title">Final standings</div>
    <div class="panel-sub">${result.code ? `Room ${esc(result.code)} · ` : ''}${result.role === 'host' ? 'You hosted this round.' : 'Hosted round.'}</div>
    <div class="scoreboard">
      ${[...result.players].sort((a, b) => b.score - a.score).map((p, i) => `<div class="player-row">
        <span class="chip ${i === 0 ? 'gold' : ''}">${i + 1}</span>
        <span class="player-dot" style="color:${p.color}"></span>
        <span class="player-name">${esc(p.name)}</span>
        <span class="player-score">${p.score}</span>
      </div>`).join('')}
    </div>
  </div>`;
}

function actionsMarkup(result) {
  const replay = result.mode === 'local' || ['quick', 'campaign', 'daily'].includes(result.mode);
  if (result.mode === 'online') {
    return `<div class="result-actions">
      ${result.role === 'host' ? `<button class="btn btn-primary" type="button" data-action="result-rematch">${icon('refresh')}Rematch</button>` : `<button class="btn btn-soft" type="button" disabled>Waiting for host rematch</button>`}
      <button class="btn btn-soft" type="button" data-action="result-home">${icon('home')}Home</button>
      <button class="btn btn-ghost" type="button" data-action="result-share">${icon('share')}Share score</button>
    </div>`;
  }
  return `<div class="result-actions">
    ${replay ? `<button class="btn btn-primary" type="button" data-action="result-replay">${icon('refresh')}Play again</button>` : ''}
    <button class="btn btn-soft" type="button" data-action="result-home">${icon('home')}Home</button>
    <button class="btn btn-ghost" type="button" data-action="result-library">${icon('book')}Verse library</button>
    <button class="btn btn-ghost" type="button" data-action="result-share">${icon('share')}Share score</button>
  </div>`;
}

export function renderResultsScreen(result) {
  if (!result) {
    return `<div class="screen"><div class="shell narrow center"><div class="empty-state">No results yet. <button class="link-btn" data-nav="home">Play a round</button></div></div></div>`;
  }
  const pct = percentage(result);
  const circumference = 452.39;
  const offset = circumference * (1 - Math.max(0, Math.min(100, pct)) / 100);
  const stage = result.mode === 'campaign' && result.stage ? stageFor(result.stage) : null;
  const verse = dailyVerse();
  const stars = result.stars ?? (pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 40 ? 1 : 0);
  const showStars = ['quick', 'campaign', 'daily'].includes(result.mode);
  const multiplayer = ['local', 'online'].includes(result.mode);

  return `<div class="screen"><div class="result-wrap">
    <section class="result-hero">
      <div class="eyebrow">${multiplayer ? 'Round complete' : stage ? `Stage ${stage.id} complete` : 'Quiz complete'}</div>
      <div class="result-ring">
        <svg viewBox="0 0 160 160" aria-hidden="true">
          <defs><linearGradient id="resultGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7dda2"/><stop offset=".55" stop-color="#e8bf6b"/><stop offset="1" stop-color="#b9852d"/></linearGradient></defs>
          <circle class="ring-track" cx="80" cy="80" r="72"></circle>
          <circle class="ring-bar" cx="80" cy="80" r="72" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"></circle>
        </svg>
        <div class="result-ring-inner"><div class="result-score">${pct}%</div><div class="result-score-label">Accuracy</div></div>
      </div>
      <h1 class="result-title grad-gold">${resultTitle(result, pct)}</h1>
      <p class="result-sub">${resultSub(result, pct)}</p>
      ${showStars ? starsMarkup(stars, 'big') : ''}
      ${multiplayer ? podiumMarkup(result.players) : ''}
    </section>

    <div class="stats-grid">
      <div class="stat-box"><div class="sb-value">${result.score}</div><div class="sb-label">Points</div></div>
      <div class="stat-box"><div class="sb-value">${result.correct}/${result.total}</div><div class="sb-label">Correct</div></div>
      <div class="stat-box"><div class="sb-value">${result.bestStreak || 0}</div><div class="sb-label">Best streak</div></div>
      <div class="stat-box"><div class="sb-value">+${result.xp || 0}</div><div class="sb-label">XP earned</div></div>
    </div>

    ${result.mode === 'online' ? onlineScoreboard(result) : ''}

    <section class="verse-panel">
      <div class="vp-label">${result.mode === 'daily' ? 'Today’s daily verse' : 'A word for the road'}</div>
      <p class="vp-text">“${esc(verse.text)}”</p>
      <div class="vp-ref">${esc(verse.ref)} · KJV</div>
    </section>

    ${actionsMarkup(result)}
    ${reviewMarkup(result)}
  </div></div>`;
}

export function attachResultActions(handlers) {
  action('result-replay', () => {
    const result = handlers.getResult();
    if (!result) return;
    if (result.mode === 'local') {
      handlers.startLocal?.(result.config || {});
      return;
    }
    if (['quick', 'campaign', 'daily'].includes(result.mode)) {
      const config = { ...(result.config || {}) };
      if (result.mode === 'daily') {
        config.mode = 'daily';
        config.label = 'Daily Challenge';
      }
      handlers.startSolo(config);
    }
  });

  action('result-rematch', () => {
    const result = handlers.getResult();
    if (!result || result.mode !== 'online') return;
    const bridge = handlers.onlineBridge?.();
    if (result.role === 'host' && bridge?.rematch) bridge.rematch();
    else toast('Waiting for the host to start a rematch.');
  });

  action('result-home', () => {
    const result = handlers.getResult();
    if (result?.mode === 'online') handlers.onlineBridge?.()?.leave?.();
    navigate('home');
  });

  action('result-library', () => {
    navigate('library');
  });

  action('result-share', async () => {
    const result = handlers.getResult();
    if (!result) return;
    const text = `Lumen — Bible Trivia: ${result.correct}/${result.total} correct · ${result.score} points · ${percentage(result)}% accuracy.`;
    try {
      await copyText(text);
      toast('Score copied. Share the light.');
      sfx.play('click');
    } catch {
      toast('Could not copy automatically.');
    }
  });
}
