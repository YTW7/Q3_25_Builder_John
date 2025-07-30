import * as anchor from "@coral-xyz/anchor";
import { BN, Program, } from "@coral-xyz/anchor";
import { createAssociatedTokenAccountIdempotentInstruction, createInitializeMint2Instruction, createMintToInstruction, getAssociatedTokenAddress, getAssociatedTokenAddressSync, getMinimumBalanceForRentExemptAccount, getMinimumBalanceForRentExemptMint, MINT_SIZE, TOKEN_2022_PROGRAM_ID,  } from "@solana/spl-token";
import { Escrow } from "../target/types/escrow";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, } from "@solana/web3.js";
import { randomBytes } from 'crypto';

describe("escrow", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.getProvider();
  const connection = provider.connection;

  const program = anchor.workspace.escrow as Program<Escrow>;
  const programId = program.programId;

  const tokenProgram = TOKEN_2022_PROGRAM_ID;

  const confirm = async (signature: string): Promise<string> => {
  const block = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    signature,
    ...block
  });
    return signature;
 };

  const log = async (signature: string): Promise<string> => {
    console.log(
      `transaction signature: https://explorer.solana.com/transaction/${signature}?cluster=custom&customUrl=${connection.rpcEndpoint}`
    );
    return signature;
  };

  const seed = new BN(randomBytes(8));

  const [maker, taker, mintA, mintB] = Array.from({ length: 4 }, () =>
    Keypair.generate()
  );

  let makerAtaA: PublicKey;
let makerAtaB: PublicKey;
let takerAtaA: PublicKey;
let takerAtaB: PublicKey;

before(async () => {
  [
    makerAtaA,
    makerAtaB,
    takerAtaA,
    takerAtaB
  ] = await Promise.all(
    [maker, taker].flatMap((user) =>
      [mintA, mintB].map((mint) =>
        getAssociatedTokenAddress(mint.publicKey, user.publicKey, false, tokenProgram)
      )
    )
  );
});

 const escrow = PublicKey.findProgramAddressSync([
   Buffer.from("escrow"), maker.publicKey.toBuffer(), seed.toArrayLike(Buffer, "le", 8)],
   program.programId
 )[0];

 const vault = getAssociatedTokenAddressSync(mintA.publicKey, escrow, true, tokenProgram)

 const accounts = {
  maker: maker.publicKey,
  taker: taker.publicKey,
  mintA: mintA.publicKey,
  mintB: mintB.publicKey,
  makerAtaA,
  makerAtaB,
  takerAtaA,
  takerAtaB,
  escrow, 
  vault,
  tokenProgram,
 }

 it("Airdrop and create mints", async () => {
    // Add your test here.
    let lamports = await getMinimumBalanceForRentExemptMint(connection);
    let tx = new Transaction;

    tx.instructions = [
      ...[maker, taker].map((account)=>
      SystemProgram.transfer({
        fromPubkey:provider.publicKey,
        toPubkey: account.publicKey,
        lamports: 10 * LAMPORTS_PER_SOL,
      })),
      ...[mintA, mintB].map((mint) =>
      SystemProgram.createAccount({
        fromPubkey: provider.publicKey,
        newAccountPubkey: mint.publicKey,
        lamports,
        space: MINT_SIZE,
        programId: tokenProgram
      })
    ),
    ...[
      {mint: mintA.publicKey, authority: maker.publicKey, ata: makerAtaA},
      {mint: mintB.publicKey, authority: taker.publicKey, ata: takerAtaB},
    ].flatMap((x) => [
      createInitializeMint2Instruction(x.mint, 6, x.authority, null, tokenProgram),
      createAssociatedTokenAccountIdempotentInstruction(provider.publicKey, x.ata, x.authority, x.mint, tokenProgram),
      createMintToInstruction(x.mint, x.ata, x.authority, 1e9, undefined, tokenProgram)
    ])

  ]
    await provider.sendAndConfirm(tx, [mintA, mintB, maker, taker]).then(log);
    
  });

  it("Make", async () => {
    // Add your test here.
    await program.methods
    .makeOffer(seed, new BN(1e6), new BN(1e6))
    .accounts({...accounts})
    .signers([maker])
    .rpc()
    .then(confirm)
    .then(log) 
  });

  it("Refund", async () => {
    // Add your test here.
    await program.methods
    .refundOffer()
    .accounts({...accounts})
    .signers([maker])
    .rpc()
    .then(confirm)
    .then(log) 
  });

  it("Take", async () => {
    // Add your test here.
    await program.methods
    .takeOffer()
    .accounts({...accounts})
    .signers([taker])
    .rpc()
    .then(confirm)
    .then(log) 
    
  });

  // it("Is initialized!", async () => {
  //   // Add your test here.
  //   const tx = await program.methods.initialize().rpc();
  //   console.log("Your transaction signature", tx);
  // });
});


