import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CapstoneLaunchpad } from "../target/types/capstone_launchpad";
import { ASSOCIATED_TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";

const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

const metadata = {
  uri: "https://raw.githubusercontent.com/solana-developers/program-examples/new-examples/tokens/tokens/.assets/spl-token.json",
  name: "Solana Gold",
  symbol: "GOLDSOL",
};

describe("capstone_launchpad", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.capstoneLaunchpad as Program<CapstoneLaunchpad>;
  const authority = provider.publicKey;
  const connection = provider.connection;
  
  // Generate a Keypair for the new mint
  const newMint = anchor.web3.Keypair.generate();

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
});