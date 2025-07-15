use anchor_lang::prelude::*;

#[account]
pub struct Config{
    pub seed: u64,
    pub authority: Option<Pubkey>,
    pub mint_a:
    pub mint_b:
    pub fee:
    pub locked:
    pub config_bump:
    pub lp_bump:
}