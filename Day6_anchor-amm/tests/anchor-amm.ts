import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorAmm } from "../target/types/anchor_amm";
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
} from "@solana/spl-token";
import { expect } from "chai";

describe("anchor-amm", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.anchorAmm as Program<AnchorAmm>;
  const connection = provider.connection;
  const wallet = provider.wallet;

  // Shared variables across tests
  const seed = new anchor.BN(12345);
  const fee = 100;

  let mintX: PublicKey;
  let mintY: PublicKey;
  let lpMintPda: PublicKey;
  let configPda: PublicKey;
  let vaultX: PublicKey;
  let vaultY: PublicKey;
  let userX: PublicKey;
  let userY: PublicKey;
  let userLp: PublicKey;

  it("Initializes the AMM pool", async () => {
    // 1. Create token mints (X and Y)
    mintX = await createMint(connection, wallet.payer, wallet.publicKey, null, 6);
    mintY = await createMint(connection, wallet.payer, wallet.publicKey, null, 6);

    // 2. Derive config PDA
    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config"), seed.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // 3. Derive LP mint PDA
    [lpMintPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("lp"), configPda.toBuffer()],
      program.programId
    );

    // 4. Derive vault token accounts (owned by config)
    vaultX = getAssociatedTokenAddressSync(mintX, configPda, true);
    vaultY = getAssociatedTokenAddressSync(mintY, configPda, true);

    // 5. Call initialize
    const txInit = await program.methods
      .initialize(seed, fee, wallet.publicKey)
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

    console.log("✅ Initialize tx:", txInit);
  });

  it("Deposits into the AMM pool", async () => {
    // 1. Derive user's token accounts
    userX = getAssociatedTokenAddressSync(mintX, wallet.publicKey);
    userY = getAssociatedTokenAddressSync(mintY, wallet.publicKey);
    userLp = getAssociatedTokenAddressSync(lpMintPda, wallet.publicKey);

    // 2. Create ATAs and mint tokens to user
    await createAssociatedTokenAccount(connection, wallet.payer, mintX, wallet.publicKey);
    await createAssociatedTokenAccount(connection, wallet.payer, mintY, wallet.publicKey);
    await createAssociatedTokenAccount(connection, wallet.payer, lpMintPda, wallet.publicKey);

    await mintTo(connection, wallet.payer, mintX, userX, wallet.payer, 1_000_000); // 1 token
    await mintTo(connection, wallet.payer, mintY, userY, wallet.payer, 2_000_000); // 2 tokens

    console.log("LP Mint:", lpMintPda.toBase58());
    console.log("User LP ATA:", userLp.toBase58());

    const configAccount = await program.account.config.fetch(configPda);
    console.log("On-chain config.mint_lp:", configAccount.mintLp.toBase58());
    console.log("Client lpMintPda:", lpMintPda.toBase58());

    // 3. Deposit call
    const tx = await program.methods
      .deposit(new anchor.BN(100_000), new anchor.BN(1_000_000), new anchor.BN(2_000_000))
      .accounts({
        user: wallet.publicKey,
        mintX,
        mintY,
        mintLp: lpMintPda,
        config: configPda,
        vaultX,
        vaultY,
        userX,
        userY,
        userLp,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Deposit tx:", tx);

    // 4. Check balances
    const vaultXInfo = await getAccount(connection, vaultX);
    const vaultYInfo = await getAccount(connection, vaultY);
    const userLpInfo = await getAccount(connection, userLp);

    console.log("Vault X balance:", Number(vaultXInfo.amount));
    console.log("Vault Y balance:", Number(vaultYInfo.amount));
    console.log("User LP tokens:", Number(userLpInfo.amount));

    expect(Number(vaultXInfo.amount)).greaterThan(0);
    expect(Number(vaultYInfo.amount)).greaterThan(0);
    expect(Number(userLpInfo.amount)).greaterThan(0);
  });
});