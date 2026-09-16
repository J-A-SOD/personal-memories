(function(){

  // ---- placeholder data — swap in real memories later ----
  var memories = [
    { date: '2013-06-14', title: 'Learned to ride a bike in the cul-de-sac' },
    { date: '2014-08-02', title: 'First week at the new school' },
    { date: '2015-12-24', title: 'Snowed in at grandma\u2019s house' },
    { date: '2016-03-11', title: 'Moved into the apartment on Pike Street' },
    { date: '2016-07-19', title: 'Road trip down the coast with no real plan' },
    { date: '2017-05-06', title: 'Adopted a very opinionated cat' },
    { date: '2018-09-23', title: 'Graduation, and the party that followed' },
    { date: '2019-01-15', title: 'Started the job that changed everything' },
    { date: '2020-04-02', title: 'Learned to bake bread, like everyone else' },
    { date: '2021-11-08', title: 'First apartment that was truly ours' },
    { date: '2022-06-30', title: 'Wedding in the backyard, rain and all' },
    { date: '2023-02-14', title: 'A quiet winter, mostly spent reading' },
    { date: '2024-08-19', title: 'Drove across three states to see the eclipse' },
    { date: '2025-10-01', title: 'The trip we almost didn\u2019t take' }
  ];

  var MIN_GAP = 110;      // minimum px between two neighboring nodes
  var PX_PER_DAY = 0.6;   // additional spacing per day elapsed
  var LERP = 0.14;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var viewport = document.getElementById('viewport');
  var track = document.getElementById('track');
  var line = document.getElementById('line');
  var timeline = document.getElementById('timeline');
  var backdropYear = document.getElementById('backdropYear');
  var focusEl = document.getElementById('focus');
  var focusDate = document.getElementById('focusDate');
  var focusTitle = document.getElementById('focusTitle');
  var hint = document.getElementById('hint');

  var nodes = [];
  var cumulative = [];
  var trackPad = 0;
  var maxOffset = 0;
  var currentOffset = 0;
  var targetOffset = 0;
  var activeIndex = -1;
  var hasInteracted = false;

  var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function fmtShort(d){
    return monthNames[d.getMonth()] + ' ' + d.getDate();
  }
  function fmtLong(d){
    return monthNames[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function build(){
    memories.forEach(function(m){ m._date = new Date(m.date + 'T00:00:00'); });
    memories.sort(function(a,b){ return a._date - b._date; });

    var els = [];
    var cum = 0;
    cumulative = [];

    memories.forEach(function(m, i){
      if (i > 0){
        var days = (m._date - memories[i-1]._date) / 86400000;
        cum += Math.max(MIN_GAP, days * PX_PER_DAY);
      }
      cumulative.push(cum);

      var btn = document.createElement('button');
      btn.className = 'node';
      btn.type = 'button';
      btn.dataset.index = i;
      btn.setAttribute('aria-label', fmtLong(m._date) + ' \u2014 ' + m.title);

      var dateEl = document.createElement('span');
      dateEl.className = 'node-date';
      dateEl.textContent = fmtShort(m._date);

      var tickEl = document.createElement('span');
      tickEl.className = 'node-tick';

      var yearEl = document.createElement('span');
      yearEl.className = 'node-year';
      yearEl.textContent = m._date.getFullYear();

      btn.appendChild(dateEl);
      btn.appendChild(tickEl);
      btn.appendChild(yearEl);
      track.appendChild(btn);
      els.push(btn);

      btn.addEventListener('click', function(){
        registerInteraction();
        goToIndex(i);
      });
    });

    nodes = els;
    layout();
  }

  function layout(){
    trackPad = viewport.clientWidth / 2;
    var lastCum = cumulative[cumulative.length - 1];
    var totalWidth = trackPad * 2 + lastCum;

    track.style.width = totalWidth + 'px';
    line.style.width = totalWidth + 'px';

    nodes.forEach(function(n, i){
      n.style.left = (trackPad + cumulative[i]) + 'px';
    });

    maxOffset = lastCum;
    targetOffset = clamp(targetOffset, 0, maxOffset);
  }

  function clamp(v, min, max){
    return Math.max(min, Math.min(max, v));
  }

  function findNearest(offset){
    var best = 0, bestDist = Infinity;
    for (var i = 0; i < nodes.length; i++){
      var d = Math.abs(cumulative[i] - offset);
      if (d < bestDist){ bestDist = d; best = i; }
    }
    return best;
  }

  function goToIndex(i){
    i = clamp(i, 0, nodes.length - 1);
    targetOffset = cumulative[i];
    nodes[i].focus({ preventScroll: true });
  }

  function setActive(i){
    if (i === activeIndex) return;
    activeIndex = i;
    nodes.forEach(function(n, idx){
      n.classList.toggle('is-active', idx === i);
      n.setAttribute('aria-current', idx === i ? 'true' : 'false');
    });

    var m = memories[i];
    if (!m) return;

    if (backdropYear.textContent !== String(m._date.getFullYear())){
      backdropYear.style.opacity = '0';
      setTimeout(function(){
        backdropYear.textContent = m._date.getFullYear();
        backdropYear.style.opacity = '0.06';
      }, reduceMotion ? 0 : 180);
    }

    focusEl.classList.add('is-shifting');
    setTimeout(function(){
      focusDate.textContent = fmtLong(m._date);
      focusTitle.textContent = m.title;
      focusEl.classList.remove('is-shifting');
    }, reduceMotion ? 0 : 180);
  }

  function registerInteraction(){
    if (hasInteracted) return;
    hasInteracted = true;
    hint.classList.add('is-hidden');
  }

  // ---- input handling ----

  viewport.addEventListener('wheel', function(e){
    e.preventDefault();
    registerInteraction();
    var delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    targetOffset = clamp(targetOffset + delta, 0, maxOffset);
  }, { passive: false });

  var dragging = false;
  var dragStartX = 0;
  var dragStartOffset = 0;

  viewport.addEventListener('pointerdown', function(e){
    dragging = true;
    dragStartX = e.clientX;
    dragStartOffset = targetOffset;
    viewport.classList.add('is-grabbing');
    viewport.setPointerCapture(e.pointerId);
  });

  viewport.addEventListener('pointermove', function(e){
    if (!dragging) return;
    registerInteraction();
    var dx = e.clientX - dragStartX;
    targetOffset = clamp(dragStartOffset - dx, 0, maxOffset);
  });

  function endDrag(){
    dragging = false;
    viewport.classList.remove('is-grabbing');
  }
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);

  timeline.addEventListener('keydown', function(e){
    if (e.key === 'ArrowRight'){
      e.preventDefault();
      registerInteraction();
      goToIndex(activeIndex + 1);
    } else if (e.key === 'ArrowLeft'){
      e.preventDefault();
      registerInteraction();
      goToIndex(activeIndex - 1);
    }
  });

  window.addEventListener('resize', debounce(layout, 120));

  function debounce(fn, ms){
    var t;
    return function(){
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  // ---- animation loop ----

  function tick(){
    currentOffset += (targetOffset - currentOffset) * (reduceMotion ? 1 : LERP);
    if (Math.abs(targetOffset - currentOffset) < 0.05) currentOffset = targetOffset;

    track.style.transform = 'translateX(' + (-currentOffset) + 'px)';

    var nearest = findNearest(currentOffset);
    setActive(nearest);

    requestAnimationFrame(tick);
  }

  build();
  goToIndex(0);
  currentOffset = targetOffset;
  track.style.transform = 'translateX(' + (-currentOffset) + 'px)';
  setActive(0);
  requestAnimationFrame(tick);

})();