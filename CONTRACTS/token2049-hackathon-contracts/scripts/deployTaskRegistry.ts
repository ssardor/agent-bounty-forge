import { toNano } from '@ton/core';
import { TaskRegistry } from '../build/TaskRegistry/TaskRegistry_TaskRegistry';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    // Prompt for verifier address
    const verifierAddress = provider.sender().address;
    if (!verifierAddress) {
        throw new Error('Verifier address is required');
    }

    console.log('Deploying TaskRegistry with verifier:', verifierAddress.toString());

    const taskRegistry = provider.open(await TaskRegistry.fromInit(verifierAddress));

    await taskRegistry.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(taskRegistry.address);

    console.log('TaskRegistry deployed at:', taskRegistry.address.toString());
    console.log('Verifier address:', verifierAddress.toString());
    
    // Test basic functionality
    const totalTasks = await taskRegistry.getGetTotalTasks();
    const balance = await taskRegistry.getGetBalance();
    
    console.log('Initial total tasks:', totalTasks.toString());
    console.log('Contract balance:', balance.toString());
}
