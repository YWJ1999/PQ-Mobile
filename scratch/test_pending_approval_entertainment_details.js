const { run } = require('./claim_approval_checks.cjs');

run(['entertainment']).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
