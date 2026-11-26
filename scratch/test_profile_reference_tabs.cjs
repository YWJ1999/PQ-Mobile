const assert = require('node:assert/strict');
const puppeteer = require('puppeteer');
const categories = [
  ['personal', 'Personal', null], ['education', 'Qualification', null],
  ['family', 'Family', 2], ['contact', 'Contact', null], ['work', 'Work', null], ['finance', 'Payroll & Tax', null],
  ['career', 'Career', 5], ['competency', 'Competencies', 6], ['performance', 'Performance', 6],
  ['training', 'Training', 33], ['compliance', 'Disciplinary', 0], ['assets', 'Assets', 4], ['letters', 'HR Letters', 31]
];

(async () => {
  const browser = await puppeteer.launch({headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', args:['--allow-file-access-from-files']});
  try {
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
    await page.setViewport({width:420,height:980});
    await page.goto('file:///C:/Users/loong/PQ-Mobile/me.html?theme=light', {waitUntil:'load'});
    const work = await page.$$eval('#bento-work .profile-field', nodes => Object.fromEntries(nodes.map(node => [node.querySelector('dt').textContent.trim(), node.querySelector('dd').textContent.trim()])));
    assert.equal(work.Department.toUpperCase(), 'HUMAN RESOURCE', 'Department must match the photo');
    assert.equal(work.Position.toUpperCase(), 'GROUP HR MANAGER', 'Position must match the photo');
    assert.equal(await page.$eval('.me-pass-title', node=>node.textContent), 'Group HR Manager');
    assert.equal(await page.$eval('.me-emp-fullname', node=>node.textContent), 'Sarah Jenkins');
    assert.equal(await page.$eval('.me-emp-code', node=>node.textContent), 'EBB01');
    const referenceOrder = categories.map(([slug])=>'bento-'+slug);
    assert.deepEqual(await page.$$eval('#meMainScroll > .profile-section', nodes=>nodes.filter(node=>!node.hidden).map(node=>node.id)), referenceOrder, 'Default view displays every category in photo order');
    assert.equal(await page.$eval('.me-jump-pill.active', node=>node.dataset.category), 'all');
    assert.equal(await page.$$eval('.me-jump-pill', nodes=>nodes.length), 14);
    assert.deepEqual(await page.$$eval('.me-jump-pill', nodes=>nodes.map(node=>node.dataset.category)), ['all',...referenceOrder], 'Tabs follow the photo order');
    for (const [slug, label, count] of categories) {
      const id = 'bento-' + slug;
      const expected = label + (count === null ? '' : ' (' + count + ')');
      const selector = '.me-jump-pill[aria-controls="' + id + '"]';
      assert.equal(await page.$eval(selector, node=>node.textContent.trim()), expected);
      assert.equal(await page.$eval('#meCatSheet [data-category="' + id + '"] .me-category-label', node=>node.textContent.trim()), expected, 'Sheet and tabs must use the same label/count');
      await page.$eval(selector, node=>node.click());
      const visible = await page.$$eval('#meMainScroll > .profile-section', nodes=>nodes.filter(node=>getComputedStyle(node).display!=='none').map(node=>node.id));
      assert.deepEqual(visible, [id], 'A filter tab displays only its own category');
      assert.equal(await page.$eval(selector, node=>node.getAttribute('aria-selected')), 'true');
      if (count !== null) assert.equal(await page.$$eval('#'+id+' .profile-history-record', nodes=>nodes.length), count);
    }
    await page.evaluate(()=>toggleCatSheet(true));
    await page.$eval('#meCatSheet [data-category="all"]',node=>node.click());
    assert.deepEqual(await page.$$eval('#meMainScroll > .profile-section',nodes=>nodes.filter(node=>!node.hidden).map(node=>node.id)),referenceOrder,'Sheet All restores the entire profile');
    assert.equal(await page.$eval('#meCatSheet',node=>node.classList.contains('open')),false);
    assert.equal(await page.$eval('.me-jump-pill.active',node=>node.dataset.category),'all');
    for (const [slug, listId, count] of [['training','dossierTrainingList',33],['letters','dossierLettersList',31]]) {
      await page.$eval('.me-jump-pill[aria-controls="bento-'+slug+'"]', node=>node.click());
      assert.equal(await page.$eval('#'+listId, node=>node.scrollHeight<=node.clientHeight+1), true, 'All records use the main page scroll, not a hidden inner scroll');
      await page.$eval('#'+listId+' .profile-history-record:last-child', node=>node.scrollIntoView({behavior:'instant',block:'center'}));
      const reachable = await page.$eval('#'+listId+' .profile-history-record:last-child', node=>{
        const row=node.getBoundingClientRect(), main=document.getElementById('meMainScroll').getBoundingClientRect();
        return row.top>=main.top && row.bottom<=main.bottom;
      });
      assert.equal(reachable,true,'The last of '+count+' records is reachable by scrolling the page');
      await page.$eval('#scrollTopBtn', node=>node.click());
      assert.equal(await page.$eval('.me-jump-pill.active', node=>node.getAttribute('aria-controls')), 'bento-'+slug, 'Back to top retains the current category');
      await page.waitForFunction(()=>document.getElementById('meMainScroll').scrollTop===0);
    }
    await page.$eval('.me-jump-pill[aria-controls="bento-training"]', node=>node.click());
    await page.$eval('#dossierTrainingSearch', node=>{node.value='PROCESS IMPROVEMENT';node.dispatchEvent(new Event('input',{bubbles:true}));});
    assert.equal(await page.$$eval('#dossierTrainingList article',nodes=>nodes.length),5);
    await page.$eval('.me-jump-pill[data-category="all"]',node=>node.click());
    assert.deepEqual(await page.$$eval('#meMainScroll > .profile-section', nodes=>nodes.filter(node=>!node.hidden).map(node=>node.id)), referenceOrder, 'All restores every category in photo order');
    assert.equal(await page.$$eval('#dossierTrainingList article',nodes=>nodes.length),33, 'All restores the complete training list');
    await page.$eval('.me-jump-pill[data-category="all"]',node=>node.focus());
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.$eval('.me-jump-pill.active', node=>node.getAttribute('aria-controls')), 'bento-personal');
    await page.goto('file:///C:/Users/loong/PQ-Mobile/me.html?theme=dark&scroll=bento-training',{waitUntil:'load'});
    await page.waitForFunction(()=>document.querySelector('.me-jump-pill.active')?.getAttribute('aria-controls')==='bento-training');
    await page.goto('file:///C:/Users/loong/PQ-Mobile/me.html?scroll=invalid',{waitUntil:'load'});
    assert.deepEqual(await page.$$eval('#meMainScroll > .profile-section', nodes=>nodes.filter(node=>!node.hidden).map(node=>node.id)), referenceOrder, 'Unknown direct links default to All');
    console.log('PASS: default All and photo order, 13 matching category tabs/sheet labels, complete records, individual filtering, return to All, keyboard tabs and direct links.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
