import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, Cell, beginCell } from '@ton/core';
import { TaskRegistry } from '../build/TaskRegistry/TaskRegistry_TaskRegistry';
import { USDJettonMaster } from '../build/USDToken/USDToken_USDJettonMaster';
import { USDJettonWallet } from '../build/USDToken/USDToken_USDJettonWallet';
import '@ton/test-utils';

describe('Address Debug', () => {
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

        // Deploy TaskRegistry with 2-parameter initialization
        taskRegistry = blockchain.openContract(await TaskRegistry.fromInit(deployer.address, usdMaster.address));
        await taskRegistry.send(
            deployer.getSender(),
            { value: toNano('0.5') },
            { $$type: 'Deploy', queryId: 0n }
        );
    });

    it('should debug addresses', async () => {
        console.log('TaskRegistry address:', taskRegistry.address);
        console.log('USD Master address:', usdMaster.address);
        
        // Calculate USD wallet address for TaskRegistry
        const calculatedTaskRegistryUsdWallet = await usdMaster.getGetWalletAddress(taskRegistry.address);
        console.log('Calculated TaskRegistry USD wallet:', calculatedTaskRegistryUsdWallet);
        
        // Get what the contract thinks the USD wallet should be
        const contractUsdWallet = await taskRegistry.getGetUsdWallet();
        console.log('Contract USD wallet:', contractUsdWallet);
        
        // Get what the contract thinks the USD master is
        const contractUsdMaster = await taskRegistry.getGetUsdMaster();
        console.log('Contract USD master:', contractUsdMaster);
        
        expect(calculatedTaskRegistryUsdWallet.toString()).toBe(contractUsdWallet.toString());
    });
});
