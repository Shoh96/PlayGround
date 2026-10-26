import {
  action,
  change,
  closeModal,
  navigate,
  openModal,
  resetSave,
  setSetting,
  startRouter,
  toast
} from './core.js';
import './screens.js';
import './game.js';
import './online.js';

action('setting-theme', ({ value }) => {
  setSetting('theme', value === 'day' ? 'day' : 'night');
  document.querySelectorAll('[data-seg="theme"] button').forEach(button => {
    button.classList.toggle('active', button.dataset.value === value);
  });
});

change('setting-sound', (value, event) => {
  setSetting('sound', Boolean(event.target.checked));
});

change('setting-timer', (value, event) => {
  setSetting('timer', Boolean(event.target.checked));
});

change('setting-motion', (value, event) => {
  setSetting('reduceMotion', Boolean(event.target.checked));
  toast(event.target.checked ? 'Reduced motion on' : 'Reduced motion off');
});

action('reset-progress', () => {
  closeModal();
  openModal({
    title: 'Reset all progress?',
    sub: 'This clears XP, stars, achievements, and streaks on this device.',
    body: '<p class="lede">There is no undo. Your questions and verses will still be here.</p>',
    actions: '<button class="btn btn-soft btn-sm" type="button" data-modal-close>Keep my progress</button><button class="btn btn-gold btn-sm" type="button" data-action="reset-confirm">Reset everything</button>'
  });
});

action('reset-confirm', () => {
  resetSave();
  closeModal();
  toast('Progress reset. A fresh road ahead.');
  navigate('home');
});

startRouter();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(error => {
      console.warn('Lumen service worker unavailable:', error);
    });
  });
}
