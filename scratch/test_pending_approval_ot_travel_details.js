const { run } = require('./claim_approval_checks.cjs');

run(['ot', 'travel', 'travelRequest']).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
