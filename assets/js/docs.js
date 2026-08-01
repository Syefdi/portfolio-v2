/**
 * Documentation page behaviour.
 *
 * The QA artefact pages are mostly static. The one interaction worth adding is a
 * copy button on each template block, since the whole point of publishing a bug
 * report and test case format is for someone to reuse it.
 */
(function () {
  'use strict';

  var COPY_LABEL = 'Copy';
  var DONE_LABEL = 'Copied';
  var ERROR_LABEL = 'Press Ctrl+C';
  var RESET_DELAY_MS = 2000;

  function canCopy() {
    return Boolean(navigator.clipboard && typeof navigator.clipboard.writeText === 'function');
  }

  /** Falls back to selecting the block so the visitor can copy it manually. */
  function selectBlockContents(block) {
    var selection = window.getSelection();

    if (!selection || typeof document.createRange !== 'function') {
      return;
    }

    var range = document.createRange();
    range.selectNodeContents(block);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function addCopyButton(block) {
    var code = block.querySelector('code');

    if (!code) {
      return;
    }

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-button';
    button.textContent = COPY_LABEL;

    var describedBy = block.getAttribute('data-copy-label');
    button.setAttribute(
      'aria-label',
      describedBy ? 'Copy ' + describedBy + ' to the clipboard' : 'Copy this block to the clipboard',
    );

    var resetTimer = null;

    function setState(label, state) {
      button.textContent = label;

      if (state) {
        button.setAttribute('data-state', state);
      } else {
        button.removeAttribute('data-state');
      }

      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(function () {
        button.textContent = COPY_LABEL;
        button.removeAttribute('data-state');
      }, RESET_DELAY_MS);
    }

    button.addEventListener('click', function () {
      var text = code.textContent || '';

      if (!canCopy()) {
        selectBlockContents(code);
        setState(ERROR_LABEL, null);
        return;
      }

      navigator.clipboard.writeText(text).then(
        function () {
          setState(DONE_LABEL, 'done');
        },
        function () {
          // Clipboard writes are rejected without a secure context or permission.
          selectBlockContents(code);
          setState(ERROR_LABEL, null);
        },
      );
    });

    block.appendChild(button);
  }

  function init() {
    var blocks = document.querySelectorAll('pre');
    Array.prototype.forEach.call(blocks, addCopyButton);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
