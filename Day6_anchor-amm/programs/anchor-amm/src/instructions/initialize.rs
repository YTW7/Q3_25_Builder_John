use anchor_lang::prelude::*;
use anchor_spl::

#[instructions[seed]]

#[derive(Accounts)]
pub struct Initialize{
    #[account(mut)]
    pub initializer: Signer<'info>,
    pub mint_x: Account<'info, Mint>,
    pub mint_y: Account<'info, Mint>,

    #[account(
        init,
        payer = initializer,
        seeds = [b"lp", config_key().as_ref()],
        bump,
        mint::decimals = 6,
        mint::authority=config,
    )]
    pub mint_lp: Account<'info, Mint>,

    #[account(
        init,
        payer = initializer,
        seeds = [b"config", seed.to_le_bytes().as_ref()],
        bump,
        space = 8 + Config::INIT_SPACE
    )]
    pub mint_y: Account<'info, Config>,    

    #[account(
        mut,
        associated_token::mint = mint_x,
        associated_token::authority= config
    )]
    pub vault_x: Account<'info, TokenAccount>,

    #[account(
    mut,
    associated_token::mint = mint_y,
    associated_token::authority= config
    )]
    pub vault_y: Account<'info, TokenAccount>,

    #[account(
    mut,
    associated_token::mint = mint_x,
    associated_token::authority= config
    )]
    pub user_x: Account<'info, TokenAccount>,

    #[account(
    mut,
    associated_token::mint = mint_y,
    associated_token::authority= config
    )]
    pub user_y: Account<'info, TokenAccount>,

    #[account(
    init_if_needed,
    payer = user,
    associated_token::mint = mint_lp,
    associated_token::authority= config
    )]
    pub user_lp: Account<'info, TokenAccount>,
}