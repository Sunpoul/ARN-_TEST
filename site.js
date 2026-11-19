(() => {
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const menuButton = $('.menu-button');
  const primaryNav = $('.primary-nav');
  const collections = new Map();

  function setMenu(open) {
    primaryNav.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
  }

  menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  $('.theme-button').addEventListener('click', event => {
    const dark = root.dataset.theme !== 'dark';
    root.dataset.theme = dark ? 'dark' : 'light';
    event.currentTarget.setAttribute('aria-pressed', String(dark));
  });

  function navigateTo(target, { highlight = false, updateHash = true, instant = false } = {}) {
    if (target.hidden) collections.get(target.closest('[data-collection]'))?.reset();
    if (target.id === 'skate') selectYear('2025');
    if (target.closest('.team-grid')) selectPerson(teamCards.indexOf(target));
    const direction = target.hasAttribute('data-direction');
    if (direction && target.getAttribute('aria-selected') !== 'true') selectDirection(target);

    setMenu(false);
    if (updateHash && location.hash !== '#' + target.id) history.pushState(null, '', '#' + target.id);

    if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
    target.focus({ preventScroll: true });
    const scrollTarget = direction ? target.closest('#directions') : target;
    requestAnimationFrame(() => arnMotion.goTo(scrollTarget, instant));

    if (highlight) {
      target.classList.remove('search-hit');
      requestAnimationFrame(() => {
        target.classList.add('search-hit');
        setTimeout(() => target.classList.remove('search-hit'), 1850);
      });
    }
  }

  function targetForHash(hash) {
    if (!hash || hash === '#') return null;
    try { return document.getElementById(decodeURIComponent(hash.slice(1))); }
    catch { return null; }
  }

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href^="#"]');
    const target = link && targetForHash(link.hash);
    if (!target) return;
    event.preventDefault();
    navigateTo(target);
  });

  const initialTarget = targetForHash(location.hash);
  if (initialTarget) addEventListener('load', () => navigateTo(initialTarget, { updateHash: false, instant: true }), { once: true });
  addEventListener('hashchange', () => {
    const target = targetForHash(location.hash);
    if (target) navigateTo(target, { updateHash: false, instant: true });
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menuButton.focus();
    }
  });

  const hero = $('.hero');
  const heroPlay = $('.hero-play');
  const heroPhoto = $('#hero-viewer');
  const heroScrollDistance = 420;
  const reloaded = performance.getEntriesByType('navigation')[0]?.type === 'reload';
  let photoExpanded = false;
  let heroIntroPending = Boolean(window.gsap && window.ScrollTrigger) && !reduced.matches && (reloaded ||
    (window.scrollY === 0 && ['', '#top', '#main'].includes(location.hash)));
  let heroIntroScroll;

  heroPlay.hidden = false;
  if (heroIntroPending) setPhotoExpanded(true);
  if (reloaded) {
    addEventListener('pageshow', () => requestAnimationFrame(() => {
      arnMotion.setScrollPosition(0);
      history.scrollRestoration = 'auto';
    }), { once: true });
  }

  function setPhotoExpanded(expanded) {
    photoExpanded = expanded;
    hero.classList.toggle('is-photo-expanded', expanded);
    heroPlay.setAttribute('aria-expanded', String(expanded));
    heroPlay.setAttribute('aria-label', expanded ? 'Закрыть фотографию' : 'Открыть фотографию на весь экран');
  }

  function cancelHeroIntro() {
    heroIntroPending = false;
    if (!heroIntroScroll) return;
    const scrollAfterIntro = Math.max(0, window.scrollY - heroIntroScroll.end);
    heroIntroScroll.kill();
    heroIntroScroll = undefined;
    hero.classList.remove('is-scroll-intro');
    hero.style.removeProperty('--hero-intro-progress');
    arnMotion.setScrollPosition(scrollAfterIntro);
    arnMotion.refresh();
  }

  function collapseHeroIntro() {
    if (!heroIntroPending) return;
    cancelHeroIntro();
    setPhotoExpanded(false);
  }

  function startHeroMotion() {
    if (reloaded && window.scrollY > 0) arnMotion.setScrollPosition(0);
    hero.classList.add('is-motion-ready');
    if (!heroIntroPending) return;
    if (reduced.matches) {
      collapseHeroIntro();
      return;
    }

    hero.style.setProperty('--hero-intro-progress', 0);
    hero.classList.add('is-scroll-intro');
    heroIntroScroll = window.ScrollTrigger.create({
      trigger: hero,
      pin: true,
      start: 0,
      end: `+=${heroScrollDistance}`,
      refreshPriority: 1,
      onUpdate: ({ progress }) => {
        const eased = progress * progress * (3 - 2 * progress);
        hero.style.setProperty('--hero-intro-progress', eased);
        if (photoExpanded !== (progress < 1)) setPhotoExpanded(progress < 1);
      },
    });
    arnMotion.refresh();
  }

  startHeroMotion();

  heroPlay.addEventListener('click', () => {
    cancelHeroIntro();
    setPhotoExpanded(!photoExpanded);
  });
  heroPhoto.addEventListener('click', () => {
    if (photoExpanded) return;
    cancelHeroIntro();
    setPhotoExpanded(true);
    heroPlay.focus({ preventScroll: true });
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !photoExpanded || $('dialog[open]') || event.defaultPrevented) return;
    event.preventDefault();
    cancelHeroIntro();
    setPhotoExpanded(false);
    heroPlay.focus({ preventScroll: true });
  });
  reduced.addEventListener('change', event => {
    if (event.matches) collapseHeroIntro();
  });

  const timeline = $('.timeline');
  const timelinePhoto = $('.timeline-photo');
  const timelineData = {
    '2016': ['Начало хронологии', 'Норильск меняется', 'Истории о том, как жители, бизнес и город создают новые пространства и возможности для Норильска.', 'assets/5bfc7.png', 'Вид на центр Норильска', 'https://arnorilsk.ru/ob-agentstve/'],
    '2018': ['Городская среда · 2018', 'Мастер-план города', 'В Норильске начали работу над мастер-планом, который определяет долгосрочное пространственное развитие города.', 'assets/b156e.png', 'Норильск с высоты', 'https://arnorilsk.ru/materialyi/'],
    '2020': ['Образование · 2020', 'Обучение и команды', 'Программы АРН помогают городским командам, специалистам и предпринимателям развивать свои проекты и сервисы.', 'assets/53513.png', 'Участники образовательной программы', 'https://arnorilsk.ru/obuchenie-i-komandyi/'],
    '2025': ['Обновление · 2025', 'Скейт-парк', 'В 2025 году АРН обновило скейт-парк у Молодёжного центра. Площадку отреставрировали и оформили в цветах городского бренда Норильска.', 'assets/a8d0e.png', 'Скейт-парк у Молодёжного центра Норильска', 'https://news.sgnorilsk.ru/2025/08/11/v-norilske-proshel-festival-aktivnyh-vidov-sporta/'],
  };

  function selectYear(year) {
    if (timeline.dataset.year === year) return;
    const [label, title, description, image, alt, url] = timelineData[year];
    timeline.dataset.year = year;
    $$('[data-year]', timeline).forEach(button => button.setAttribute('aria-pressed', String(button.dataset.year === year)));
    $('.timeline-kicker', timeline).textContent = label;
    $('.timeline-title', timeline).textContent = title;
    $('.timeline-summary', timeline).textContent = description;
    $('.timeline-link', timeline).href = url;
    timelinePhoto.src = image;
    timelinePhoto.alt = alt;
    arnMotion.reveal([$('.timeline-card', timeline)], 9);
  }
  $$('[data-year]', timeline).forEach(button => button.addEventListener('click', () => selectYear(button.dataset.year)));

  function pagerValue(current, total) {
    return [current, total].map(number => String(number).padStart(2, '0')).join(' / ');
  }

  const teamGrid = $('.team-grid');
  const teamCards = $$('.team-card', teamGrid);
  const teamPager = $('[data-pager="team"]');
  let personIndex = 0;
  function selectPerson(index) {
    if (index < 0) return;
    personIndex = index;
    teamCards.forEach((card, i) => card.classList.toggle('is-current', i === index));
    $('output', teamPager).textContent = pagerValue(index + 1, teamCards.length);
    if (teamGrid.scrollWidth > teamGrid.clientWidth) {
      const offset = teamCards[index].getBoundingClientRect().left - teamGrid.getBoundingClientRect().left + teamGrid.scrollLeft;
      teamGrid.scrollTo({ left: offset, behavior: reduced.matches ? 'instant' : 'smooth' });
    }
  }
  $$('[data-step]', teamPager).forEach(button => button.addEventListener('click', () => {
    selectPerson((personIndex + Number(button.dataset.step) + teamCards.length) % teamCards.length);
  }));

  const directionTabs = $$('[data-direction]');
  const directionPanel = $('#direction-panel');
  const directionImage = $('.direction-photo img', directionPanel);
  const directionData = {
    education: {
      title: $('h3', directionPanel).textContent, description: $('.direction-description', directionPanel).textContent,
      kicker: $('.direction-kicker', directionPanel).textContent, points: $$('li', directionPanel).map(item => item.textContent),
      image: directionImage.getAttribute('src'), alt: directionImage.alt, url: 'https://arnorilsk.ru/obuchenie-i-komandyi/',
    },
    culture: {
      title: 'События и культура', kicker: 'Направление',
      description: 'Городские события, культурные проекты и поддержка талантов Норильска.',
      points: ['Проводим фестивали и городские встречи', 'Поддерживаем молодых музыкантов и художников', 'Помогаем городским сообществам реализовывать свои идеи'],
      image: 'assets/98147.png', alt: 'Участники городской программы', url: 'https://arnorilsk.ru/sobyitiya-i-kultura/',
    },
    city: {
      title: 'Развитие инфраструктуры', kicker: 'Направление',
      description: 'Общественные пространства, площадки для спорта и проекты городской среды.',
      points: ['Развиваем пространства для отдыха и спорта', 'Обновляем городские площадки вместе с жителями', 'Поддерживаем проекты комплексного развития Норильска'],
      image: 'assets/d6ef2.png', alt: 'Спортивная площадка в Норильске', url: 'https://arnorilsk.ru/razvitie-infrastrukturyi/',
    },
    strategy: {
      title: 'Планы и стратегии', kicker: 'Направление',
      description: 'Планируем долгосрочное развитие города и его территорий.',
      points: ['Готовим планы развития городской среды', 'Изучаем запросы жителей и городских команд', 'Собираем предложения для будущих проектов'],
      image: 'assets/b156e.png', alt: 'Городские кварталы Норильска с высоты', url: 'https://arnorilsk.ru/planyi-i-strategii/',
    },
  };

  function selectDirection(tab) {
    directionTabs.forEach(button => {
      const active = button === tab;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    const content = directionData[tab.dataset.direction];
    directionPanel.setAttribute('aria-labelledby', tab.id);
    directionImage.src = content.image;
    directionImage.alt = content.alt;
    $('.direction-kicker', directionPanel).textContent = content.kicker;
    $('h3', directionPanel).textContent = content.title;
    $('.direction-description', directionPanel).textContent = content.description;
    const points = content.points.map(text => Object.assign(document.createElement('li'), { textContent: text }));
    $('ol', directionPanel).replaceChildren(...points);
    $('a', directionPanel).href = content.url;
    arnMotion.reveal(directionPanel.children);
    arnMotion.refresh();
  }

  directionTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectDirection(tab));
    tab.addEventListener('keydown', event => {
      const last = directionTabs.length - 1;
      const next = { ArrowLeft: (index + last) % (last + 1), ArrowRight: (index + 1) % (last + 1), Home: 0, End: last }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      selectDirection(directionTabs[next]);
      directionTabs[next].focus();
    });
  });

  const projectRows = $$('[data-project]');
  const projectPeek = $('.project-peek');
  const projectPhotos = new Map($$('[data-project-photo]', projectPeek).map(image => [image.dataset.projectPhoto, image]));
  const pointerPreview = matchMedia('(min-width: 761px) and (hover: hover)');
  let previewedRow;
  let focusedRow;
  let pointerPosition;

  for (const row of projectRows) {
    const image = projectPhotos.get(row.dataset.project);
    const thumbnail = new Image();
    thumbnail.className = 'project-thumbnail';
    thumbnail.alt = '';
    thumbnail.loading = 'lazy';
    thumbnail.src = image.getAttribute('src');
    row.querySelector('a').insertBefore(thumbnail, row.querySelector('.icon-button'));

    row.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch' && !focusedRow) showPreview(row);
    });
    row.addEventListener('focusin', () => {
      focusedRow = row;
      showPreview(row);
    });
    row.addEventListener('focusout', event => {
      focusedRow = event.relatedTarget?.closest('.project-row') || null;
      if (!focusedRow) clearPreview();
    });
  }
  document.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const position = [event.clientX, event.clientY].join(',');
    if (position === pointerPosition) return;
    pointerPosition = position;
    const row = event.target.closest('.project-row');
    if (row) showPreview(row);
  }, { passive: true });
  $('.project-list').addEventListener('pointerleave', () => {
    const focused = document.activeElement.closest('.project-row');
    if (focused) showPreview(focused);
    else clearPreview();
  });
  pointerPreview.addEventListener('change', () => clearPreview());

  function showPreview(row) {
    if (!pointerPreview.matches || row === previewedRow) return;
    previewedRow?.classList.remove('is-previewed');
    previewedRow = row;
    row.classList.add('is-previewed');
    const next = projectPhotos.get(row.dataset.project);
    const half = projectPeek.offsetHeight / 2;
    const targetY = Math.min(row.parentElement.offsetHeight - half, Math.max(half, row.offsetTop + row.offsetHeight / 2));
    projectPeek.style.top = targetY + 'px';
    projectPeek.classList.add('is-open');
    projectPeek.dataset.active = row.dataset.project;
    for (const image of projectPhotos.values()) {
      window.gsap?.killTweensOf(image);
      image.classList.toggle('is-current', image === next);
    }
    if (window.gsap && !reduced.matches) {
      window.gsap.fromTo(next, { clipPath: 'inset(12% 0 88% 0)', scale: 1.08 }, {
        clipPath: 'inset(0% 0 0% 0)', scale: 1, duration: 0.47, ease: 'power3.out', clearProps: 'clipPath,transform',
      });
    }
  }

  function clearPreview() {
    previewedRow?.classList.remove('is-previewed');
    previewedRow = undefined;
    projectPeek.classList.remove('is-open');
    delete projectPeek.dataset.active;
  }

  const cityPager = $('[data-pager="city"]');
  const cityPhoto = $('.city-frame img');
  const cityCaption = $('.city-frame h2');
  const citySlides = [
    ['assets/b156e.png', 'Центральная улица Норильска'],
    ['assets/5bfc7.png', 'Городская площадь Норильска'],
    ['assets/a8d0e.png', 'Скейт-парк у Молодёжного центра'],
    ['assets/d6ef2.png', 'Норильские дворы'],
  ];
  let slideIndex = 0;
  $$('[data-step]', cityPager).forEach(button => button.addEventListener('click', () => {
    slideIndex = (slideIndex + Number(button.dataset.step) + citySlides.length) % citySlides.length;
    const [url, title] = citySlides[slideIndex];
    cityPhoto.src = url;
    cityPhoto.alt = title;
    cityCaption.textContent = title;
    $('output', cityPager).textContent = pagerValue(slideIndex + 1, citySlides.length);
    arnMotion.reveal([cityCaption], 10);
    if (window.gsap && !reduced.matches) window.gsap.fromTo(cityPhoto, { opacity: 0.38 }, { opacity: 1, duration: 0.45, overwrite: true, clearProps: 'opacity' });
  }));

  for (const section of $$('[data-collection]')) {
    const grid = $('.card-grid', section);
    const cards = $$('[data-card]', grid);
    const categories = $$('[data-filter]', section);
    const free = $('[data-free-filter]', section);
    const empty = $('.collection-empty', section);
    const pager = $('[data-collection-pager]', section);
    let category = 'all';
    let position = 0;
    let matches = cards;

    function showCards(animate = false) {
      matches = cards.filter(card => (category === 'all' || card.dataset.category === category) && (!free?.checked || card.dataset.free === 'true'));
      for (const card of cards) card.hidden = !matches.includes(card);
      const order = [...matches.slice(position), ...matches.slice(0, position)];
      grid.append(...order);
      empty.hidden = matches.length > 0;
      pager.hidden = matches.length < 2;
      $('output', pager).textContent = pagerValue(position + 1, matches.length);
      if (animate) arnMotion.reveal(order, 10);
      arnMotion.refresh();
    }

    function selectCategory(value) {
      category = value;
      position = 0;
      categories.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
      showCards(true);
    }

    categories.forEach(button => button.addEventListener('click', () => selectCategory(button.dataset.filter)));
    free?.addEventListener('change', () => { position = 0; showCards(true); });
    $$('[data-step]', pager).forEach(button => button.addEventListener('click', () => {
      if (matches.length < 2) return;
      position = (position + Number(button.dataset.step) + matches.length) % matches.length;
      showCards(true);
    }));
    collections.set(section, { reset() { if (free) free.checked = false; selectCategory('all'); } });
  }

  const ideaForm = $('#idea-form');
  const ideaReady = $('#idea-ready');
  const ideaField = $('textarea', ideaForm);
  ideaField.addEventListener('input', () => ideaField.setCustomValidity(''));
  ideaForm.addEventListener('submit', event => {
    event.preventDefault();
    const values = new FormData(ideaForm);
    const message = values.get('idea').trim();
    if (!message) {
      ideaField.setCustomValidity('Опишите вашу идею.');
      ideaField.reportValidity();
      return;
    }

    const subject = encodeURIComponent('Идея: ' + values.get('topic'));
    $('#idea-email').href = 'mailto:priemnaya@arnorilsk.ru?subject=' + subject + '&body=' + encodeURIComponent(message);
    ideaForm.hidden = true;
    ideaReady.hidden = false;
    $('h3', ideaReady).focus({ preventScroll: true });
    arnMotion.reveal([ideaReady], 10);
    arnMotion.refresh();
  });
  $('#idea-back').addEventListener('click', () => {
    ideaReady.hidden = true;
    ideaForm.hidden = false;
    ideaField.focus({ preventScroll: true });
    arnMotion.refresh();
  });

  let activeDialog;

  function openDialog(dialog, focusTarget, revealTargets) {
    if (activeDialog) return;
    if (menuButton.getAttribute('aria-expanded') === 'true') menuButton.focus({ preventScroll: true });
    setMenu(false);
    const state = { dialog };
    activeDialog = state;
    dialog.showModal();
    root.classList.add('dialog-open');
    dialog.scrollTop = 0;
    focusTarget?.focus({ preventScroll: true });

    if (!window.gsap || reduced.matches) return;
    const timeline = window.gsap.timeline({ onReverseComplete: () => finishDialogClose(state) });
    state.timeline = timeline;
    if (dialog.matches('.fullscreen-dialog')) {
      timeline.fromTo(dialog,
        { clipPath: 'inset(0 0 100% 0)', '--dialog-backdrop': 0 },
        { clipPath: 'inset(0 0 0% 0)', '--dialog-backdrop': 1, duration: 0.56, ease: 'power3.inOut' }, 0);
      timeline.fromTo(revealTargets, { opacity: 0.38, y: 16 },
        { opacity: 1, y: 0, duration: 0.32, stagger: 0.035, ease: 'power2.out' }, 0.1);
    } else if (dialog.matches('.team-profile')) {
      timeline.fromTo(dialog,
        { xPercent: 102, '--dialog-backdrop': 0 },
        { xPercent: 0, '--dialog-backdrop': 1, duration: 0.58, ease: 'power3.inOut' });
    } else {
      timeline.fromTo(dialog,
        { opacity: 0, y: 16, scale: 0.985, '--dialog-backdrop': 0 },
        { opacity: 1, y: 0, scale: 1, '--dialog-backdrop': 1, duration: 0.36, ease: 'power2.inOut' });
    }
  }

  function finishDialogClose(state) {
    if (activeDialog !== state) return;
    activeDialog = undefined;
    state.dialog.close();
    state.timeline?.revert();
    root.classList.remove('dialog-open');
    state.afterClose?.();
  }

  function closeDialog(dialog, afterClose) {
    const state = activeDialog;
    if (state?.dialog !== dialog || state.closing) return;
    state.closing = true;
    state.afterClose = afterClose;
    if (state.timeline?.progress() && !reduced.matches) state.timeline.reverse();
    else finishDialogClose(state);
  }

  $$('dialog').forEach(dialog => {
    $('[data-close-dialog]', dialog).addEventListener('click', () => closeDialog(dialog));
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      closeDialog(dialog);
    });
  });
  reduced.addEventListener('change', event => {
    if (!event.matches || !activeDialog) return;
    if (activeDialog.closing) finishDialogClose(activeDialog);
    else activeDialog.timeline?.progress(1);
  });

  const profileDialog = $('#team-profile');
  const profileName = $('#team-profile-name', profileDialog);
  const profileRelatedList = $('.team-profile-related-list', profileDialog);
  const profileRelatedTemplate = $('#team-profile-related-item');
  const profiles = {
    'maxim-mironov': {
      lead: 'Руководит Агентством развития Норильска.',
      detail: 'Представлял мастер-план туристического кластера «Арктический» и рассказывал о возможностях экологического туризма на Таймыре.',
      related: [
        { kind: 'Проект', title: 'Ландшафтный дизайн парка «Озеро Долгое»', url: 'https://arnorilsk.ru/news/v-norilske-predstavlen-landshaftnyj-dizajnproekt-parka-ozero-dolgoe/' },
        { kind: 'Новость', title: 'Форум для родителей школьников', url: 'https://arnorilsk.ru/novosti-i-anonsyi/novosti/v-norilske-proshel-forum-dlya-roditelej-shkolnikov/' },
      ],
    },
    'yulia-gribanova': {
      lead: 'Занимается инвестициями и развитием бизнес-среды Норильска.',
      detail: 'Рассказывала о поддержке местных ресторанов и о «Гастрохабе» — площадке для обучения и сотрудничества специалистов отрасли.',
      related: [
        { kind: 'Проект', title: '«ГастроХаб» на базе НТПТиС', url: 'https://arnorilsk.ru/proektyi/razvitie-infrastrukturyi/razvitie-proekta-gastroxab-na-baze-ntptis/' },
        { kind: 'Новость', title: '«Сады Арктики». Как команды развивают детские сады', url: 'https://arnorilsk.ru/novosti-i-anonsyi/novosti/sadyi-arktiki-komandyi-kotoryie-razvivayut-detskie-sadyi/' },
      ],
    },
    'roman-kulyan': {
      lead: 'Представлял программы поддержки предпринимателей на стратегической сессии «Норильск — территория роста».',
      detail: 'Объяснял, как АРН помогает структурировать инвестиционные проекты и готовить расчёты для заявок на финансирование и получение статуса резидента Арктической зоны.',
      related: [
        { kind: 'Анонс', title: 'Инвестиции на форуме «Арктика: настоящее и будущее»', url: 'https://arnorilsk.ru/news/komanda-arn-vyistupit-na-mejdunarodnom-forume-arktika-nastoyaschee-i-buduschee/' },
        { kind: 'Программа', title: 'Закрытые общественные пространства на конференции об Арктике', url: 'https://arnorilsk.ru/files/files/2019/09/23/-mnpk-27-29-sentyabrya-2019.pdf' },
      ],
    },
    'viktoria-chulanova': {
      lead: 'Работала над проектами городской среды и общественных пространств Норильска.',
      detail: 'Среди её проектов — мозаичное панно «Солнце Арктики» и общественно-культурный центр «Башня».',
      related: [
        { kind: 'Проект', title: 'Общественно-культурный центр «Башня»', url: 'https://arnorilsk.ru/proektyi/razvitie-infrastrukturyi/obshhestvenno-kulturnyij-czentr-bashnya/' },
        { kind: 'Новость', title: 'Как в Талнахе сохранили мурал с полярным жирафом', url: 'https://arnorilsk.ru/novosti-i-anonsyi/novosti/kopiya-norilsk.-gornyij-start-2026-glazami-uchastnikov/' },
      ],
    },
  };

  teamCards.forEach(card => {
    const opener = $('.team-profile-open', card);
    const portrait = $('.portrait img', card);
    const profile = profiles[card.id];
    opener.addEventListener('click', () => {
      if (activeDialog) return;
      const [firstName, ...surname] = opener.textContent.trim().split(/\s+/);
      profileName.replaceChildren(firstName, document.createElement('br'), surname.join(' '));
      $('.team-profile-role', profileDialog).textContent = $('p.mono', card).textContent;
      $('.team-profile-portrait img', profileDialog).src = portrait.getAttribute('src');
      $('.team-profile-lead', profileDialog).textContent = profile.lead;
      $('.team-profile-detail', profileDialog).textContent = profile.detail;
      profileRelatedList.replaceChildren(...profile.related.map(({ kind, title, url }) => {
        const item = profileRelatedTemplate.content.cloneNode(true);
        $('a', item).href = url;
        $('.team-profile-related-kind', item).textContent = kind;
        $('.team-profile-related-name', item).textContent = title;
        return item;
      }));
      openDialog(profileDialog, profileName);
    });
  });
  profileDialog.addEventListener('click', event => {
    if (event.target !== profileDialog) return;
    const bounds = profileDialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientY < bounds.top) closeDialog(profileDialog);
  });

  const directionsDialog = $('#directions-dialog');
  const directionsTitle = $('#directions-title', directionsDialog);
  const directionsLinks = $('.directions-links', directionsDialog);
  const directionTemplate = $('#direction-link');
  directionsLinks.append(...directionTabs.map(tab => {
    const item = directionTemplate.content.cloneNode(true);
    const link = $('a', item);
    const { title, description } = directionData[tab.dataset.direction];
    link.href = '#' + tab.id;
    $('strong', link).textContent = title;
    $('.direction-link-summary', link).textContent = description;
    return item;
  }));

  $$('[data-open-directions]').forEach(opener => opener.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openDialog(directionsDialog, directionsTitle, [directionsTitle, ...directionsLinks.children]);
  }));

  function followFullscreenLink(event, dialog) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a');
    const target = link && targetForHash(link.hash);
    if (!target) return;
    event.preventDefault();
    closeDialog(dialog, () => navigateTo(target, { highlight: dialog === search }));
  }

  directionsLinks.addEventListener('click', event => followFullscreenLink(event, directionsDialog));

  const search = $('#search-dialog');
  const searchInput = $('#site-query');
  const searchResults = $('.search-results', search);
  const searchStatus = $('.search-status', search);
  const suggestions = $('.search-suggestions', search);
  const searchTemplate = $('#search-result');
  const searchOpener = $('.search-open');
  const normalize = value => value.toLocaleLowerCase('ru').replaceAll('ё', 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const searchEntries = $$('[data-search][id]').map(node => {
    const heading = $('h1,h2,h3', node)?.textContent.trim().replace(/\s+/gu, ' ');
    const title = node.dataset.searchTitle || heading || node.dataset.search;
    const description = ($('p:not(.mono)', node) || $('p', node))?.textContent.trim() || '';
    const body = node.dataset.search === 'Раздел' && node.id !== 'contacts' ? '' : node.textContent.trim();
    return {
      node, title, description, kind: node.dataset.search,
      titleKey: normalize(title), bodyKey: normalize([node.dataset.search, description, body, node.dataset.searchExtra || ''].join(' ')),
    };
  });

  function renderSearch() {
    const query = normalize(searchInput.value);
    searchResults.replaceChildren();
    if (!query) {
      suggestions.hidden = false;
      searchStatus.hidden = true;
      return;
    }

    const terms = query.split(' ');
    const matches = searchEntries.map(entry => {
      const scores = terms.map(term => entry.titleKey.includes(term) ? 3 : Number(entry.bodyKey.includes(term)));
      return { entry, score: scores.every(Boolean) ? scores.reduce((sum, value) => sum + value, 0) : 0 };
    }).filter(item => item.score).sort((a, b) => b.score - a.score);

    suggestions.hidden = true;
    searchStatus.hidden = false;
    searchStatus.textContent = matches.length ? 'Найдено ' + matches.length : 'Ничего не найдено. Попробуйте другой запрос.';
    const results = document.createDocumentFragment();
    for (const { entry } of matches) {
      const item = searchTemplate.content.cloneNode(true);
      const link = $('a', item);
      link.href = '#' + entry.node.id;
      $('.search-result-kind', item).textContent = entry.kind;
      $('strong', item).textContent = entry.title;
      const summary = entry.description.length > 108 ? entry.description.slice(0, 108).replace(/\s+\S*$/u, '') + '…' : entry.description;
      $('.search-result-summary', item).textContent = summary;
      results.append(item);
    }
    searchResults.append(results);
  }

  function openSearch() {
    if (activeDialog) return;
    renderSearch();
    openDialog(search, searchInput, $$('.search-content > :not([hidden])', search));
  }

  searchOpener.addEventListener('click', openSearch);
  document.addEventListener('keydown', event => {
    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.target.closest('input,textarea,[contenteditable]') && !activeDialog) {
      event.preventDefault();
      openSearch();
    }
  });
  searchInput.addEventListener('input', renderSearch);
  searchInput.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    closeDialog(search);
  });
  $$('[data-query]', search).forEach(button => button.addEventListener('click', () => {
    searchInput.value = button.dataset.query;
    renderSearch();
    searchInput.focus();
  }));
  $('.search-form', search).addEventListener('submit', event => {
    event.preventDefault();
    $('a', searchResults)?.click();
  });
  searchResults.addEventListener('click', event => followFullscreenLink(event, search));

  const articleDialog = $('#article-dialog');
  function showArticle({ title, caption, image, alt, description, url, linkLabel }) {
    $('h2', articleDialog).textContent = title;
    $('p.mono', articleDialog).textContent = caption;
    $('img', articleDialog).src = image;
    $('img', articleDialog).alt = alt;
    $('.article-text', articleDialog).textContent = description;
    const link = $('a', articleDialog);
    link.href = url;
    link.textContent = linkLabel;
    openDialog(articleDialog);
  }
  $$('[data-read]').forEach(button => button.addEventListener('click', () => {
    const card = button.closest('.news-card');
    const image = $('.news-image img', card);
    showArticle({
      title: $('h3', card).textContent, caption: $('.card-meta', card).innerText.trim().replace(/\s+/g, ' '),
      image: image.src, alt: image.alt, description: $('p', card).textContent,
      url: 'https://arnorilsk.ru/novosti-i-anonsyi/novosti/', linkLabel: 'Новости на сайте АРН',
    });
  }));
  const projectSummaries = {
    accelerator: 'Программа помогает местным предпринимателям развивать отраслевые сообщества и повышать качество городских сервисов.',
    navigator: 'Проект включил Норильск в геомаркетинговую систему, с которой предприниматели могут изучать местный рынок.',
    names: 'Конкурс и стипендиальная программа поддерживают юных музыкантов и художников Норильска.',
    taimyr: 'Цифровая платформа объединяет маршруты, экскурсии и предложения местных туроператоров на Таймыре.',
  };
  projectRows.forEach(row => {
    const link = $('a', row);
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const key = row.dataset.project;
      showArticle({
        title: $('h3', row).textContent, caption: $('p', row).textContent,
        image: projectPhotos.get(key).src, alt: '', description: projectSummaries[key],
        url: link.href, linkLabel: 'Подробнее о проекте',
      });
    });
  });
})();
