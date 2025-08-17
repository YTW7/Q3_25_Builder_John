import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CapstoneLaunchpad,  } from "../target/types/capstone_launchpad";
import { token } from "@coral-xyz/anchor/dist/cjs/utils";
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
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { AMMTestUtils, AMMTestSetup } from "../helper";

describe("capstone_launchpad", () => {
  // Configure the client to use the local cluster.
  const provider=anchor.AnchorProvider.env();
  const authority = provider.publicKey;

  anchor.setProvider(provider);
    const connection = provider.connection;
  const wallet = provider.wallet;

  const program = anchor.workspace.capstoneLaunchpad as Program<CapstoneLaunchpad>;
  const seed_string  = 5;

  it("Initializes a pool", async () => {
    const poolSeed = new anchor.BN(seed_string);
    const fee = 30; //0.3%
    const authority = provider.publicKey;

    const ammSeed = new anchor.BN(seed_string); 
    const [configAmmPda, configBump] = anchor.web3.PublicKey.findProgramAddressSync(
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

  });
// Expected config_pool PDA: 8KroHm9grP1hjAg7CuyNpRFRSAfU5pLktPkruugUsFsz
// Expected LP mint PDA: AGptQGrEs2yQtnFcCpocty6dvkD3jXHLq4jAY4JM6kL1
// mintX: PublicKey(9QndCCfG6r9d9GnJD6HZZrhzGGRAvSFR3nB3WcyGhVND)
// mintY: PublicKey(4uVCs6uDkymcru7hpy4m7E5QtTNBSp2UAbcUEQQti91E)
// vaultX: PublicKey(Be5wK9N2Q51T5s6sCQHTpbf21LWqJ8Zg5ub1j6W42XEY)
// vaultY: PublicKey(7yE3c8TfSSDPsWgzMSUued4QFVVMMJuBi9DoFJeTqt5R)
// mintLp: PublicKey(AGptQGrEs2yQtnFcCpocty6dvkD3jXHLq4jAY4JM6kL1)