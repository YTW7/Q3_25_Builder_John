import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddressSync,
  getAccount,
  mintTo,
  createAssociatedTokenAccount,
  TokenAccountNotFoundError,
} from "@solana/spl-token";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";

export interface AMMTestSetup {
  mintX: PublicKey;
  mintY: PublicKey;
  configPoolPda: PublicKey;
  lpMintPda: PublicKey;
  vaultX: PublicKey;
  vaultY: PublicKey;
  userX: PublicKey;
  userY: PublicKey;
  userLp: PublicKey;
  configAmmPda: PublicKey;
  poolSeed: anchor.BN;
  ammSeed: anchor.BN;
}

export interface CreateMintsOptions {
  decimals?: number;
  initialSupply?: number;
  createUserAccounts?: boolean;
  mintToUser?: number;
}

export interface SetupAMMOptions {
  poolSeed?: number;
  ammSeed?: number;
  createMints?: boolean;
  mintsOptions?: CreateMintsOptions;
  existingMintX?: PublicKey;
  existingMintY?: PublicKey;
  createVaults?: boolean;
  mintToUser?: number;
}

export class AMMTestUtils {
  constructor(
    private program: Program<any>,
    private provider: anchor.AnchorProvider,
    private connection: anchor.web3.Connection
  ) {}

  /**
   * Creates new token mints for testing
   */
  async createMints(options: CreateMintsOptions = {}): Promise<{ mintX: PublicKey; mintY: PublicKey }> {
    const {
      decimals = 9,
      createUserAccounts = true,
      mintToUser = 1000_000_000
    } = options;

    console.log("Creating test token mints...");

    // Create mint X
    const mintX = await createMint(
      this.connection,
      this.provider.wallet.payer,
      this.provider.publicKey, // mint authority
      null, // freeze authority
      decimals
    );

    // Create mint Y
    const mintY = await createMint(
      this.connection,
      this.provider.wallet.payer,
      this.provider.publicKey, // mint authority
      null, // freeze authority
      decimals
    );

    console.log(`Created mintX: ${mintX.toString()}`);
    console.log(`Created mintY: ${mintY.toString()}`);

    // Create user token accounts and mint tokens if requested
    if (createUserAccounts) {
      await this.createUserTokenAccounts(mintX, mintY);
      
      if (mintToUser > 0) {
        await this.mintTokensToUser(mintX, mintY, mintToUser);
      }
    }

    return { mintX, mintY };
  }

  /**
   * Creates user token accounts for the given mints
   */
  async createUserTokenAccounts(mintX: PublicKey, mintY: PublicKey): Promise<void> {
    const user = this.provider.publicKey;
    
    const userX = getAssociatedTokenAddressSync(mintX, user);
    const userY = getAssociatedTokenAddressSync(mintY, user);

    // Create user X token account if it doesn't exist
    try {
      await getAccount(this.connection, userX);
      console.log("User X token account already exists");
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        console.log("Creating user X token account");
        await createAssociatedTokenAccount(
          this.connection,
          this.provider.wallet.payer,
          mintX,
          user
        );
      } else {
        throw error;
      }
    }

    // Create user Y token account if it doesn't exist
    try {
      await getAccount(this.connection, userY);
      console.log("User Y token account already exists");
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        console.log("Creating user Y token account");
        await createAssociatedTokenAccount(
          this.connection,
          this.provider.wallet.payer,
          mintY,
          user
        );
      } else {
        throw error;
      }
    }
  }

  /**
   * Mints tokens to user accounts
   */
  async mintTokensToUser(mintX: PublicKey, mintY: PublicKey, amount: number): Promise<void> {
    const user = this.provider.publicKey;
    const userX = getAssociatedTokenAddressSync(mintX, user);
    const userY = getAssociatedTokenAddressSync(mintY, user);

    console.log(`Minting ${amount} tokens to user accounts...`);

    await mintTo(
      this.connection,
      this.provider.wallet.payer,
      mintX,
      userX,
      this.provider.wallet.payer,
      amount
    );

    await mintTo(
      this.connection,
      this.provider.wallet.payer,
      mintY,
      userY,
      this.provider.wallet.payer,
      amount
    );

    console.log("Tokens minted successfully");
  }

  /**
   * Creates vault token accounts for the pool
   */
  async createVaultAccounts(
    mintX: PublicKey,
    mintY: PublicKey,
    configPoolPda: PublicKey
  ): Promise<{ vaultX: PublicKey; vaultY: PublicKey }> {
    const vaultX = getAssociatedTokenAddressSync(mintX, configPoolPda, true);
    const vaultY = getAssociatedTokenAddressSync(mintY, configPoolPda, true);

    // Create vault X if it doesn't exist
    try {
      await getAccount(this.connection, vaultX);
      console.log("Vault X already exists");
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        console.log("Creating vault X token account");
        await createAssociatedTokenAccount(
          this.connection,
          this.provider.wallet.payer,
          mintX,
          configPoolPda
        );
      } else {
        throw error;
      }
    }

    // Create vault Y if it doesn't exist
    try {
      await getAccount(this.connection, vaultY);
      console.log("Vault Y already exists");
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        console.log("Creating vault Y token account");
        await createAssociatedTokenAccount(
          this.connection,
          this.provider.wallet.payer,
          mintY,
          configPoolPda
        );
      } else {
        throw error;
      }
    }

    return { vaultX, vaultY };
  }

  /**
   * Finds program-derived addresses for AMM and pool
   */
  findPDAs(ammSeed: anchor.BN, poolSeed: anchor.BN): {
    configAmmPda: PublicKey;
    configPoolPda: PublicKey;
    lpMintPda: PublicKey;
  } {
    const [configAmmPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config_amm"), ammSeed.toArrayLike(Buffer, "le", 8)],
      this.program.programId
    );

    const [configPoolPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("config_pool"),
        configAmmPda.toBuffer(),
        poolSeed.toArrayLike(Buffer, "le", 8)
      ],
      this.program.programId
    );

    const [lpMintPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("lp"), configPoolPda.toBuffer()],
      this.program.programId
    );

    return { configAmmPda, configPoolPda, lpMintPda };
  }

  /**
   * Complete setup for AMM testing
   */
  async setupAMM(options: SetupAMMOptions = {}): Promise<AMMTestSetup> {
    const {
      poolSeed = 1,
      ammSeed = 1,
      createMints = true,
      mintsOptions = {},
      existingMintX,
      existingMintY,
      createVaults = true,
      mintToUser = 1000_000_000
    } = options;

    console.log("Setting up AMM test environment...");

    // Convert seeds to BN
    const poolSeedBN = new anchor.BN(poolSeed);
    const ammSeedBN = new anchor.BN(ammSeed);

    // Find PDAs
    const { configAmmPda, configPoolPda, lpMintPda } = this.findPDAs(ammSeedBN, poolSeedBN);

    console.log("Config AMM PDA:", configAmmPda.toString());
    console.log("Config Pool PDA:", configPoolPda.toString());
    console.log("LP Mint PDA:", lpMintPda.toString());

    // Handle mints
    let mintX: PublicKey;
    let mintY: PublicKey;

    if (createMints) {
      const mints = await this.createMints(mintsOptions);
      mintX = mints.mintX;
      mintY = mints.mintY;
    } else if (existingMintX && existingMintY) {
      mintX = existingMintX;
      mintY = existingMintY;

      // Verify mints exist
      await this.verifyMintsExist(mintX, mintY);
      
      // Create user accounts if needed
      await this.createUserTokenAccounts(mintX, mintY);
      
      if (mintToUser > 0) {
        await this.mintTokensToUser(mintX, mintY, mintToUser);
      }
    } else {
      throw new Error("Either set createMints=true or provide existingMintX and existingMintY");
    }

    // Calculate token account addresses
    const user = this.provider.publicKey;
    const userX = getAssociatedTokenAddressSync(mintX, user);
    const userY = getAssociatedTokenAddressSync(mintY, user);
    const userLp = getAssociatedTokenAddressSync(lpMintPda, user);

    // Create vault accounts
    let vaultX: PublicKey;
    let vaultY: PublicKey;

    if (createVaults) {
      const vaults = await this.createVaultAccounts(mintX, mintY, configPoolPda);
      vaultX = vaults.vaultX;
      vaultY = vaults.vaultY;
    } else {
      vaultX = getAssociatedTokenAddressSync(mintX, configPoolPda, true);
      vaultY = getAssociatedTokenAddressSync(mintY, configPoolPda, true);
    }

    console.log("AMM setup complete!");
    console.log("=".repeat(50));
    console.log("Mint X:", mintX.toString());
    console.log("Mint Y:", mintY.toString());
    console.log("User X ATA:", userX.toString());
    console.log("User Y ATA:", userY.toString());
    console.log("User LP ATA:", userLp.toString());
    console.log("Vault X:", vaultX.toString());
    console.log("Vault Y:", vaultY.toString());
    console.log("=".repeat(50));

    return {
      mintX,
      mintY,
      configPoolPda,
      lpMintPda,
      vaultX,
      vaultY,
      userX,
      userY,
      userLp,
      configAmmPda,
      poolSeed: poolSeedBN,
      ammSeed: ammSeedBN
    };
  }

  /**
   * Verifies that mints exist on-chain
   */
  async verifyMintsExist(mintX: PublicKey, mintY: PublicKey): Promise<void> {
    const mintXInfo = await this.connection.getAccountInfo(mintX);
    const mintYInfo = await this.connection.getAccountInfo(mintY);

    if (!mintXInfo) {
      throw new Error(`Mint X (${mintX.toString()}) does not exist`);
    }
    if (!mintYInfo) {
      throw new Error(`Mint Y (${mintY.toString()}) does not exist`);
    }

    console.log("Verified both mints exist on-chain");
  }

  /**
   * Get token account balances for debugging
   */
  async getBalances(setup: AMMTestSetup): Promise<{
    userX: bigint;
    userY: bigint;
    userLp: bigint;
    vaultX: bigint;
    vaultY: bigint;
  }> {
    const [userXAccount, userYAccount, userLpAccount, vaultXAccount, vaultYAccount] = 
      await Promise.allSettled([
        getAccount(this.connection, setup.userX),
        getAccount(this.connection, setup.userY),
        getAccount(this.connection, setup.userLp),
        getAccount(this.connection, setup.vaultX),
        getAccount(this.connection, setup.vaultY)
      ]);

    return {
      userX: userXAccount.status === 'fulfilled' ? userXAccount.value.amount : 0n,
      userY: userYAccount.status === 'fulfilled' ? userYAccount.value.amount : 0n,
      userLp: userLpAccount.status === 'fulfilled' ? userLpAccount.value.amount : 0n,
      vaultX: vaultXAccount.status === 'fulfilled' ? vaultXAccount.value.amount : 0n,
      vaultY: vaultYAccount.status === 'fulfilled' ? vaultYAccount.value.amount : 0n,
    };
  }

  /**
   * Print balances in a readable format
   */
  async printBalances(setup: AMMTestSetup, label = ""): Promise<void> {
    const balances = await this.getBalances(setup);
    
    console.log(`\n${label ? label + " - " : ""}Token Balances:`);
    console.log(`User X: ${balances.userX.toString()}`);
    console.log(`User Y: ${balances.userY.toString()}`);
    console.log(`User LP: ${balances.userLp.toString()}`);
    console.log(`Vault X: ${balances.vaultX.toString()}`);
    console.log(`Vault Y: ${balances.vaultY.toString()}\n`);
  }

  /**
   * Helper to get common instruction accounts for AMM operations
   */
  getInstructionAccounts(setup: AMMTestSetup) {
    return {
      user: this.provider.publicKey,
      mintX: setup.mintX,
      mintY: setup.mintY,
      configPool: setup.configPoolPda,
      mintLp: setup.lpMintPda,
      vaultX: setup.vaultX,
      vaultY: setup.vaultY,
      userAtaX: setup.userX,
      userAtaY: setup.userY,
      userAtaLp: setup.userLp,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    };
  }
}