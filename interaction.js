const filters = document.querySelector('.filters');
if (filters) {
  const buttons = [...filters.querySelectorAll('button')];
  const cards = [...document.querySelectorAll('.catalog .project-card')];
  const status = document.querySelector('#filter-status');
  filters.hidden = false;
  filters.addEventListener('click', event => {
    const active = event.target.closest('button[data-filter]');
    if (!active) return;
    for (const button of buttons) button.setAttribute('aria-pressed', String(button === active));
    for (const card of cards) card.hidden = Boolean(active.dataset.filter && card.dataset.category !== active.dataset.filter);
    status.textContent = 'Показано проектов: ' + cards.filter(card => !card.hidden).length;
  });
}

const seasonalHero = document.querySelector('.seasonal-hero');
if (seasonalHero) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const ambient = seasonalHero.querySelector('.seasonal-ambient');
  const motionButton = seasonalHero.querySelector('.seasonal-motion-toggle');
  let heroInView = true;
  let userPaused = false;

  async function updateAmbient() {
    if (!ambient) return;
    if (reducedMotion.matches || !heroInView || userPaused || document.hidden) {
      ambient.pause();
      return;
    }
    if (!ambient.hasAttribute('src')) ambient.src = ambient.dataset.video;
    ambient.muted = true;
    try {
      await ambient.play();
      ambient.classList.add('is-playing');
      motionButton.hidden = false;
    } catch {
      if (ambient.error) ambient.classList.remove('is-playing');
    }
  }

  motionButton?.addEventListener('click', () => {
    userPaused = !userPaused;
    motionButton.textContent = userPaused ? 'Включить видео' : 'Остановить видео';
    void updateAmbient();
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      ambient?.classList.remove('is-playing');
      if (motionButton) motionButton.hidden = true;
    }
    void updateAmbient();
  });
  document.addEventListener('visibilitychange', updateAmbient);

  for (const player of document.querySelectorAll('.seasonal-player')) {
    const video = player.querySelector('video');
    const label = player.querySelector('.seasonal-play');
    player.addEventListener('toggle', () => {
      label.textContent = player.open ? 'Свернуть видео' : '▶ Смотреть кейс';
      if (player.open) {
        if (!video.hasAttribute('src')) video.src = player.dataset.video;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }

  const mobileMenu = document.querySelector('.mobile-nav');
  mobileMenu?.addEventListener('click', event => {
    if (event.target.closest('a')) mobileMenu.open = false;
  });

  if ('IntersectionObserver' in window) {
    const screen = new IntersectionObserver(([entry]) => {
      heroInView = entry.isIntersecting;
      void updateAmbient();
    }, {threshold: 0.12});
    screen.observe(seasonalHero);

    const reveal = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        reveal.unobserve(entry.target);
        if (!reducedMotion.matches && entry.target.animate) entry.target.animate([
          {opacity: 0.62, transform: 'translateY(20px)'},
          {opacity: 1, transform: 'none'}
        ], {duration: 460, easing: 'cubic-bezier(.22,.61,.36,1)'});
      }
    }, {threshold: 0.08});
    for (const element of document.querySelectorAll('[data-reveal]')) reveal.observe(element);
  } else {
    void updateAmbient();
  }
}
