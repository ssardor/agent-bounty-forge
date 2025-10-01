import { Address, toNano } from '@ton/core';
import { TaskRegistry } from '../build/TaskRegistry/TaskRegistry_TaskRegistry';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    
    // Get contract address
    const contractAddress = await ui.input('Enter TaskRegistry contract address');
    const taskRegistry = provider.open(TaskRegistry.fromAddress(Address.parse(contractAddress)));

    // Get task ID
    const taskIdStr = await ui.input('Enter task ID to complete');
    const taskId = BigInt(taskIdStr);

    console.log('Completing task...');
    console.log('Task ID:', taskId.toString());

    // Check if task exists and is fulfilled
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
    console.log('- Fulfiller:', task.fulfiller?.toString() || 'None');
    console.log('- Fulfillment data:', task.fulfillmentData);

    if (task.status !== 1n) { // TASK_STATUS_FULFILLED
        console.log('Task is not fulfilled yet!');
        return;
    }

    if (!task.fulfiller) {
        console.log('No fulfiller found!');
        return;
    }

    // Check if sender is verifier
    const verifier = await taskRegistry.getGetVerifier();
    console.log('Contract verifier:', verifier.toString());
    console.log('Your address:', provider.sender().address?.toString());

    await taskRegistry.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'CompleteTask',
            taskId: taskId,
        }
    );

    console.log('Task completed successfully!');
    console.log('Payment sent to fulfiller:', task.fulfiller.toString());
    console.log('Payment amount:', task.bounty.toString());
}
