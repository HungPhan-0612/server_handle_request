"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendToken = sendToken;
const buffer_1 = require("buffer");
;
globalThis.Buffer = buffer_1.Buffer;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
// Initialize connection to the cluster (devnet/testnet/mainnet)
const connection = new web3_js_1.Connection("https://api.devnet.solana.com");
// Helper to get the Phantom provider from the window object
function getProvider() {
    if ('solana' in window) {
        const provider = window.solana;
        if (provider.isPhantom) {
            return provider;
        }
    }
    throw new Error('Phantom Wallet not found. Please install it.');
}
/**
 * Send an SPL token transfer transaction using Phantom for signing.
 * @param senderATA - Associated Token Account address of the sender
 * @param receiverATA - Associated Token Account address of the receiver
 * @param amount - Token amount in human-readable units (e.g., 1.5)
 * @param mintAddress - The SPL token mint address
 * @param decimals - Number of decimals the token uses
 * @returns Transaction signature (txid)
 */
async function sendToken(senderATA, receiverATA, amount, mintAddress, decimals) {
    console.log('🔥 sendToken()', { senderATA, receiverATA, amount, mintAddress, decimals });
    // Connect to Phantom
    try {
        const provider = getProvider();
        await provider.connect();
        // Prepare public keys
        const walletPubkey = new web3_js_1.PublicKey(provider.publicKey.toString());
        console.log('[sendToken] connected wallet', walletPubkey.toString());
        ;
        const fromTokenAccount = new web3_js_1.PublicKey(senderATA);
        const toTokenAccount = new web3_js_1.PublicKey(receiverATA);
        const mintPubkey = new web3_js_1.PublicKey(mintAddress);
        // Verify the sender ATA belongs to the connected wallet
        const parsedInfo = await connection.getParsedAccountInfo(fromTokenAccount);
        if (!parsedInfo.value) {
            throw new Error(`Sender ATA ${senderATA} not found on chain.`);
        }
        // @ts-ignore: parsing raw account data
        const owner = parsedInfo.value.data.parsed.info.owner;
        if (owner !== walletPubkey.toString()) {
            throw new Error('Sender ATA does not match connected wallet public key.');
        }
        // Convert amount to smallest unit
        const rawAmount = BigInt(Math.round(amount * Math.pow(10, decimals)));
        // Create the transfer instruction (checked ensures correct decimals)
        const transferIx = (0, spl_token_1.createTransferCheckedInstruction)(fromTokenAccount, mintPubkey, toTokenAccount, walletPubkey, rawAmount, decimals);
        // Build transaction
        const transaction = new web3_js_1.Transaction().add(transferIx);
        transaction.feePayer = walletPubkey;
        const { blockhash } = await connection.getLatestBlockhash('finalized');
        transaction.recentBlockhash = blockhash;
        console.log('[sendToken] set blockhash', blockhash);
        // Request Phantom to sign the transaction
        let result;
        try {
            // this pops Phantom, signs, and sends in one step
            result = await provider.signAndSendTransaction(transaction);
        }
        catch (err) {
            console.error('[sendToken] signAndSendTransaction error', err);
            throw new Error('Wallet failed to sign & send: ' + (err.message || err));
        }
        const signature = result.signature;
        console.log('[sendToken] signature:', signature);
        // Optionally confirm it
        await connection.confirmTransaction(signature, 'confirmed');
        console.log('[sendToken] confirmed:', signature);
        return signature;
    }
    catch (err) {
        console.error('[sendToken] ERROR', err);
        // rethrow so the caller can see it
        throw err;
    }
}
