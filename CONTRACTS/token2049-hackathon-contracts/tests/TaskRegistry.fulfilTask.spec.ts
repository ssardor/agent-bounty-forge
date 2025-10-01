import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, Cell, beginCell } from '@ton/core';
import { TaskRegistry } from '../build/TaskRegistry/TaskRegistry_TaskRegistry';
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

describe('TaskRegistry - Fulfill Task', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let verifier: SandboxContract<TreasuryContract>;
    let requester: SandboxContract<TreasuryContract>;
    let fulfiller: SandboxContract<TreasuryContract>;
    let taskRegistry: SandboxContract<TaskRegistry>;
    let usdMasterAddress: any;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        verifier = await blockchain.treasury('verifier');
        requester = await blockchain.treasury('requester');
        fulfiller = await blockchain.treasury('fulfiller');

        // Use a fixed address for USDJettonMaster
        usdMasterAddress = deployer.address; // Simple approach for testing

        taskRegistry = blockchain.openContract(
            await TaskRegistry.fromInit(verifier.address, usdMasterAddress)
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

        // Create a task for testing
        await createTaskViaJetton(taskRegistry, blockchain, requester, toNano('100'));
    });

    it('should allow task fulfillment', async () => {
        const fulfillmentData = 'Task completed successfully';
        const result = await taskRegistry.send(
            fulfiller.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'FulfilTask',
                taskId: 0n,
                fulfillmentData: fulfillmentData,
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: fulfiller.address,
            to: taskRegistry.address,
            success: true,
        });

        // Check task status
        const task = await taskRegistry.getGetTask(0n);
        expect(task?.status).toBe(1n); // TASK_STATUS_FULFILLED
        expect(task?.fulfiller?.toString()).toBe(fulfiller.address.toString());
        expect(task?.fulfillmentData).toBe(fulfillmentData);
    });

    it('should reject fulfillment with empty data', async () => {
        const result = await taskRegistry.send(
            fulfiller.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'FulfilTask',
                taskId: 0n,
                fulfillmentData: '',
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: fulfiller.address,
            to: taskRegistry.address,
            success: false,
        });
    });

    it('should reject fulfillment of non-existent task', async () => {
        const result = await taskRegistry.send(
            fulfiller.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'FulfilTask',
                taskId: 999n,
                fulfillmentData: 'Some data',
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: fulfiller.address,
            to: taskRegistry.address,
            success: false,
        });
    });

    it('should prevent fulfillment of cancelled tasks', async () => {
        // Cancel the task first
        await taskRegistry.send(
            requester.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'CancelTask',
                taskId: 0n,
            }
        );

        // Try to fulfill cancelled task
        const result = await taskRegistry.send(
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

        expect(result.transactions).toHaveTransaction({
            from: fulfiller.address,
            to: taskRegistry.address,
            success: false,
        });
    });

    it('should prevent fulfillment of already fulfilled tasks', async () => {
        // Fulfill the task first
        await taskRegistry.send(
            fulfiller.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'FulfilTask',
                taskId: 0n,
                fulfillmentData: 'First fulfillment',
            }
        );

        // Try to fulfill again
        const result = await taskRegistry.send(
            fulfiller.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'FulfilTask',
                taskId: 0n,
                fulfillmentData: 'Second fulfillment',
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: fulfiller.address,
            to: taskRegistry.address,
            success: false,
        });
    });

    it('should update fulfillment timestamp', async () => {
        const fulfillmentData = 'Task completed successfully';
        
        await taskRegistry.send(
            fulfiller.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'FulfilTask',
                taskId: 0n,
                fulfillmentData: fulfillmentData,
            }
        );

        const task = await taskRegistry.getGetTask(0n);
        expect(task?.fulfilledAt).toBeGreaterThan(0n);
        expect(task?.fulfilledAt).toBeGreaterThanOrEqual(task?.createdAt || 0n);
    });

    it('should allow different users to fulfill different tasks', async () => {
        // Create another task
        await createTaskViaJetton(taskRegistry, blockchain, requester, toNano('100'));

        const fulfiller2 = await blockchain.treasury('fulfiller2');

        // Fulfill first task
        await taskRegistry.send(
            fulfiller.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'FulfilTask',
                taskId: 0n,
                fulfillmentData: 'First task completed',
            }
        );

        // Fulfill second task with different user
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

        const task1 = await taskRegistry.getGetTask(0n);
        const task2 = await taskRegistry.getGetTask(1n);

        expect(task1?.fulfiller?.toString()).toBe(fulfiller.address.toString());
        expect(task2?.fulfiller?.toString()).toBe(fulfiller2.address.toString());
        expect(task1?.status).toBe(1n); // TASK_STATUS_FULFILLED
        expect(task2?.status).toBe(1n); // TASK_STATUS_FULFILLED
    });
});
