const solc = require('./node_modules/solc');
const fs   = require('fs');
const path = require('path');

const src = fs.readFileSync('Archermes.sol', 'utf8');

const input = {
  language: 'Solidity',
  sources: { 'Archermes.sol': { content: src } },
  settings: {
    viaIR: true,
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      'Archermes.sol': {
        Archermes: ['abi', 'evm.bytecode.object'],
      },
    },
  },
};

const out = JSON.parse(solc.compile(JSON.stringify(input)));

if (out.errors) {
  const errs = out.errors.filter(e => e.severity === 'error');
  if (errs.length) { console.error(JSON.stringify(errs, null, 2)); process.exit(1); }
  const warns = out.errors.filter(e => e.severity === 'warning');
  if (warns.length) console.warn('Warnings:', warns.map(w => w.message).join('\n'));
}

const contract = out.output?.contracts?.['Archermes.sol']?.Archermes
              ?? out.contracts?.['Archermes.sol']?.Archermes;
if (!contract) { console.error('No contract in output'); process.exit(1); }

fs.mkdirSync('out', { recursive: true });
fs.writeFileSync('out/Archermes.abi.json', JSON.stringify(contract.abi, null, 2));
fs.writeFileSync('out/Archermes.bin',      '0x' + contract.evm.bytecode.object);

console.log('ABI entries:', contract.abi.length);
console.log('Bytecode size:', Math.floor(contract.evm.bytecode.object.length / 2), 'bytes');
console.log('COMPILE OK');
