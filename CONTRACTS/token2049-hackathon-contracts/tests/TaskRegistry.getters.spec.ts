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

describe('TaskRegistry - Getters', () => {
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

    it('should return correct verifier address', async () => {
        const verifierAddress = await taskRegistry.getGetVerifier();
        expect(verifierAddress.toString()).toBe(verifier.address.toString());
    });

    it('should return correct total tasks count', async () => {
        // Initially should be 0
        let totalTasks = await taskRegistry.getGetTotalTasks();
        expect(totalTasks).toBe(0n);

        // Create a task
        await createTaskViaJetton(taskRegistry, blockchain, requester, toNano('100'));

        // Should be 1 now
        totalTasks = await taskRegistry.getGetTotalTasks();
        expect(totalTasks).toBe(1n);

        // Create another task
        await createTaskViaJetton(taskRegistry, blockchain, requester, toNano('100'));

        // Should be 2 now
        totalTasks = await taskRegistry.getGetTotalTasks();
        expect(totalTasks).toBe(2n);
    });

    it('should return task details correctly', async () => {
        const usdAmount = toNano('100');

        // Create a task
        await createTaskViaJetton(taskRegistry, blockchain, requester, usdAmount);

        const task = await taskRegistry.getGetTask(0n);
        expect(task).toBeDefined();
        
        if (task) {
            expect(task.requester.toString()).toBe(requester.address.toString());
            expect(task.description).toBe("Default Task"); // Contract uses default value
            expect(task.bounty).toBe(usdAmount); // Should be USD amount
            expect(task.completionConditions).toBe("Complete the task"); // Contract uses default value
            expect(task.status).toBe(0n); // TASK_STATUS_ACTIVE
            expect(task.fulfiller).toBeNull();
            expect(task.fulfillmentData).toBe('');
            expect(task.createdAt).toBeGreaterThan(0n);
            expect(task.fulfilledAt).toBe(0n);
        }
    });

    it('should return null for non-existent tasks', async () => {
        const task = await taskRegistry.getGetTask(999n);
        expect(task).toBeNull();
    });

    it('should return correct contract balance', async () => {
        const initialBalance = await taskRegistry.getGetBalance();
        expect(initialBalance).toBeGreaterThanOrEqual(0n);

        // Create a task to add more funds
        await createTaskViaJetton(taskRegistry, blockchain, requester, toNano('100'));

        const newBalance = await taskRegistry.getGetBalance();
        expect(newBalance).toBeGreaterThan(initialBalance);
    });

    it('should handle task existence checks correctly', async () => {
        // Check non-existent task
        let exists = await taskRegistry.getTaskExists(-1n);
        expect(exists).toBe(false);

        exists = await taskRegistry.getTaskExists(0n);
        expect(exists).toBe(false);

        exists = await taskRegistry.getTaskExists(999n);
        expect(exists).toBe(false);

        // Create a task
        await createTaskViaJetton(taskRegistry, blockchain, requester, toNano('100'));

        // Check existing task
        exists = await taskRegistry.getTaskExists(0n);
        expect(exists).toBe(true);

        // Check non-existent task with higher ID
        exists = await taskRegistry.getTaskExists(1n);
        expect(exists).toBe(false);

        exists = await taskRegistry.getTaskExists(999n);
        expect(exists).toBe(false);
    });

    it('should handle multiple task existence checks', async () => {
        // Create 3 tasks
        for (let i = 0; i < 3; i++) {
            await createTaskViaJetton(taskRegistry, blockchain, requester, toNano('100'));
        }

        // Check all created tasks exist
        for (let i = 0; i < 3; i++) {
            const exists = await taskRegistry.getTaskExists(BigInt(i));
            expect(exists).toBe(true);
        }

        // Check non-existent tasks
        let exists = await taskRegistry.getTaskExists(3n);
        expect(exists).toBe(false);

        exists = await taskRegistry.getTaskExists(999n);
        expect(exists).toBe(false);
    });

    it('should return updated task details after state changes', async () => {
        const fulfiller = await blockchain.treasury('fulfiller');
        
        // Create a task
        await createTaskViaJetton(taskRegistry, blockchain, requester, toNano('100'));

        // Check initial state
        let task = await taskRegistry.getGetTask(0n);
        expect(task?.status).toBe(0n); // TASK_STATUS_ACTIVE
        expect(task?.fulfiller).toBeNull();

        // Fulfill the task
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

        // Check updated state
        task = await taskRegistry.getGetTask(0n);
        expect(task?.status).toBe(1n); // TASK_STATUS_FULFILLED
        expect(task?.fulfiller?.toString()).toBe(fulfiller.address.toString());
        expect(task?.fulfillmentData).toBe('Task completed successfully');
        expect(task?.fulfilledAt).toBeGreaterThan(0n);

        // Complete the task
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

        // Check final state
        task = await taskRegistry.getGetTask(0n);
        expect(task?.status).toBe(2n); // TASK_STATUS_COMPLETED
    });

    it('should maintain task data integrity across multiple operations', async () => {
        const fulfiller = await blockchain.treasury('fulfiller');
        const taskDescription = 'Complex test task';
        const bountyAmount = toNano('2.5');
        const usdAmount = toNano('250');
        const completionConditions = 'Complete all requirements';
        const fulfillmentData = 'All requirements completed successfully';

        // Create task
        await createTaskViaJetton(taskRegistry, blockchain, requester, usdAmount);

        // Fulfill task
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

        // Complete task
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

        // Verify all data is maintained correctly
        const task = await taskRegistry.getGetTask(0n);
        expect(task?.requester.toString()).toBe(requester.address.toString());
        expect(task?.description).toBe("Default Task"); // Contract uses default value
        expect(task?.bounty).toBe(usdAmount); // Should be USD amount
        expect(task?.completionConditions).toBe("Complete the task"); // Contract uses default value
        expect(task?.status).toBe(2n); // TASK_STATUS_COMPLETED
        expect(task?.fulfiller?.toString()).toBe(fulfiller.address.toString());
        expect(task?.fulfillmentData).toBe(fulfillmentData);
        expect(task?.createdAt).toBeGreaterThan(0n);
        expect(task?.fulfilledAt).toBeGreaterThan(0n);
        expect(task?.fulfilledAt).toBeGreaterThanOrEqual(task?.createdAt || 0n);
    });
});
