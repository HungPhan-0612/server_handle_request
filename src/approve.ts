// public/approve_session.ts

import { Buffer } from 'buffer';
;(globalThis as any).Buffer = Buffer;

import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { createApproveCheckedInstruction } from '@solana/spl-token';

const connection = new Connection("https://api.devnet.solana.com");

// exactly the same provider helper you already use
function getProvider(): any {
  if ("solana" in window) {
    const provider = (window as any).solana;
    if (provider.isPhantom) return provider;
  }
  throw new Error("Phantom Wallet not found. Please install it.");
}

/**
 * Approve a one-time delegate session.
 *
 * @param sessionId    The session key’s publicKey (delegate)
 * @param userATA      The user’s associated token account
 * @param mintAddress  The SPL token mint
 * @param decimals     The token’s decimals
 * @param allowance    The raw-unit allowance to delegate
 */
export async function approveSession(
  sessionId: string,
  userATA: string,
  mintAddress: string,
  decimals: number,
  allowance: bigint
): Promise<string> {
  const provider = getProvider();
  await provider.connect();

  const userPubkey = provider.publicKey;
  const ataPubkey  = new PublicKey(userATA);
  const mintPubkey = new PublicKey(mintAddress);
  const delegate   = new PublicKey(sessionId);

  // build the EXACT same ApproveChecked instruction
  const ix = createApproveCheckedInstruction(
    ataPubkey,      // token account
    mintPubkey,     // mint
    delegate,       // delegate (session key)
    userPubkey,     // owner (you)
    allowance,      // amount in raw units
    decimals        // decimals
  );

  const tx = new Transaction().add(ix);
  tx.feePayer = userPubkey;
  const { blockhash } = await connection.getLatestBlockhash("finalized");
  tx.recentBlockhash = blockhash;

  // this pops Phantom and signs+sends in one step
  const { signature } = await provider.signAndSendTransaction(tx);
  await connection.confirmTransaction(signature, "confirmed");

  return signature;
}
