use anchor_lang::prelude::*;

mod state;
mod instructions;

use instructions::*;

declare_id!("68QFHzUpgfPfasuSopoXHfNrmVjuLmVttc5iWxBxsVkC");

#[program]
pub mod day7_staking {
    use super::*;

    pub fn initialize(ctx: Context<InitializeConfig>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
