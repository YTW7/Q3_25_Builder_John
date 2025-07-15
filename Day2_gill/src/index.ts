import { createSolanaClient } from "gill";
 
const { rpc, rpcSubscriptions, sendAndConfirmTransaction } = createSolanaClient({
  urlOrMoniker: "devnet",
});

(async () => {
try {
// get slot
const slot = await rpc.getSlot().send();
 
// get the latest blockhash
const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

console.log(`slot: ${slot},\nlatestBlockhash: ${latestBlockhash.blockhash},\nlastValidBlockHeight: ${latestBlockhash.lastValidBlockHeight} `);
} catch(e) {
console.error(`Oops, something went wrong: ${e}`)
}
})();