import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CapstoneLaunchpad } from "../target/types/amm";
import { token } from "@coral-xyz/anchor/dist/cjs/utils";
import { 
    TOKEN_PROGRAM_ID, 
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddressSync,
    getAccount,
    getOrCreateAssociatedTokenAccount
 } from "@solana/spl-token"
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { expect } from "chai";

function formatAmount(amount: any) {
  return Number(amount.toString()) / 1_000_000;
}

const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

const metadata = {
  uri: "https://raw.githubusercontent.com/solana-developers/program-examples/new-examples/tokens/tokens/.assets/spl-token.json",
  name: "Solana Gold",
  symbol: "GOLDSOL",
};

describe("tikr dot fun tests begins...", () => {
  // Configure the client to use the local cluster.
  const provider=anchor.AnchorProvider.env();
  const authority = provider.publicKey;
  const connection = provider.connection;

  anchor.setProvider(provider);
  const program = anchor.workspace.capstoneLaunchpad as Program<CapstoneLaunchpad>;

  // Generate a Keypair for the new mint
   const newMint = anchor.web3.Keypair.generate();

  const seed_string = 9;
  const ammSeed = new anchor.BN(seed_string); // pick your seed
  const poolSeed = new anchor.BN(seed_string);
  const fee = 30; //0.3%

  const [configAmmPda, configAmmBump] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config_amm"), ammSeed.toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  const [configPoolPda, configPoolBump] = PublicKey.findProgramAddressSync(
     [Buffer.from("config_pool"), configAmmPda.toBuffer(), poolSeed.toArrayLike(Buffer, "le", 8)],
     program.programId
   );

    const [lpMintPda, lpBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("lp"), configPoolPda.toBuffer()],
      program.programId
    );

    let userAtaX: PublicKey;
    let userAtaY: PublicKey;
    let userAtaLp: PublicKey;


    console.log("Expected config_pool PDA:", configPoolPda.toString());
    console.log("Expected LP mint PDA:", lpMintPda.toString());

    // const mintX = await createMint(connection, wallet.payer, wallet.publicKey, null, 6);
    // const mintY = await createMint(connection, wallet.payer, wallet.publicKey, null, 6);
    const mintX=new PublicKey("9QndCCfG6r9d9GnJD6HZZrhzGGRAvSFR3nB3WcyGhVND");
    const mintY=new PublicKey("4uVCs6uDkymcru7hpy4m7E5QtTNBSp2UAbcUEQQti91E");

    const vaultX = getAssociatedTokenAddressSync(
       mintX,
       configPoolPda,
       true // allow PDA owner
    );

    const vaultY = getAssociatedTokenAddressSync(
       mintY,
       configPoolPda,
       true
    );
it("Create Token...", async () => {
    // Derive the metadata PDA
    const [metadataPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        newMint.publicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    console.log("Mint:", newMint.publicKey.toBase58());
    console.log("Metadata PDA:", metadataPda.toBase58());

    // Build the transaction - Remove user_ata_new if it's not needed for mint creation
    const tx = await program.methods
      .createMint(metadata.uri, metadata.name, metadata.symbol)
      .accounts({
        admin: authority,
        newTokenMint: newMint.publicKey,
        metadataAccount: metadataPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([newMint])
      .rpc();

    console.log("Token created. Tx:", tx);
  });

  it("Mint Token...", async () => {
    // Create the associated token account for the user
    const userAtaNew = await getOrCreateAssociatedTokenAccount(
      connection, 
      (provider.wallet as any).payer, 
      newMint.publicKey, 
      authority
    );

    console.log("User ATA:", userAtaNew.address.toBase58());

    const amount = new anchor.BN(100 * 10 ** 9); // 100 tokens with 9 decimals

    // Build the transaction
    const tx = await program.methods
      .mintToken(amount)
      .accounts({
        admin: authority,
        newTokenMint: newMint.publicKey,
        userAtaNew: userAtaNew.address, // Use the address property
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
    //   .signers([newMint])
      .rpc();

    console.log(`${amount} of new token Minted. Tx:`, tx);
  });

  it("Initializes AMM!", async () => {
    // Add your test here.
    const tx = await program.methods.initializeAmm(ammSeed, authority)
    .accountsPartial({
        initializer: authority,
        configAmm: configAmmPda,
        systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
    console.log("Your transaction signature", tx);
  });
  
  it("Initializes a Liquidity Pool!", async () => {
    console.log("configAmmPda:", configAmmPda.toString())
    console.log("configPoolPda:", configPoolPda.toString())
    console.log("mintX:", mintX.toString())
    console.log("mintY:", mintY.toString())
    console.log("vaultX:", vaultX.toString())
    console.log("vaultY:", vaultY.toString())
    console.log("mintLp:", lpMintPda.toString())
  

    const tx = await program.methods
      .initializePool(
        poolSeed,
        fee,
        authority, // optional: can pass null with `null` if using Option<Pubkey>
      )
      .accounts({
        initializer: provider.publicKey,
        mintX: mintX,
        mintY: mintY,
        configAmm: configAmmPda,
        configPool: configPoolPda,
        mintLp: lpMintPda,
        vaultX,
        vaultY,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    console.log("Pool initialized. Tx:", tx);
  });
  
  it("First deposit (when pool is empty)", async () => {
    const amount = new anchor.BN(100_000_000); // user wants 100 LP tokens
    const maxX = new anchor.BN(500_000_000);   // willing to deposit up to 500 X
    const maxY = new anchor.BN(300_000_000);   // willing to deposit up to 300 Y

    userAtaX = (
          await getOrCreateAssociatedTokenAccount(connection, (provider.wallet as any).payer, mintX, authority)
        ).address;
    
    userAtaY = (
          await getOrCreateAssociatedTokenAccount(connection, (provider.wallet as any).payer, mintY, authority)
        ).address;
    
    userAtaLp = (
          await getOrCreateAssociatedTokenAccount(connection, (provider.wallet as any).payer, lpMintPda, authority)
        ).address;
  
    // Get initial balances
    const initialUserX = await getAccount(connection, userAtaX);
    const initialUserY = await getAccount(connection, userAtaY);
    const initialUserLp = await getAccount(connection, userAtaLp);
    const initialVaultX = await getAccount(connection, vaultX);
    const initialVaultY = await getAccount(connection, vaultY);
  
console.log("Initial balances:");
console.log("User X:", formatAmount(initialUserX.amount));
console.log("User Y:", formatAmount(initialUserY.amount));
console.log("User LP:", formatAmount(initialUserLp.amount));
console.log("Vault X:", formatAmount(initialVaultX.amount));
console.log("Vault Y:", formatAmount(initialVaultY.amount));
  
    const tx = await program.methods
      .deposit(amount, maxX, maxY)
      .accounts({
        user: authority,
        mintX,
        mintY,
        configAmm: configAmmPda,    // ✅ include configAmm
        configPool: configPoolPda,
        mintLp: lpMintPda,          // ✅ use PDA, not hardcoded mint
        vaultX,
        vaultY,
        userAtaX,
        userAtaY,
        userAtaLp,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();
  
    console.log("First deposit tx:", tx);
  
    // Balances after deposit
    const finalUserX = await getAccount(connection, userAtaX);
    const finalUserY = await getAccount(connection, userAtaY);
    const finalUserLp = await getAccount(connection, userAtaLp);
    const finalVaultX = await getAccount(connection, vaultX);
    const finalVaultY = await getAccount(connection, vaultY);
  

console.log("Final balances:");
console.log("User X:", formatAmount(finalUserX.amount));
console.log("User Y:", formatAmount(finalUserY.amount));
console.log("User LP:", formatAmount(finalUserLp.amount));
console.log("Vault X:", formatAmount(finalVaultX.amount));
console.log("Vault Y:", formatAmount(finalVaultY.amount));
  
    // Assertions for first deposit (pool is empty → deposits exactly maxX/maxY)
    // expect(finalUserX.amount).to.equal(initialUserX.amount - BigInt(maxX.toString()));
    // expect(finalUserY.amount).to.equal(initialUserY.amount - BigInt(maxY.toString()));
    // expect(finalUserLp.amount).to.equal(BigInt(amount.toString()));
    // expect(finalVaultX.amount).to.equal(BigInt(maxX.toString()));
    // expect(finalVaultY.amount).to.equal(BigInt(maxY.toString()));
  });

    it("Second deposit (when liquidity already exists in the pool)", async () => {
    const amount = new anchor.BN(100_000_000); // user wants 100 LP tokens
    const maxX = new anchor.BN(500_000_000);   // willing to deposit up to 500 X
    const maxY = new anchor.BN(300_000_000);   // willing to deposit up to 300 Y

    userAtaX = (
          await getOrCreateAssociatedTokenAccount(connection, (provider.wallet as any).payer, mintX, authority)
        ).address;
    
    userAtaY = (
          await getOrCreateAssociatedTokenAccount(connection, (provider.wallet as any).payer, mintY, authority)
        ).address;
    
    userAtaLp = (
          await getOrCreateAssociatedTokenAccount(connection, (provider.wallet as any).payer, lpMintPda, authority)
        ).address;
  
    // Get initial balances
    const initialUserX = await getAccount(connection, userAtaX);
    const initialUserY = await getAccount(connection, userAtaY);
    const initialUserLp = await getAccount(connection, userAtaLp);
    const initialVaultX = await getAccount(connection, vaultX);
    const initialVaultY = await getAccount(connection, vaultY);
  
console.log("Initial balances:");
console.log("User X:", formatAmount(initialUserX.amount));
console.log("User Y:", formatAmount(initialUserY.amount));
console.log("User LP:", formatAmount(initialUserLp.amount));
console.log("Vault X:", formatAmount(initialVaultX.amount));
console.log("Vault Y:", formatAmount(initialVaultY.amount));
  
    const tx = await program.methods
      .deposit(amount, maxX, maxY)
      .accounts({
        user: authority,
        mintX,
        mintY,
        configAmm: configAmmPda,    // ✅ include configAmm
        configPool: configPoolPda,
        mintLp: lpMintPda,          // ✅ use PDA, not hardcoded mint
        vaultX,
        vaultY,
        userAtaX,
        userAtaY,
        userAtaLp,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();
  
    console.log("First deposit tx:", tx);
  
    // Balances after deposit
    const finalUserX = await getAccount(connection, userAtaX);
    const finalUserY = await getAccount(connection, userAtaY);
    const finalUserLp = await getAccount(connection, userAtaLp);
    const finalVaultX = await getAccount(connection, vaultX);
    const finalVaultY = await getAccount(connection, vaultY);
  

console.log("Final balances:");
console.log("User X:", formatAmount(finalUserX.amount));
console.log("User Y:", formatAmount(finalUserY.amount));
console.log("User LP:", formatAmount(finalUserLp.amount));
console.log("Vault X:", formatAmount(finalVaultX.amount));
console.log("Vault Y:", formatAmount(finalVaultY.amount));
  
    // Assertions for first deposit (pool is empty → deposits exactly maxX/maxY)
    // expect(finalUserX.amount).to.equal(initialUserX.amount - BigInt(maxX.toString()));
    // expect(finalUserY.amount).to.equal(initialUserY.amount - BigInt(maxY.toString()));
    // expect(finalUserLp.amount).to.equal(BigInt(amount.toString()));
    // expect(finalVaultX.amount).to.equal(BigInt(maxX.toString()));
    // expect(finalVaultY.amount).to.equal(BigInt(maxY.toString()));
  });

    it("Withdraw liquidity...", async () => {
    const amount = new anchor.BN(10_000_000); // user wants 10 LP tokens
    const maxX = new anchor.BN(10_000_000);   // willing to withdraw up to 100 X
    const maxY = new anchor.BN(10_000_000);   // willing to withdraw up to 100 Y
  
    // Get initial balances
    const initialUserX = await getAccount(connection, userAtaX);
    const initialUserY = await getAccount(connection, userAtaY);
    const initialUserLp = await getAccount(connection, userAtaLp);
    const initialVaultX = await getAccount(connection, vaultX);
    const initialVaultY = await getAccount(connection, vaultY);
  
    console.log("Initial balances:");
console.log("User X:", formatAmount(initialUserX.amount));
console.log("User Y:", formatAmount(initialUserY.amount));
console.log("User LP:", formatAmount(initialUserLp.amount));
console.log("Vault X:", formatAmount(initialVaultX.amount));
console.log("Vault Y:", formatAmount(initialVaultY.amount));
  
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
console.log("User X:", formatAmount(finalUserX.amount));
console.log("User Y:", formatAmount(finalUserY.amount));
console.log("User LP:", formatAmount(finalUserLp.amount));
console.log("Vault X:", formatAmount(finalVaultX.amount));
console.log("Vault Y:", formatAmount(finalVaultY.amount));
  
    // Assertions for first deposit (pool is empty → deposits exactly maxX/maxY)
  //   expect(finalUserX.amount).to.equal(initialUserX.amount - BigInt(maxX.toString()));
  //   expect(finalUserY.amount).to.equal(initialUserY.amount - BigInt(maxY.toString()));
  //   expect(finalUserLp.amount).to.equal(BigInt(amount.toString()));
  //   expect(finalVaultX.amount).to.equal(BigInt(maxX.toString()));
  //   expect(finalVaultY.amount).to.equal(BigInt(maxY.toString()));
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
console.log("User X:", formatAmount(initialUserX.amount));
console.log("User Y:", formatAmount(initialUserY.amount));
console.log("Vault X:", formatAmount(initialVaultX.amount));
console.log("Vault Y:", formatAmount(initialVaultY.amount));
  
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
  

console.log("Final balances(after swap):");
console.log("User X:", formatAmount(finalUserX.amount));
console.log("User Y:", formatAmount(finalUserY.amount));
console.log("Vault X:", formatAmount(finalVaultX.amount));
console.log("Vault Y:", formatAmount(finalVaultY.amount));
  
    // Assertions
    expect(finalUserX.amount).to.equal(initialUserX.amount - BigInt(amountIn.toString()));
    expect(finalVaultX.amount).to.equal(initialVaultX.amount + BigInt(amountIn.toString()));
  
    // Outgoing Y should increase user balance and decrease vault
  //   expect(finalUserY.amount).to.be.greaterThan(initialUserY.amount);
  //   expect(finalVaultY.amount).to.be.lessThan(initialVaultY.amount);
  });


    it("Swaps Y for X", async () => {
    const amountIn = new anchor.BN(10_000_000); // user swaps 50 X
    const minOut = new anchor.BN(1);            // slippage tolerance, accept anything > 0
  
    // Balances before
    const initialUserX = await getAccount(connection, userAtaX);
    const initialUserY = await getAccount(connection, userAtaY);
    const initialVaultX = await getAccount(connection, vaultX);
    const initialVaultY = await getAccount(connection, vaultY);
  
    console.log("Initial balances (before swap):");
console.log("User X:", formatAmount(initialUserX.amount));
console.log("User Y:", formatAmount(initialUserY.amount));
console.log("Vault X:", formatAmount(initialVaultX.amount));
console.log("Vault Y:", formatAmount(initialVaultY.amount));
  
    // Perform swap
    const tx = await program.methods
      .swap(false, amountIn, minOut) // true = swap X→Y
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
  

console.log("Final balances(after swap):");
console.log("User X:", formatAmount(finalUserX.amount));
console.log("User Y:", formatAmount(finalUserY.amount));
console.log("Vault X:", formatAmount(finalVaultX.amount));
console.log("Vault Y:", formatAmount(finalVaultY.amount));
  
    // Assertions
    expect(finalUserY.amount).to.equal(initialUserY.amount - BigInt(amountIn.toString()));
    expect(finalVaultY.amount).to.equal(initialVaultY.amount + BigInt(amountIn.toString()));
  
    // Outgoing Y should increase user balance and decrease vault
  //   expect(finalUserY.amount).to.be.greaterThan(initialUserY.amount);
  //   expect(finalVaultY.amount).to.be.lessThan(initialVaultY.amount);
  });
  


});
