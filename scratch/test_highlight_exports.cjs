const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const puppeteer=require('puppeteer');
const directory=path.join(__dirname,'performance-highlight-exports');
const configs=[
  {kind:'performance',prefix:'performanceHighlight',metric:'AverageScore',filter:{keyword:'#EBB02',period:'2026',evaluationType:'Annual Appraisal',scoreType:'goalScore'},expectedCount:'1',expectedMetric:'84.00',columns:['Emp No.','Name','Score','Branch','Department','Position'],names:['Daniel Wong'],numbers:['84']},
  {kind:'incident',prefix:'incidentHighlight',metric:'TotalPoints',filter:{meritType:'demerit'},expectedCount:'3',expectedMetric:'-11',columns:['Emp No.','Name','Total','Branch','Department','Position'],names:['Alex Tan','Daniel Wong','Nur Izzati'],numbers:['-6','-1','-4']}
];
function parseCsv(text){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const char=text[i];if(char==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(char===','&&!quoted){row.push(cell);cell='';}else if(char==='\n'&&!quoted){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}else cell+=char;}if(cell||row.length){row.push(cell);rows.push(row);}return rows;}
(async()=>{
  const browser=await puppeteer.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--allow-file-access-from-files','--no-sandbox']});
  try{
    for(const config of configs)for(const theme of ['light','dark']){
      const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.setRequestInterception(true);page.on('request',request=>/^https?:/.test(request.url())?request.abort():request.continue());
      await page.setViewport({width:360,height:844});
      const url=pathToFileURL(path.resolve(__dirname,`../modules/performance/options/${config.kind}-highlight.html`)).href+'?theme='+theme;
      await page.goto(url,{waitUntil:'load'});
      assert.ok(await page.$('#'+config.prefix+'ExportPdf'),'PDF export button exists');assert.ok(await page.$('#'+config.prefix+'ExportExcel'),'Excel export button exists');
      assert.ok(await page.$eval('#'+config.prefix+'ExportPdf',node=>!!node.querySelector('.fa-file-pdf')));assert.ok(await page.$eval('#'+config.prefix+'ExportExcel',node=>!!node.querySelector('.fa-file-excel')));
      await page.click('#'+config.prefix+'FilterTrigger');
      await page.evaluate(({prefix,filter})=>{const form=document.getElementById(prefix+'FilterForm');for(const[key,value]of Object.entries(filter))form.elements.namedItem(key).value=value;},{prefix:config.prefix,filter:config.filter});
      await page.click('#'+config.prefix+'ApplyFilter');
      assert.equal(await page.$eval('#'+config.prefix+'TotalRecords',node=>node.textContent.trim()),config.expectedCount);assert.equal(await page.$eval('#'+config.prefix+config.metric,node=>node.textContent.trim()),config.expectedMetric);
      const destination=path.join(directory,config.kind,theme);await fs.mkdir(destination,{recursive:true});
      const file=path.join(destination,config.kind+'-highlight.csv');await fs.rm(file,{force:true});
      const cdp=await page.createCDPSession();await cdp.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:destination});
      await page.click('#'+config.prefix+'ExportExcel');
      await page.waitForFunction(()=>!document.querySelector('a[download]'),{timeout:5000});
      let content;for(let attempt=0;attempt<40;attempt++){try{content=await fs.readFile(file,'utf8');break;}catch{await new Promise(resolve=>setTimeout(resolve,50));}}
      assert.ok(content,'Excel-compatible CSV downloads');assert.equal(content.charCodeAt(0),0xfeff,'UTF-8 BOM retained');
      const rows=parseCsv(content.slice(1));assert.deepEqual(rows[0],config.columns);
      const data=rows.slice(1,1+Number(config.expectedCount));assert.deepEqual(data.map(row=>row[1]),config.names);assert.deepEqual(data.map(row=>row[2]),config.numbers,'Numeric points remain signed numbers');
      assert.ok(rows.some(row=>row[0]==='Total Records'&&row[1]===config.expectedCount));
      assert.ok(rows.some(row=>row[0]===(config.kind==='performance'?'Average Score':'Total Points')&&Number(row[2])===Number(config.expectedMetric)));
      await page.evaluate(()=>{window.print=()=>{window.exportPrintCalled=true;};});await page.click('#'+config.prefix+'ExportPdf');assert.equal(await page.evaluate(()=>window.exportPrintCalled),true,'PDF opens print-to-PDF workflow');
      await page.emulateMediaType('print');
      assert.equal(await page.$eval('#'+config.prefix+'FilterSummary',node=>getComputedStyle(node).color),'rgb(17, 17, 17)','Printed filter remains legible in either theme');
      assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).overflowY),'visible','Print root does not clip long reports');
      assert.ok(await page.evaluate(prefix=>{
        const phone=document.querySelector('.phone-container'),main=document.querySelector('main'),table=document.getElementById(prefix+'Table');
        return getComputedStyle(document.querySelector('phone-bottom-nav')).display==='none'&&getComputedStyle(document.querySelector('preview-top-bar')).display==='none'&&getComputedStyle(document.getElementById(prefix+'ExportPdf')).display==='none'&&getComputedStyle(phone).overflow==='visible'&&getComputedStyle(main).overflowY==='visible'&&table.scrollWidth<=main.clientWidth+1;
      },config.prefix),'Printed report is unclipped and hides navigation/export controls');
      await page.pdf({path:path.join(destination,config.kind+'-highlight.pdf'),format:'A4',landscape:true,printBackground:true,preferCSSPageSize:true});
      const pdf=await fs.readFile(path.join(destination,config.kind+'-highlight.pdf'));assert.equal(pdf.subarray(0,5).toString(),'%PDF-');assert.ok(pdf.length>3000);
      await page.screenshot({path:path.join(__dirname,`${config.kind}-highlight-print-${theme}.png`)});await page.emulateMediaType('screen');
      await page.screenshot({path:path.join(__dirname,`${config.kind}-highlight-export-buttons-${theme}.png`)});assert.ok(await page.$eval('main',node=>node.scrollWidth<=node.clientWidth+1));assert.deepEqual(errors,[]);
      await page.close();console.log(`PASS: Filtered ${config.kind} Excel CSV and full PDF print report; ${theme}`);
    }
    // Text formula protection and quoting must not change genuine numeric negatives/zero.
    const page=await browser.newPage();await page.setRequestInterception(true);page.on('request',request=>/^https?:/.test(request.url())?request.abort():request.continue());
    await page.goto(pathToFileURL(path.resolve(__dirname,'../modules/performance/options/incident-highlight.html')).href,{waitUntil:'load'});
    assert.deepEqual(await page.evaluate(()=>{
      const csv=window.PeopleHcmHighlightExport.csvText([['=SUM(1,2)',' @bad','Text,with "quotes"\nand 中文',-2,0,null]]);return [csv.startsWith('\uFEFF'),csv];
    }),[true,'\uFEFF"\'=SUM(1,2)","\' @bad","Text,with ""quotes""\nand 中文",-2,0,""']);
    await page.close();console.log('PASS: CSV quotes, Unicode, formula-like text and signed numeric values.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
