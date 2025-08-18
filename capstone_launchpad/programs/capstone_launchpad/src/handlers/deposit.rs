use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{Transfer, transfer, Mint, Token, TokenAccount, MintTo, mint_to}};
use constant_product_curve::ConstantProduct;

use crate::{errors::AmmError, state::{ConfigPool, ConfigAmm}};

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    pub mint_x: Account<'info, Mint>,

    pub mint_y: Account<'info, Mint>,

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
            config_pool.pool_seed.to_le_bytes().as_ref()
            ],
        bump = config_pool.config_pool_bump,
    )]
    pub config_pool: Account<'info, ConfigPool>,

    #[account(
        mut,
        seeds = [b"lp", config_pool.key().as_ref()],
        bump = config_pool.lp_bump,
    )]
    pub mint_lp: Account<'info, Mint>,

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
        associated_token::mint = mint_x,
        associated_token::authority = user,
    )]
    pub user_ata_x: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint_y,
        associated_token::authority = user,
    )]
    pub user_ata_y: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint_lp,
        associated_token::authority = user,
    )]
    pub user_lp: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> Deposit<'info> {
    pub fn deposit (
        &mut self,
        amount: u64, // Amount of LP tokens that the user wants to "claim"
        max_x: u64, // Maximum amount of token X that the user is willing to deposit
        max_y: u64, // Maximum amount of token Y that the user is willing to deposit
    ) -> Result<()> {
        require!(self.config_pool.locked == false, AmmError::PoolLocked);
        require!(amount != 0, AmmError::InvalidAmount);

        let (x, y) = match self.mint_lp.supply == 0 && self.vault_x.amount == 0 && self.vault_y.amount == 0 {
            true => (max_x, max_y),
            false => {
                let amounts = ConstantProduct::xy_deposit_amounts_from_l(
                    self.vault_x.amount, 
                    self.vault_y.amount, 
                    self.mint_lp.supply, 
                    amount, 
                6
            ).unwrap();
            (amounts.x, amounts.y)
            }
        };

        require!(x <= max_x && y <= max_y, AmmError::SlippageExceeded);

        // deposit token x
        self.deposit_tokens(true, x)?;
        // deposit token y
        self.deposit_tokens(false, y)?;
        // mint lp tokens
        self.mint_lp_tokens(amount)
    }

    pub fn deposit_tokens(&self, is_x: bool, amount: u64) -> Result<()> {
        let (from, to) = match is_x {
            true => (self.user_ata_x.to_account_info(), self.vault_x.to_account_info()),
            false => (self.user_ata_y.to_account_info(), self.vault_y.to_account_info()),
        };

        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = Transfer {
            from,
            to,
            authority: self.user.to_account_info(),
        };

        let ctx = CpiContext::new(cpi_program, cpi_accounts);

        transfer(ctx, amount)
    }

    pub fn mint_lp_tokens(&self, amount: u64) -> Result<()> {
        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = MintTo {
            mint: self.mint_lp.to_account_info(),
            to: self.user_lp.to_account_info(),
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

        let ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        mint_to(ctx, amount)
    }
}