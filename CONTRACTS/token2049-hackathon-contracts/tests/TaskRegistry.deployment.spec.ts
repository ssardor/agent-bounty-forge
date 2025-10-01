import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, Cell, beginCell } from '@ton/core';
import { TaskRegistry } from '../build/TaskRegistry/TaskRegistry_TaskRegistry';
import { USDJettonMaster } from '../build/USDToken/USDToken_USDJettonMaster';
import { USDJettonWallet } from '../build/USDToken/USDToken_USDJettonWallet';
import '@ton/test-utils';

describe('TaskRegistry - Deployment', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let verifier: SandboxContract<TreasuryContract>;
    let usdMaster: SandboxContract<USDJettonMaster>;
    let usdWallet: SandboxContract<USDJettonWallet>;
    let taskRegistry: SandboxContract<TaskRegistry>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        verifier = await blockchain.treasury('verifier');

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

    it('should deploy successfully', async () => {
        // Contract should be deployed and verifier should be set correctly
        const verifierAddress = await taskRegistry.getGetVerifier();
        expect(verifierAddress.toString()).toBe(verifier.address.toString());
        
        const totalTasks = await taskRegistry.getGetTotalTasks();
        expect(totalTasks).toBe(0n);
    });

    it('should initialize with correct verifier', async () => {
        const verifierAddress = await taskRegistry.getGetVerifier();
        expect(verifierAddress.toString()).toBe(verifier.address.toString());
    });

    it('should initialize with zero total tasks', async () => {
        const totalTasks = await taskRegistry.getGetTotalTasks();
        expect(totalTasks).toBe(0n);
    });

    it('should have initial balance after deployment', async () => {
        const balance = await taskRegistry.getGetBalance();
        expect(balance).toBeGreaterThanOrEqual(0n);
    });
});
