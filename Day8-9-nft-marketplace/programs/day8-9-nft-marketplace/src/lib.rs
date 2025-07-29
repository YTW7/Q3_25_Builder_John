use anchor_lang::prelude::*;

declare_id!("BRYUbcy7Bqn6AM1vM3Rqn5pJ49CEZFkK8FPgbELda5Lh");

#[program]
pub mod day8_9_nft_marketplace {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
