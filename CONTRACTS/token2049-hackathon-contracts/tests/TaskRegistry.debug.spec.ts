import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, beginCell, Address } from '@ton/core';
import { TaskRegistry } from '../build/TaskRegistry/TaskRegistry_TaskRegistry';
import { USDJettonMaster } from '../build/USDToken/USDToken_USDJettonMaster';
import { USDJettonWallet } from '../build/USDToken/USDToken_USDJettonWallet';
import '@ton/test-utils';

describe('TaskRegistry Debug', () => {
    let blockchain: Blockchain;
    let taskRegistry: SandboxContract<TaskRegistry>;
    let deployer: SandboxContract<TreasuryContract>;
    let requester: SandboxContract<TreasuryContract>;
    let usdMaster: SandboxContract<USDJettonMaster>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        requester = await blockchain.treasury('requester');
        
        // Deploy USD master
        const content = beginCell().endCell(); // Empty content
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

        console.log('TaskRegistry deployed at:', taskRegistry.address);
        console.log('USD Master deployed at:', usdMaster.address);
    });

    it('should receive JettonTransferNotification', async () => {
        const initialTasks = await taskRegistry.getGetTotalTasks();
        console.log('Initial tasks:', initialTasks);

        // Get the expected USD wallet address that the contract is looking for
        const expectedUsdWallet = await taskRegistry.getGetUsdWallet();
        console.log('Expected USD wallet address:', expectedUsdWallet);
        console.log('TaskRegistry address:', taskRegistry.address);

        // Send JettonTransferNotification from the expected USD wallet address
        const overrideSender = blockchain.sender(expectedUsdWallet);
        
        const result = await taskRegistry.send(
            overrideSender,
            {
                value: toNano('0.5'),
            },
            {
                $$type: 'JettonTransferNotification',
                query_id: 0n,
                amount: toNano('1000'),
                sender: requester.address,
                forward_payload: beginCell()
                    .storeUint(0, 32) // Custom data flag
                    .endCell().asSlice()
            }
        );

        console.log('Transaction result:', result.transactions.length, 'transactions');
        
        const finalTasks = await taskRegistry.getGetTotalTasks();
        console.log('Final tasks:', finalTasks);
        
        expect(finalTasks).toBe(1n);
    });
});
