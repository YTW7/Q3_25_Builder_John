#![allow(unexpected_cfgs, deprecated)]
use anchor_lang::prelude::*;

mod errors;
mod state;
mod handlers;

use handlers::*;

declare_id!("HEL245pHnCwALpkjHqC9dAbB4ML4yEvZDARRyg78MB3F");

#[program]
pub mod capstone_launchpad {
    use super::*;

    pub fn initialize_amm(ctx: Context<InitializeAmm>, amm_seed: u64, authority: Option<Pubkey>) -> Result<()> {
        ctx.accounts.initialize_amm(amm_seed, authority, ctx.bumps)
    }

    pub fn initialize_pool(ctx: Context<InitializePool>, pool_seed: u64, fee: u16, authority: Option<Pubkey>) -> Result<()> {
        ctx.accounts.initialize_pool(pool_seed, fee, authority, ctx.bumps)
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64, max_x: u64, max_y: u64) -> Result<()> {
        ctx.accounts.deposit(amount, max_x, max_y)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64, max_x: u64, max_y: u64) -> Result<()> {
        ctx.accounts.withdraw(amount, max_x, max_y)
    }

    pub fn swap(ctx: Context<Swap>, is_x: bool, amount_in: u64, min_amount_out: u64) -> Result<()> {
        ctx.accounts.swap(is_x, amount_in, min_amount_out)
    }
}
