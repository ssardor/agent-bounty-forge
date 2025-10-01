import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, Cell, beginCell } from '@ton/core';
import { TaskRegistry } from '../build/TaskRegistry/TaskRegistry_TaskRegistry';
import { USDJettonMaster } from '../build/USDToken/USDToken_USDJettonMaster';
import { USDJettonWallet } from '../build/USDToken/USDToken_USDJettonWallet';
import '@ton/test-utils';

// Helper function to create a task via JettonTransferNotification
async function createTaskViaJetton(
    taskRegistry: SandboxContract<TaskRegistry>,
    blockchain: Blockchain,
    sender: SandboxContract<TreasuryContract>,
    amount: bigint
) {
    const usdWalletAddress = await taskRegistry.getGetUsdWallet();
    
    const taskData = beginCell()
        .storeUint(0, 32) // Simple payload since contract doesn't parse it yet
        .endCell();

    return await taskRegistry.send(
        blockchain.sender(usdWalletAddress),
        { value: toNano('0.1') },
        {
            $$type: 'JettonTransferNotification',
            query_id: 0n,
            amount: amount,
            sender: sender.address,
            forward_payload: taskData.asSlice(),
        }
    );
}

describe('TaskRegistry - Verifier Management', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let verifier: SandboxContract<TreasuryContract>;
    let requester: SandboxContract<TreasuryContract>;
    let usdMaster: SandboxContract<USDJettonMaster>;
    let usdWallet: SandboxContract<USDJettonWallet>;
    let taskRegistry: SandboxContract<TaskRegistry>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        verifier = await blockchain.treasury('verifier');
        requester = await blockchain.treasury('requester');

        // Deploy USD Token Master
        const content = beginCell()
            .storeUint(0, 8) // off-chain content flag
            .storeStringTail('{"name":"USD","symbol":"USD","decimals":"6"}')
            .endCell();
        
        usdMaster = blockchain.openContract(
            await USDJettonMaster.fromInit(deployer.address, content)
        );

        // Deploy USD Master
        const deployMasterResult = await usdMaster.send(
            deployer.getSender(),
            { value: toNano('0.1') },
            { $$type: 'Deploy', queryId: 0n }
        );

        // Get USD Wallet address for deployer
        const usdWalletAddress = await usdMaster.getGetWalletAddress(deployer.address);
        usdWallet = blockchain.openContract(USDJettonWallet.fromAddress(usdWalletAddress));

        // Mint some USD tokens
        await usdMaster.send(
            deployer.getSender(),
            { value: toNano('0.1') },
            { 
                $$type: 'JettonMint', 
                query_id: 0n, 
                amount: toNano('1000'), 
                to: deployer.address 
            }
        );

        taskRegistry = blockchain.openContract(
            await TaskRegistry.fromInit(verifier.address, usdMaster.address)
        );

        const deployResult = await taskRegistry.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: taskRegistry.address,
            deploy: true,
            success: true,
        });
    });

    it('should allow verifier update', async () => {
        const newVerifier = await blockchain.treasury('newVerifier');

        const result = await taskRegistry.send(
            verifier.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'UpdateVerifier',
                newVerifier: newVerifier.address,
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: verifier.address,
            to: taskRegistry.address,
            success: true,
        });

        // Check new verifier
        const updatedVerifier = await taskRegistry.getGetVerifier();
        expect(updatedVerifier.toString()).toBe(newVerifier.address.toString());
    });

    it('should reject verifier update by non-verifier', async () => {
        const newVerifier = await blockchain.treasury('newVerifier');

        const result = await taskRegistry.send(
            requester.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'UpdateVerifier',
                newVerifier: newVerifier.address,
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: requester.address,
            to: taskRegistry.address,
            success: false,
        });
    });

    it('should maintain verifier permissions after update', async () => {
        const newVerifier = await blockchain.treasury('newVerifier');

        // Update verifier
        await taskRegistry.send(
            verifier.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'UpdateVerifier',
                newVerifier: newVerifier.address,
            }
        );

        // Old verifier should no longer have permissions
        const result1 = await taskRegistry.send(
            verifier.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'UpdateVerifier',
                newVerifier: verifier.address,
            }
        );

        expect(result1.transactions).toHaveTransaction({
            from: verifier.address,
            to: taskRegistry.address,
            success: false,
        });

        // New verifier should have permissions
        const anotherNewVerifier = await blockchain.treasury('anotherNewVerifier');
        const result2 = await taskRegistry.send(
            newVerifier.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'UpdateVerifier',
                newVerifier: anotherNewVerifier.address,
            }
        );

        expect(result2.transactions).toHaveTransaction({
            from: newVerifier.address,
            to: taskRegistry.address,
            success: true,
        });
    });

    it('should allow new verifier to complete tasks', async () => {
        const newVerifier = await blockchain.treasury('newVerifier');
        const fulfiller = await blockchain.treasury('fulfiller');

        // Create and fulfill a task
        await createTaskViaJetton(taskRegistry, blockchain, requester, toNano('100'));

        await taskRegistry.send(
            fulfiller.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'FulfilTask',
                taskId: 0n,
                fulfillmentData: 'Task completed',
            }
        );

        // Update verifier
        await taskRegistry.send(
            verifier.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'UpdateVerifier',
                newVerifier: newVerifier.address,
            }
        );

        // New verifier should be able to complete tasks
        const result = await taskRegistry.send(
            newVerifier.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'CompleteTask',
                taskId: 0n,
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: newVerifier.address,
            to: taskRegistry.address,
            success: true,
        });
    });

    it('should prevent old verifier from completing tasks after update', async () => {
        const newVerifier = await blockchain.treasury('newVerifier');
        const fulfiller = await blockchain.treasury('fulfiller');

        // Create and fulfill a task
        await createTaskViaJetton(taskRegistry, blockchain, requester, toNano('100'));

        await taskRegistry.send(
            fulfiller.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'FulfilTask',
                taskId: 0n,
                fulfillmentData: 'Task completed',
            }
        );

        // Update verifier
        await taskRegistry.send(
            verifier.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'UpdateVerifier',
                newVerifier: newVerifier.address,
            }
        );

        // Old verifier should NOT be able to complete tasks
        const result = await taskRegistry.send(
            verifier.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'CompleteTask',
                taskId: 0n,
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: verifier.address,
            to: taskRegistry.address,
            success: false,
        });
    });

    it('should allow verifier to update to same address', async () => {
        const result = await taskRegistry.send(
            verifier.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'UpdateVerifier',
                newVerifier: verifier.address,
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: verifier.address,
            to: taskRegistry.address,
            success: true,
        });

        // Verifier should remain the same
        const currentVerifier = await taskRegistry.getGetVerifier();
        expect(currentVerifier.toString()).toBe(verifier.address.toString());
    });
});
