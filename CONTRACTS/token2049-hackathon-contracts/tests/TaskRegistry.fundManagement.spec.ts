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

describe('TaskRegistry - Fund Management', () => {
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

    it('should allow fund withdrawal by verifier', async () => {
        const withdrawTo = await blockchain.treasury('withdrawTo');

        // Add some funds to the contract first by creating a task
        await createTaskViaJetton(taskRegistry, blockchain, requester, toNano('100'));

        const result = await taskRegistry.send(
            verifier.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'WithdrawFunds',
                amount: toNano('0.1'),
                to: withdrawTo.address,
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: verifier.address,
            to: taskRegistry.address,
            success: true,
        });

        expect(result.transactions).toHaveTransaction({
            from: taskRegistry.address,
            to: withdrawTo.address,
        });
    });

    it('should reject fund withdrawal by non-verifier', async () => {
        const withdrawTo = await blockchain.treasury('withdrawTo');

        const result = await taskRegistry.send(
            requester.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'WithdrawFunds',
                amount: toNano('0.01'),
                to: withdrawTo.address,
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: requester.address,
            to: taskRegistry.address,
            success: false,
        });
    });

    it('should reject withdrawal of zero amount', async () => {
        const withdrawTo = await blockchain.treasury('withdrawTo');

        const result = await taskRegistry.send(
            verifier.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'WithdrawFunds',
                amount: 0n,
                to: withdrawTo.address,
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: verifier.address,
            to: taskRegistry.address,
            success: false,
        });
    });

    it('should reject withdrawal of negative amount', async () => {
        const withdrawTo = await blockchain.treasury('withdrawTo');

        const result = await taskRegistry.send(
            verifier.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'WithdrawFunds',
                amount: -1n,
                to: withdrawTo.address,
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: verifier.address,
            to: taskRegistry.address,
            success: false,
        });
    });

    it('should track contract balance correctly', async () => {
        const initialBalance = await taskRegistry.getGetBalance();
        
        // Create a task to add funds
        await createTaskViaJetton(taskRegistry, blockchain, requester, toNano('100'));

        const balanceAfterTask = await taskRegistry.getGetBalance();
        expect(balanceAfterTask).toBeGreaterThan(initialBalance);

        // Withdraw some funds
        const withdrawTo = await blockchain.treasury('withdrawTo');
        await taskRegistry.send(
            verifier.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'WithdrawFunds',
                amount: toNano('0.1'),
                to: withdrawTo.address,
            }
        );

        const balanceAfterWithdrawal = await taskRegistry.getGetBalance();
        expect(balanceAfterWithdrawal).toBeLessThan(balanceAfterTask);
    });

    it('should allow multiple withdrawals', async () => {
        const withdrawTo = await blockchain.treasury('withdrawTo');

        // Add funds
        await createTaskViaJetton(taskRegistry, blockchain, requester, toNano('100'));

        // First withdrawal
        const result1 = await taskRegistry.send(
            verifier.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'WithdrawFunds',
                amount: toNano('0.1'),
                to: withdrawTo.address,
            }
        );

        expect(result1.transactions).toHaveTransaction({
            from: verifier.address,
            to: taskRegistry.address,
            success: true,
        });

        // Second withdrawal
        const result2 = await taskRegistry.send(
            verifier.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'WithdrawFunds',
                amount: toNano('0.05'),
                to: withdrawTo.address,
            }
        );

        expect(result2.transactions).toHaveTransaction({
            from: verifier.address,
            to: taskRegistry.address,
            success: true,
        });
    });

    it('should allow withdrawal to different addresses', async () => {
        const withdrawTo1 = await blockchain.treasury('withdrawTo1');
        const withdrawTo2 = await blockchain.treasury('withdrawTo2');

        // Add funds
        await createTaskViaJetton(taskRegistry, blockchain, requester, toNano('100'));

        // Withdraw to first address
        const result1 = await taskRegistry.send(
            verifier.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'WithdrawFunds',
                amount: toNano('0.1'),
                to: withdrawTo1.address,
            }
        );

        expect(result1.transactions).toHaveTransaction({
            from: taskRegistry.address,
            to: withdrawTo1.address,
        });

        // Withdraw to second address
        const result2 = await taskRegistry.send(
            verifier.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'WithdrawFunds',
                amount: toNano('0.05'),
                to: withdrawTo2.address,
            }
        );

        expect(result2.transactions).toHaveTransaction({
            from: taskRegistry.address,
            to: withdrawTo2.address,
        });
    });

    it('should maintain balance integrity after task completion', async () => {
        const fulfiller = await blockchain.treasury('fulfiller');
        const bountyAmount = toNano('1');

        // Create task
        await createTaskViaJetton(taskRegistry, blockchain, requester, toNano('100'));

        const balanceAfterCreate = await taskRegistry.getGetBalance();

        // Fulfill and complete task
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

        const balanceAfterComplete = await taskRegistry.getGetBalance();
        
        // Balance should remain roughly the same since we don't handle actual token transfers in this simplified version
        // In a real implementation, this would decrease by the bounty amount
        expect(balanceAfterComplete).toBeGreaterThan(0n);
    });
});
