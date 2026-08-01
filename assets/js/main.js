/**
 * Tally: page behaviour.
 *
 * The centrepiece is the tally field, 400 cells generated at build time from the
 * real ERM V3 execution counts. It prints in on a diagonal sweep and its legend
 * doubles as a control: pressing an outcome dims the rest so the subset stands
 * out while the proportion stays readable.
 *
 * Everything degrades. Without scripting the field is fully painted, the log shows
 * every record, and the chart bars sit at full length.
 */
(function () {
  'use strict';

  var reducedMotionQuery =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

  function prefersReducedMotion() {
    return Boolean(reducedMotionQuery && reducedMotionQuery.matches);
  }

  function select(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function selectAll(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  function rafThrottle(callback) {
    var scheduled = false;

    return function throttled() {
      var args = arguments;
      var context = this;

      if (scheduled) {
        return;
      }

      scheduled = true;
      window.requestAnimationFrame(function () {
        scheduled = false;
        callback.apply(context, args);
      });
    };
  }

  function createElement(tagName, className, textContent) {
    var element = document.createElement(tagName);

    if (className) {
      element.className = className;
    }

    // textContent, never innerHTML: nothing injected here should be markup.
    if (typeof textContent === 'string') {
      element.textContent = textContent;
    }

    return element;
  }

  /**
   * Calls back once for each element as scrolling reaches it.
   *
   * This sweeps positions rather than using IntersectionObserver. An observer
   * samples, so an element scrolled past between two samples can be missed and
   * never fire, which for a reveal means content that stays invisible for good.
   * A sweep is monotonic: reached once, fired once, then dropped. The listener
   * detaches when nothing is left pending.
   */
  function whenReached(elements, onReach) {
    var pending = elements.slice();

    if (pending.length === 0) {
      return;
    }

    var sweep = rafThrottle(function () {
      var limit = window.innerHeight - 40;

      pending = pending.filter(function (element) {
        if (element.getBoundingClientRect().top > limit) {
          return true;
        }

        onReach(element);
        return false;
      });

      if (pending.length === 0) {
        window.removeEventListener('scroll', sweep);
        window.removeEventListener('resize', sweep);
      }
    });

    window.addEventListener('scroll', sweep, { passive: true });
    window.addEventListener('resize', sweep, { passive: true });
    sweep();
  }

  /* ======================================================================
     Entrances
     ====================================================================== */

  /**
   * Reveals entrance targets as they are reached.
   *
   * This sweeps positions on scroll rather than using IntersectionObserver.
   * An observer samples, so an element scrolled past between two samples can be
   * missed and left permanently invisible, which is the exact failure mode a
   * reveal animation must not have. A sweep is monotonic: once an element has
   * been reached it is revealed and dropped, and the listener detaches when the
   * list is empty.
   */
  function initEntrances() {
    var targets = selectAll('[data-enter]');

    if (targets.length === 0) {
      return;
    }

    if (prefersReducedMotion()) {
      targets.forEach(function (target) {
        target.classList.add('is-entered');
      });
      return;
    }

    whenReached(targets, function (target) {
      target.classList.add('is-entered');
    });
  }

  /* ======================================================================
     Tally field
     ====================================================================== */

  var OUTCOME_LABELS = {
    pass: 'passed',
    fail: 'failed',
    pending: 'in progress',
    absent: 'not executed',
  };

  function initTally() {
    var wrap = select('#tally');

    if (!wrap) {
      return;
    }

    // Print the field in. The per-cell delay is baked into the markup at build
    // time, so this only has to flip one class.
    if (prefersReducedMotion()) {
      wrap.classList.add('is-printed');
    } else {
      whenReached([wrap], function () {
        wrap.classList.add('is-printed');
      });
    }

    var legend = select('#tally-legend');
    var status = select('#tally-status');

    if (!legend) {
      return;
    }

    var buttons = selectAll('[data-outcome]', legend);

    function isolate(outcome) {
      var isClearing = !outcome || wrap.getAttribute('data-isolate') === outcome;

      if (isClearing) {
        wrap.removeAttribute('data-isolate');
      } else {
        wrap.setAttribute('data-isolate', outcome);
      }

      buttons.forEach(function (button) {
        button.setAttribute(
          'aria-pressed',
          !isClearing && button.getAttribute('data-outcome') === outcome ? 'true' : 'false',
        );
      });

      if (status) {
        status.textContent = isClearing
          ? ''
          : 'Isolating the ' + (OUTCOME_LABELS[outcome] || outcome) + ' items. Press again to clear.';
      }
    }

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        isolate(button.getAttribute('data-outcome'));
      });
    });
  }

  /* ======================================================================
     Density chart
     ====================================================================== */

  function initChart() {
    var bars = selectAll('.chart-bar');

    if (bars.length === 0) {
      return;
    }

    function draw() {
      bars.forEach(function (bar, index) {
        // A short stagger reads as a scale being drawn rather than decoration.
        bar.style.setProperty('--bar-delay', index * 70 + 'ms');
        bar.classList.add('is-drawn');
      });
    }

    if (prefersReducedMotion()) {
      draw();
      return;
    }

    whenReached([bars[0].closest('div[role="table"]') || bars[0]], draw);
  }

  /* ======================================================================
     Masthead
     ====================================================================== */

  function initReadProgress() {
    var bar = select('#read-progress');

    if (!bar) {
      return;
    }

    var update = rafThrottle(function () {
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - doc.clientHeight;
      var ratio = scrollable > 0 ? doc.scrollTop / scrollable : 0;

      bar.style.transform = 'scaleX(' + Math.min(Math.max(ratio, 0), 1) + ')';
    });

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  function initSectionTracking() {
    var links = selectAll('[data-section-link]');
    var sections = selectAll('section[id]');

    if (links.length === 0 || sections.length === 0 || !('IntersectionObserver' in window)) {
      return;
    }

    var ratios = {};

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          ratios[entry.target.id] = entry.isIntersecting ? entry.intersectionRatio : 0;
        });

        // Most visible section wins, so the marker does not jump on fast scrolls.
        var bestId = null;
        var bestRatio = 0;

        Object.keys(ratios).forEach(function (id) {
          if (ratios[id] > bestRatio) {
            bestRatio = ratios[id];
            bestId = id;
          }
        });

        if (!bestId) {
          return;
        }

        links.forEach(function (link) {
          var isActive = link.getAttribute('href') === '#' + bestId;
          link.classList.toggle('is-active', isActive);

          if (isActive) {
            link.setAttribute('aria-current', 'true');
          } else {
            link.removeAttribute('aria-current');
          }
        });
      },
      { rootMargin: '-12% 0px -55% 0px', threshold: [0, 0.15, 0.4, 0.75, 1] },
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  /* ======================================================================
     Severity filter
     ====================================================================== */

  var SEVERITY_KEYS = { 1: 'critical', 2: 'high', 3: 'medium', 4: 'low', 0: 'all' };

  function initSeverityFilter() {
    var group = select('#severity-filter');
    var body = select('#record-body');
    var status = select('#filter-status');

    if (!group || !body || !status) {
      return;
    }

    var buttons = selectAll('[data-severity]', group);
    var rows = selectAll('.record-row', body);

    function apply(severity) {
      var shown = 0;

      rows.forEach(function (row) {
        var matches = severity === 'all' || row.getAttribute('data-severity') === severity;
        row.hidden = !matches;

        if (matches) {
          shown += 1;
        }
      });

      buttons.forEach(function (button) {
        button.setAttribute(
          'aria-pressed',
          button.getAttribute('data-severity') === severity ? 'true' : 'false',
        );
      });

      status.textContent =
        severity === 'all'
          ? 'Showing all ' + shown + ' records'
          : 'Showing ' + shown + ' ' + severity + ' of ' + rows.length + ' records';
    }

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        apply(button.getAttribute('data-severity'));
      });
    });

    // Number keys jump straight to a severity. Ignored while a dialog is open or
    // while the visitor is typing.
    document.addEventListener('keydown', function (event) {
      if (event.metaKey || event.ctrlKey || event.altKey || select('dialog[open]')) {
        return;
      }

      var target = event.target;
      if (target && (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName))) {
        return;
      }

      var severity = SEVERITY_KEYS[event.key];
      if (!severity) {
        return;
      }

      apply(severity);

      var pressed = select('[data-severity="' + severity + '"]', group);
      if (pressed) {
        pressed.focus();
      }
    });
  }

  /* ======================================================================
     Overlays
     ====================================================================== */

  function supportsModal(dialog) {
    return Boolean(dialog && typeof dialog.showModal === 'function');
  }

  function releaseScrollLock() {
    if (!select('dialog[open]')) {
      document.documentElement.classList.remove('has-overlay');
    }
  }

  /**
   * Wires a native dialog. Focus trapping, Escape, focus restoration and
   * background inertness all come from the platform; only the transition and the
   * scroll lock need managing here.
   */
  function wireOverlay(dialog, panel, options) {
    var settings = options || {};

    function open() {
      dialog.showModal();
      document.documentElement.classList.add('has-overlay');

      if (settings.onOpen) {
        settings.onOpen();
      }

      window.requestAnimationFrame(function () {
        panel.classList.remove('opacity-0', 'translate-y-2');
      });
    }

    function close() {
      panel.classList.add('opacity-0', 'translate-y-2');

      window.setTimeout(function () {
        if (dialog.open) {
          dialog.close();
        }
      }, 180);
    }

    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) {
        close();
      }
    });

    dialog.addEventListener('cancel', function (event) {
      event.preventDefault();
      close();
    });

    dialog.addEventListener('close', function () {
      panel.classList.add('opacity-0', 'translate-y-2');
      releaseScrollLock();

      if (settings.onClose) {
        settings.onClose();
      }
    });

    selectAll('[data-overlay-dismiss]', dialog).forEach(function (element) {
      element.addEventListener('click', close);
    });

    return { open: open, close: close };
  }

  function initContentsOverlay() {
    var toggle = select('#contents-toggle');
    var dialog = select('#contents-overlay');
    var panel = select('#contents-panel');

    if (!toggle || !dialog || !panel || !supportsModal(dialog)) {
      return;
    }

    var overlay = wireOverlay(dialog, panel, {
      onOpen: function () {
        toggle.setAttribute('aria-expanded', 'true');
      },
      onClose: function () {
        toggle.setAttribute('aria-expanded', 'false');
      },
    });

    toggle.addEventListener('click', function () {
      if (dialog.open) {
        overlay.close();
      } else {
        overlay.open();
      }
    });

    if (typeof window.matchMedia === 'function') {
      var wideQuery = window.matchMedia('(min-width: 1024px)');
      if (typeof wideQuery.addEventListener === 'function') {
        wideQuery.addEventListener('change', function (event) {
          if (event.matches && dialog.open) {
            overlay.close();
          }
        });
      }
    }
  }

  /* ======================================================================
     Revision archive
     ====================================================================== */

  function initArchiveOverlay() {
    var toggle = select('#archive-toggle');
    var dialog = select('#archive-overlay');
    var panel = select('#archive-panel');

    if (!toggle || !dialog || !panel) {
      return;
    }

    // Without dialog support the trigger cannot open anything, so it becomes a
    // plain link to the other revision instead of a button that does nothing.
    if (!supportsModal(dialog)) {
      var fallback = document.createElement('a');
      fallback.className = toggle.className;
      fallback.href = 'https://syefdi.github.io/';
      fallback.replaceChildren.apply(fallback, toggle.childNodes);
      toggle.replaceWith(fallback);
      return;
    }

    var overlay = wireOverlay(dialog, panel, {
      onOpen: function () {
        toggle.setAttribute('aria-expanded', 'true');
      },
      onClose: function () {
        toggle.setAttribute('aria-expanded', 'false');
      },
    });

    toggle.addEventListener('click', function () {
      if (dialog.open) {
        overlay.close();
      } else {
        overlay.open();
      }
    });
  }

  /* ======================================================================
     System detail
     ====================================================================== */

  var SYSTEMS = {
    erm: {
      name: 'ERM',
      full: 'Enterprise Risk Management',
      summary:
        'Risk assessment matrices, mitigation tracking and compliance reporting, with access scoped by role from administrator down to viewer.',
      scope: ['Risk assessment workflows', 'Mitigation tracking', 'Compliance modules', 'Role-based access'],
      work: [
        'Ran more than 150 manual test cases across the risk assessment workflows.',
        'Found and documented calculation defects in the risk scoring module.',
        'Verified access control for five user tiers, administrator through viewer.',
        'Triggered and inspected the notification cron jobs, which is where the critical defect surfaced.',
      ],
    },
    crm: {
      name: 'CRM',
      full: 'Customer Relationship Management',
      summary:
        'Customer records, communication history and permission compliance, with attention to what each role is allowed to see.',
      scope: ['Customer data management', 'Permissions and roles', 'Session handling'],
      work: [
        'Tested data persistence and timeout behaviour across concurrent sessions.',
        'Verified that personally identifiable information stays masked from lower tiers.',
        'Checked communication log formatting across different mail clients.',
      ],
    },
    dms: {
      name: 'DMS',
      full: 'Document Management System',
      summary:
        'File integrity from upload through storage to download, plus the locking that stops two people overwriting each other.',
      scope: ['Document uploads', 'File integrity', 'Version control'],
      work: [
        'Pushed the upload limits, including executables renamed with a .pdf extension.',
        'Verified download integrity so nothing is corrupted in transit.',
        'Tested lock and checkout behaviour against concurrent edits.',
      ],
    },
    hris: {
      name: 'HRIS',
      full: 'Human Resource Information System',
      summary:
        'Onboarding and offboarding pipelines, payroll calculation, and the audit trail over sensitive employee data.',
      scope: ['Human resource workflows', 'Payroll integration', 'Data privacy'],
      work: [
        'Walked the onboarding and offboarding flows step by step.',
        'Validated payroll calculation against tax brackets and leave deductions.',
        'Confirmed the audit log captures every unauthorised access attempt.',
      ],
    },
    pd: {
      name: 'PD',
      full: 'Product Distribution',
      summary:
        'Logistics and dispatch, from warehouse check-in to delivery, including what happens when the network drops mid-update.',
      scope: ['Logistics workflows', 'Inventory syncing', 'Dispatch tracking'],
      work: [
        'Traced a single item from warehouse check-in through to final dispatch.',
        'Simulated network loss during status updates to verify offline caching.',
        'Tested the integration between the warehouse scanner and the central database.',
      ],
    },
  };

  function buildSystemPanel(system, titleId) {
    var fragment = document.createDocumentFragment();

    var header = createElement('div', 'border-b-2 border-ink px-6 py-6 pr-14 sm:px-8');
    header.appendChild(createElement('p', 'plate-label', 'System under test'));

    var heading = createElement('h2', 'mt-2 font-display text-loud uppercase text-ink', system.name);
    heading.id = titleId;
    header.appendChild(heading);
    header.appendChild(createElement('p', 'mt-1 text-sm font-medium text-ink-secondary', system.full));
    fragment.appendChild(header);

    var content = createElement('div', 'px-6 py-7 sm:px-8');
    content.appendChild(createElement('p', 'max-w-measure text-ink-secondary', system.summary));

    var scopeBlock = createElement('div', 'mt-9');
    scopeBlock.appendChild(createElement('p', 'plate-label border-b-2 border-ink pb-2', 'Scope'));
    var scopeList = createElement('ul', 'ledger list-none p-0');
    system.scope.forEach(function (item) {
      scopeList.appendChild(createElement('li', 'py-2.5 font-medium text-ink', item));
    });
    scopeBlock.appendChild(scopeList);
    content.appendChild(scopeBlock);

    var workBlock = createElement('div', 'mt-9');
    workBlock.appendChild(createElement('p', 'plate-label border-b-2 border-ink pb-2', 'What I did'));
    var workList = createElement('ul', 'ledger list-none p-0');
    system.work.forEach(function (item) {
      workList.appendChild(
        createElement('li', 'py-3 text-sm leading-relaxed text-ink-secondary', item),
      );
    });
    workBlock.appendChild(workList);
    content.appendChild(workBlock);

    fragment.appendChild(content);
    return fragment;
  }

  function initSystemOverlay() {
    var dialog = select('#system-overlay');
    var panel = select('#system-panel');
    var body = select('#system-panel-body');
    var triggers = selectAll('[data-system]');

    if (!dialog || !panel || !body || triggers.length === 0) {
      return;
    }

    var TITLE_ID = 'system-panel-title';

    // Without dialog support these would be dead controls, so they stop
    // advertising themselves and the row text still reads fine on its own.
    if (!supportsModal(dialog)) {
      triggers.forEach(function (trigger) {
        trigger.removeAttribute('aria-haspopup');
        trigger.disabled = true;
      });
      return;
    }

    var overlay = wireOverlay(dialog, panel, {
      onClose: function () {
        body.replaceChildren();
      },
    });

    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        var system = SYSTEMS[trigger.getAttribute('data-system')];

        if (!system) {
          return;
        }

        body.replaceChildren(buildSystemPanel(system, TITLE_ID));
        dialog.setAttribute('aria-labelledby', TITLE_ID);
        overlay.open();
      });
    });
  }

  /* ======================================================================
     Footer
     ====================================================================== */

  function initFooterYear() {
    var element = select('#footer-year');

    if (!element) {
      return;
    }

    var year = String(new Date().getFullYear());
    element.textContent = year;
    element.setAttribute('datetime', year);
  }

  /* ======================================================================
     Bootstrap
     ====================================================================== */

  function init() {
    initEntrances();
    initTally();
    initChart();
    initReadProgress();
    initSectionTracking();
    initSeverityFilter();
    initContentsOverlay();
    initArchiveOverlay();
    initSystemOverlay();
    initFooterYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
