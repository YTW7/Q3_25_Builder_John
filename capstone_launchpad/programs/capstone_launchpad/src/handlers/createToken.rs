use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{Transfer, transfer, Mint, Token, TokenAccount, MintTo, mint_to}};
use constant_product_curve::ConstantProduct;

use crate::{errors::AmmError, state::{ConfigPool, ConfigAmm}};

#[derive(Accounts)]
pub struct CreateToken<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    pub mint_new: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"config_amm", config_amm.amm_seed.to_le_bytes().as_ref()],
        bump = config_amm.config_amm_bump,
    )]
    pub config_amm: Account<'info, ConfigAmm>,


    #[account(
        init,
        payer = user,
        associated_token::mint = mint_new,
        associated_token::authority = user,
    )]
    pub user_ata_new: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> CreateToken<'info> {
    pub fn create_token (
        &mut self,
        amount: u64, // Amount of new tokens that the user wants to mint
    ) -> Result<()> {
        require!(amount != 0, AmmError::InvalidAmount);

        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = MintTo {
            mint: self.mint_new.to_account_info(),
            to: self.user_ata_new.to_account_info(),
            authority: self.user_ata_new.to_account_info(),
        };

        let ctx = CpiContext::new(cpi_program, cpi_accounts);

        mint_to(ctx, amount)
    }

}