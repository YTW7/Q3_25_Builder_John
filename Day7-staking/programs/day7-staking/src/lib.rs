use anchor_lang::prelude::*;

declare_id!("68QFHzUpgfPfasuSopoXHfNrmVjuLmVttc5iWxBxsVkC");

#[program]
pub mod day7_staking {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
