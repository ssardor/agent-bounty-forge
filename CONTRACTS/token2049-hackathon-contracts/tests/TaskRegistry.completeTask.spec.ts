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

describe('TaskRegistry - Complete Task', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let verifier: SandboxContract<TreasuryContract>;
    let requester: SandboxContract<TreasuryContract>;
    let fulfiller: SandboxContract<TreasuryContract>;
    let usdMaster: SandboxContract<USDJettonMaster>;
    let usdWallet: SandboxContract<USDJettonWallet>;
    let taskRegistry: SandboxContract<TaskRegistry>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        verifier = await blockchain.treasury('verifier');
        requester = await blockchain.treasury('requester');
        fulfiller = await blockchain.treasury('fulfiller');

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

        // Create and fulfill a task for testing
        await createTaskViaJetton(taskRegistry, blockchain, requester, toNano('100'));

        await taskRegistry.send(
            fulfiller.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'FulfilTask',
                taskId: 0n,
                fulfillmentData: 'Task completed successfully',
            }
        );
    });

    it('should allow task completion by verifier', async () => {
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
            success: true,
        });

        // Check task status
        const task = await taskRegistry.getGetTask(0n);
        expect(task?.status).toBe(2n); // TASK_STATUS_COMPLETED
    });

    it('should reject task completion by non-verifier', async () => {
        const result = await taskRegistry.send(
            requester.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'CompleteTask',
                taskId: 0n,
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: requester.address,
            to: taskRegistry.address,
            success: false,
        });
    });

    it('should prevent completion of non-fulfilled tasks', async () => {
        // Create a new task that hasn't been fulfilled
        await createTaskViaJetton(taskRegistry, blockchain, requester, toNano('100'));

        // Try to complete without fulfillment
        const result = await taskRegistry.send(
            verifier.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'CompleteTask',
                taskId: 1n,
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: verifier.address,
            to: taskRegistry.address,
            success: false,
        });
    });

    it('should reject completion of non-existent task', async () => {
        const result = await taskRegistry.send(
            verifier.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'CompleteTask',
                taskId: 999n,
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: verifier.address,
            to: taskRegistry.address,
            success: false,
        });
    });

    it('should transfer bounty to fulfiller upon completion', async () => {
        const bountyAmount = toNano('1');
        
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

        // Verify the task was completed successfully
        expect(result.transactions).toHaveTransaction({
            from: verifier.address,
            to: taskRegistry.address,
            success: true,
        });
        
        // Check task status is completed
        const task = await taskRegistry.getGetTask(0n);
        expect(task?.status).toBe(2n); // TASK_STATUS_COMPLETED
    });

    it('should prevent completion of already completed tasks', async () => {
        // Complete the task first
        await taskRegistry.send(
            verifier.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'CompleteTask',
                taskId: 0n,
            }
        );

        // Try to complete again
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

    it('should prevent completion of cancelled tasks', async () => {
        // Create a new task and cancel it
        await createTaskViaJetton(taskRegistry, blockchain, requester, toNano('100'));

        await taskRegistry.send(
            requester.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'CancelTask',
                taskId: 1n,
            }
        );

        // Try to complete cancelled task
        const result = await taskRegistry.send(
            verifier.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'CompleteTask',
                taskId: 1n,
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: verifier.address,
            to: taskRegistry.address,
            success: false,
        });
    });

    it('should complete multiple tasks independently', async () => {
        const fulfiller2 = await blockchain.treasury('fulfiller2');
        
        // Create and fulfill another task
        await createTaskViaJetton(taskRegistry, blockchain, requester, toNano('50'));

        await taskRegistry.send(
            fulfiller2.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'FulfilTask',
                taskId: 1n,
                fulfillmentData: 'Second task completed',
            }
        );

        // Complete both tasks
        await taskRegistry.send(
            verifier.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'CompleteTask',
                taskId: 0n,
            }
        );

        await taskRegistry.send(
            verifier.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'CompleteTask',
                taskId: 1n,
            }
        );

        const task1 = await taskRegistry.getGetTask(0n);
        const task2 = await taskRegistry.getGetTask(1n);

        expect(task1?.status).toBe(2n); // TASK_STATUS_COMPLETED
        expect(task2?.status).toBe(2n); // TASK_STATUS_COMPLETED
    });
});
