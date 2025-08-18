#![allow(unexpected_cfgs, deprecated)]
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{create_metadata_accounts_v3, CreateMetadataAccountsV3, Metadata},
    token::{burn, mint_to, Burn, Mint, MintTo, Token, TokenAccount},
};

// use mpl_token_metadata::instructions::pda::find_metadata_account;
use mpl_token_metadata::types::DataV2;

mod errors;
mod state;
mod handlers;

use handlers::*;
use handlers::create_token::CreateMint;

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

    pub fn create_mint(
        ctx: Context<CreateMint>,
        uri: String,
        name: String,
        symbol: String,
    ) -> Result<()> {

        // On-chain token metadata for the mint
        let data_v2 = DataV2 {
            name: name,
            symbol: symbol,
            uri: uri,
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        };

        // CPI Context for metadata
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: ctx.accounts.metadata_account.to_account_info(), // the metadata account being created
                mint: ctx.accounts.new_token_mint.to_account_info(), // the mint account of the metadata account
                mint_authority: ctx.accounts.admin.to_account_info(), // the mint authority of the mint account
                update_authority: ctx.accounts.admin.to_account_info(), // the update authority of the metadata account
                payer: ctx.accounts.admin.to_account_info(), // the payer for creating the metadata account
                system_program: ctx.accounts.system_program.to_account_info(), // the system program account
                rent: ctx.accounts.rent.to_account_info(), // the rent sysvar account
            }
        );

        create_metadata_accounts_v3(
            cpi_ctx, // cpi context
            data_v2, // token metadata
            true,    // is_mutable
            true,    // update_authority_is_signer
            None,    // collection details
        )?;

        Ok(())
    }

    pub fn mint_token(
        ctx: Context<MintToken>,
        amount: u64,
    ) -> Result<()> {
        let mint_to_cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.new_token_mint.to_account_info(),
                to: ctx.accounts.user_ata_new.to_account_info(),
                authority: ctx.accounts.admin.to_account_info(),
            }
            );

        anchor_spl::token::mint_to(mint_to_cpi_ctx, amount)?;
        Ok(())
    }


}
