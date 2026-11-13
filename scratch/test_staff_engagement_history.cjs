const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const puppeteer = require('puppeteer');
const url = pathToFileURL(path.resolve(__dirname,'../modules/employee-career/options/team/history.html')).href;
const labels = ['Reference #','Emp #','Name','Position','Interviewee #','Interviewee Position','Submitter #','Submit Date','Interview Date','Flight Risk','Recommendation','Notes','Positive Feedback','Negative Feedback','Mitigation Action','Approver Remark','Applicant Remark','Status','Attachment'];
(async()=>{
  const browser=await puppeteer.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--allow-file-access-from-files','--no-sandbox']});
  try {
    for(const theme of ['light','dark']) for(const width of [360,420]) {
      const page=await browser.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.setRequestInterception(true);
      page.on('request',request=>/^https?:/.test(request.url())?request.abort():request.continue());
      await page.setViewport({width,height:844});
      await page.goto(url+'?category=staff-engagement&theme='+theme,{waitUntil:'load'});
      assert.ok(await page.$('#teamEngagementFilterTrigger'),'Staff Engagement has its own filter');
      assert.deepEqual(await page.$$eval('#teamHistoryList .history-card-row',nodes=>nodes.slice(0,3).map(node=>node.firstElementChild.textContent.trim())),['Notice Date','Last Paid Date','Reason']);
      assert.deepEqual(await page.$$eval('#teamHistoryList .status-pill',nodes=>nodes.map(node=>node.textContent.trim())),['Pending','Pending']);
      // Enrich records only inside this browser; distinct people and dates detect accidental field substitutions.
      await page.evaluate(()=>{
        const records=window.EMPLOYEE_CAREER_TEAM_HISTORY_DATA['staff-engagement'];
        Object.assign(records[0],{reference:'ENG-REF-0021',interviewerName:'Lee',interviewerPosition:'Account Executive',employeeName:'Aina Rahman',empNo:'#EBB01',position:'People Operations Executive',intervieweeNo:'004177',intervieweePosition:'Finance Analyst',submitterNo:'#009988',submittedDate:'2026-10-05',noticeDate:'2026-10-01',lastPaidDate:'2026-10-31',reason:'Retention Review',notes:'Interview notes.\nSecond line.',positiveFeedback:'Strong collaboration.',negativeFeedback:'Workload concerns.',mitigationAction:'Review workload.',approverRemark:'Follow up next month.',applicantRemark:'Acknowledged.',attachments:[{name:'interview.pdf',url:'https://example.com/interview.pdf'},{name:'notes.txt',url:'javascript:alert(1)'}]});
        Object.assign(records[1],{interviewerName:'Tan',interviewerPosition:'Team Lead'});
      });
      await page.click('[data-team-history-kind="staff-request"]');
      await page.click('[data-team-history-kind="staff-engagement"]');
      const original=await page.evaluate(()=>JSON.stringify(window.EMPLOYEE_CAREER_TEAM_HISTORY_DATA['staff-engagement']));
      const names=()=>page.$$eval('#teamHistoryList .team-history-employee-name',nodes=>nodes.map(node=>node.textContent.trim()));
      assert.deepEqual(await names(),['Lee','Tan'],'Card name is the interviewer, distinct from employee/interviewee');
      assert.deepEqual(await page.$$eval('#teamHistoryList .team-history-employee-position',nodes=>nodes.map(node=>node.textContent.trim())),['Account Executive','Team Lead']);
      assert.deepEqual(await page.$$eval('#teamHistoryList .team-history-record-ref',nodes=>nodes.map(node=>node.textContent.trim())),['Ref: ENG-REF-0021','Ref: SEG-2026-0022']);
      assert.equal(await page.$$eval('#teamHistoryList .team-history-employee-id',nodes=>nodes.length),0,'Employee ID is not shown under a different interviewer name');
      assert.deepEqual(await page.$$eval('#teamHistoryList .history-card-row',nodes=>nodes.slice(0,3).map(node=>node.lastElementChild.textContent.trim())),['1 Oct 2026','31 Oct 2026','Retention Review']);
      const first='[data-engagement-id="SEG-2026-0021"]';
      await page.click(first);
      assert.deepEqual(await page.$$eval('#teamEngagementDetailsRows th',nodes=>nodes.map(node=>node.textContent.trim())),labels);
      assert.deepEqual(await page.$$eval('#teamEngagementDetailsRows td',nodes=>nodes.slice(0,-1).map(node=>node.textContent.trim())),['ENG-REF-0021','#EBB01','Aina Rahman','People Operations Executive','#004177','Finance Analyst','#009988','5 Oct 2026','8 Oct 2026','Low','Continue Development Plan','Interview notes.\nSecond line.','Strong collaboration.','Workload concerns.','Review workload.','Follow up next month.','Acknowledged.','Pending']);
      assert.equal(await page.$$eval('#teamEngagementDetailsRows tr:last-child a',nodes=>nodes.length),1);
      assert.ok(await page.$eval('#teamEngagementDetailsRows tr:last-child',node=>node.textContent.includes('notes.txt')));
      await page.screenshot({path:path.join(__dirname,`staff-engagement-details-${theme}-${width}.png`)});
      await page.setViewport({width,height:568});
      await page.$eval('#teamEngagementDetailsOverlay .detail-popout-body',node=>{node.scrollTop=node.scrollHeight;});
      assert.ok(await page.$eval('#teamEngagementDetailsRows tr:last-child',node=>{
        const rect=node.getBoundingClientRect(),panel=node.closest('.detail-popout-panel').getBoundingClientRect(),body=node.closest('.detail-popout-body').getBoundingClientRect();
        return panel.top>=0&&panel.bottom<=innerHeight+1&&rect.top>=body.top-1&&rect.bottom<=body.bottom+1;
      }),'Attachment reachable on a short screen');
      await page.keyboard.press('Escape');
      assert.ok(await page.$eval(first,node=>document.activeElement===node));
      await page.keyboard.press('Enter');
      assert.equal(await page.$eval('#teamEngagementDetailsOverlay',node=>node.hidden),false);
      await page.click('#teamEngagementCloseDetails');
      await page.setViewport({width,height:844});
      await page.click('[data-engagement-id="SEG-2026-0022"]');
      const missing=await page.$$eval('#teamEngagementDetailsRows td',nodes=>nodes.map(node=>node.textContent.trim()));
      assert.equal(missing[4],'—');assert.equal(missing[6],'—');assert.equal(missing[7],'—');assert.equal(missing[11],'—');assert.equal(missing.at(-1),'No attachments');
      await page.click('#teamEngagementCloseDetails');
      const fieldIds={keyword:'teamEngagementKeyword',startDate:'teamEngagementStartDate',endDate:'teamEngagementEndDate',status:'teamEngagementStatus'};
      const apply=async values=>{
        await page.click('#teamEngagementFilterTrigger');
        await page.evaluate(({values,fieldIds})=>{for(const [key,id] of Object.entries(fieldIds))document.getElementById(id).value=values[key]||'';},{values,fieldIds});
        await page.click('#teamEngagementApplyFilter');
      };
      await page.click('#teamEngagementFilterTrigger');
      assert.deepEqual(await page.$$eval('#teamEngagementFilterForm label',nodes=>nodes.map(node=>node.textContent.trim())),['Search Keyword','Start Date','End Date','Status']);
      assert.deepEqual(await page.$$eval('#teamEngagementStatus option',nodes=>nodes.map(node=>node.textContent.trim())),['All Status','Pending','Approved','Rejected','To Resubmit']);
      await page.screenshot({path:path.join(__dirname,`staff-engagement-filter-${theme}-${width}.png`)});
      await page.keyboard.press('Escape');
      for(const [values,expected] of [
        [{keyword:'lEE'},['Lee']], [{keyword:'ACCOUNT EXECUTIVE'},['Lee']], [{keyword:'ENG-REF-0021'},['Lee']],
        [{keyword:'#004177'},['Lee']], [{keyword:'retention review'},['Lee']],
        [{startDate:'2026-10-08',endDate:'2026-10-08'},['Lee']],
        [{startDate:'2026-10-12'},['Tan']],
        [{startDate:'2026-10-05',endDate:'2026-10-05'},[]],
        [{keyword:'Lee',startDate:'2026-10-08',endDate:'2026-10-08',status:'Submitted'},['Lee']],
        [{status:'Approved'},[]]
      ]) {await apply(values);assert.deepEqual(await names(),expected,JSON.stringify(values));}
      assert.equal(await page.$eval('#teamHistoryRecordCount',node=>node.textContent.trim()),'0');
      assert.equal(await page.$eval('#teamHistoryEmpty',node=>node.hidden),false);
      await page.click('#teamEngagementFilterTrigger');await page.click('#teamEngagementResetFilter');
      assert.equal(await page.$eval('#teamHistoryRecordCount',node=>node.textContent.trim()),'2');
      await apply({startDate:'2026-11-01',endDate:'2026-10-01'});
      assert.equal(await page.$eval('#teamEngagementFilterOverlay',node=>node.hidden),false);
      assert.equal(await page.$eval('#teamEngagementFilterError',node=>node.hidden),false);
      assert.equal(await page.$eval('#teamHistoryRecordCount',node=>node.textContent.trim()),'2');
      await page.keyboard.press('Escape');
      await apply({keyword:'Lee'});
      await page.click('#teamEngagementFilterTrigger');
      await page.$eval('#teamEngagementKeyword',node=>{node.value='Tan';});
      await page.keyboard.press('Escape');
      assert.deepEqual(await names(),['Lee']);
      for(const category of ['staff-confirmation','staff-exit','staff-request']) {
        await page.click(`[data-team-history-kind="${category}"]`);
        assert.equal(await page.$eval('#teamHistoryRecordCount',node=>node.textContent.trim()),'2');
        assert.equal(await page.$eval('#teamEngagementFilterBar',node=>node.hidden),true);
      }
      await page.click('[data-team-history-kind="staff-engagement"]');assert.deepEqual(await names(),['Lee']);
      await page.click('#teamEngagementFilterTrigger');await page.click('#teamEngagementResetFilter');
      assert.equal(await page.evaluate(()=>JSON.stringify(window.EMPLOYEE_CAREER_TEAM_HISTORY_DATA['staff-engagement'])),original,'Viewing and filtering preserve source records');
      assert.ok(await page.$eval('main',node=>node.scrollWidth<=node.clientWidth+1));
      await page.screenshot({path:path.join(__dirname,`staff-engagement-history-${theme}-${width}.png`)});
      assert.deepEqual(errors,[]);
      await page.close();
      console.log(`PASS: Staff Engagement cards, filters and details; ${theme} ${width}px`);
    }
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
