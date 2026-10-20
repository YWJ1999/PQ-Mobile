// Keep reporting lines attached when fonts, cards, or the viewport change size.
(function () {
  'use strict';

  const tree = document.querySelector('.subordinates-page .v-org-container');
  if (!tree) return;

  const svgNamespace = 'http://www.w3.org/2000/svg';
  const lines = document.createElementNS(svgNamespace, 'svg');
  lines.classList.add('v-org-connectors');
  lines.setAttribute('aria-hidden', 'true');
  lines.setAttribute('focusable', 'false');
  tree.prepend(lines);

  function drawConnections() {
    const origin = tree.getBoundingClientRect();
    const paths = document.createDocumentFragment();

    tree.querySelectorAll('.v-branch-wrapper').forEach(group => {
      const manager = group.parentElement.querySelector(':scope > .v-node-card');
      const reports = [...group.querySelectorAll(':scope > .v-branch-item > .v-node-card')];
      if (!manager || !reports.length) return;

      const parent = manager.getBoundingClientRect();
      const bounds = group.getBoundingClientRect();
      const trunkX = bounds.left - origin.left + parseFloat(getComputedStyle(group).paddingLeft) / 2;
      const parentY = parent.bottom - origin.top;
      const isRoot = group.parentElement === tree;
      const parentX = isRoot
        ? parent.left - origin.left + parent.width / 2
        : trunkX;
      // Start inside nested cards so their rounded corners cannot leave a gap.
      const startY = isRoot ? parentY : parentY - 12;
      const bendY = parentY + (bounds.top - parent.bottom) / 2;
      const children = reports.map(card => card.getBoundingClientRect());
      const last = children[children.length - 1];
      const path = document.createElementNS(svgNamespace, 'path');
      const segments = [
        `M ${parentX} ${startY} V ${bendY} H ${trunkX} V ${last.top - origin.top + last.height / 2}`
      ];
      children.forEach(child => {
        segments.push(`M ${trunkX} ${child.top - origin.top + child.height / 2} H ${child.left - origin.left}`);
      });
      path.setAttribute('d', segments.join(' '));
      paths.append(path);
    });

    lines.replaceChildren(paths);
  }

  let frame = 0;
  function scheduleDraw() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(drawConnections);
  }

  const observer = new ResizeObserver(scheduleDraw);
  observer.observe(tree);
  tree.querySelectorAll('.v-node-card').forEach(card => observer.observe(card));
  document.fonts.ready.then(scheduleDraw);
  window.addEventListener('resize', scheduleDraw);
  scheduleDraw();
})();
