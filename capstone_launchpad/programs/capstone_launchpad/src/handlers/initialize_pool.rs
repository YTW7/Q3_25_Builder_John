use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{Mint, Token, TokenAccount}};

use crate::state::{ConfigAmm, ConfigPool};

#[derive(Accounts)]
#[instruction(pool_seed: u64)]
pub struct InitializePool<'info> {
    #[account(mut)]
    pub initializer: Signer<'info>,

    pub mint_x: Account<'info, Mint>,
    pub mint_y: Account<'info, Mint>,

        /// Parent AMM config
    #[account(
        mut,
        seeds = [b"config_amm", config_amm.amm_seed.to_le_bytes().as_ref()],
        bump = config_amm.config_amm_bump,
    )]
    pub config_amm: Account<'info, ConfigAmm>,

        /// Pool-specific config
    #[account(
        init,
        payer = initializer,
        seeds = [b"config_pool", config_amm.key().as_ref(), pool_seed.to_le_bytes().as_ref()],
        bump,
        space = 8 + ConfigPool::INIT_SPACE,
    )]
    pub config_pool: Account<'info, ConfigPool>,

    // #[account(
    //     mut,
    //     seeds = [b"config", config.seed.to_le_bytes().as_ref()],
    //     bump = config.config_bump,
    // )]
    // pub config: Account<'info, ConfigPool>,

    #[account(
        init,
        payer = initializer,
        seeds = [b"lp", config_pool.key().as_ref()],
        bump,
        mint::decimals = 6,
        mint::authority = config_pool,
    )]
    pub mint_lp: Account<'info, Mint>,

    #[account(
        init,
        payer = initializer,
        associated_token::mint = mint_x,
        associated_token::authority = config_pool,
    )]
    pub vault_x: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = initializer,
        associated_token::mint = mint_y,
        associated_token::authority = config_pool,
    )]
    pub vault_y: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitializePool<'info> {
    pub fn initialize_pool(
        &mut self,
        pool_seed: u64,
        fee: u16,
        authority: Option<Pubkey>,
        bumps: InitializePoolBumps,
    ) -> Result<()> {
    self.config_pool.set_inner(ConfigPool {
            pool_seed: pool_seed,
            authority,
            mint_x: self.mint_x.key(),
            mint_y: self.mint_y.key(),
            fee,
            locked: false,
            config_pool_bump: bumps.config_pool,
            lp_bump: bumps.mint_lp,
        });
        Ok(())
    }
}

