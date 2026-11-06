const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = [...new Set(require('./record-summaries-baseline.json').coverage.map(row => row.page))];
const cardClasses = new Set(['history-total-records-card', 'attendance-report-summary', 'staff-list-action-summary',
  'action-summary-bar', 'summary-list-overview', 'summary-stats-bar', 'timesheet-action-summary',
  'timesheet-summary', 'staff-feedback-overview', 'confirm-new-user-summary', 'staff-event-detail-summary',
  'career-event-total', 'manpower-staff-summary', 'list-header', 'staff-kpi', 'bonus-kpi-tile']);
const inlineIds = new Set(['v3CategoryItemsCount', 'v2DetailsCount', 'catExpenseSubtitle', 'catAdvanceSubtitle',
  'catDetailsSubtitle', 'visitGuestListCount', 'visitAttendeeListCount',
  'wsSummaryRecordCount', 'nwSummaryRecordCount', 'otSummaryRecordCount', 'lvSummaryRecordCount']);
const voidTags = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
let totalCards = 0;
for (const relative of files) {
  const filename = path.join(root, relative);
  const source = fs.readFileSync(filename, 'utf8');
  const doc = { name: '#document', children: [] };
  const stack = [doc];
  const nodes = [];
  const tokens = /<!--[\s\S]*?-->|<(script|style)\b(?:[^"'>]|"[^"]*"|'[^']*')*>[\s\S]*?<\/\1\s*>|<(?:[^"'>]|"[^"]*"|'[^']*')*>|[^<]+/gi;
  let match;
  while ((match = tokens.exec(source))) {
    const token = match[0];
    if (/^<!--|^<!|^<\?/.test(token)) continue;
    if (/^<\//.test(token)) {
      const name = token.match(/^<\/\s*([\w-]+)/)?.[1]?.toLowerCase();
      const index = stack.findLastIndex(node => node.name === name);
      if (index > 0) stack.length = index;
      continue;
    }
    if (token[0] !== '<') { const current = stack.at(-1); current.text = (current.text || '') + token; continue; }
    const name = token.match(/^<\s*([\w-]+)/)?.[1]?.toLowerCase();
    if (!name) continue;
    const attrs = Object.fromEntries([...token.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(item => [item[1].toLowerCase(), item[2] ?? item[3]]));
    const node = { name, attrs, start: match.index, opening: token.match(/^<(?:[^"'>]|"[^"]*"|'[^']*')*>/)[0], parent: stack.at(-1), children: [], classes: new Set((attrs.class || '').split(/\s+/).filter(Boolean)), extra: new Set() };
    node.parent.children.push(node); nodes.push(node);
    if (!voidTags.has(name) && !['script','style'].includes(name)) stack.push(node);
  }
  const allText = node => (node.text || '') + node.children.map(allText).join('');
  const cards = new Set();
  for (const node of nodes) {
    if (node.classes.has('form-list-caption')) continue;
    const own = (node.text || '').trim();
    if (inlineIds.has(node.attrs.id) || /^total\s+records?(?:\s+found)?\s*:\s*[\d,]+$/i.test(own)) {
      node.extra.add('data-record-summary-count');
      continue;
    }
    if (!/^total\s+records?(?:\s+found)?\s*:?$/i.test(own)) continue;
    const embedded = node.children.find(child => /^(strong|span)$/.test(child.name) && /^[\d,]*$/.test(allText(child).trim()));
    const siblings = node.parent.children;
    const sibling = siblings[siblings.indexOf(node) + 1];
    const center = /center/.test(node.parent.attrs.class || '');
    const valueGroup = embedded || sibling || (center ? siblings[siblings.indexOf(node) - 1] : null);
    if (!valueGroup) continue;
    const value = valueGroup.children.find(child => child.attrs.id && /^[\d,]*$/.test(allText(child).trim())) || valueGroup;
    value.classes.add('record-summary-value');
    if (!embedded) node.classes.add('record-summary-label');
    if (center) continue;
    const metric = embedded ? node : node.parent;
    metric.classes.add('record-summary-metric');
    let card = metric;
    for (let ancestor = metric; ancestor?.name !== '#document'; ancestor = ancestor.parent) {
      if ([...ancestor.classes].some(name => cardClasses.has(name))) { card = ancestor; break; }
    }
    const grid = metric.parent;
    if (card === metric && grid.children.length >= 2 && grid.children.length <= 3 &&
        (/display:\s*grid/.test(grid.attrs.style || '') || ['entitlement-summary', 'bonus-kpi-grid', 'staff-kpis'].some(name => grid.classes.has(name)))) {
      metric.classes.delete('record-summary-card');
      card = grid;
      card.classes.add('record-summary-grid');
    }
    card.classes.add('record-summary-card');
    cards.add(card);
  }
  const edits = nodes.filter(node => node.extra.size || [...node.classes].join(' ') !== (node.attrs.class || '')).map(node => {
    let opening = node.opening;
    if (node.classes.size) {
      const classText = [...node.classes].join(' ');
      if (node.attrs.class != null) opening = opening.replace(/\bclass\s*=\s*(?:"[^"]*"|'[^']*')/, 'class="' + classText + '"');
      else opening = opening.replace(/>$/, ' class="' + classText + '">');
    }
    for (const name of node.extra) if (!opening.includes(name)) opening = opening.replace(/>$/, ' ' + name + '>');
    return { start: node.start, end: node.start + node.opening.length, replacement: opening };
  }).sort((a,b) => b.start - a.start);
  if (!edits.length) continue;
  let output = source;
  for (const edit of edits) output = output.slice(0,edit.start) + edit.replacement + output.slice(edit.end);
  fs.writeFileSync(filename, output);
  totalCards += cards.size;
  console.log(relative + ': ' + cards.size + ' cards, ' + edits.length + ' tags');
}
console.log('Tagged ' + totalCards + ' static record cards.');
