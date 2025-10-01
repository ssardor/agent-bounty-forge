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

describe('TaskRegistry - CancelTask', () => {
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
    });

    it('should allow task cancellation by requester', async () => {
        // Create a task first
        await createTaskViaJetton(taskRegistry, blockchain, requester, toNano('100'));

        // Cancel the task
        const result = await taskRegistry.send(
            requester.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'CancelTask',
                taskId: 0n,
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: requester.address,
            to: taskRegistry.address,
            success: true,
        });

        // Check task status
        const task = await taskRegistry.getGetTask(0n);
        expect(task?.status).toBe(3n); // TASK_STATUS_CANCELLED
    });

    it('should reject task cancellation by non-requester', async () => {
        // Create a task first
        await createTaskViaJetton(taskRegistry, blockchain, requester, toNano('100'));

        // Try to cancel by different user
        const result = await taskRegistry.send(
            fulfiller.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'CancelTask',
                taskId: 0n,
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: fulfiller.address,
            to: taskRegistry.address,
            success: false,
        });
    });

    it('should reject cancellation of non-existent task', async () => {
        const result = await taskRegistry.send(
            requester.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'CancelTask',
                taskId: 999n,
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: requester.address,
            to: taskRegistry.address,
            success: false,
        });
    });

    it('should reject cancellation of already cancelled task', async () => {
        // Create a task first
        await createTaskViaJetton(taskRegistry, blockchain, requester, toNano('100'));

        // Cancel the task
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

        // Try to cancel again
        const result = await taskRegistry.send(
            requester.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'CancelTask',
                taskId: 0n,
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: requester.address,
            to: taskRegistry.address,
            success: false,
        });
    });

    it('should refund bounty when task is cancelled', async () => {
        const bountyAmount = toNano('1');
        
        // Create a task first
        await createTaskViaJetton(taskRegistry, blockchain, requester, toNano('100'));

        const requesterBalanceBefore = await requester.getBalance();

        // Cancel the task
        const result = await taskRegistry.send(
            requester.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'CancelTask',
                taskId: 0n,
            }
        );

        // Verify the task was cancelled successfully
        expect(result.transactions).toHaveTransaction({
            from: requester.address,
            to: taskRegistry.address,
            success: true,
        });
        
        // Check task status is cancelled
        const task = await taskRegistry.getGetTask(0n);
        expect(task?.status).toBe(3n); // TASK_STATUS_CANCELLED
    });
});
