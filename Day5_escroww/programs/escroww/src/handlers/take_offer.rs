#![allow(unexpected_cfgs)]
#![allow(deprecated)]

use super::shared::transfer_tokens;
use crate::{close_token_account, error::ErrorCode, state::Offer};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},

};

#[derive(Accounts)]
// #[instruction(id: u64)]
pub struct TakeOffer<'info> {

    //used for managing difff atas 
    pub associated_token_program: Program<'info, AssociatedToken>,

    //helps you works with classic token prog or token2022
    pub token_program: Interface<'info, TokenInterface>,

    //used to create ccounst
    pub system_program: Program<'info, System>,

    #[account(
        mut
    )]
    pub taker: Signer<'info>,


    #[account(
        mut
    )]
    pub maker: Signer<'info>,

    #[account(
        mint::token_program = token_program
    )]
    pub token_mint_a: InterfaceAccount <'info, Mint>,

    #[account(
        mint::token_program = token_program
    )]
    pub token_mint_b: InterfaceAccount <'info, Mint>,

    #[account(
        init_if_needed,
        payer = taker,
        associated_token::mint = token_mint_a,
        associated_token::authority = taker,
        associated_token::token_program = token_program //check whetr classic or token2022
    )]
    pub taker_token_account_a: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = token_mint_b,
        associated_token::authority = taker,
        associated_token::token_program = token_program //check whetr classic or token2022
    )]
    pub taker_token_account_b: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = taker,
        associated_token::mint = token_mint_b,
        associated_token::authority = maker,
        associated_token::token_program = token_program //check whetr classic or token2022
    )]
    pub maker_token_account_b: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        close = maker,
        has_one = maker, 
        has_one = token_mint_b,
        seeds = [b"offer", offer.id.to_le_bytes().as_ref()],
        bump = offer.bump
    )]
    pub offer: Account<'info, Offer>,

    #[account(
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = offer,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

}

pub fn take_offer(context: Context<TakeOffer>) -> Result<()> {

    let offer_account_seeds = &[
        b"offer",
        &context.accounts.offer.id.to_le_bytes()[..],
        &[context.accounts.offer.bump],
    ];

    let signer_seeds = Some(&offer_account_seeds[..]);

    //withdraw the offered tokens from the vault to the taker
    transfer_tokens(
        &context.accounts.vault,
        &context.accounts.taker_token_account_a,
        &context.accounts.vault.amount,
        &context.accounts.token_mint_a,
        &context.accounts.offer.to_account_info(),
        &context.accounts.token_program,
        signer_seeds,

    ).map_err(|_| ErrorCode::FailedVaultWithdrawal)?;

    //close the vault and return the rent to the maker
    close_token_account(
        &context.accounts.vault,
        &context.accounts.taker.to_account_info(),
        &context.accounts.offer.to_account_info(),
        &context.accounts.token_program,
        signer_seeds,

    ).map_err(|_| ErrorCode::FailedVaultClosure)?;

    //send the wanted tokens from the taker to the maker
    transfer_tokens(
        &context.accounts.taker_token_account_b,
        &context.accounts.maker_token_account_b,
        &context.accounts.offer.token_b_wanted_amount,
        &context.accounts.token_mint_b,
        &context.accounts.taker.to_account_info(),
        &context.accounts.token_program,
        None,

    ).map_err(|_| ErrorCode::InsufficientTakerBalance)?;

    Ok(())
}