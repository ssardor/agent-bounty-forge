import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, Cell, beginCell } from '@ton/core';
import { TaskRegistry } from '../build/TaskRegistry/TaskRegistry_TaskRegistry';
import { USDJettonMaster } from '../build/USDToken/USDToken_USDJettonMaster';
import { USDJettonWallet } from '../build/USDToken/USDToken_USDJettonWallet';
import '@ton/test-utils';

describe('USD Wallet Owner Debug', () => {
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

    it('should check USD wallet owner', async () => {
        console.log('TaskRegistry address:', taskRegistry.address);
        console.log('USD Master address:', usdMaster.address);
        
        // Get TaskRegistry's USD wallet address
        const taskRegistryUsdWalletAddress = await taskRegistry.getGetUsdWallet();
        console.log('TaskRegistry USD wallet address:', taskRegistryUsdWalletAddress);
        
        // First, trigger the deployment of the USD wallet by minting tokens to TaskRegistry
        await usdMaster.send(
            deployer.getSender(),
            { value: toNano('0.1') },
            { 
                $$type: 'JettonMint', 
                query_id: 0n, 
                amount: toNano('100'),
                to: taskRegistry.address 
            }
        );
        
        // Now check the USD wallet
        const taskRegistryUsdWallet = blockchain.openContract(USDJettonWallet.fromAddress(taskRegistryUsdWalletAddress));
        
        try {
            const walletData = await taskRegistryUsdWallet.getGetWalletData();
            console.log('USD wallet owner:', walletData.owner);
            console.log('USD wallet balance:', walletData.balance);
            console.log('Is owner TaskRegistry?', walletData.owner.toString() === taskRegistry.address.toString());
        } catch (error) {
            console.log('Error getting wallet data:', error);
        }
    });
});
