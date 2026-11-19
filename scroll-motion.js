const arnMotion = (() => {
  const { gsap, ScrollTrigger, ScrollSmoother, ScrambleTextPlugin } = window;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  const available = Boolean(gsap && ScrollTrigger);
  let smoother;
  let intro;
  let coordinateIntroReady = !root.classList.contains('booting');
  let playHeroCoordinates;
  const completedCoordinates = new WeakSet();

  function startHeroCoordinates() {
    coordinateIntroReady = true;
    playHeroCoordinates?.();
  }

  if (available) {
    gsap.registerPlugin(ScrollTrigger);
    if (ScrollSmoother) gsap.registerPlugin(ScrollSmoother);

    const media = gsap.matchMedia();
    media.add({
      allowMotion: '(prefers-reduced-motion: no-preference)',
      desktop: '(min-width: 900px) and (pointer: fine)',
    }, ({ conditions }) => {
      if (!conditions.allowMotion) return;

      if (ScrollSmoother && conditions.desktop) {
        smoother = ScrollSmoother.create({
          wrapper: '#smooth-wrapper',
          content: '#smooth-content',
          smooth: 0.86,
          smoothTouch: 0,
          effects: false,
        });
        root.classList.add('has-smooth-scroll');
      }

      for (const element of document.querySelectorAll('[data-reveal], [data-parallax], [data-motion-track]')) {
        if (element.hasAttribute('data-reveal')) {
          gsap.from(element, {
            opacity: 0.18,
            y: conditions.desktop ? 27 : 16,
            duration: 0.72,
            ease: 'power3.out',
            clearProps: 'opacity,transform',
            scrollTrigger: { trigger: element, start: element.dataset.reveal || 'top 93%', once: true },
          });
        } else if (element.hasAttribute('data-parallax') && conditions.desktop) {
          gsap.fromTo(element, { yPercent: -3, scale: 1.085 }, {
            yPercent: 3,
            scale: 1.085,
            ease: 'none',
            scrollTrigger: { trigger: element.parentElement, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
          });
        } else if (element.hasAttribute('data-motion-track')) {
          const frame = element.parentElement;
          gsap.to(element, {
            x: () => -Math.min(Math.max(element.scrollWidth - frame.clientWidth, 0), conditions.desktop ? 260 : 90),
            ease: 'none',
            scrollTrigger: { trigger: frame, start: 'clamp(top bottom)', end: 'bottom top', scrub: 0.5, invalidateOnRefresh: true },
          });
        }
      }

      for (const number of document.querySelectorAll('[data-number-fade]:not([data-coordinate-count] [data-number-fade])')) {
        gsap.from(number, {
          opacity: 0, duration: 0.55, ease: 'power2.out', clearProps: 'opacity',
          scrollTrigger: { trigger: number, start: 'clamp(top 95%)', once: true },
        });
      }

      const restoreCounters = [];
      for (const group of document.querySelectorAll('[data-coordinate-count]')) {
        if (completedCoordinates.has(group)) continue;
        const digits = [...group.querySelectorAll('[data-coordinate-value]')];
        const finalValues = digits.map(digit => digit.textContent);
        const count = { progress: 0 };
        const draw = () => digits.forEach((digit, index) => {
          const finalValue = finalValues[index];
          digit.textContent = String(Math.round(Number(finalValue) * count.progress)).padStart(finalValue.length, '0');
        });
        const restore = () => digits.forEach((digit, index) => { digit.textContent = finalValues[index]; });
        restoreCounters.push(restore);
        draw();
        const motion = gsap.timeline({ paused: true, onComplete: () => {
          restore();
          completedCoordinates.add(group);
        } });
        motion.to(count, {
          progress: 1,
          duration: 1.5,
          ease: 'power2.inOut',
          onUpdate: draw,
        });
        const years = group.querySelector('[data-number-fade]');
        if (years) motion.from(years, { opacity: 0, duration: 0.55, ease: 'power2.out', clearProps: 'opacity' }, 0);

        if (group.matches('.hero-coords')) {
          if (coordinateIntroReady) motion.play();
          else playHeroCoordinates = () => motion.play();
        } else {
          ScrollTrigger.create({ trigger: group, start: 'clamp(top 95%)', once: true, onEnter: () => motion.play() });
        }
      }

      return () => {
        playHeroCoordinates = undefined;
        restoreCounters.forEach(restore => restore());
        smoother?.kill();
        smoother = undefined;
        root.classList.remove('has-smooth-scroll');
      };
    });

    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }

  function finishLoading() {
    root.classList.remove('booting');
    startHeroCoordinates();
  }

  if (!available || reduced.matches) {
    finishLoading();
  } else {
    const loader = document.querySelector('.loader');
    const title = loader.querySelector('.loader-title');
    const titleText = title.textContent;
    const count = loader.querySelector('.loader-count');
    const line = loader.querySelector('.loader-line');
    const progress = { value: 0 };
    const heroPhotos = [...document.querySelectorAll('.hero-photo img')];
    const heroLines = '.hero h1>span>span';
    const supporting = '.hero-kicker, .hero-description, .hero-button, .hero-about, .hero-play-slot';
    const openedAt = performance.now();
    const drawProgress = () => { count.textContent = String(Math.round(progress.value)).padStart(2, '0'); };

    gsap.set(heroLines, { yPercent: 105 });
    gsap.set(supporting, { opacity: 0, y: 14 });
    const pending = gsap.timeline().to(progress, { value: 92, duration: 1.04, ease: 'power2.out', onUpdate: drawProgress }, 0)
      .to(line, { scaleX: 0.92, duration: 1.04, ease: 'power2.out' }, 0);
    const minimumVisible = ScrambleTextPlugin ? 970 : 440;
    if (ScrambleTextPlugin) {
      gsap.registerPlugin(ScrambleTextPlugin);
      title.textContent = '01_001_1';
      pending.to(title, {
        duration: 0.88, ease: 'none',
        scrambleText: { text: titleText, chars: 'XO_01', revealDelay: 0.2, speed: 0.4 },
      }, 0);
    }
    const ready = Promise.allSettled([heroPhotos[0].decode(), document.fonts?.ready]);
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

    Promise.race([ready, wait(1050)]).then(() => wait(Math.max(0, minimumVisible - (performance.now() - openedAt)))).then(() => {
      pending.kill();
      title.textContent = titleText;
      if (reduced.matches) {
        gsap.set([heroLines, supporting], { clearProps: 'opacity,transform' });
        finishLoading();
        return;
      }

      intro = gsap.timeline({ onComplete: finishLoading, defaults: { ease: 'power3.out' } });
      intro.to(progress, { value: 100, duration: 0.17, onUpdate: drawProgress }, 0)
        .to(line, { scaleX: 1, duration: 0.17 }, 0)
        .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 0.62, ease: 'power3.inOut' }, 0.19)
        .call(startHeroCoordinates, null, 0.19)
        .to(heroLines, { yPercent: 0, duration: 0.76, stagger: 0.11, clearProps: 'transform' }, 0.28)
        .from(heroPhotos, { scale: 1.065, duration: 1.05, clearProps: 'transform' }, 0.27)
        .to(supporting, { opacity: 1, y: 0, duration: 0.52, stagger: 0.07, clearProps: 'opacity,transform' }, 0.63);
    });

    reduced.addEventListener('change', event => {
      if (event.matches) {
        pending.kill();
        intro?.kill();
        title.textContent = titleText;
        gsap.set([heroLines, supporting, ...heroPhotos], { clearProps: 'opacity,transform' });
        finishLoading();
      }
    });
  }

  return {
    setScrollPosition(top) {
      if (smoother) smoother.scrollTo(top, false);
      else window.scrollTo({ top, behavior: 'instant' });
    },
    goTo(target, instant = false) {
      const previewHeight = target.dataset.project ? document.querySelector('.project-peek').offsetHeight : 0;
      const previewOffset = Math.max(0, (previewHeight - target.offsetHeight) / 2);
      const revealOffset = available && target.hasAttribute('data-reveal') ? Number(gsap.getProperty(target, 'y')) || 0 : 0;
      const offset = header.offsetHeight + 22 + previewOffset + revealOffset;
      if (smoother) {
        const top = Math.max(0, smoother.offset(target, 'top top') - offset);
        smoother.scrollTo(top, !instant && !reduced.matches);
      } else {
        const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset);
        window.scrollTo({ top, behavior: instant || reduced.matches ? 'instant' : 'smooth' });
      }
    },
    reveal(targets, distance = 13) {
      if (!available || reduced.matches) return;
      const elements = Array.from(targets);
      if (!elements.length) return;
      gsap.fromTo(elements, { opacity: 0.38, y: distance }, {
        opacity: 1, y: 0, stagger: 0.045, duration: 0.36, ease: 'power2.out',
        overwrite: 'auto', clearProps: 'opacity,transform',
      });
    },
    refresh() {
      if (available) ScrollTrigger.refresh();
    },
  };
})();
