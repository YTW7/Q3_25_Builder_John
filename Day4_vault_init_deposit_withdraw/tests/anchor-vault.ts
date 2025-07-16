import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorVault } from "../target/types/anchor_vault";

describe("anchor-vault", () => {
  // Configure the client to use the local cluster.
  const provider=anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.anchorVault as Program<AnchorVault>;
  
  const vaultState = anchor.web3.findProgramAddressSync([Buffer.from("state"), provider.publicKey.toBytes()], program.programId)[0];
  const vault = anchor.web3.findProgramAddressSync([Buffer.from("vault"), vaultState.toBytes()], program.programId)[0];
  

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize()
    .accountsPartial({
      user: provider.publicKey,
      vaultState,
      vault,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
    console.log("Your transaction signature", tx);
  });
});
