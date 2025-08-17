#![allow(unexpected_cfgs)]
#![allow(deprecated)]

use anchor_lang::{prelude::*, system_program::{Transfer, transfer}};
pub mod errors;
use errors::*;

declare_id!("iYFvHyuS9DVNBhRYBz8So192RMHvk45ztfo9oKAwbWX");

#[program] //progam macro -> entry point of our program
pub mod anchor_vault {
    use super::*;

    //here we add instructions to interact with our vault
    //each ixn will have it's own context
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.initialize(&ctx.bumps)?;

        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        ctx.accounts.deposit(amount)?;

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        ctx.accounts.withdraw(amount)?;

        Ok(())
    }


}

#[derive(Accounts)] //derive(Accounts) macro -> definition of initialize struct
pub struct Initialize<'info> {
    #[account(   //account constraints for user
        mut
    )]
    pub user: Signer<'info>, //user account required to init our vault

    #[account(    //account constraints for vault_state
        init,
        payer=user, //pays for the rent exemption of the account i.e. will be user who transfers lamports from his account to vault
        seeds = [b"state", user.key().as_ref()],
        bump,
        space = 8 + VaultState::INIT_SPACE, //8 bytes for anchor discriminator + size of vaultState
    )]
    pub vault_state: Account<'info, VaultState>, //vault_state account required to init our vault

    #[account(     //account constraints for vault
        mut,
        seeds = [b"vault", vault_state.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,  //vault account required to init our vault


    pub system_program: Program<'info, System>
}

impl<'info>Initialize<'info>{
    pub fn initialize(&mut self, bumps: &InitializeBumps) -> Result<()> {

        let rent_exempt = Rent::get()?.minimum_balance(self.vault_state.to_account_info().data_len());

        let cpi_program = self.system_program.to_account_info();

        let cpi_accounts = Transfer{
            from: self.user.to_account_info(),
            to: self.vault.to_account_info()
        };

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        transfer(cpi_ctx, rent_exempt)?;

        self.vault_state.vault_bump= bumps.vault;
        self.vault_state.state_bump= bumps.vault_state;

        Ok(())
    }
}


#[derive(Accounts)] //derive(Accounts) macro -> definition of Deposit struct
pub struct Deposit<'info>{

    #[account(
        mut
    )]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", vault_state.key().as_ref()],
        bump = vault_state.vault_bump,

    )]
    pub vault: SystemAccount<'info>,

    #[account(
        seeds = [b"state", user.key().as_ref()],
        bump = vault_state.state_bump,

    )]
    pub vault_state: Account<'info, VaultState>,
    pub system_program: Program<'info, System>
}

impl<'info>Deposit<'info>{
    pub fn deposit(&mut self, amount: u64) -> Result<()>{
        let cpi_program=self.system_program.to_account_info();

        let cpi_accounts=Transfer{
            from: self.user.to_account_info(),
            to: self.vault.to_account_info(),
        };

        let cpi_ctx=CpiContext::new(cpi_program, cpi_accounts);

        transfer(cpi_ctx, amount)?;

        Ok(())
    }
}


#[derive(Accounts)] //derive(Accounts) macro -> definition of Deposit struct
pub struct Withdraw<'info>{

    #[account(
        mut
    )]
    pub user: Signer<'info>,

    #[account(
        seeds=[b"state", user.key().as_ref()],
        bump=vault_state.state_bump,

    )]
    pub vault_state: Account<'info, VaultState>,

    #[account(
        mut,
        seeds=[b"vault", vault_state.key().as_ref()],
        bump=vault_state.vault_bump,
        
    )]
    pub vault: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info>Withdraw<'info>{
    pub fn withdraw(&mut self, amount: u64) -> Result<()>{
        // let cpi_program=self.system_program.to_account_info();

        // let cpi_accounts=Transfer{
        //     from: self.vault.to_account_info(),
        //     to: self.user.to_account_info(),
        // };

        // let cpi_ctx=CpiContext::new(cpi_program, cpi_accounts);

        // transfer(cpi_ctx, amount)?;

        // Ok(())



        // get the rent exempt
        let rent_exempt = Rent::get()?.minimum_balance(self.vault.data_len());

        // get the current balance of vault
        let current_balance = self.vault.lamports();

        // check for the amount is available to withdraw
        // we need the rent exempt to keep the account alive
        // so we will minus the rent exempt from the current balance to get the available balance
        require!(
            amount <= current_balance - rent_exempt,
            VaultError::InsufficientFunds
        );

        // system program to transfer the funds
        let cpi_program = self.system_program.to_account_info();

        // accounts that used in the transfer
        let cpi_accounts = Transfer {
            from: self.vault.to_account_info(),
            to: self.user.to_account_info(),
        };

        let binding = self.vault_state.key();

        let seeds = &[b"vault", binding.as_ref(), &[self.vault_state.vault_bump]];

        // signer seeds to sign the tx
        let signer_seeds = &[&seeds[..]];

        // cpi context for the transfer
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        // transferring the funds
        transfer(cpi_ctx, amount)?;
        Ok(())
    }
}

#[account] //account macro
#[derive(InitSpace)]
pub struct VaultState {
    pub vault_bump: u8,
    pub state_bump: u8,
}

// impl Space for VaultState{
//     const INIT_SPACE: usize = 
//     8 //for anchor discriminator
//      + 
//      1 // vault bump takes
//      +
//      1; //state  bump takes
// }

//---------------------------------------------------------------------------------
//----------------------------------ARCHIVED CODE----------------------------------
//---------------------------------------------------------------------------------

// #[derive(Accounts)]
// pub struct Payment<'info>(
//     #[account(mut)]
//     pub user: Signer<'info>,

//     #[account(
//         mut,
//         seeds = [b"vault", vault_state.key().as_ref()],
//         bump = vaul_state.state_bump;
//     )]
//     pub vault: SystemAccount<'info>,

//     #[account(
//         seeds = [b"vault", user.key().as_ref()],
//         bump = vaul_state.state_bump;
//     )]
//     pub vaul_state: Account<'info, VaultState>,

//     pub system_program: Program<'info, System>
// );




// impl<'info>Payment<'info>{
//     pub fn deposit(&mut self, amount: u64) -> Result<()> {

//         let cpi_program = self.system_program.to_account_info();

//         let cpi_accounts = Transfer{
//             from: self.user.to_account_info(),
//             to: self.vault.to_account_info()
//         };

//         let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

//         transfer(cpi_ctx, amount);

//     }

//     pub fn withdraw(&mut self, amount: u64) -> Result<()> {

//         let cpi_program = self.system_program.to_account_info();

//         let cpi_accounts = Transfer{
//             from: self.vault.to_account_info(),
//             to: self.user.to_account_info()
//         };

//         let seeds=&[
//             b"vault",
//             self.vaul_state.to_account_info().key.as_ref(),
//             &[self.vaul_state.vault_bump],
//         ];

//         let signer_seeds = &[&seeds[..]];

//         let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

//         transfer(cpi_ctx, amount);

//     }
// }


