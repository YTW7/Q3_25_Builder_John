use anchor_lang::prelude::*;

declare_id!("B1R7yAzDARREcDnq9QG1sukStLUpEYfFD9hHDCiaLraB");

#[program]
pub mod anchor_amm {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
