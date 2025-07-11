import wallet from "./turbin3-wallet.json"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createGenericFile, createSignerFromKeypair, signerIdentity } from "@metaplex-foundation/umi"
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys"
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";

// Create a devnet connection
const umi = createUmi('https://api.devnet.solana.com');

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(irysUploader());
umi.use(signerIdentity(signer));

(async () => {
    try {
        // Follow this JSON structure
        // https://docs.metaplex.com/programs/token-metadata/changelog/v1.0#json-structure

        const image = "https://gateway.irys.xyz/93t1D3yLgsWMnZ9SKsXzK6hA4umd5aPqYgnu5XZqz7D5";
        const metadata = {
            name: "Q3_2025_RUG",
            symbol: "RUG",
            description: "YOU RUG, I RUG, WE ALL RUG!",
            image: image,
            attributes: [
                {trait_type: 'Captain', value: 'Col. Jeff'}
            ],
            properties: {
                files: [
                    {
                        type: "image/png",
                        uri: image
                    },
                ]
            },
            creators: []
        };
        const myUri = await umi.uploader.uploadJson(metadata)
        console.log("Your metadata URI: ", myUri);
    }
    catch(error) {
        console.log("Oops.. Something went wrong", error);
    }
})();

// https://gateway.irys.xyz/4Ti3hkAnuDvQ1V7gyz44jgctoEciQhy4v6yuJJUgphiT