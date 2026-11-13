const puppeteer = require('puppeteer');
const path = require('path');

const EXPECTED_BENEFIT_LABELS = [
  'Document Reference', 'Document Status', 'Employee', 'Entitlement Year',
  'Benefit Type', 'Claim Period', 'Start Date', 'End Date', 'Purpose',
  'Receipt #', 'Other Ref.', 'Currency', 'Claim Amount', 'Claim Quantity',
  'Remarks'
];

const EXPECTED_MEDICAL_SECTIONS = {
  General: [
    'Document Reference', 'Status', 'Employee', 'Benefit Year',
    'Benefit Type', 'Entitled Balance', 'Usable Balance', 'Claim Period',
    'Receipt Date', 'Receipt No.', 'Claim Total', 'Remark'
  ],
  Medical: [
    'Patient Type', 'Patient Name', 'Treatment Type', 'Clinic Location',
    'Clinic / Hospital', 'Sickness Type'
  ],
  Details: ['Receipt No.', 'Expenses', 'Amount', 'Currency', 'Forex Rate', 'Local Amount']
};

async function openDetails(page, tabName, itemId) {
  await page.evaluate((name) => {
    const tab = [...document.querySelectorAll('.filter-pill')]
      .find(button => button.textContent.trim() === name);
    if (!tab) throw new Error(`Missing tab: ${name}`);
    tab.click();
  }, tabName);

  await page.evaluate((id) => window.ClaimsEngine.triggerClaimViewDetails(id), itemId);
  await page.waitForSelector('#claimDetailsModalOverlay[style*="display: flex"]');
}

async function readSections(page) {
  return page.evaluate(() => {
    const body = document.getElementById('claimDetailsDynamicBody');
    return {
      text: body.innerText,
      sections: [...body.querySelectorAll(':scope > section[aria-label]')].map(section => ({
        ariaLabel: section.getAttribute('aria-label'),
        title: section.querySelector(':scope > h4')?.textContent.trim() || '',
        rows: [...section.querySelectorAll('tr')].map(row => ({
          label: row.cells[0]?.textContent.trim() || '',
          value: row.cells[1]?.innerText.trim() || ''
        }))
      }))
    };
  });
}

function valuesByLabel(section) {
  return Object.fromEntries(section.rows.map(row => [row.label, row.value]));
}

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.setViewport({ width: 450, height: 950 });

    const url = `file:///${path.resolve(__dirname, '../modules/claims/options/pending-approval.html').replace(/\\/g, '/')}`;
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#teamApprovalsQueue pending-approval-card');

    await openDetails(page, 'Benefit', '1');
    const benefit = await readSections(page);
    await page.evaluate(() => window.ClaimsEngine.closeClaimDetailsModal());
    await page.waitForFunction(() => document.getElementById('claimDetailsModalOverlay').style.display === 'none');

    await openDetails(page, 'Medical', '5');
    const medical = await readSections(page);

    const benefitSection = benefit.sections[0];
    const benefitValues = benefitSection ? valuesByLabel(benefitSection) : {};
    const benefitPassed = benefit.sections.length === 1
      && benefitSection.title === ''
      && JSON.stringify(benefitSection.rows.map(row => row.label)) === JSON.stringify(EXPECTED_BENEFIT_LABELS)
      && /Farhan binti rahmat\s+#EBB12/.test(benefitValues.Employee || '')
      && benefitValues['Document Status'] === 'Pending'
      && benefitValues['Entitlement Year'] === '2019'
      && benefitValues['Benefit Type'] === 'PERSONAL ALLOWANCE'
      && benefitValues['Claim Period'] === '201902'
      && benefitValues['Start Date'] === '4 Sep 2019'
      && benefitValues['End Date'] === '4 Sep 2019'
      && benefitValues['Claim Amount'] === 'RM -5.00'
      && !/undefined/i.test(benefit.text);

    const medicalTitles = medical.sections.map(section => section.title);
    const medicalLabels = Object.fromEntries(
      medical.sections.map(section => [section.title, section.rows.map(row => row.label)])
    );
    const medicalGeneralValues = valuesByLabel(
      medical.sections.find(section => section.title === 'General') || { rows: [] }
    );
    const medicalPassed = JSON.stringify(medicalTitles) === JSON.stringify(['General', 'Medical', 'Details'])
      && Object.entries(EXPECTED_MEDICAL_SECTIONS).every(([title, labels]) => (
        JSON.stringify(medicalLabels[title]) === JSON.stringify(labels)
      ))
      && /Jessica Wong\s+#003891/.test(medicalGeneralValues.Employee || '')
      && medicalGeneralValues['Benefit Type'] === 'General Consultation'
      && medicalGeneralValues['Receipt Date'] === '07/09/2026'
      && medicalGeneralValues['Receipt No.'] === 'QC-5510'
      && medicalGeneralValues.Status === 'Pending'
      && medicalGeneralValues['Claim Total'] === 'RM 135.00';

    let screenshotExamplePassed = true;
    for (const theme of ['dark', 'light']) {
      await page.evaluate(theme => document.documentElement.setAttribute('data-theme', theme), theme);
      await openDetails(page, 'Medical', '2');
      const example = await readSections(page);
      const general = example.sections.find(section => section.title === 'General');
      const values = general ? valuesByLabel(general) : {};
      screenshotExamplePassed = screenshotExamplePassed
        && JSON.stringify(general?.rows.map(row => row.label)) === JSON.stringify(EXPECTED_MEDICAL_SECTIONS.General)
        && values['Claim Period'] === '201601'
        && values['Receipt Date'] === '09/03/2016'
        && values['Receipt No.'] === '-'
        && values['Claim Total'] === 'RM 100.00';
      await page.evaluate(async () => {
        const overlay = document.getElementById('claimDetailsModalOverlay');
        await Promise.all(overlay.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {})));
      });
      await page.screenshot({ path: path.resolve(__dirname, `pending_medical_correct_fields_${theme}.png`) });
    }

    let totalsPassed = true;
    for (const [claimTotal, expected] of [[0, 'RM 0.00'], [250.5, 'RM 250.50'], [null, 'RM 100.00']]) {
      await page.evaluate(total => { window.MOCK_TEAM_APPROVALS.find(item => item.id === 2).claimTotal = total; }, claimTotal);
      await openDetails(page, 'Medical', '2');
      const example = await readSections(page);
      const general = example.sections.find(section => section.title === 'General');
      totalsPassed = totalsPassed && valuesByLabel(general)['Claim Total'] === expected;
    }

    const passed = benefitPassed && medicalPassed && screenshotExamplePassed && totalsPassed && pageErrors.length === 0;
    console.log(JSON.stringify({
      benefit: { sectionTitles: benefit.sections.map(section => section.title), rows: benefitSection?.rows || [] },
      medical: { sectionTitles: medicalTitles, labels: medicalLabels },
      pageErrors,
      benefitPassed,
      medicalPassed,
      screenshotExamplePassed,
      totalsPassed,
      passed
    }, null, 2));

    if (!passed) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
