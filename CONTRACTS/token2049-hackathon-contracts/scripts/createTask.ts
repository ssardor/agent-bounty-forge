import { Address, toNano } from '@ton/core';
import { TaskRegistry } from '../build/TaskRegistry/TaskRegistry_TaskRegistry';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    
    // Get contract address
    const contractAddress = await ui.input('Enter TaskRegistry contract address');
    const taskRegistry = provider.open(TaskRegistry.fromAddress(Address.parse(contractAddress)));

    // Get task details
    const description = await ui.input('Enter task description');
    const bountyAmount = await ui.input('Enter bounty amount (in TON)');
    const completionConditions = await ui.input('Enter completion conditions');

    console.log('Creating task...');
    console.log('Description:', description);
    console.log('Bounty:', bountyAmount, 'TON');
    console.log('Completion conditions:', completionConditions);

    const bountyNano = toNano(bountyAmount);
    const totalValue = bountyNano + toNano('0.1'); // bounty + gas

    await taskRegistry.send(
        provider.sender(),
        {
            value: totalValue,
        },
        {
            $$type: 'CreateTask',
            description: description,
            bounty: bountyNano,
            completionConditions: completionConditions,
        }
    );

    console.log('Task created successfully!');
    
    // Get updated total tasks
    const totalTasks = await taskRegistry.getGetTotalTasks();
    console.log('Total tasks in registry:', totalTasks.toString());
}
