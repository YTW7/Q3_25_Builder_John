use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{Mint, Token, TokenAccount, Transfer, transfer}};
use constant_product_curve::{ConstantProduct, LiquidityPair};

use crate::{errors::AmmError, state::{ConfigPool, ConfigAmm}};

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    pub mint_x: Account<'info, Mint>,

    pub mint_y: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint_x,
        associated_token::authority = user,
    )]
    pub user_ata_x: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint_y,
        associated_token::authority = user,
    )]
    pub user_ata_y: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint_x,
        associated_token::authority = config_pool,
    )]
    pub vault_x: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint_y,
        associated_token::authority = config_pool,
    )]
    pub vault_y: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"config_amm", config_amm.amm_seed.to_le_bytes().as_ref()],
        bump = config_amm.config_amm_bump,
    )]
    pub config_amm: Account<'info, ConfigAmm>,

    #[account(
        has_one = mint_x,
        has_one = mint_y,
        seeds = [
            b"config_pool", 
            config_amm.key().as_ref(), 
            config_pool.pool_seed.to_le_bytes().as_ref()],
        bump = config_pool.config_pool_bump,
    )]
    pub config_pool: Account<'info, ConfigPool>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> Swap<'info> {
    pub fn swap(&mut self, is_x: bool, amount: u64, min: u64) -> Result<()> {
        require!(self.config_pool.locked == false, AmmError::PoolLocked);
        require!(amount > 0, AmmError::InvalidAmount);

        let mut curve = ConstantProduct::init(
            self.vault_x.amount,
             self.vault_y.amount, 
             self.vault_x.amount, 
             self.config_pool.fee,
            None,
        )
        .map_err(AmmError::from)?;

        let p = match is_x {
            true => LiquidityPair::X,
            false => LiquidityPair::Y,
        };

        let res = curve.swap(p, amount, min).map_err(AmmError::from)?;

        require!(res.deposit != 0, AmmError::InvalidAmount);
        require!(res.withdraw != 0, AmmError::InvalidAmount);

        // deposit tokens
        self.deposit_tokens(is_x, res.deposit)?;
        // withdraw tokens
        self.withdraw_tokens(is_x, res.withdraw)?;
        // transfer fee

        Ok(())
    }

    pub fn deposit_tokens(&mut self, is_x: bool, amount: u64) -> Result<()> {
        let (from, to) = match is_x {
            true => (self.user_ata_x.to_account_info() , self.vault_x.to_account_info()),
            false => (self.user_ata_y.to_account_info(), self.vault_y.to_account_info()),
        };

        let cpi_program = self.token_program.to_account_info();

        let accounts = Transfer {
            from: from.to_account_info(),
            to: to.to_account_info(),
            authority: self.user.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program, accounts);

        transfer(cpi_ctx, amount)?;

        Ok(())
    }

    pub fn withdraw_tokens(&mut self, is_x: bool, amount: u64) -> Result<()> {
        let (from, to) = match is_x {
            true => (self.vault_y.to_account_info() , self.user_ata_y.to_account_info()),
            false => (self.vault_x.to_account_info(), self.user_ata_x.to_account_info()),
        };

        let cpi_program = self.token_program.to_account_info();

        let accounts = Transfer {
            from: from.to_account_info(),
            to: to.to_account_info(),
            authority: self.config_pool.to_account_info(),
        };

        let config_amm_key = self.config_amm.key();

        let seeds = &[
            b"config_pool",
            config_amm_key.as_ref(),
            &self.config_pool.pool_seed.to_le_bytes(),
        ];

        let signer_seeds: &[&[&[u8]]] = &[&[
        seeds[0],
        seeds[1],
        seeds[2],
        &[self.config_pool.config_pool_bump],
        ]];

        let cpi_ctx = CpiContext::new_with_signer(cpi_program, accounts, signer_seeds);

        transfer(cpi_ctx, amount)?;

        Ok(())
    }
}