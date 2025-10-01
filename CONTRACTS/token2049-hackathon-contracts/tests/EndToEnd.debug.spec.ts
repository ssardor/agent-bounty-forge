import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, Cell, beginCell } from '@ton/core';
import { TaskRegistry } from '../build/TaskRegistry/TaskRegistry_TaskRegistry';
import { USDJettonMaster } from '../build/USDToken/USDToken_USDJettonMaster';
import { USDJettonWallet } from '../build/USDToken/USDToken_USDJettonWallet';
import '@ton/test-utils';

describe('End-to-End Jetton Flow Debug', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let requester: SandboxContract<TreasuryContract>;
    let usdMaster: SandboxContract<USDJettonMaster>;
    let taskRegistry: SandboxContract<TaskRegistry>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        requester = await blockchain.treasury('requester');
        
        // Deploy USD master
        const content = beginCell().endCell();
        usdMaster = blockchain.openContract(await USDJettonMaster.fromInit(deployer.address, content));
        await usdMaster.send(
            deployer.getSender(),
            { value: toNano('0.5') },
            { $$type: 'Deploy', queryId: 0n }
        );

        // Deploy TaskRegistry
        taskRegistry = blockchain.openContract(await TaskRegistry.fromInit(deployer.address, usdMaster.address));
        await taskRegistry.send(
            deployer.getSender(),
            { value: toNano('0.5') },
            { $$type: 'Deploy', queryId: 0n }
        );
    });

    it('should trace the complete jetton transfer flow', async () => {
        console.log('=== SETUP ===');
        console.log('TaskRegistry address:', taskRegistry.address.toString());
        console.log('USD Master address:', usdMaster.address.toString());
        
        // Get TaskRegistry's USD wallet address
        const taskRegistryUsdWalletAddress = await taskRegistry.getGetUsdWallet();
        console.log('TaskRegistry USD wallet address:', taskRegistryUsdWalletAddress.toString());
        
        // Step 1: Pre-deploy TaskRegistry's USD wallet
        console.log('\n=== STEP 1: Deploy TaskRegistry USD Wallet ===');
        const deployResult = await usdMaster.send(
            deployer.getSender(),
            { value: toNano('0.1') },
            { 
                $$type: 'JettonMint', 
                query_id: 0n, 
                amount: toNano('1'),
                to: taskRegistry.address 
            }
        );
        console.log('Deploy transactions:', deployResult.transactions.length);
        
        // Check if USD wallet is deployed
        const taskRegistryUsdWallet = blockchain.openContract(USDJettonWallet.fromAddress(taskRegistryUsdWalletAddress));
        try {
            const walletData = await taskRegistryUsdWallet.getGetWalletData();
            console.log('TaskRegistry USD wallet deployed successfully');
            console.log('  - Owner:', walletData.owner.toString());
            console.log('  - Balance:', walletData.balance.toString());
            console.log('  - Jetton Master:', walletData.jetton_master.toString());
        } catch (error) {
            console.log('TaskRegistry USD wallet not deployed yet');
        }
        
        // Step 2: Mint tokens to requester
        console.log('\n=== STEP 2: Mint Tokens to Requester ===');
        await usdMaster.send(
            deployer.getSender(),
            { value: toNano('0.1') },
            { 
                $$type: 'JettonMint', 
                query_id: 0n, 
                amount: toNano('500'),
                to: requester.address 
            }
        );
        
        const requesterUsdWalletAddress = await usdMaster.getGetWalletAddress(requester.address);
        const requesterUsdWallet = blockchain.openContract(USDJettonWallet.fromAddress(requesterUsdWalletAddress));
        const requesterWalletData = await requesterUsdWallet.getGetWalletData();
        console.log('Requester USD wallet address:', requesterUsdWalletAddress.toString());
        console.log('Requester USD wallet balance:', requesterWalletData.balance.toString());
        
        // Step 3: Transfer tokens from requester to TaskRegistry
        console.log('\n=== STEP 3: Transfer Tokens ===');
        console.log('Transferring from:', requesterUsdWalletAddress.toString());
        console.log('Transferring to TaskRegistry contract:', taskRegistry.address.toString());
        
        const transferResult = await requesterUsdWallet.send(
            requester.getSender(),
            {
                value: toNano('0.2'),
            },
            {
                $$type: 'JettonTransfer',
                query_id: 0n,
                amount: toNano('100'),
                destination: taskRegistry.address,  // Send to TaskRegistry contract, not its USD wallet
                response_destination: requester.address,
                custom_payload: null,
                forward_ton_amount: toNano('0.1'),
                forward_payload: beginCell()
                    .storeUint(0, 32)
                    .endCell().beginParse()
            }
        );
        
        console.log('Transfer transactions:', transferResult.transactions.length);
        transferResult.transactions.forEach((tx, i) => {
            console.log(`  Transaction ${i}: account=${tx.address}, lt=${tx.lt}`);
        });
        
        // Step 4: Check final state
        console.log('\n=== STEP 4: Final State ===');
        const finalTaskCount = await taskRegistry.getGetTotalTasks();
        console.log('Final task count:', finalTaskCount.toString());
        
        const finalTaskRegistryUsdWalletData = await taskRegistryUsdWallet.getGetWalletData();
        console.log('TaskRegistry USD wallet final balance:', finalTaskRegistryUsdWalletData.balance.toString());
        
        expect(finalTaskCount).toBe(1n);
    });
});
