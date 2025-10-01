import { Address } from '@ton/core';
import { TaskRegistry } from '../build/TaskRegistry/TaskRegistry_TaskRegistry';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    
    // Get contract address
    const contractAddress = await ui.input('Enter TaskRegistry contract address');
    const taskRegistry = provider.open(TaskRegistry.fromAddress(Address.parse(contractAddress)));

    // Get contract info
    const verifier = await taskRegistry.getGetVerifier();
    const totalTasks = await taskRegistry.getGetTotalTasks();
    const balance = await taskRegistry.getGetBalance();

    console.log('=== TaskRegistry Contract Info ===');
    console.log('Contract address:', contractAddress);
    console.log('Verifier address:', verifier.toString());
    console.log('Total tasks:', totalTasks.toString());
    console.log('Contract balance:', balance.toString(), 'nanoTON');
    console.log('Contract balance:', (Number(balance) / 1e9).toFixed(4), 'TON');

    // List all tasks
    console.log('\n=== Tasks ===');
    for (let i = 0n; i < totalTasks; i++) {
        const task = await taskRegistry.getGetTask(i);
        if (task) {
            console.log(`\nTask ${i}:`);
            console.log('  Requester:', task.requester.toString());
            console.log('  Description:', task.description);
            console.log('  Bounty:', task.bounty.toString(), 'nanoTON');
            console.log('  Bounty:', (Number(task.bounty) / 1e9).toFixed(4), 'TON');
            console.log('  Completion conditions:', task.completionConditions);
            console.log('  Status:', getStatusName(task.status));
            if (task.fulfiller) {
                console.log('  Fulfiller:', task.fulfiller.toString());
                console.log('  Fulfillment data:', task.fulfillmentData);
            }
            console.log('  Created at:', new Date(Number(task.createdAt) * 1000).toISOString());
            if (task.fulfilledAt > 0n) {
                console.log('  Fulfilled at:', new Date(Number(task.fulfilledAt) * 1000).toISOString());
            }
        }
    }

    // Ask if user wants to check a specific task
    const checkSpecific = await ui.choose('Check specific task?', ['Yes', 'No'], (item) => item);
    if (checkSpecific === 'Yes') {
        const taskIdStr = await ui.input('Enter task ID');
        const taskId = BigInt(taskIdStr);
        
        const exists = await taskRegistry.getTaskExists(taskId);
        console.log(`\nTask ${taskId} exists:`, exists);
        
        if (exists) {
            const task = await taskRegistry.getGetTask(taskId);
            if (task) {
                console.log('Task details:');
                console.log('  Requester:', task.requester.toString());
                console.log('  Description:', task.description);
                console.log('  Bounty:', (Number(task.bounty) / 1e9).toFixed(4), 'TON');
                console.log('  Status:', getStatusName(task.status));
                console.log('  Completion conditions:', task.completionConditions);
                if (task.fulfiller) {
                    console.log('  Fulfiller:', task.fulfiller.toString());
                    console.log('  Fulfillment data:', task.fulfillmentData);
                }
            }
        }
    }
}

function getStatusName(status: bigint): string {
    switch (Number(status)) {
        case 0: return 'ACTIVE';
        case 1: return 'FULFILLED';
        case 2: return 'COMPLETED';
        case 3: return 'CANCELLED';
        default: return 'UNKNOWN';
    }
}
