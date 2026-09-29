/**
 * ABEERA KHAN — FASHION & EDITORIAL PORTFOLIO
 * Horizontal runway engine, index, cinema and lightbox for Desktop & Mobile
 */

(function () {
  'use strict';

  const EMAIL = 'abeerakhanphotography@gmail.com';

  // Series shown in the filter ribbon: [model value in data, display label]
  const SERIES = [
    ['all', 'All'],
    ['Sasha'],
    ['Amrit'],
    ['Iliana'],
    ['Niki'],
    ['Ana Askims'],
    ['Lauren'],
    ['Aline'],
    ['Sabrina'],
    ['Lex'],
    ['Ghazal'],
    ['Sarah'],
    ['Boxing & Fitness'],
    ['Derek & Jeff'],
    ['The Earrings', 'Jewelry']
  ];

  // Application State
  const state = {
    currentView: 'runway', // 'runway' | 'grid' | 'cinema'
    activeFilter: 'all',
    filteredItems: [...GALLERY_DATA],
    isLightboxOpen: false,
    lightboxItems: [...GALLERY_DATA], // the order the viewer is browsing in
    lightboxIndex: 0,
    lightboxToken: 0,
    isZoomed: false,
    cinemaPlaying: false,
    cinemaIndex: 0,
    cinemaToken: 0,
    toastTimer: null,
    dragMoved: false
  };

  // DOM Cache
  const DOM = {
    body: document.body,
    header: document.getElementById('site-header'),
    brandLogo: document.getElementById('brand-logo'),
    seriesRibbon: document.getElementById('series-ribbon'),
    seriesList: document.getElementById('series-list'),
    filterTriggerBtn: document.getElementById('filter-trigger-btn'),
    currentFilterName: document.getElementById('current-filter-name'),
    seriesBtns: [],

    // Mobile Menu
    mobileMenu: document.getElementById('mobile-menu'),
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    mmSeries: document.getElementById('mm-series'),
    mmAboutBtn: document.getElementById('mm-about-btn'),
    mmInquireBtn: document.getElementById('mm-inquire-btn'),

    // View Sections
    runwayView: document.getElementById('runway-view'),
    gridView: document.getElementById('grid-view'),
    cinemaView: document.getElementById('cinema-view'),
    runwayWrapper: document.getElementById('runway-scroll-wrapper'),
    runwayTrack: document.getElementById('runway-track'),
    runwayCardsContainer: document.getElementById('runway-cards-container'),
    editorialGrid: document.getElementById('editorial-grid'),
    gridStatsCount: document.getElementById('grid-stats-count'),

    // View Buttons
    viewBtns: document.querySelectorAll('.view-btn'),
    mobBtns: document.querySelectorAll('.mob-btn'),

    // HUD Scrubber
    hudSeriesLabel: document.getElementById('hud-series-label'),
    hudPrevBtn: document.getElementById('hud-prev-btn'),
    hudNextBtn: document.getElementById('hud-next-btn'),
    hudScrubber: document.getElementById('hud-scrubber'),
    hudProgressFill: document.getElementById('hud-progress-fill'),
    hudScrubberHandle: document.getElementById('hud-scrubber-handle'),

    // Biography Drawer
    aboutDrawer: document.getElementById('about-drawer'),
    aboutBackdrop: document.getElementById('about-backdrop'),
    openAboutBtn: document.getElementById('open-about-btn'),
    closeAboutBtn: document.getElementById('close-about-btn'),
    copyEmailBtn: document.getElementById('copy-email-btn'),

    // Inquiry Modal
    inquiryModal: document.getElementById('inquiry-modal'),
    inquiryBackdrop: document.getElementById('inquiry-backdrop'),
    openContactBtn: document.getElementById('open-contact-btn'),
    closeInquiryBtn: document.getElementById('close-inquiry-btn'),
    inquiryForm: document.getElementById('inquiry-form'),
    dialogVisualImg: document.getElementById('dialog-visual-img'),
    dialogVisualModel: document.getElementById('dialog-visual-model'),

    // Lightbox
    lightboxModal: document.getElementById('lightbox-modal'),
    lightboxOverlay: document.getElementById('lightbox-overlay'),
    lightboxImg: document.getElementById('lightbox-img'),
    lbTitle: document.getElementById('lb-title'),
    lbMeta: document.getElementById('lb-meta'),
    lbPrevBtn: document.getElementById('lb-prev-btn'),
    lbNextBtn: document.getElementById('lb-next-btn'),
    lbZoomToggle: document.getElementById('lb-zoom-toggle'),
    lbShareBtn: document.getElementById('lb-share-btn'),
    closeLightboxBtn: document.getElementById('close-lightbox-btn'),
    lbThumbnailsStrip: document.getElementById('lb-thumbnails-strip'),

    // Cinema
    cinemaAmbient: document.getElementById('cinema-ambient'),
    cinemaImg: document.getElementById('cinema-image'),
    cinemaTitle: document.getElementById('cinema-title'),
    cinemaCategory: document.getElementById('cinema-category'),
    cinemaPrev: document.getElementById('cinema-prev'),
    cinemaNext: document.getElementById('cinema-next'),
    cinemaPlayPause: document.getElementById('cinema-play-pause'),
    cinemaTimerFill: document.getElementById('cinema-timer-fill'),

    // Misc
    cursorLabel: document.getElementById('cursor-label'),
    toastNotice: document.getElementById('toast-notice')
  };

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------
  function init() {
    renderSeries();
    renderRunway();
    renderGrid();
    renderCinemaSlide(0);
    renderLightboxThumbnails();
    setupGlobalScrollEngine();
    setupCursorLabel();
    setupEventListeners();
    updateHudScrubber();

    const fromHash = HASH_TO_VIEW[location.hash.slice(1)];
    if (fromHash) setViewMode(fromHash);
  }

  const HASH_TO_VIEW = { index: 'grid', cinema: 'cinema' };

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------
  function captionCategory(item) {
    return item.category && item.category !== item.model ? item.category : '';
  }

  function isOverlayOpen() {
    return state.isLightboxOpen ||
      DOM.aboutDrawer.classList.contains('is-open') ||
      DOM.inquiryModal.classList.contains('is-open') ||
      DOM.mobileMenu.classList.contains('is-open');
  }

  // Reveal elements as they enter their scroll container, staggering each batch
  function observeReveal(elements, root) {
    if (!('IntersectionObserver' in window) || prefersReducedMotion) {
      elements.forEach(el => el.classList.add('in-view'));
      return null;
    }

    const io = new IntersectionObserver((entries) => {
      let batch = 0;
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.style.transitionDelay = `${Math.min(batch, 6) * 90}ms`;
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
        batch++;
      });
    }, { root, rootMargin: '0px 6% 0px 0px', threshold: 0.02 });

    elements.forEach(el => io.observe(el));
    return io;
  }

  let runwayObserver = null;
  let gridObserver = null;

  // ---------------------------------------------------------------------------
  // GALLERY RENDERING (NO NUMBERING ON PHOTOGRAPHS)
  // ---------------------------------------------------------------------------
  function renderSeries() {
    const counts = {};
    const covers = {};
    GALLERY_DATA.forEach(item => {
      counts[item.model] = (counts[item.model] || 0) + 1;
      if (!covers[item.model]) covers[item.model] = item;
    });

    [DOM.seriesList, DOM.mmSeries].forEach(container => {
      container.innerHTML = '';
      SERIES.forEach(([filter, label]) => {
        const isAll = filter === 'all';
        // "All" gets a small collage of four different series covers
        const coverItems = isAll
          ? ['Amrit', 'Iliana', 'Ana Askims', 'Lex'].map(model => covers[model]).filter(Boolean)
          : [covers[filter]].filter(Boolean);
        const btn = document.createElement('button');
        btn.className = 'series-btn' + (filter === state.activeFilter ? ' active' : '');
        btn.setAttribute('data-filter', filter);
        btn.innerHTML = `
          <span class="series-cover${isAll ? ' is-collage' : ''}" style="background-color: ${coverItems[0] ? coverItems[0].dominantColor : '#ddd'};">
            ${coverItems.map(item => `<img src="${item.urlThumb}" alt="" loading="lazy" draggable="false">`).join('')}
          </span>
          <span class="series-name"></span>
        `;
        const name = btn.querySelector('.series-name');
        name.textContent = label || filter;
        const sup = document.createElement('sup');
        sup.textContent = filter === 'all' ? GALLERY_DATA.length : (counts[filter] || 0);
        name.appendChild(sup);

        btn.addEventListener('click', () => {
          applyFilter(filter);
          closeSeriesRibbon();
          closeMobileMenu();
        });
        container.appendChild(btn);
      });
    });

    DOM.seriesBtns = document.querySelectorAll('.series-btn');
  }

  function renderRunway() {
    if (runwayObserver) runwayObserver.disconnect();
    DOM.runwayCardsContainer.innerHTML = '';
    const frag = document.createDocumentFragment();

    state.filteredItems.forEach((item, index) => {
      const prev = state.filteredItems[index - 1];
      const isSeriesStart = !prev || prev.model !== item.model;

      const card = document.createElement('article');
      card.className = 'gallery-card' + (isSeriesStart ? ' is-series-start' : '');
      card.setAttribute('data-id', item.id);
      card.setAttribute('data-index', index);
      card.setAttribute('data-model', item.model);
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Open photograph of ${item.model}`);
      card.style.aspectRatio = String(item.aspectRatio || 0.67);
      card.style.setProperty('--ar', item.aspectRatio || 0.67);

      // PURE PHOTOGRAPHY - NO NUMBERS, NOTHING OVER THE PHOTO (caption sits below)
      card.innerHTML = `
        <div class="card-frame" style="background-color: ${item.dominantColor};">
          <img
            src="${item.urlMedium}"
            data-full="${item.url}"
            alt="${item.model} by Abeera Khan"
            class="card-photo"
            loading="lazy"
            decoding="async"
            draggable="false"
          />
        </div>
        <div class="card-caption" aria-hidden="true">
          <span class="card-caption-name">${item.model}</span>
          <span class="card-caption-cat">${captionCategory(item)}</span>
        </div>
      `;

      const img = card.querySelector('.card-photo');
      img.addEventListener('load', () => img.classList.add('loaded'));
      if (img.complete && img.naturalWidth) img.classList.add('loaded');

      // Click to open high-res lightbox (ignored at the end of a drag)
      card.addEventListener('click', () => {
        if (state.dragMoved) return;
        openLightbox(state.filteredItems, index);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(state.filteredItems, index);
        }
      });

      frag.appendChild(card);
    });

    DOM.runwayCardsContainer.appendChild(frag);
    runwayObserver = observeReveal(
      Array.from(DOM.runwayCardsContainer.children),
      DOM.runwayWrapper
    );
  }

  // Index: photographs gathered by series, each with a pinned title column
  function groupBySeries(items) {
    const groups = [];
    const byModel = {};
    items.forEach(item => {
      if (!byModel[item.model]) {
        byModel[item.model] = { model: item.model, items: [] };
        groups.push(byModel[item.model]);
      }
      byModel[item.model].items.push(item);
    });
    return groups;
  }

  function renderGrid() {
    if (gridObserver) gridObserver.disconnect();
    DOM.editorialGrid.innerHTML = '';
    const frag = document.createDocumentFragment();
    const groups = groupBySeries(state.filteredItems);
    const indexOrder = groups.flatMap(group => group.items);
    let position = 0;

    groups.forEach(group => {
      const series = SERIES.find(([value]) => value === group.model);
      const title = series ? (series[1] || series[0]) : group.model;
      const categories = [...new Set(group.items.map(captionCategory).filter(Boolean))];
      const count = group.items.length;

      const section = document.createElement('section');
      section.className = 'index-group';
      section.innerHTML = `
        <div class="index-group-head">
          <h3 class="index-group-name"></h3>
          <span class="index-group-meta"></span>
          <span class="index-group-count"></span>
        </div>
        <div class="index-group-grid"></div>
      `;
      section.querySelector('.index-group-name').textContent = title;
      section.querySelector('.index-group-meta').textContent = categories.join(' / ');
      section.querySelector('.index-group-count').textContent = `${count} photograph${count === 1 ? '' : 's'}`;

      const grid = section.querySelector('.index-group-grid');
      group.items.forEach(item => {
        const index = position++;
        const tile = document.createElement('div');
        tile.className = 'masonry-tile';
        tile.setAttribute('tabindex', '0');
        tile.setAttribute('role', 'button');
        tile.setAttribute('aria-label', `Open photograph of ${item.model}`);

        tile.innerHTML = `
          <div class="tile-frame" style="aspect-ratio: ${item.aspectRatio || 0.67}; background-color: ${item.dominantColor};">
            <img
              src="${item.urlMedium}"
              alt="${item.model} photography"
              loading="lazy"
              decoding="async"
              draggable="false"
            />
          </div>
        `;

        const img = tile.querySelector('img');
        img.addEventListener('load', () => img.classList.add('loaded'));
        if (img.complete && img.naturalWidth) img.classList.add('loaded');

        tile.addEventListener('click', () => openLightbox(indexOrder, index));
        tile.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openLightbox(indexOrder, index);
          }
        });
        grid.appendChild(tile);
      });

      frag.appendChild(section);
    });

    DOM.editorialGrid.appendChild(frag);
    const total = state.filteredItems.length;
    DOM.gridStatsCount.textContent = groups.length > 1
      ? `${total} photographs \u2014 ${groups.length} series`
      : `${total} photograph${total === 1 ? '' : 's'}`;

    if (state.currentView === 'grid') replayGridReveal();
  }

  function replayGridReveal() {
    if (gridObserver) gridObserver.disconnect();
    const tiles = Array.from(DOM.editorialGrid.querySelectorAll('.index-group-head, .masonry-tile'));
    tiles.forEach(tile => {
      tile.classList.remove('in-view');
      tile.style.transitionDelay = '0ms';
    });
    // Let the reset paint before observing, so the entrance animates
    requestAnimationFrame(() => {
      gridObserver = observeReveal(tiles, DOM.gridView);
    });
  }

  function renderLightboxThumbnails() {
    DOM.lbThumbnailsStrip.innerHTML = '';
    const frag = document.createDocumentFragment();

    state.lightboxItems.forEach((item, index) => {
      const thumb = document.createElement('button');
      thumb.className = `strip-thumb ${index === state.lightboxIndex ? 'active' : ''}`;
      thumb.setAttribute('data-index', index);
      thumb.setAttribute('aria-label', `View ${item.model}`);

      thumb.innerHTML = `<img src="${item.urlThumb}" alt="" loading="lazy" draggable="false">`;

      thumb.addEventListener('click', () => setLightboxSlide(index));
      frag.appendChild(thumb);
    });

    DOM.lbThumbnailsStrip.appendChild(frag);
  }

  // ---------------------------------------------------------------------------
  // FILTERING LOGIC
  // ---------------------------------------------------------------------------
  function applyFilter(filterName) {
    state.activeFilter = filterName;

    if (filterName === 'all') {
      state.filteredItems = [...GALLERY_DATA];
    } else {
      state.filteredItems = GALLERY_DATA.filter(item => item.model.toLowerCase() === filterName.toLowerCase());
    }

    const series = SERIES.find(([value]) => value === filterName);
    DOM.currentFilterName.textContent = series ? (series[1] || series[0]) : filterName;

    DOM.seriesBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-filter') === filterName);
    });

    state.lightboxItems = state.filteredItems;
    state.lightboxIndex = 0;
    stopGlide();
    DOM.runwayWrapper.scrollLeft = 0;

    renderRunway();
    renderGrid();
    renderLightboxThumbnails();
    renderCinemaSlide(0);

    DOM.gridView.scrollTop = 0;
    updateHudScrubber();
  }

  function closeSeriesRibbon() {
    DOM.seriesRibbon.classList.remove('is-open');
    DOM.filterTriggerBtn.setAttribute('aria-expanded', 'false');
  }

  // ---------------------------------------------------------------------------
  // VIEW MODE SWITCHER
  // ---------------------------------------------------------------------------
  function setViewMode(viewName) {
    closeMobileMenu();
    if (state.currentView === viewName) return;
    state.currentView = viewName;
    DOM.body.setAttribute('data-view', viewName);

    DOM.runwayView.classList.toggle('active', viewName === 'runway');
    DOM.gridView.classList.toggle('active', viewName === 'grid');
    DOM.cinemaView.classList.toggle('active', viewName === 'cinema');

    [...DOM.viewBtns, ...DOM.mobBtns].forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
    });

    if (viewName === 'grid') replayGridReveal();

    const hash = viewName === 'grid' ? '#index' : viewName === 'cinema' ? '#cinema' : '';
    history.replaceState(null, '', location.pathname + location.search + hash);

    if (viewName !== 'cinema' && state.cinemaPlaying) {
      toggleCinemaPlay(false);
    }
  }

  // ---------------------------------------------------------------------------
  // GLOBAL HORIZONTAL SCROLL & SLIDE ENGINE (Desktop & Phone)
  // ---------------------------------------------------------------------------
  // Eased glide: the scroller chases a target position each frame
  const glide = { target: 0, current: 0, raf: null };

  function maxScroll() {
    const scroller = DOM.runwayWrapper;
    return Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  }

  function glideTick() {
    const scroller = DOM.runwayWrapper;
    glide.current += (glide.target - glide.current) * (prefersReducedMotion ? 1 : 0.1);
    if (Math.abs(glide.target - glide.current) < 0.5) glide.current = glide.target;
    scroller.scrollLeft = glide.current;

    glide.raf = glide.current !== glide.target ? requestAnimationFrame(glideTick) : null;
  }

  function glideTo(x) {
    if (!glide.raf) glide.current = DOM.runwayWrapper.scrollLeft;
    glide.target = Math.max(0, Math.min(maxScroll(), x));
    if (!glide.raf) glide.raf = requestAnimationFrame(glideTick);
  }

  function glideBy(dx) {
    const base = glide.raf ? glide.target : DOM.runwayWrapper.scrollLeft;
    glideTo(base + dx);
  }

  function stopGlide() {
    if (glide.raf) cancelAnimationFrame(glide.raf);
    glide.raf = null;
  }

  // Width of the runway's left edge that photos sit behind: the pinned title
  // panel on desktop, otherwise just the track's padding
  function runwayInset() {
    const intro = document.getElementById('intro-slide');
    if (getComputedStyle(intro).position === 'sticky') {
      return intro.offsetWidth + (parseFloat(getComputedStyle(intro).marginRight) || 0);
    }
    return parseFloat(getComputedStyle(DOM.runwayTrack).paddingLeft) || 0;
  }

  // Step to the next / previous photograph so each press lands on a clean edge
  function stepRunway(direction) {
    const scroller = DOM.runwayWrapper;
    const inset = runwayInset();
    const current = glide.raf ? glide.target : scroller.scrollLeft;
    const stops = [
      0,
      ...Array.from(DOM.runwayCardsContainer.children).map(el => el.offsetLeft - inset),
      maxScroll()
    ];

    let dest;
    if (direction > 0) {
      dest = stops.find(x => x > current + 4);
      if (dest === undefined) dest = maxScroll();
    } else {
      dest = [...stops].reverse().find(x => x < current - 4);
      if (dest === undefined) dest = 0;
    }
    glideTo(dest);
  }

  function setupGlobalScrollEngine() {
    const scroller = DOM.runwayWrapper;

    // 1. Wheel / trackpad anywhere on the page slides the runway
    window.addEventListener('wheel', (e) => {
      if (e.ctrlKey) return;
      const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? scroller.clientWidth : 1;
      const delta = (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * unit;

      const seriesRow = e.target.closest('.series-list');
      if (seriesRow) {
        e.preventDefault();
        seriesRow.scrollLeft += delta;
        return;
      }

      if (state.currentView !== 'runway' || isOverlayOpen()) return;
      e.preventDefault();
      glideBy(delta * 1.15);
    }, { passive: false });

    // 2. Phones: horizontal swipes scroll natively; vertical swipes are
    // translated into a horizontal slide with a little momentum on release.
    let touchStartX = 0;
    let touchStartY = 0;
    let scrollStart = 0;
    let verticalMode = false;
    let lastY = 0;
    let lastT = 0;
    let velocity = 0;

    window.addEventListener('touchstart', (e) => {
      if (state.currentView !== 'runway' || isOverlayOpen()) return;
      stopGlide();
      touchStartX = e.touches[0].clientX;
      touchStartY = lastY = e.touches[0].clientY;
      lastT = performance.now();
      scrollStart = scroller.scrollLeft;
      verticalMode = false;
      velocity = 0;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (state.currentView !== 'runway' || isOverlayOpen()) return;

      const curX = e.touches[0].clientX;
      const curY = e.touches[0].clientY;
      const diffX = touchStartX - curX;
      const diffY = touchStartY - curY;

      if (!verticalMode && Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 6) {
        verticalMode = true;
      }

      if (verticalMode) {
        scroller.scrollLeft = scrollStart + diffY * 1.4;
        const now = performance.now();
        const dt = Math.max(1, now - lastT);
        velocity = (lastY - curY) / dt;
        lastY = curY;
        lastT = now;
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      if (!verticalMode) return;
      verticalMode = false;
      if (Math.abs(velocity) > 0.2) glideBy(velocity * 1.4 * 260);
    }, { passive: true });

    // 3. Desktop click-and-drag pan (a real drag never counts as a click)
    let isMouseDown = false;
    let dragStartX = 0;
    let dragScrollStart = 0;

    scroller.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || e.target.closest('button, a')) return;
      stopGlide();
      isMouseDown = true;
      state.dragMoved = false;
      dragStartX = e.pageX;
      dragScrollStart = scroller.scrollLeft;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isMouseDown) return;
      const walk = e.pageX - dragStartX;
      if (!state.dragMoved && Math.abs(walk) > 5) {
        state.dragMoved = true;
        scroller.classList.add('is-dragging');
        DOM.cursorLabel.classList.remove('is-active');
      }
      if (state.dragMoved) scroller.scrollLeft = dragScrollStart - walk * 1.3;
    });

    window.addEventListener('mouseup', () => {
      if (!isMouseDown) return;
      isMouseDown = false;
      scroller.classList.remove('is-dragging');
      // Clear after the click event that follows mouseup has been ignored
      setTimeout(() => { state.dragMoved = false; }, 0);
    });

    // 4. Update HUD on scroll
    let hudQueued = false;
    scroller.addEventListener('scroll', () => {
      if (hudQueued) return;
      hudQueued = true;
      requestAnimationFrame(() => {
        hudQueued = false;
        updateHudScrubber();
      });
    }, { passive: true });

    window.addEventListener('resize', updateHudScrubber);

    // 5. HUD scrubber: click or drag to seek
    let scrubbing = false;
    const seek = (clientX, smooth) => {
      const rect = DOM.hudScrubber.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      if (smooth) {
        glideTo(maxScroll() * ratio);
      } else {
        stopGlide();
        scroller.scrollLeft = maxScroll() * ratio;
      }
    };

    DOM.hudScrubber.addEventListener('pointerdown', (e) => {
      scrubbing = true;
      DOM.hudScrubber.setPointerCapture(e.pointerId);
      seek(e.clientX, true);
    });
    DOM.hudScrubber.addEventListener('pointermove', (e) => {
      if (scrubbing) seek(e.clientX, false);
    });
    DOM.hudScrubber.addEventListener('pointerup', () => { scrubbing = false; });
    DOM.hudScrubber.addEventListener('pointercancel', () => { scrubbing = false; });

    // 6. HUD step next / prev
    DOM.hudPrevBtn.addEventListener('click', () => stepRunway(-1));
    DOM.hudNextBtn.addEventListener('click', () => stepRunway(1));
  }

  function updateHudScrubber() {
    const scroller = DOM.runwayWrapper;
    const max = maxScroll();
    const progress = max > 0 ? scroller.scrollLeft / max : 0;
    const percent = Math.min(100, Math.max(0, progress * 100));

    DOM.hudProgressFill.style.width = `${percent}%`;
    DOM.hudScrubberHandle.style.left = `${percent}%`;
    DOM.hudScrubber.setAttribute('aria-valuenow', Math.round(percent));

    updateHudLabel();
  }

  // Show the name of the series currently in view
  function updateHudLabel() {
    const scroller = DOM.runwayWrapper;
    const inset = runwayInset();
    const focusX = scroller.scrollLeft + inset + (scroller.clientWidth - inset) * 0.3;
    const cards = DOM.runwayCardsContainer.children;
    let label = 'Selected Works';

    const first = cards[0];
    const last = cards[cards.length - 1];
    if (first && focusX >= first.offsetLeft) {
      if (last && focusX > last.offsetLeft + last.offsetWidth + 40) {
        label = 'Bookings & Inquiries';
      } else {
        for (let i = 0; i < cards.length; i++) {
          if (cards[i].offsetLeft + cards[i].offsetWidth >= focusX) {
            label = cards[i].getAttribute('data-model');
            break;
          }
        }
      }
    }

    if (DOM.hudSeriesLabel.textContent === label || DOM.hudSeriesLabel.dataset.pending === label) return;
    DOM.hudSeriesLabel.dataset.pending = label;
    DOM.hudSeriesLabel.classList.add('is-changing');
    clearTimeout(updateHudLabel.timer);
    updateHudLabel.timer = setTimeout(() => {
      DOM.hudSeriesLabel.textContent = label;
      delete DOM.hudSeriesLabel.dataset.pending;
      DOM.hudSeriesLabel.classList.remove('is-changing');
    }, 220);
  }

  // ---------------------------------------------------------------------------
  // HOVER CURSOR LABEL (desktop only)
  // ---------------------------------------------------------------------------
  function setupCursorLabel() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    DOM.body.classList.add('has-cursor');

    const pos = { x: -200, y: -200, tx: -200, ty: -200 };
    let raf = null;

    const tick = () => {
      pos.x += (pos.tx - pos.x) * 0.22;
      pos.y += (pos.ty - pos.y) * 0.22;
      DOM.cursorLabel.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      raf = (Math.abs(pos.tx - pos.x) > 0.1 || Math.abs(pos.ty - pos.y) > 0.1) ? requestAnimationFrame(tick) : null;
    };

    window.addEventListener('pointermove', (e) => {
      pos.tx = e.clientX;
      pos.ty = e.clientY;
      if (!raf) raf = requestAnimationFrame(tick);

      const overPhoto = !state.dragMoved && !!e.target.closest('.gallery-card, .masonry-tile');
      DOM.cursorLabel.classList.toggle('is-active', overPhoto);
    }, { passive: true });

    document.addEventListener('mouseleave', () => DOM.cursorLabel.classList.remove('is-active'));
  }

  // ---------------------------------------------------------------------------
  // LIGHTBOX MODAL
  // ---------------------------------------------------------------------------
  function openLightbox(items, index) {
    if (items !== state.lightboxItems) {
      state.lightboxItems = items;
      state.lightboxIndex = index;
      renderLightboxThumbnails();
    }
    state.lightboxIndex = index;
    state.isLightboxOpen = true;
    state.isZoomed = false;

    DOM.cursorLabel.classList.remove('is-active');
    DOM.lbZoomToggle.classList.remove('zoomed');
    DOM.lightboxImg.classList.remove('is-zoomed');
    updateLightboxContent();
    DOM.lightboxModal.classList.add('is-open');
    DOM.lightboxModal.setAttribute('aria-hidden', 'false');
  }

  function closeLightbox() {
    state.isLightboxOpen = false;
    DOM.lightboxModal.classList.remove('is-open');
    DOM.lightboxModal.setAttribute('aria-hidden', 'true');
    DOM.lightboxImg.classList.remove('is-zoomed');
    state.isZoomed = false;
  }

  function preload(url) {
    const img = new Image();
    img.src = url;
    return img;
  }

  function updateLightboxContent() {
    const item = state.lightboxItems[state.lightboxIndex];
    if (!item) return;

    const token = ++state.lightboxToken;
    const img = DOM.lightboxImg;
    img.classList.add('is-loading');

    const next = preload(item.url);
    const show = () => {
      if (token !== state.lightboxToken) return;
      img.src = item.url;
      img.alt = `${item.model} by Abeera Khan`;
      requestAnimationFrame(() => img.classList.remove('is-loading'));
    };
    if (next.decode) next.decode().then(show, show); else next.onload = next.onerror = show;

    DOM.lbTitle.textContent = item.model;
    DOM.lbMeta.textContent = captionCategory(item);

    Array.from(DOM.lbThumbnailsStrip.children).forEach((thumb, idx) => {
      thumb.classList.toggle('active', idx === state.lightboxIndex);
    });

    const activeThumb = DOM.lbThumbnailsStrip.children[state.lightboxIndex];
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    // Warm the neighbours so arrowing through feels instant
    const len = state.lightboxItems.length;
    [1, -1].forEach(step => {
      const neighbour = state.lightboxItems[(state.lightboxIndex + step + len) % len];
      if (neighbour) preload(neighbour.url);
    });
  }

  function setLightboxSlide(newIndex) {
    if (newIndex < 0) newIndex = state.lightboxItems.length - 1;
    if (newIndex >= state.lightboxItems.length) newIndex = 0;
    state.lightboxIndex = newIndex;
    state.isZoomed = false;
    DOM.lightboxImg.classList.remove('is-zoomed');
    DOM.lbZoomToggle.classList.remove('zoomed');
    updateLightboxContent();
  }

  function toggleLightboxZoom() {
    state.isZoomed = !state.isZoomed;
    DOM.lightboxImg.classList.toggle('is-zoomed', state.isZoomed);
    DOM.lbZoomToggle.classList.toggle('zoomed', state.isZoomed);
  }

  // ---------------------------------------------------------------------------
  // CINEMA SLIDESHOW
  // ---------------------------------------------------------------------------
  function renderCinemaSlide(index) {
    const len = state.filteredItems.length;
    if (!len) return;
    if (index < 0) index = len - 1;
    if (index >= len) index = 0;
    state.cinemaIndex = index;

    const item = state.filteredItems[index];
    const token = ++state.cinemaToken;

    DOM.cinemaImg.classList.add('is-swapping');
    DOM.cinemaAmbient.classList.add('is-swapping');
    DOM.cinemaView.classList.remove('is-playing');

    const next = preload(item.url);
    const fadeOut = new Promise(resolve => setTimeout(resolve, DOM.cinemaImg.getAttribute('src') ? 450 : 0));
    const loaded = next.decode ? next.decode().catch(() => { }) : Promise.resolve();

    Promise.all([fadeOut, loaded]).then(() => {
      if (token !== state.cinemaToken) return;
      DOM.cinemaImg.src = item.url;
      DOM.cinemaImg.alt = `${item.model} by Abeera Khan`;
      DOM.cinemaAmbient.style.backgroundImage = `url("${item.urlThumb}")`;
      DOM.cinemaTitle.textContent = item.model;
      DOM.cinemaCategory.textContent = captionCategory(item);

      requestAnimationFrame(() => {
        DOM.cinemaImg.classList.remove('is-swapping');
        DOM.cinemaAmbient.classList.remove('is-swapping');
        if (state.cinemaPlaying) restartCinemaTimer();
      });

      preload(state.filteredItems[(index + 1) % len].url);
    });
  }

  // The progress bar's animation drives autoplay, so bar and slide stay in sync
  function restartCinemaTimer() {
    DOM.cinemaView.classList.remove('is-playing');
    void DOM.cinemaTimerFill.offsetWidth;
    DOM.cinemaView.classList.add('is-playing');
  }

  function toggleCinemaPlay(forceState) {
    state.cinemaPlaying = forceState !== undefined ? forceState : !state.cinemaPlaying;
    DOM.cinemaPlayPause.classList.toggle('playing', state.cinemaPlaying);

    if (state.cinemaPlaying) {
      restartCinemaTimer();
    } else {
      DOM.cinemaView.classList.remove('is-playing');
    }
  }

  // ---------------------------------------------------------------------------
  // ABOUT DRAWER, INQUIRY MODAL & MOBILE MENU
  // ---------------------------------------------------------------------------
  function openAboutDrawer() {
    closeMobileMenu();
    DOM.aboutDrawer.classList.add('is-open');
    DOM.aboutBackdrop.classList.add('is-open');
    DOM.aboutDrawer.setAttribute('aria-hidden', 'false');
    DOM.aboutDrawer.focus({ preventScroll: true });
  }

  function closeAboutDrawer() {
    DOM.aboutDrawer.classList.remove('is-open');
    DOM.aboutBackdrop.classList.remove('is-open');
    DOM.aboutDrawer.setAttribute('aria-hidden', 'true');
  }

  function openInquiryModal() {
    closeMobileMenu();
    closeAboutDrawer();

    const portraits = GALLERY_DATA.filter(item => (item.aspectRatio || 1) < 0.8);
    const pick = portraits[Math.floor(Math.random() * portraits.length)];
    if (pick) {
      DOM.dialogVisualImg.src = pick.urlMedium;
      DOM.dialogVisualModel.textContent = `Pictured \u2014 ${pick.model}`;
    }

    DOM.inquiryModal.classList.add('is-open');
    DOM.inquiryBackdrop.classList.add('is-open');
    setTimeout(() => document.getElementById('inq-name').focus({ preventScroll: true }), 350);
  }

  function closeInquiryModal() {
    DOM.inquiryModal.classList.remove('is-open');
    DOM.inquiryBackdrop.classList.remove('is-open');
  }

  function openMobileMenu() {
    DOM.mobileMenu.classList.add('is-open');
    DOM.mobileMenu.setAttribute('aria-hidden', 'false');
    DOM.body.classList.add('menu-open');
    DOM.mobileMenuBtn.setAttribute('aria-expanded', 'true');
    DOM.mobileMenuBtn.setAttribute('aria-label', 'Close menu');
  }

  function closeMobileMenu() {
    if (!DOM.mobileMenu.classList.contains('is-open')) return;
    DOM.mobileMenu.classList.remove('is-open');
    DOM.mobileMenu.setAttribute('aria-hidden', 'true');
    DOM.body.classList.remove('menu-open');
    DOM.mobileMenuBtn.setAttribute('aria-expanded', 'false');
    DOM.mobileMenuBtn.setAttribute('aria-label', 'Open menu');
  }

  function showToast(message) {
    DOM.toastNotice.textContent = message;
    DOM.toastNotice.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {
      DOM.toastNotice.classList.remove('show');
    }, 2600);
  }

  // ---------------------------------------------------------------------------
  // ALL EVENT LISTENERS
  // ---------------------------------------------------------------------------
  function setupEventListeners() {
    // Brand returns to the start of the runway
    DOM.brandLogo.addEventListener('click', (e) => {
      e.preventDefault();
      closeSeriesRibbon();
      setViewMode('runway');
      glideTo(0);
    });

    // View Switcher Buttons
    [...DOM.viewBtns, ...DOM.mobBtns].forEach(btn => {
      btn.addEventListener('click', () => setViewMode(btn.getAttribute('data-view')));
    });

    // Series Ribbon Toggle
    DOM.filterTriggerBtn.addEventListener('click', () => {
      const isOpen = DOM.seriesRibbon.classList.toggle('is-open');
      DOM.filterTriggerBtn.setAttribute('aria-expanded', String(isOpen));
    });

    // Mobile Menu
    DOM.mobileMenuBtn.addEventListener('click', () => {
      if (DOM.mobileMenu.classList.contains('is-open')) closeMobileMenu(); else openMobileMenu();
    });
    DOM.mmAboutBtn.addEventListener('click', openAboutDrawer);
    DOM.mmInquireBtn.addEventListener('click', openInquiryModal);

    // About Panel
    DOM.openAboutBtn.addEventListener('click', openAboutDrawer);
    DOM.closeAboutBtn.addEventListener('click', closeAboutDrawer);
    DOM.aboutBackdrop.addEventListener('click', closeAboutDrawer);

    // Copy Email
    DOM.copyEmailBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(EMAIL);
        DOM.copyEmailBtn.textContent = 'Copied';
        setTimeout(() => { DOM.copyEmailBtn.textContent = 'Copy'; }, 1800);
        showToast('Email address copied');
      } catch (err) {
        showToast(EMAIL);
      }
    });

    // Inquiry Modal
    DOM.openContactBtn.addEventListener('click', openInquiryModal);
    DOM.closeInquiryBtn.addEventListener('click', closeInquiryModal);
    DOM.inquiryBackdrop.addEventListener('click', closeInquiryModal);

    DOM.inquiryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('inq-name').value;
      const email = document.getElementById('inq-email').value;
      const type = document.getElementById('inq-project-type').value;
      const msg = document.getElementById('inq-msg').value;

      const subject = encodeURIComponent(`Inquiry: ${type} - ${name}`);
      const body = encodeURIComponent(`Hi Abeera,\n\nName: ${name}\nEmail: ${email}\nProject: ${type}\n\nDetails:\n${msg}`);

      window.location.href = `mailto:${EMAIL}?subject=${subject}&body=${body}`;
      closeInquiryModal();
      showToast('Opening your mail app');
    });

    // Lightbox Controls
    DOM.closeLightboxBtn.addEventListener('click', closeLightbox);
    DOM.lightboxOverlay.addEventListener('click', closeLightbox);
    DOM.lbPrevBtn.addEventListener('click', () => setLightboxSlide(state.lightboxIndex - 1));
    DOM.lbNextBtn.addEventListener('click', () => setLightboxSlide(state.lightboxIndex + 1));
    DOM.lbZoomToggle.addEventListener('click', toggleLightboxZoom);
    DOM.lightboxImg.addEventListener('click', toggleLightboxZoom);

    DOM.lbShareBtn.addEventListener('click', async () => {
      const item = state.lightboxItems[state.lightboxIndex];
      if (item && item.url) {
        try {
          await navigator.clipboard.writeText(item.url);
          showToast('Image link copied');
        } catch (e) {
          showToast('Could not copy link');
        }
      }
    });

    // Cinema Controls
    DOM.cinemaPrev.addEventListener('click', () => renderCinemaSlide(state.cinemaIndex - 1));
    DOM.cinemaNext.addEventListener('click', () => renderCinemaSlide(state.cinemaIndex + 1));
    DOM.cinemaPlayPause.addEventListener('click', () => toggleCinemaPlay());
    DOM.cinemaTimerFill.addEventListener('animationend', () => {
      if (state.cinemaPlaying) renderCinemaSlide(state.cinemaIndex + 1);
    });

    // Keyboard Navigation
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (state.isLightboxOpen) closeLightbox();
        else if (DOM.inquiryModal.classList.contains('is-open')) closeInquiryModal();
        else if (DOM.aboutDrawer.classList.contains('is-open')) closeAboutDrawer();
        else if (DOM.mobileMenu.classList.contains('is-open')) closeMobileMenu();
        else closeSeriesRibbon();
        return;
      }

      // Never hijack keys while someone is typing
      if (e.target.closest('input, textarea, select')) return;

      if (state.isLightboxOpen) {
        if (e.key === 'ArrowLeft') setLightboxSlide(state.lightboxIndex - 1);
        if (e.key === 'ArrowRight') setLightboxSlide(state.lightboxIndex + 1);
        if (e.key === 'z' || e.key === 'Z') toggleLightboxZoom();
        return;
      }

      if (isOverlayOpen()) return;

      if (state.currentView === 'runway') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          stepRunway(-1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          stepRunway(1);
        } else if (e.key === 'Home') {
          glideTo(0);
        } else if (e.key === 'End') {
          glideTo(maxScroll());
        }
      } else if (state.currentView === 'cinema') {
        if (e.key === 'ArrowLeft') renderCinemaSlide(state.cinemaIndex - 1);
        if (e.key === 'ArrowRight') renderCinemaSlide(state.cinemaIndex + 1);
        if (e.key === ' ' && !e.target.closest('button')) {
          e.preventDefault();
          toggleCinemaPlay();
        }
      }
    });

    // Touch Swipe in Lightbox
    let lbTouchX = 0;
    let lbTouchY = 0;

    DOM.lightboxModal.addEventListener('touchstart', (e) => {
      lbTouchX = e.touches[0].clientX;
      lbTouchY = e.touches[0].clientY;
    }, { passive: true });

    DOM.lightboxModal.addEventListener('touchend', (e) => {
      if (!state.isLightboxOpen || state.isZoomed) return;
      const diffX = e.changedTouches[0].clientX - lbTouchX;
      const diffY = e.changedTouches[0].clientY - lbTouchY;

      if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY)) {
        setLightboxSlide(state.lightboxIndex + (diffX > 0 ? -1 : 1));
      } else if (diffY > 80 && Math.abs(diffY) > Math.abs(diffX)) {
        closeLightbox();
      }
    }, { passive: true });
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
