import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createSignerFromKeypair, signerIdentity, generateSigner, percentAmount } from "@metaplex-foundation/umi"
import { createNft, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";

import wallet from "./turbin3-wallet.json"
import base58 from "bs58";

const RPC_ENDPOINT = "https://api.devnet.solana.com";
const umi = createUmi(RPC_ENDPOINT);

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const myKeypairSigner = createSignerFromKeypair(umi, keypair);
umi.use(signerIdentity(myKeypairSigner));
umi.use(mplTokenMetadata())

const mint = generateSigner(umi);
const metadataUri = "https://gateway.irys.xyz/4Ti3hkAnuDvQ1V7gyz44jgctoEciQhy4v6yuJJUgphiT";

(async () => {
    // let tx = ???
    const tx = await createNft(umi, {
      mint,
      name: "Q3_2025_RUG",
      symbol: "RUG",
      uri: metadataUri,
      sellerFeeBasisPoints: percentAmount(5), // 5% royalty
      decimals: 0,
      isMutable: true,
      creators: [
        {
          address: myKeypairSigner.publicKey,
          verified: true,
          share: 100
        }
      ],
    });
    let result = await tx.sendAndConfirm(umi);
    const signature = base58.encode(result.signature);
    
    console.log(`Succesfully Minted! Check out your TX here:\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`)

    console.log("Mint Address: ", mint.publicKey);
})();

// tx = https://explorer.solana.com/tx/51B7ZmCEdeeeDpzEUGnMspzni1ZWYitdHjHno86dWcrT6xyY6G4Tipx99rFLx9FoX5mYLAiya4bH26xA2QnFZPpC?cluster=devnet

// mint_address = EbXRLbkF9QYnYYgJuDrhhRdJ9Ruc7nvjdWV7CACkCLTi