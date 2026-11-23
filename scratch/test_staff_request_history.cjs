const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const puppeteer = require('puppeteer');
const url = pathToFileURL(path.resolve(__dirname, '../modules/employee-career/options/team/history.html')).href;
const labels = ['Reference #', 'Status', 'Request', 'Period', 'Type', 'Manpower Plan #', 'Description', 'Company', 'Branch', 'Department', 'Section', 'Location', 'Job', 'Access', 'Employment Type', 'Count', 'Required By', 'Reason', 'Remarks', 'Attachment'];
(async () => {
  const browser = await puppeteer.launch({headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', args:['--allow-file-access-from-files','--no-sandbox']});
  try {
    for (const theme of ['light','dark']) for (const width of [360,420]) {
      const page = await browser.newPage();
      const errors=[];
      page.on('pageerror', error=>errors.push(error.message));
      await page.setRequestInterception(true);
      page.on('request', request=>/^https?:/.test(request.url()) ? request.abort() : request.continue());
      await page.setViewport({width,height:844});
      await page.goto(url+'?category=staff-request&theme='+theme,{waitUntil:'load'});
      assert.ok(await page.$('#teamRequestFilterTrigger'), 'Staff Request has its own filter');
      assert.equal(await page.$eval('#teamRequestFilterBar',node=>node.hidden),false);
      assert.deepEqual(await page.$$eval('#teamHistoryList .team-history-employee-identity .history-employee-name',nodes=>nodes.map(node=>node.textContent.trim())),['Aina Rahman','Daniel Wong'],'The initial preview cards show employee names before test fixtures are injected');
      assert.deepEqual(await page.$$eval('#teamHistoryList .team-history-employee-position',nodes=>nodes.map(node=>node.textContent.trim())),['People Operations Executive','Product Designer']);
      assert.deepEqual(await page.$$eval('#teamHistoryList .history-card-row',nodes=>nodes.slice(0,3).map(node=>node.firstElementChild.textContent.trim())),['Request Date','Require Date','Reason']);
      assert.deepEqual(await page.$$eval('#teamHistoryList .status-pill',nodes=>nodes.map(node=>node.textContent.trim())),['Approved','Approved']);
      // Rich records are injected only into this browser to exercise real rendering/filtering without inventing production data.
      await page.evaluate(()=>{
        const records=window.EMPLOYEE_CAREER_TEAM_HISTORY_DATA['staff-request'];
        Object.assign(records[0],{employeeName:'Request Owner A',empNo:'##0077',request:'Senior Executive',requestDate:'2026-10-04',company:'PeopleHCM Malaysia',branch:'Kuala Lumpur',requestType:'Budgeted',manpowerPlanNo:'MP-2026-008',description:'Recruit additional capacity.',section:'Operations',location:'Head Office',access:'Manager',employmentType:'Permanent',count:0,reason:'Expansion',remarks:'First line\nSecond line',attachments:[{name:'plan.pdf',url:'https://example.com/plan.pdf'},{name:'unsafe.txt',url:'javascript:alert(1)'}]});
        Object.assign(records[1],{employeeName:'Request Owner B',empNo:'',request:'Product Support Specialist',requestDate:'2026-09-10',company:'PeopleHCM Services',branch:'Penang',requestType:'Replacement',reason:'Replacement'});
      });
      await page.click('[data-team-history-kind="staff-exit"]');
      await page.click('[data-team-history-kind="staff-request"]');
      const original=await page.evaluate(()=>JSON.stringify(window.EMPLOYEE_CAREER_TEAM_HISTORY_DATA['staff-request']));
      const names=()=>page.$$eval('#teamHistoryList .team-history-employee-identity .history-employee-name',nodes=>nodes.map(node=>node.textContent.trim()));
      assert.deepEqual(await names(),['Request Owner A','Request Owner B']);
      assert.deepEqual(await page.$$eval('#teamHistoryList .history-card-row:last-child strong',nodes=>nodes.map(node=>node.textContent.trim())),['SR-2026-0012','SR-2026-0011']);
      assert.deepEqual(await page.$$eval('#teamHistoryList .history-card-row',nodes=>nodes.slice(0,3).map(node=>node.lastElementChild.textContent.trim())),['4 Oct 2026','1 Dec 2026','Expansion']);
      const first='[data-request-id="SR-2026-0012"]';
      await page.click(first);
      assert.deepEqual(await page.$$eval('#teamRequestDetailsRows th',nodes=>nodes.map(node=>node.textContent.trim())),labels);
      assert.deepEqual(await page.$$eval('#teamRequestDetailsRows td',nodes=>nodes.slice(0,-1).map(node=>node.textContent.trim())),['SR-2026-0012','Approved','Senior Executive','Oct 2026','Budgeted','MP-2026-008','Recruit additional capacity.','PeopleHCM Malaysia','Kuala Lumpur','People Operations','Operations','Head Office','Senior Executive','Manager','Permanent','0','1 Dec 2026','Expansion','First line\nSecond line']);
      assert.equal(await page.$$eval('#teamRequestDetailsRows tr:last-child a',nodes=>nodes.length),1);
      assert.ok(await page.$eval('#teamRequestDetailsRows tr:last-child',node=>node.textContent.includes('unsafe.txt')));
      await page.keyboard.press('Escape');
      assert.ok(await page.$eval(first,node=>document.activeElement===node));
      await page.keyboard.press('Enter');
      assert.equal(await page.$eval('#teamRequestDetailsOverlay',node=>node.hidden),false);
      await page.setViewport({width,height:568});
      await page.$eval('#teamRequestDetailsOverlay .detail-popout-body',node=>{node.scrollTop=node.scrollHeight;});
      assert.ok(await page.$eval('#teamRequestDetailsRows tr:last-child',node=>{
        const row=node.getBoundingClientRect(),panel=node.closest('.detail-popout-panel').getBoundingClientRect(),body=node.closest('.detail-popout-body').getBoundingClientRect();
        return panel.top>=0 && panel.bottom<=innerHeight+1 && row.top>=body.top-1 && row.bottom<=body.bottom+1 && node.closest('table').scrollWidth<=body.width+1;
      }),'Details and final attachment fit a short mobile screen');
      await page.screenshot({path:path.join(__dirname,`staff-request-details-${theme}-${width}.png`)});
      await page.click('#teamRequestCloseDetails');
      await page.setViewport({width,height:844});
      await page.click('[data-request-id="SR-2026-0011"]');
      const missing=await page.$$eval('#teamRequestDetailsRows td',nodes=>nodes.map(node=>node.textContent.trim()));
      assert.equal(missing[5],'—');
      assert.equal(missing[10],'—');
      assert.equal(missing.at(-1),'No attachments');
      await page.click('#teamRequestCloseDetails');
      const fieldIds={periodFrom:'teamRequestPeriodFrom',periodTo:'teamRequestPeriodTo',company:'teamRequestCompany',department:'teamRequestDepartment',branch:'teamRequestBranch',job:'teamRequestJob',requestType:'teamRequestType'};
      const apply=async values=>{
        await page.click('#teamRequestFilterTrigger');
        await page.evaluate(({values,fieldIds})=>{for(const [key,id] of Object.entries(fieldIds)) document.getElementById(id).value=values[key]||'';},{values,fieldIds});
        await page.click('#teamRequestApplyFilter');
      };
      await page.click('#teamRequestFilterTrigger');
      assert.deepEqual(await page.$$eval('#teamRequestFilterForm label',nodes=>nodes.map(node=>node.textContent.trim())),['Period From','Period To','Company','Department','Branch','Job','Request Type']);
      assert.equal(await page.$eval('#teamRequestPeriodFrom',node=>node.type),'month');
      await page.screenshot({path:path.join(__dirname,`staff-request-filter-${theme}-${width}.png`)});
      await page.keyboard.press('Escape');
      for(const [values,expected] of [
        [{periodFrom:'2026-10',periodTo:'2026-10'},['Request Owner A']],
        [{company:'PeopleHCM Services'},['Request Owner B']],
        [{department:'Customer Experience'},['Request Owner B']],
        [{branch:'Kuala Lumpur'},['Request Owner A']],
        [{job:'Product Support Specialist'},['Request Owner B']],
        [{requestType:'Budgeted'},['Request Owner A']],
        [{periodFrom:'2026-09',periodTo:'2026-10',company:'PeopleHCM Malaysia',department:'People Operations',branch:'Kuala Lumpur',job:'Senior Executive',requestType:'Budgeted'},['Request Owner A']],
        [{company:'PeopleHCM Services',requestType:'Budgeted'},[]]
      ]) {await apply(values);assert.deepEqual(await names(),expected,JSON.stringify(values));}
      assert.equal(await page.$eval('#teamHistoryRecordCount',node=>node.textContent.trim()),'0');
      assert.equal(await page.$eval('#teamHistoryEmpty',node=>node.hidden),false);
      await page.click('#teamRequestFilterTrigger');await page.click('#teamRequestResetFilter');
      assert.equal(await page.$eval('#teamHistoryRecordCount',node=>node.textContent.trim()),'2');
      await apply({periodFrom:'2026-11',periodTo:'2026-09'});
      assert.equal(await page.$eval('#teamRequestFilterOverlay',node=>node.hidden),false);
      assert.equal(await page.$eval('#teamRequestFilterError',node=>node.hidden),false);
      assert.equal(await page.$eval('#teamHistoryRecordCount',node=>node.textContent.trim()),'2');
      await page.keyboard.press('Escape');
      await apply({company:'PeopleHCM Malaysia'});
      await page.click('#teamRequestFilterTrigger');
      await page.select('#teamRequestCompany','PeopleHCM Services');
      await page.keyboard.press('Escape');
      assert.deepEqual(await names(),['Request Owner A'],'Closing discards draft changes');
      await page.click('[data-team-history-kind="staff-confirmation"]');
      assert.equal(await page.$eval('#teamRequestFilterBar',node=>node.hidden),true);
      assert.equal(await page.$eval('#teamHistoryRecordCount',node=>node.textContent.trim()),'2');
      await page.click('[data-team-history-kind="staff-request"]');
      assert.deepEqual(await names(),['Request Owner A'],'Request filters survive tab switches independently');
      await page.click('#teamRequestFilterTrigger');
      await page.setViewport({width,height:568});
      await page.$eval('#teamRequestFilterForm .team-history-filter-fields',node=>{node.scrollTop=node.scrollHeight;});
      assert.ok(await page.$eval('#teamRequestApplyFilter',node=>{const rect=node.getBoundingClientRect();return rect.top>=0&&rect.bottom<=innerHeight+1;}),'Filter action remains reachable on short screens');
      await page.click('#teamRequestResetFilter');
      await page.setViewport({width,height:844});
      assert.equal(await page.evaluate(()=>JSON.stringify(window.EMPLOYEE_CAREER_TEAM_HISTORY_DATA['staff-request'])),original);
      assert.ok(await page.$eval('main',node=>node.scrollWidth<=node.clientWidth+1));
      await page.screenshot({path:path.join(__dirname,`staff-request-history-${theme}-${width}.png`)});
      assert.deepEqual(errors,[]);
      await page.close();
      console.log(`PASS: Staff Request filters, cards and details; ${theme} ${width}px`);
    }
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
