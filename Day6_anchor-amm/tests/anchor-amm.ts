import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorAmm } from "../target/types/anchor_amm";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

describe("anchor-amm", () => {
  // Set up Anchor provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.anchorAmm as Program<AnchorAmm>;
  const connection = provider.connection;
  const wallet = provider.wallet;

  it("Is initialized!", async () => {
    const seed = new anchor.BN(123);
    const fee = 100; // basis points
    const authority = wallet.publicKey;

    // 1. Create Mints
    const mintX = await createMint(connection, wallet.payer, wallet.publicKey, null, 6);
    const mintY = await createMint(connection, wallet.payer, wallet.publicKey, null, 6);

    // 2. Derive Config PDA
    const [configPda, configBump] = await PublicKey.findProgramAddressSync(
      [Buffer.from("config"), seed.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // 3. Derive LP mint PDA
    const [lpMintPda, lpBump] = await PublicKey.findProgramAddressSync(
      [Buffer.from("lp"), configPda.toBuffer()],
      program.programId
    );

    // 4. Derive Vaults (Associated Token Accounts)
    const vaultX = getAssociatedTokenAddressSync(mintX, configPda, true);
    const vaultY = getAssociatedTokenAddressSync(mintY, configPda, true);

    // 5. Call the initialize method
    const tx = await program.methods
      .initialize(seed, fee, authority)
      .accounts({
        initializer: wallet.publicKey,
        mintX,
        mintY,
        mintLp: lpMintPda,
        vaultX,
        vaultY,
        config: configPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Transaction signature:", tx);
  });
});
