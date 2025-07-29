use anchor_lang::prelude::*;

declare_id!("HEL245pHnCwALpkjHqC9dAbB4ML4yEvZDARRyg78MB3F");

#[program]
pub mod capstone_launchpad {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
