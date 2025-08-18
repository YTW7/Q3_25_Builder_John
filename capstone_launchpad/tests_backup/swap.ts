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
  let userLp: PublicKey;
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

    userLp = (
      await getOrCreateAssociatedTokenAccount(connection, (provider.wallet as any).payer, mintLp, authority)
    ).address;

    vaultX = getAssociatedTokenAddressSync(mintX, configPoolPda, true);
    vaultY = getAssociatedTokenAddressSync(mintY, configPoolPda, true);
  });


it("Swaps X for Y", async () => {
  const amountIn = new anchor.BN(10_000_000); // user swaps 50 X
  const minOut = new anchor.BN(1);            // slippage tolerance, accept anything > 0

  // Balances before
  const initialUserX = await getAccount(connection, userAtaX);
  const initialUserY = await getAccount(connection, userAtaY);
  const initialVaultX = await getAccount(connection, vaultX);
  const initialVaultY = await getAccount(connection, vaultY);

  console.log("Initial balances (before swap):");
  console.log("User X:", initialUserX.amount.toString());
  console.log("User Y:", initialUserY.amount.toString());
  console.log("Vault X:", initialVaultX.amount.toString());
  console.log("Vault Y:", initialVaultY.amount.toString());

  // Perform swap
  const tx = await program.methods
    .swap(true, amountIn, minOut) // true = swap X→Y
    .accounts({
      user: authority,
      mintX,
      mintY,
      userAtaX,
      userAtaY,
      vaultX,
      vaultY,
      configAmm: configAmmPda,
      configPool: configPoolPda,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .rpc();

  console.log("Swap tx:", tx);

  // Balances after
  const finalUserX = await getAccount(connection, userAtaX);
  const finalUserY = await getAccount(connection, userAtaY);
  const finalVaultX = await getAccount(connection, vaultX);
  const finalVaultY = await getAccount(connection, vaultY);

  console.log("Final balances (after swap):");
  console.log("User X:", finalUserX.amount.toString());
  console.log("User Y:", finalUserY.amount.toString());
  console.log("Vault X:", finalVaultX.amount.toString());
  console.log("Vault Y:", finalVaultY.amount.toString());

  // Assertions
  expect(finalUserX.amount).to.equal(initialUserX.amount - BigInt(amountIn.toString()));
  expect(finalVaultX.amount).to.equal(initialVaultX.amount + BigInt(amountIn.toString()));

  // Outgoing Y should increase user balance and decrease vault
//   expect(finalUserY.amount).to.be.greaterThan(initialUserY.amount);
//   expect(finalVaultY.amount).to.be.lessThan(initialVaultY.amount);
});

});