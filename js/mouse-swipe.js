// Desktop preview: drag the phone's scrollable surfaces like a touch screen.
// Native touch scrolling and editable controls keep their browser behavior.
(function enableMouseSwipeScrolling() {
  let gesture = null;
  let suppressClickUntil = 0;
  const nativeControls = 'input, textarea, select, label, [contenteditable]:not([contenteditable="false"]), [draggable="true"], [role="slider"], [data-no-mouse-swipe]';

  function findScroller(target) {
    const phone = target.closest('.phone-container');
    if (!phone) return null;
    for (let node = target; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) return node;
      if (node === phone) break;
    }
    return null;
  }

  function finishGesture() {
    if (!gesture) return;
    const { scroller, pointerId, dragging } = gesture;
    gesture = null;
    document.documentElement.classList.remove('is-mouse-swiping');
    if (scroller.hasPointerCapture(pointerId)) scroller.releasePointerCapture(pointerId);
    if (dragging) suppressClickUntil = performance.now() + 500;
  }

  document.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    finishGesture();
    suppressClickUntil = 0;
    // Modified mouse gestures remain available for selecting/copying text.
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element) || event.target.closest(nativeControls)) return;
    const scroller = findScroller(event.target);
    if (!scroller) return;
    gesture = {
      scroller,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastY: event.clientY,
      dragging: false
    };
  }, true);

  window.addEventListener('pointermove', event => {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    if (!(event.buttons & 1)) {
      finishGesture();
      return;
    }
    if (!gesture.dragging) {
      const dx = Math.abs(event.clientX - gesture.startX);
      const dy = Math.abs(event.clientY - gesture.startY);
      if (Math.max(dx, dy) < 6) return;
      // Leave horizontal gestures to carousels, charts, and other controls.
      if (dx > dy) {
        finishGesture();
        return;
      }
      gesture.dragging = true;
      gesture.scroller.setPointerCapture(event.pointerId);
      document.documentElement.classList.add('is-mouse-swiping');
    }
    event.preventDefault();
    gesture.scroller.scrollBy({ top: gesture.lastY - event.clientY, behavior: 'instant' });
    gesture.lastY = event.clientY;
  }, { passive: false });

  window.addEventListener('pointerup', event => {
    if (event.pointerId === gesture?.pointerId) finishGesture();
  }, true);
  window.addEventListener('pointercancel', event => {
    if (event.pointerId === gesture?.pointerId) finishGesture();
  }, true);
  document.addEventListener('lostpointercapture', event => {
    if (event.pointerId === gesture?.pointerId) finishGesture();
  }, true);
  window.addEventListener('blur', finishGesture);

  document.addEventListener('selectstart', event => {
    if (gesture) event.preventDefault();
  });
  document.addEventListener('dragstart', event => {
    if (gesture) event.preventDefault();
  }, true);
  document.addEventListener('click', event => {
    // A swipe that began on a link/card must not activate it on release.
    if (event.detail > 0 && performance.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressClickUntil = 0;
    }
  }, true);
})();
