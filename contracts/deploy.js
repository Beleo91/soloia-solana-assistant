#!/usr/bin/env node
/**
 * Deploys Archermes contract to Arc Testnet.
 *
 * Usage:
 *   PRIVATE_KEY=0x... node contracts/deploy.js
 *
 * Writes the new address to:
 *   contracts/out/deployed.json  { address, txHash, block, timestamp }
 */
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'out');

const RPC_URL  = 'https://rpc.testnet.arc.network';
const CHAIN_ID = 5042002;

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('ERROR: PRIVATE_KEY env var is required.');
  process.exit(1);
}

const abi      = JSON.parse(readFileSync(path.join(OUT, 'Archermes.abi.json'), 'utf8'));
const bytecode = '0x' + readFileSync(path.join(OUT, 'Archermes.bin'), 'utf8').trim();

const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);

console.log(`Deployer: ${wallet.address}`);
const balance = await provider.getBalance(wallet.address);
console.log(`Balance : ${ethers.formatEther(balance)} ETH`);

const factory = new ethers.ContractFactory(abi, bytecode, wallet);

console.log('Sending deploy transaction …');
const contract = await factory.deploy();
const receipt  = await contract.deploymentTransaction().wait();

const info = {
  address:   await contract.getAddress(),
  txHash:    receipt.hash,
  block:     receipt.blockNumber,
  timestamp: new Date().toISOString(),
};

console.log(`\n✓ Contract deployed!`);
console.log(`  Address : ${info.address}`);
console.log(`  TX      : ${info.txHash}`);
console.log(`  Block   : ${info.block}`);

writeFileSync(path.join(OUT, 'deployed.json'), JSON.stringify(info, null, 2));
console.log(`\nInfo saved → contracts/out/deployed.json`);
