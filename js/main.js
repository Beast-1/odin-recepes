(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Footer year ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Live local clock (Sikkim, India -> Asia/Kolkata) ---------- */
  const clockEl = document.getElementById('localClock');
  if (clockEl) {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
    });
    const tick = () => { clockEl.textContent = `SIKKIM · IN · ${fmt.format(new Date())} IST`; };
    tick();
    setInterval(tick, 30000);
  }

  /* ---------- Live GitHub stat (public API, no auth needed) ---------- */
  const ghStatEl = document.getElementById('ghStat');
  if (ghStatEl) {
    fetch('https://api.github.com/users/Beast-1')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        const repos = data.public_repos ?? 0;
        ghStatEl.textContent = `${repos} public repo${repos === 1 ? '' : 's'} on GitHub`;
      })
      .catch(() => { ghStatEl.remove(); });
  }

  /* ---------- Nav scroll state ---------- */
  const nav = document.getElementById('nav');
  if (nav) {
    const onScroll = () => {
      nav.classList.toggle('is-scrolled', window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Mobile menu ---------- */
  const navToggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  if (navToggle && mobileMenu) {
    const closeMenu = () => {
      navToggle.setAttribute('aria-expanded', 'false');
      mobileMenu.classList.remove('is-open');
      document.body.style.overflow = '';
    };
    const openMenu = () => {
      navToggle.setAttribute('aria-expanded', 'true');
      mobileMenu.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    };
    navToggle.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.contains('is-open');
      isOpen ? closeMenu() : openMenu();
    });
    mobileMenu.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
  }

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if (revealEls.length) {
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      revealEls.forEach((el) => el.classList.add('is-visible'));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
      );
      document.querySelectorAll('section').forEach((section) => {
        section.querySelectorAll('[data-reveal]').forEach((el, i) => {
          el.style.transitionDelay = `${Math.min(i, 5) * 80}ms`;
        });
      });
      revealEls.forEach((el) => io.observe(el));
    }
  }

  /* ---------- Particle field (hero + CTA) ---------- */
  function initParticles(canvasId, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || prefersReducedMotion) return;

    const ctx = canvas.getContext('2d');
    const density = options.density || 9000;
    const speed = options.speed || 0.15;
    let particles = [];
    let width, height, dpr;
    let rafId;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.parentElement.clientWidth;
      height = canvas.parentElement.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.round((width * height) / density);
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.3 + 0.4,
        vy: (Math.random() * 0.4 + 0.15) * speed,
        phase: Math.random() * Math.PI * 2,
        swing: Math.random() * 10 + 4,
        alpha: Math.random() * 0.4 + 0.15,
      }));
    }

    let elapsed = 0;
    let lastTime = null;

    function draw(now) {
      if (lastTime === null) lastTime = now;
      const dt = Math.min(now - lastTime, 48);
      lastTime = now;
      elapsed += dt;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#ffffff';
      particles.forEach((p) => {
        p.y -= p.vy * (dt / 16.7);
        if (p.y < -4) p.y = height + 4;
        const x = p.x + Math.sin(elapsed / 4000 + p.phase) * p.swing;

        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(draw);
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });

    resize();
    rafId = requestAnimationFrame(draw);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
      } else {
        lastTime = null;
        rafId = requestAnimationFrame(draw);
      }
    });
  }

  initParticles('particles', { density: 9000, speed: 0.18 });
  initParticles('particlesCta', { density: 12000, speed: 0.12 });
})();
