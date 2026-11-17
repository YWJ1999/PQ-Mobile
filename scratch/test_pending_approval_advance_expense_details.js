const { run } = require('./claim_approval_checks.cjs');

run(['advance', 'expense']).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
