import { Keypair, PublicKey, Connection, Commitment } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import wallet from "./turbin3-wallet.json"

// Import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

const token_decimals = 1_000_000n;

// Mint address
const mint = new PublicKey("5kRpr8ompeekdRV5JoxFJgdzLZBZkPDgnNFnS3wun4mA");

(async () => {
    try {
        // Create an ATA
        const ata = await getOrCreateAssociatedTokenAccount(
            connection,
            keypair,
            mint,
            keypair.publicKey
        );
        console.log(`Your ata is: ${ata.address.toBase58()}`);

        // Mint to ATA
        const mintTx = await mintTo(
            connection,
            keypair,
            mint,
            ata.address,
            keypair.publicKey,
            BigInt(100)*token_decimals,
        )
        console.log(`Your mint txid: ${mintTx}`);
    } catch(error) {
        console.log(`Oops, something went wrong: ${error}`)
    }
})()

// ata is: p6F1QNUHC74wdYvsyMya1DcN6aMD3dpN7ac1qwv9Jht
// mint txid is: 5a68LQke71GRQSQzF4XccUcpEjTn3ZrgrZ77Xg3hbFDBkgwxExsX2Cty79oMYbrXHvBzbek1BcZufp9S4cthE5bR