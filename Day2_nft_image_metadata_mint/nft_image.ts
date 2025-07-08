import wallet from "./turbin3-wallet.json"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createGenericFile, createSignerFromKeypair, signerIdentity } from "@metaplex-foundation/umi"
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys"
import { readFile } from "fs/promises"

const umi = createUmi('https://api.devnet.solana.com');

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(irysUploader());
umi.use(signerIdentity(signer));

(async () => {
    try {
        //1. Load image
        const image= await readFile('/home/john/Desktop/Q3_25_Builder_John/Day2/generug.png',)
        //2. Convert image to generic file.
        const genericImage = createGenericFile(image, "generug.png", {
      contentType: "image/png"
    });
        //3. Upload image
        const [imageUri] = await umi.uploader.upload([genericImage]);

        // const image = ???

        // const [myUri] = ??? 
        console.log("Your image URI: ", imageUri);
    }
    catch(error) {
        console.log("Oops.. Something went wrong", error);
    }
})();