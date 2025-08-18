import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CapstoneLaunchpad } from "../target/types/amm";
import { token } from "@coral-xyz/anchor/dist/cjs/utils";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token"

describe("capstone_launchpad", () => {
  // Configure the client to use the local cluster.
  const provider=anchor.AnchorProvider.env();
  const authority = provider.publicKey;

  anchor.setProvider(provider);

  const program = anchor.workspace.capstoneLaunchpad as Program<CapstoneLaunchpad>;

  it("Initialize AMM!", async () => {
    // Add your test here.
     const seed_string  = 5;
    const ammSeed = new anchor.BN(seed_string); // pick your seed
    const [configAmmPda, configAmmBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("config_amm"), ammSeed.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    const tx = await program.methods.initializeAmm(ammSeed, authority)
    .accountsPartial({
        initializer: authority,
        configAmm: configAmmPda,
        systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
    console.log("Your transaction signature", tx);
  });

//   it("Initializes a pool", async () => {
//     // 1️⃣ Arguments
//     const poolSeed = new anchor.BN(1);
//     const fee = 30; // example: 0.3% if using basis points
//     const authority = provider.publicKey;

//     // 2️⃣ Derive PDAs (you must replace seeds to match your program logic)
//     const [configPoolPda, configPoolBump] = anchor.web3.PublicKey.findProgramAddressSync(
//       [Buffer.from("config_pool"), poolSeed.toArrayLike(Buffer, "le", 8)],
//       program.programId
//     );

//     const [lpMintPda, lpBump] = anchor.web3.PublicKey.findProgramAddressSync(
//       [Buffer.from("lp_mint"), poolSeed.toArrayLike(Buffer, "le", 8)],
//       program.programId
//     );

//     const tx = await program.methods
//       .initializePool(
//         poolSeed,
//         fee,
//         authority, // optional: can pass null with `null` if using Option<Pubkey>
//       )
//       .accounts({
//         initializer: provider.publicKey,
//         mintX: /* Your X token mint */,
//         mintY: /* Your Y token mint */,
//         configAmm: configPoolPda,
//         configPool: configPoolPda,
//         mintLp: lpMintPda,
//         tokenProgram: TOKEN_PROGRAM_ID,
//         systemProgram: SystemProgram.programId,
//       })
//       .rpc();

//     console.log("Pool initialized. Tx:", tx);
//   });

});
