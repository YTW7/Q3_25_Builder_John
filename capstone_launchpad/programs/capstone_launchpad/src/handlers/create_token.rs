use anchor_lang::prelude::*;
use anchor_spl::{token::{ Mint, Token}};
use anchor_spl::{
    metadata::{Metadata}
};
use mpl_token_metadata::accounts::{ Metadata as MetadataAccount };

#[derive(Accounts)]
pub struct CreateMint<'info> {
    #[account(
        mut
    )]
    pub admin: Signer<'info>,
    
    // The PDA is both the address of the mint account and the mint authority
    #[account(
        init,
        payer = admin,
        mint::decimals = 9,
        mint::authority = admin,
    )]
    pub new_token_mint: Account<'info, Mint>,
    
    ///CHECK: Using "address" constraint to validate metadata account address
    #[account(
        mut,
        address=MetadataAccount::find_pda(&new_token_mint.key()).0,
    )]
    pub metadata_account: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
// #[derive(Accounts)]
// pub struct CreateToken<'info> {
//     #[account(mut)]
//     pub user: Signer<'info>,

//     pub mint_new: Account<'info, Mint>,

//     #[account(
//         mut,
//         seeds = [b"config_amm", config_amm.amm_seed.to_le_bytes().as_ref()],
//         bump = config_amm.config_amm_bump,
//     )]
//     pub config_amm: Account<'info, ConfigAmm>,


//     #[account(
//         init,
//         payer = user,
//         associated_token::mint = mint_new,
//         associated_token::authority = user,
//     )]
//     pub user_ata_new: Account<'info, TokenAccount>,
    
//     pub token_program: Program<'info, Token>,
//     pub system_program: Program<'info, System>,
//     pub associated_token_program: Program<'info, AssociatedToken>,
// }

// impl<'info> CreateToken<'info> {
//     pub fn create_token (
//         &mut self,
//         amount: u64, // Amount of new tokens that the user wants to mint
//     ) -> Result<()> {
//         require!(amount != 0, AmmError::InvalidAmount);

//         let cpi_program = self.token_program.to_account_info();

//         let cpi_accounts = MintTo {
//             mint: self.mint_new.to_account_info(),
//             to: self.user_ata_new.to_account_info(),
//             authority: self.user_ata_new.to_account_info(),
//         };

//         let ctx = CpiContext::new(cpi_program, cpi_accounts);

//         mint_to(ctx, amount)
//     }

// }