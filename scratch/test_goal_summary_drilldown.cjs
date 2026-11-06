const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const puppeteer=require('puppeteer');
const file=pathToFileURL(path.resolve(__dirname,'../modules/performance/options/goal-summary.html')).href;
(async()=>{
  const browser=await puppeteer.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--allow-file-access-from-files','--no-sandbox']});
  try{
    for(const theme of ['light','dark'])for(const width of [360,420]){
      const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.setRequestInterception(true);page.on('request',request=>/^https?:/.test(request.url())?request.abort():request.continue());
      await page.setViewport({width,height:844});await page.goto(file+'?theme='+theme,{waitUntil:'load'});
      assert.ok(await page.$('[data-goal-summary-type="People"]'),'Goal type rows expose a drilldown');
      const original=await page.evaluate(()=>JSON.stringify(window.PERFORMANCE_GOAL_SUMMARY_DATA));
      await page.click('[data-goal-summary-type="People"]');
      assert.equal(await page.$eval('#goalSummaryEmployeeView',node=>node.hidden),false);assert.equal(await page.$eval('#goalSummaryReportView',node=>node.hidden),true);
      assert.equal(await page.$eval('#goalSummaryEmployeeCount',node=>node.textContent.trim()),'3');
      assert.equal(await page.$eval('#goalSummaryEmployeeType',node=>node.hidden),true,'Goal type heading is not repeated above the cards');
      assert.equal(await page.$eval('#goalSummaryEmployeeView',node=>node.innerText.includes('Financial Goals')),false,'Details do not repeat the selected goal type');
      assert.equal(await page.$$eval('#goalSummaryEmployeeCards .history-card-item',nodes=>nodes.length),3,'Employee goals use History Cards');
      assert.equal(await page.$$eval('#goalSummaryEmployeeCards .status-pill',nodes=>nodes.length),3,'Each History Card shows achievement in a status pill');
      assert.equal(await page.$$eval('#goalSummaryEmployeeCards .history-card-details',nodes=>nodes.length),3,'Each History Card uses the shared detail panel');
      assert.deepEqual(
        await page.$$eval('#goalSummaryEmployeeCards .goal-summary-employee-card',nodes=>nodes.map(node=>({status:node.dataset.status,pill:[...node.querySelector('.status-pill').classList]}))),
        [
          {status:'draft',pill:['status-pill','draft','goal-summary-achieved-pill']},
          {status:'draft',pill:['status-pill','draft','goal-summary-achieved-pill']},
          {status:'approved',pill:['status-pill','approved','goal-summary-achieved-pill']}
        ],
        '100% uses the teal approved treatment while lower results remain purple'
      );
      assert.deepEqual(await page.$$eval('#goalSummaryEmployeeCards .goal-summary-employee-card',cards=>cards.map(card=>({
        name:card.querySelector('.goal-summary-employee-name').textContent.trim(),id:card.querySelector('.goal-summary-employee-id').textContent.trim(),status:card.querySelector('.status-pill').textContent.trim(),
        fields:[...card.querySelectorAll('.goal-summary-employee-detail')].map(field=>[field.querySelector('dt').textContent.trim(),field.querySelector('dd').textContent.trim()])
      }))),[
        {name:'Farhan Binti Rahmat',id:'#EBB12',status:'90.00%',fields:[['Department','Human Resource'],['Job','Group HR Manager'],['Period','2026'],['Goal','Reduce Staff Attrition']]},
        {name:'Farhan Binti Rahmat',id:'#EBB12',status:'80.00%',fields:[['Department','Human Resource'],['Job','Group HR Manager'],['Period','2026'],['Goal','Improve Staff Satisfaction']]},
        {name:'Nur Izzati',id:'#EBB03',status:'100.00%',fields:[['Department','Finance'],['Job','Finance Analyst'],['Period','2026'],['Goal','Improve team knowledge sharing']]}
      ]);
      assert.ok(await page.$eval('.goal-summary-employee-card',node=>parseFloat(getComputedStyle(node).borderTopLeftRadius)===20&&parseFloat(getComputedStyle(node).borderLeftWidth)===5));
      assert.ok(await page.$eval('.goal-summary-employee-id',node=>getComputedStyle(node).fontSize==='11.5px'&&getComputedStyle(node).opacity==='0.8'));
      assert.deepEqual(await page.$eval('#goalSummaryEmployeeViewChart',node=>({text:node.textContent.trim(),barIcon:!!node.querySelector('.fa-chart-simple')})),{text:'Chart',barIcon:true});
      await page.screenshot({path:path.join(__dirname,`goal-summary-employee-cards-${theme}-${width}.png`)});
      await page.click('#goalSummaryEmployeeViewChart');assert.equal(await page.$eval('#goalSummaryChartTotal',node=>node.textContent.trim()),'3');
      assert.equal(await page.$$eval('#goalSummaryChartLegend [data-count]',nodes=>nodes.reduce((sum,node)=>sum+Number(node.dataset.count),0)),3);
      await page.select('#goalSummaryChartMetric','goalType');assert.deepEqual(await page.$$eval('#goalSummaryChartLegend [data-category]',nodes=>nodes.map(node=>[node.dataset.category,node.dataset.count,node.dataset.achieved])),[['People','3','90.00%']]);
      await page.screenshot({path:path.join(__dirname,`goal-summary-employee-chart-${theme}-${width}.png`)});await page.click('#goalSummaryBack');
      assert.equal(await page.$eval('#goalSummaryEmployeeView',node=>node.hidden),false,'Child chart returns to employee cards');await page.keyboard.press('Escape');
      assert.equal(await page.$eval('#goalSummaryReportView',node=>node.hidden),false,'Employee cards return to summary');
      const link='[data-goal-summary-type="People"] .goal-summary-row-link';await page.focus(link);await page.keyboard.press('Enter');assert.equal(await page.$eval('#goalSummaryEmployeeCount',node=>node.textContent.trim()),'3');
      await page.click('#goalSummaryBack');await page.click('#goalSummaryFilterTrigger');
      await page.select('#goalSummaryPeriod','2026');await page.$eval('#goalSummaryAchievedMin',node=>{node.value='90';});await page.click('#goalSummaryApplyFilter');
      await page.click('[data-goal-summary-type="People"]');assert.equal(await page.$eval('#goalSummaryEmployeeCount',node=>node.textContent.trim()),'2');
      assert.deepEqual(await page.$$eval('#goalSummaryEmployeeCards .goal-summary-employee-name',nodes=>nodes.map(node=>node.textContent.trim())),['Farhan Binti Rahmat','Nur Izzati']);
      await page.reload({waitUntil:'load'});assert.equal(await page.$eval('#goalSummaryEmployeeCount',node=>node.textContent.trim()),'2','Reload preserves selected goal type and applied filter');
      await page.click(`[data-set-theme="${theme==='light'?'dark':'light'}"]`);
      const cv=await page.$eval('#goalSummaryEmployeeCards .goal-summary-employee-card',node=>({href:node.href,theme:new URL(node.href).searchParams.get('theme'),employee:new URL(node.href).searchParams.get('employee')}));
      assert.equal(cv.employee,'EBB12');assert.equal(cv.theme,theme==='light'?'dark':'light');assert.ok(new URL(cv.href).pathname.endsWith('/me.html'));
      await Promise.all([page.waitForNavigation({waitUntil:'load'}),page.click('#goalSummaryEmployeeCards .goal-summary-employee-card')]);assert.ok(page.url().includes('/me.html'));assert.equal(new URL(page.url()).searchParams.get('employee'),'EBB12');
      await page.goBack({waitUntil:'load'});assert.equal(await page.$eval('#goalSummaryEmployeeCount',node=>node.textContent.trim()),'2','Returning from existing CV entry restores drilldown');
      await page.click('#goalSummaryEmployeeViewChart');assert.equal(await page.$eval('#goalSummaryChartTotal',node=>node.textContent.trim()),'2');await page.keyboard.press('Escape');await page.keyboard.press('Escape');
      assert.equal(await page.$eval('#goalSummaryTotalRecords',node=>node.textContent.trim()),'4','Parent keeps its filters');
      assert.equal(await page.evaluate(()=>JSON.stringify(window.PERFORMANCE_GOAL_SUMMARY_DATA)),original);
      assert.ok(await page.$eval('main',node=>node.scrollWidth<=node.clientWidth+1));assert.deepEqual(errors,[]);await page.close();console.log(`PASS: Goal Summary row/card drilldown, scoped chart and existing CV navigation; ${theme} ${width}px`);
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
