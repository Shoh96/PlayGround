import { icon } from './icons.js';

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Math.round(Number(value) || 0));
}

export function plural(value, singular, pluralForm = `${singular}s`) {
  return Number(value) === 1 ? singular : pluralForm;
}

export function toast(message, { type = 'info', iconName = 'spark', duration = 3600, title = '' } = {}) {
  const root = $('#toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.innerHTML = `
    <span class="toast__icon">${icon(iconName, 20)}</span>
    <span class="toast__body">${title ? `<strong>${esc(title)}</strong>` : ''}<span>${esc(message)}</span></span>
    <button class="toast__close" aria-label="Dismiss">${icon('x', 16)}</button>`;
  root.append(el);
  const dismiss = () => {
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 260);
  };
  el.querySelector('.toast__close').addEventListener('click', dismiss);
  setTimeout(dismiss, duration);
  return el;
}

let modalEscapeHandler = null;

export function openModal(html, { className = '', onClose = null, labelledBy = 'modal-title' } = {}) {
  closeModal();
  const root = $('#modal-root');
  root.innerHTML = `
    <div class="modal-backdrop" data-modal-backdrop>
      <div class="modal ${className}" role="dialog" aria-modal="true" aria-labelledby="${labelledBy}">
        ${html}
      </div>
    </div>`;
  root.classList.add('is-open');
  document.body.classList.add('has-modal');
  const backdrop = $('[data-modal-backdrop]', root);
  const close = () => {
    if (modalEscapeHandler) document.removeEventListener('keydown', modalEscapeHandler);
    modalEscapeHandler = null;
    root.classList.remove('is-open');
    document.body.classList.remove('has-modal');
    root.innerHTML = '';
    if (onClose) onClose();
  };
  backdrop.addEventListener('click', event => {
    if (event.target === backdrop) close();
  });
  root.querySelectorAll('[data-modal-close]').forEach(button => button.addEventListener('click', close));
  modalEscapeHandler = event => {
    if (event.key === 'Escape') close();
  };
  document.addEventListener('keydown', modalEscapeHandler);
  const focusable = root.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  setTimeout(() => focusable?.focus(), 40);
  return { close };
}

export function closeModal() {
  const root = $('#modal-root');
  if (!root) return;
  if (modalEscapeHandler) {
    document.removeEventListener('keydown', modalEscapeHandler);
    modalEscapeHandler = null;
  }
  root.classList.remove('is-open');
  document.body.classList.remove('has-modal');
  root.innerHTML = '';
}

export function confirmDialog({ title, body, confirmText = 'Confirm', cancelText = 'Cancel', danger = false, iconName = 'spark' }) {
  return new Promise(resolve => {
    const modal = openModal(`
      <div class="modal__head">
        <span class="modal__icon ${danger ? 'modal__icon--danger' : ''}">${icon(iconName, 26)}</span>
        <div>
          <h2 id="modal-title">${esc(title)}</h2>
          <p>${body}</p>
        </div>
      </div>
      <div class="modal__actions">
        <button class="btn btn--ghost" data-modal-close>${esc(cancelText)}</button>
        <button class="btn ${danger ? 'btn--danger' : 'btn--gold'}" data-confirm>${esc(confirmText)}</button>
      </div>`, {
      onClose: () => resolve(false)
    });
    document.querySelector('[data-confirm]').addEventListener('click', () => {
      modal.close();
      resolve(true);
    });
  });
}

export function confetti(count = 90) {
  const root = $('#confetti');
  if (!root) return;
  const colors = ['#f5c86b', '#6fe0c1', '#ff8fb1', '#8b7bf7', '#ffb56b', '#fdf6e4'];
  const reduce = document.documentElement.dataset.motion === 'reduced';
  if (reduce) return;
  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement('i');
    const size = 5 + Math.random() * 8;
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * (0.6 + Math.random())}px`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.8}s`;
    piece.style.animationDuration = `${2.4 + Math.random() * 2.2}s`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    if (i % 3 === 0) piece.style.borderRadius = '50%';
    root.append(piece);
  }
  setTimeout(() => { root.innerHTML = ''; }, 5200);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      area.remove();
    }
  }
}

export async function shareContent({ title, text, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch {
      return false;
    }
  }
  return copyText(url || text);
}

export function scrollTop() {
  window.scrollTo({ top: 0, behavior: document.documentElement.dataset.motion === 'reduced' ? 'auto' : 'smooth' });
}

export function progressRing(progress, color = 'var(--gold)', size = 64, stroke = 5) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(1, progress)));
  return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
    <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
  </svg>`;
}

export function scoreLabel(score) {
  return formatNumber(score);
}

export function initials(name = 'P') {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('') || 'P';
}

export function speakingTime(ms) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${seconds}s`;
}
