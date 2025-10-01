import { Address, toNano } from '@ton/core';
import { TaskRegistry } from '../build/TaskRegistry/TaskRegistry_TaskRegistry';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    
    // Get contract address
    const contractAddress = await ui.input('Enter TaskRegistry contract address');
    const taskRegistry = provider.open(TaskRegistry.fromAddress(Address.parse(contractAddress)));

    // Get task ID and fulfillment data
    const taskIdStr = await ui.input('Enter task ID to fulfill');
    const fulfillmentData = await ui.input('Enter fulfillment data');

    const taskId = BigInt(taskIdStr);

    console.log('Fulfilling task...');
    console.log('Task ID:', taskId.toString());
    console.log('Fulfillment data:', fulfillmentData);

    // Check if task exists and is active
    const task = await taskRegistry.getGetTask(taskId);
    if (!task) {
        console.log('Task not found!');
        return;
    }

    console.log('Task details:');
    console.log('- Requester:', task.requester.toString());
    console.log('- Description:', task.description);
    console.log('- Bounty:', task.bounty.toString());
    console.log('- Status:', task.status.toString());

    if (task.status !== 0n) { // TASK_STATUS_ACTIVE
        console.log('Task is not active!');
        return;
    }

    await taskRegistry.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'FulfilTask',
            taskId: taskId,
            fulfillmentData: fulfillmentData,
        }
    );

    console.log('Task fulfilled successfully!');
    console.log('Waiting for verifier approval...');
}
