use anchor_lang::prelude::*;
// use anchor_spl::{associated_token::AssociatedToken, token::{Mint, Token, TokenAccount}};

use crate::state::ConfigAmm;

#[derive(Accounts)]
#[instruction(amm_seed: u64)]
pub struct InitializeAmm<'info> {
    #[account(mut)]
    pub initializer: Signer<'info>,

    #[account(
        init,
        payer = initializer,
        seeds = [b"config_amm", amm_seed.to_le_bytes().as_ref()],
        bump,
        space = 8 + ConfigAmm::INIT_SPACE,
    )]
    pub config_amm: Account<'info, ConfigAmm>,

    pub system_program: Program<'info, System>,
}

impl<'info> InitializeAmm<'info> {
    pub fn initialize_amm(
        &mut self,
        amm_seed: u64,
        authority: Option<Pubkey>,
        bumps: InitializeAmmBumps,
    ) -> Result<()> {
        self.config_amm.set_inner(ConfigAmm {
            amm_seed,
            authority,
            config_amm_bump: bumps.config_amm,
        });
        Ok(())
    }
}
