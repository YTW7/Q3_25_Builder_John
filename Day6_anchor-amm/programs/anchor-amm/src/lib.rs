#![allow(unexpected_cfgs)]
#![allow(deprecated)]
pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;
use anchor_lang::prelude::*;

declare_id!("AGVxbXb4wQBmkfQzY7XfhkL4g3ALQ47JTcZCR2oNhhvB");


pub use constants::*;
pub use instructions::*;
pub use state::*;

#[program]
pub mod anchor_amm {
    use super::*;

    // pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    //     msg!("Greetings from: {:?}", ctx.program_id);
    //     Ok(())
    // }
    pub fn initialize(ctx: Context<Initialize>, seed: u64, fee: u16, authority: Option<Pubkey>) -> Result<()> {
        ctx.accounts.init(seed, fee, authority, ctx.bumps)
    }

     pub fn deposit(ctx: Context<Deposit>, amount: u64, max_x: u64, max_y: u64) -> Result<()> {
        ctx.accounts.deposit(amount, max_x, max_y)
    }
}

