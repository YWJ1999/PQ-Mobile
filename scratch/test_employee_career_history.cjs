const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const puppeteer = require('puppeteer');
const url = file => pathToFileURL(path.resolve(file)).href;
(async () => {
  const browser = await puppeteer.launch({headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', args:['--allow-file-access-from-files']});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    for (const theme of ['dark','light']) {
      await page.setViewport({width:390,height:950});
      await page.goto(url('modules/employee-career/index.html')+'?scope=individual&theme='+theme,{waitUntil:'load'});
      assert.ok(await page.$('[data-option-id="history"]'), 'Individual options must include History');
      await Promise.all([page.waitForNavigation({waitUntil:'load'}),page.click('[data-option-id="history"]')]);
      assert.equal(await page.$eval('html',n=>n.dataset.theme),theme);
      assert.equal(await page.$$eval('.history-card-item',n=>n.length),3);
      assert.ok(await page.$$eval('.history-card-item',nodes=>nodes.every(n=>n.dataset.status === 'submitted' && n.querySelector('.status-pill').textContent.trim() === 'Pending' && n.querySelector('.status-pill i').classList.contains('fa-paper-plane'))));
      await page.click('.history-card-item');
      assert.equal(await page.$eval('#historyDetailTitle',n=>n.textContent),'Feedback Detail');
      const fields = await page.$$eval('#historyDetailBody th',n=>n.map(x=>x.textContent));
      assert.deepEqual(fields.slice(0,2),['Name','Emp #']);
      for (const label of ['Type','Category','Feedback Date 1','Feedback Date 2','Feedback Note','Feedback Remarks','Submit Date','Reviewer Comment','Reviewed By','Reviewed Date','Rating','Reward','Status','Attachments']) assert.ok(fields.includes(label),label);
      assert.equal(await page.$$eval('#historyDetailBody tr', rows => rows.find(row => row.querySelector('th')?.textContent === 'Status').querySelector('td').textContent.trim()), 'Pending');
      assert.equal(await page.$eval('.career-history-employee-id',n=>n.textContent),'#EBB12');
      await page.keyboard.press('Escape');
      await page.click('#historyFilterTrigger');
      assert.equal(await page.$('#historyKeyword'),null);
      assert.deepEqual(await page.$$eval('#historyStatus option',nodes=>nodes.map(n=>n.textContent)),['All Status','Pending']);
      await page.select('#historyStatus','submitted');
      await page.$eval('#historyDateFrom',n=>{n.value='2026-01-01';});
      await page.$eval('#historyDateTo',n=>{n.value='2026-12-31';});
      await page.click('#applyHistoryFilter');
      assert.equal(await page.$$eval('.history-card-item',n=>n.length),1);
      await page.click('[data-history-kind="whereabout"]');
      await page.click('#historyFilterTrigger');
      assert.equal(await page.$eval('#historyYear',n=>n.closest('[hidden]')===null),true);
      assert.equal(await page.$eval('#historyMonth',n=>n.closest('[hidden]')===null),true);
      await page.select('#historyYear','2026');
      await page.select('#historyMonth','9');
      await page.click('#applyHistoryFilter');
      assert.equal(await page.$$eval('.history-card-item',n=>n.length),0);
      assert.equal(await page.$eval('#historyEmptyState',n=>n.hidden),false);
      await page.click('#historyFilterTrigger');
      await page.select('#historyMonth','10');
      await page.click('#applyHistoryFilter');
      assert.equal(await page.$$eval('.history-card-item',n=>n.length),1);
      await page.click('.history-card-item');
      assert.deepEqual(await page.$$eval('#historyDetailBody th',n=>n.map(x=>x.textContent)),['Description','Date','Time','Status','Project','Task','State','Remarks']);
      assert.ok((await page.$eval('#historyDetailBody',n=>n.textContent)).includes('HRDF TRAINING'));
      await page.click('#closeHistoryDetails');
      for (const width of [360,390,450]) {
        await page.setViewport({width,height:950});
        assert.ok(await page.$eval('main',n=>n.scrollWidth<=n.clientWidth+1));
      }
      await page.setViewport({width:390,height:950});
      await page.evaluate(()=>new Promise(r=>setTimeout(r,350)));
      await page.screenshot({path:`scratch/employee_career_history_whereabout_${theme}.png`});
      await page.click('[data-history-kind="feedback"]');
      assert.equal(await page.$$eval('.history-card-item',n=>n.length),1,'Feedback keeps its filters');
      await page.evaluate(()=>new Promise(r=>setTimeout(r,350)));
      await page.screenshot({path:`scratch/employee_career_history_feedback_${theme}.png`});
      await page.click('.history-card-item');
      await page.screenshot({path:`scratch/employee_career_history_feedback_details_${theme}.png`});
      assert.equal(await page.$eval('#historyDetailActions',n=>n.hidden),false);
      assert.equal(await page.$eval('#historyEditFeedback',n=>n.textContent.trim()),'Edit Feedback');
      await page.click('#closeHistoryDetails');
      await page.click('[data-history-kind="whereabout"]');
      await page.click('.history-card-item');
      assert.equal(await page.$eval('#historyDeleteWhereabout',n=>n.hidden),false);
      assert.equal(await page.$eval('#historyDetailActions',n=>n.hidden),false);
      assert.equal(await page.$eval('#historyDeleteWhereabout',n=>n.textContent.trim()),'Delete Record');
      assert.ok(await page.$('#historyDeleteWhereabout .fa-trash-can[aria-hidden="true"]'));
      await page.click('#closeHistoryDetails');
      assert.equal(await page.$$eval('.history-card-item',n=>n.length),1);
      await page.click('[data-history-kind="feedback"]');
      await page.click('#historyFilterTrigger');
      await page.$eval('#historyDateFrom',n=>{n.value='2026-12-31';});
      await page.$eval('#historyDateTo',n=>{n.value='2026-01-01';});
      await page.click('#applyHistoryFilter');
      assert.equal(await page.$eval('#historyFilterError',n=>n.hidden),false);
      await page.click('#resetHistoryFilter');
      await page.click('#applyHistoryFilter');
      assert.equal(await page.$$eval('.history-card-item',n=>n.length),3);
      await page.evaluate(() => {
        const requests = ['Pending HR Approval', 'Submitted'].map((status, i) => ({
          id: 'status-test-' + i, submittedAt: '2026-10-01', status, changes: []
        }));
        localStorage.setItem('pq_change_request_history', JSON.stringify(requests));
      });
      await page.reload({waitUntil:'load'});
      for (const [category, status, label, fill] of [
        ['feedback', 'pending', 'Pending', 'rgb(179, 90, 13)'],
        ['whereabout', 'approved', 'Pass', 'rgb(34, 129, 86)'],
        ['cv-change-request', 'pending', 'Pending HR Approval', 'rgb(179, 90, 13)'],
        ['cv-change-request', 'submitted', 'Submitted', 'rgb(34, 129, 86)'],
        ['cv-change-request', 'approved', 'Approved', 'rgb(34, 129, 86)'],
        ['cv-change-request', 'cancelled', 'Cancelled', 'rgb(107, 114, 128)']
      ]) {
        await page.click(`[data-history-kind="${category}"]`);
        const header = `.history-card-header:has(.record-status-badge[data-status="${status}"])`;
        assert.match(await page.$eval(header, el => getComputedStyle(el).backgroundImage), /^linear-gradient\(/);
        await page.click(header);
        assert.deepEqual(await page.$eval('#historyDetailBody .record-status-badge', el => {
          const style = getComputedStyle(el);
          return [el.textContent.trim(), style.backgroundImage, style.backgroundColor];
        }), [label, 'none', fill], `${theme} ${category} ${label} badge`);
        await page.click('#closeHistoryDetails');
      }
      await page.click('#historyFilterTrigger');
      await page.select('#cvHistoryStatus', 'submitted');
      await page.click('#applyHistoryFilter');
      assert.deepEqual(await page.$$eval('#careerHistoryList .record-status-badge', badges => badges.map(el => el.textContent.trim())),
        ['Pending HR Approval', 'Submitted'], 'Both badges remain visible under the Submitted filter');
      await page.evaluate(() => localStorage.removeItem('pq_change_request_history'));
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: History navigation, reference fields, filters, Feedback Detail Edit, Whereabout Delete, both themes and mobile widths.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
