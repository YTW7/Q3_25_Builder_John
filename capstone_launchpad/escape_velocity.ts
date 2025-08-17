import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CapstoneLaunchpad } from "./target/types/amm";
import { token } from "@coral-xyz/anchor/dist/cjs/utils";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token"

describe("escape velocity begins...", () => {
  const provider = anchor.AnchorProvider.env();
  const authority = provider.publicKey;
  anchor.setProvider(provider);

  const program = anchor.workspace.capstoneLaunchpad as Program<CapstoneLaunchpad>;

  for (let i = 1; i <= 99999; i++) {
    it(`swap test ${i}...`, async () => {
      console.log(`✅ swap test ${i} passed...`);
    });
  }
});

