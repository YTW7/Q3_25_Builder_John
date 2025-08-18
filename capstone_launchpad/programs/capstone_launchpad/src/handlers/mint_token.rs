use anchor_lang::prelude::*;
use anchor_spl::{token::{ Mint, Token, TokenAccount}};
use anchor_spl::{associated_token::AssociatedToken};


#[derive(Accounts)]
pub struct MintToken<'info> {
    #[account(
        mut
    )]
    pub admin: Signer<'info>,
    
    // The PDA is both the address of the mint account and the mint authority
    #[account(
        mut,
        mint::decimals = 9,
        mint::authority = admin,
    )]
    pub new_token_mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = admin,
        associated_token::mint = new_token_mint,
        associated_token::authority = admin,
    )]
    pub user_ata_new: Account<'info, TokenAccount>,
    
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}
