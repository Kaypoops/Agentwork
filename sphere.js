// sphere.js — Real Sphere SDK wallet connection for AgentWork
import { autoConnect, SPHERE_NETWORKS } from '@unicitylabs/sphere-sdk/connect/browser';

let client = null;
let connection = null;

export async function connectSphereWallet() {
  try {
    const result = await autoConnect({
      dapp: {
        name: 'AgentWork',
        url:  window.location.href,
        iconUrl: 'https://agentwork.unicity.app/icon.png',
      },
      permissions: ['identity', 'payments', 'communications'],
      network: SPHERE_NETWORKS.testnet2,
      silent: false,
    });

    client     = result.client;
    connection = result.connection;

    const identity = await client.getIdentity();

    return {
      success:  true,
      address:  identity.address,
      nametag:  identity.nametag ?? identity.address.slice(0, 10) + '…',
    };

  } catch (err) {
    console.error('Sphere connect error:', err);
    return { success: false, error: err.message };
  }
}

export async function sendPayment(toAddress, amountUCT, memo) {
  if (!client) return { success: false, error: 'Wallet not connected' };

  try {
    // UCT has 6 decimal places — multiply by 1,000,000
    const amountRaw = String(Math.floor(amountUCT * 1_000_000));

    const result = await client.payments.send({
      to:     toAddress,
      amount: amountRaw,
      memo:   memo ?? '',
    });

    return { success: true, txId: result.txId };

  } catch (err) {
    console.error('Payment error:', err);
    return { success: false, error: err.message };
  }
}

export async function getBalance() {
  if (!client) return null;
  try {
    const bal = await client.payments.getBalance();
    // Convert from raw units back to UCT
    return (parseInt(bal.amount) / 1_000_000).toFixed(2);
  } catch {
    return null;
  }
}

export function disconnectWallet() {
  if (connection) connection.disconnect();
  client     = null;
  connection = null;
}