@echo off
echo Running test at %date% %time% > test-output.txt
node scripts/test-console.js >> test-output.txt 2>&1
echo Test completed at %date% %time% >> test-output.txt
type test-output.txt
