#!/usr/bin/env node
/**
 * Compiles Archermes.sol using solc and writes:
 *   contracts/out/Archermes.abi.json
 *   contracts/out/Archermes.bin
 */
import { createRequire } from 'module';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);
const solc = require('solc');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, 'Archermes.sol');
const OUT = path.join(__dirname, 'out');

mkdirSync(OUT, { recursive: true });

const source = readFileSync(SRC, 'utf8');

const input = {
  language: 'Solidity',
  sources: { 'Archermes.sol': { content: source } },
  settings: {
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } },
    optimizer: { enabled: true, runs: 200 },
  },
};

console.log('Compiling Archermes.sol …');
const output = JSON.parse(solc.compile(JSON.stringify(input)));

// Check for errors
const errors = (output.errors ?? []).filter((e) => e.severity === 'error');
if (errors.length) {
  console.error('Compilation errors:');
  errors.forEach((e) => console.error(e.formattedMessage));
  process.exit(1);
}

const warnings = (output.errors ?? []).filter((e) => e.severity === 'warning');
if (warnings.length) {
  console.warn('Warnings:');
  warnings.forEach((w) => console.warn(w.formattedMessage));
}

const contract = output.contracts['Archermes.sol']['Archermes'];
const abi      = contract.abi;
const bytecode = contract.evm.bytecode.object;

writeFileSync(path.join(OUT, 'Archermes.abi.json'), JSON.stringify(abi, null, 2));
writeFileSync(path.join(OUT, 'Archermes.bin'),      bytecode);

console.log(`✓ ABI  → contracts/out/Archermes.abi.json`);
console.log(`✓ BIN  → contracts/out/Archermes.bin  (${bytecode.length / 2} bytes)`);
