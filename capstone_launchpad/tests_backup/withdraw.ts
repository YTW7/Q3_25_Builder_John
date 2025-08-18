import "mocha";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CapstoneLaunchpad } from "../target/types/capstone_launchpad";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddressSync,
  getAccount,
  mintTo,
  createAssociatedTokenAccount,
  MINT_SIZE,
  createInitializeMintInstruction,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { expect } from "chai";

describe("capstone_launchpad", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const connection = provider.connection;
  const authority = provider.publicKey;
  const program = anchor.workspace.capstoneLaunchpad as Program<CapstoneLaunchpad>;

  let mintX: PublicKey;
  let mintY: PublicKey;
  let mintLp: PublicKey;
  let userAtaX: PublicKey;
  let userAtaY: PublicKey;
  let userAtaLp: PublicKey;
  let vaultX: PublicKey;
  let vaultY: PublicKey;
  let configAmmPda: PublicKey;
  let configPoolPda: PublicKey;
  let lpMintPda: PublicKey;

  before(async () => {
    const seed_string = 5;
    const poolSeed = new anchor.BN(seed_string);
    const ammSeed = new anchor.BN(seed_string);

    [configAmmPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("config_amm"), ammSeed.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    [configPoolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config_pool"), configAmmPda.toBuffer(), poolSeed.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    [lpMintPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("lp"), configPoolPda.toBuffer()],
      program.programId
    );

    mintX = new PublicKey("9QndCCfG6r9d9GnJD6HZZrhzGGRAvSFR3nB3WcyGhVND");
    mintY = new PublicKey("4uVCs6uDkymcru7hpy4m7E5QtTNBSp2UAbcUEQQti91E");
    mintLp = new PublicKey("CRFP6NhYQHum5ggFq553uuQouoSiA48QzSmEVHfWuuV4");

    userAtaX = (
      await getOrCreateAssociatedTokenAccount(connection, (provider.wallet as any).payer, mintX, authority)
    ).address;

    userAtaY = (
      await getOrCreateAssociatedTokenAccount(connection, (provider.wallet as any).payer, mintY, authority)
    ).address;

    userAtaLp = (
      await getOrCreateAssociatedTokenAccount(connection, (provider.wallet as any).payer, mintLp, authority)
    ).address;

    vaultX = getAssociatedTokenAddressSync(mintX, configPoolPda, true);
    vaultY = getAssociatedTokenAddressSync(mintY, configPoolPda, true);
  });

  it("withdraw liquidity", async () => {
  const amount = new anchor.BN(100_000_000); // user wants 100 LP tokens
  const maxX = new anchor.BN(500_000_000);   // willing to deposit up to 500 X
  const maxY = new anchor.BN(300_000_000);   // willing to deposit up to 300 Y

  // Get initial balances
  const initialUserX = await getAccount(connection, userAtaX);
  const initialUserY = await getAccount(connection, userAtaY);
  const initialUserLp = await getAccount(connection, userAtaLp);
  const initialVaultX = await getAccount(connection, vaultX);
  const initialVaultY = await getAccount(connection, vaultY);

  console.log("Initial balances:");
  console.log("User X:", initialUserX.amount.toString());
  console.log("User Y:", initialUserY.amount.toString());
  console.log("initialVaultX:", initialVaultX.amount.toString());
  console.log("initialVaultY:", initialVaultY.amount.toString());
  console.log("initialUserLp:", initialUserLp.amount.toString());

  const tx = await program.methods
    .withdraw(amount, maxX, maxY)
    .accounts({
      user: authority,
      mintX,
      mintY,
      configAmm: configAmmPda,    // ✅ include configAmm
      configPool: configPoolPda,
      mintLp: lpMintPda,          // ✅ use PDA, not hardcoded mint
      vaultX,
      vaultY,
      userAtaX: userAtaX,
      userAtaY: userAtaY,
      userAtaLp: userAtaLp,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .rpc();

  console.log("withdraw  tx:", tx);

  // Balances after deposit
  const finalUserX = await getAccount(connection, userAtaX);
  const finalUserY = await getAccount(connection, userAtaY);
  const finalUserLp = await getAccount(connection, userAtaLp);
  const finalVaultX = await getAccount(connection, vaultX);
  const finalVaultY = await getAccount(connection, vaultY);

  console.log("Final balances:");
  console.log("User X:", finalUserX.amount.toString());
  console.log("User Y:", finalUserY.amount.toString());
  console.log("User LP:", finalUserLp.amount.toString());
  console.log("Vault X:", finalVaultX.amount.toString());
  console.log("Vault Y:", finalVaultY.amount.toString());

  // Assertions for first deposit (pool is empty → deposits exactly maxX/maxY)
//   expect(finalUserX.amount).to.equal(initialUserX.amount - BigInt(maxX.toString()));
//   expect(finalUserY.amount).to.equal(initialUserY.amount - BigInt(maxY.toString()));
//   expect(finalUserLp.amount).to.equal(BigInt(amount.toString()));
//   expect(finalVaultX.amount).to.equal(BigInt(maxX.toString()));
//   expect(finalVaultY.amount).to.equal(BigInt(maxY.toString()));
});

});

// Expected config_pool PDA: 8KroHm9grP1hjAg7CuyNpRFRSAfU5pLktPkruugUsFsz
// Expected LP mint PDA: AGptQGrEs2yQtnFcCpocty6dvkD3jXHLq4jAY4JM6kL1
// mintX: PublicKey(9QndCCfG6r9d9GnJD6HZZrhzGGRAvSFR3nB3WcyGhVND)
// mintY: PublicKey(4uVCs6uDkymcru7hpy4m7E5QtTNBSp2UAbcUEQQti91E)
// vaultX: PublicKey(Be5wK9N2Q51T5s6sCQHTpbf21LWqJ8Zg5ub1j6W42XEY)
// vaultY: PublicKey(7yE3c8TfSSDPsWgzMSUued4QFVVMMJuBi9DoFJeTqt5R)
// mintLp: PublicKey(AGptQGrEs2yQtnFcCpocty6dvkD3jXHLq4jAY4JM6kL1)


// seed=5
// Expected config_pool PDA: H3A4iz8UWW8wgiuBpnyb9vxUQLHcrPKDyBrvurXmSHu4
// Expected LP mint PDA: CRFP6NhYQHum5ggFq553uuQouoSiA48QzSmEVHfWuuV4
// mintX: 9QndCCfG6r9d9GnJD6HZZrhzGGRAvSFR3nB3WcyGhVND
// mintY: 4uVCs6uDkymcru7hpy4m7E5QtTNBSp2UAbcUEQQti91E
// vaultX: AmwgqPYXXfDrzeoMD5J923NDzRm3XBLfSu8KKr86PJ1t
// vaultY: BFV4Z9f1Csmv8r4nSRG16uRHWKUDzLCKCc37dA6GpPwq
// mintLp: CRFP6NhYQHum5ggFq553uuQouoSiA48QzSmEVHfWuuV4