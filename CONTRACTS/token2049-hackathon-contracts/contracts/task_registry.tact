import "@stdlib/deploy";
import "./usd_token";

// Task status enumeration
const TASK_STATUS_ACTIVE: Int = 0;
const TASK_STATUS_FULFILLED: Int = 1;
const TASK_STATUS_COMPLETED: Int = 2;
const TASK_STATUS_CANCELLED: Int = 3;

// Task data structure
struct Task {
    requester: Address;
    description: String;
    bounty: Int;
    completionConditions: String;
    status: Int;
    fulfiller: Address?;
    fulfillmentData: String;
    createdAt: Int;
    fulfilledAt: Int;
}

// Messages for contract interactions
message CancelTask {
    taskId: Int;
}

message FulfilTask {
    taskId: Int;
    fulfillmentData: String;
}

message CompleteTask {
    taskId: Int;
}

message UpdateVerifier {
    newVerifier: Address;
}

message WithdrawFunds {
    amount: Int;
    to: Address;
}

// Events (notifications)
message TaskCreated {
    taskId: Int;
    requester: Address;
    description: String;
    bounty: Int;
    completionConditions: String;
}

message TaskCancelled {
    taskId: Int;
    requester: Address;
    refundAmount: Int;
}

message TaskFulfilled {
    taskId: Int;
    fulfiller: Address;
    fulfillmentData: String;
}

message TaskCompleted {
    taskId: Int;
    fulfiller: Address;
    payment: Int;
}

message VerifierUpdated {
    oldVerifier: Address;
    newVerifier: Address;
}

// Error codes
const ERROR_UNAUTHORIZED_COMPLETION: Int = 1001;
const ERROR_TASK_NOT_FOUND: Int = 1002;
const ERROR_EMPTY_DESCRIPTION: Int = 1003;
const ERROR_EMPTY_COMPLETION_CONDITIONS: Int = 1004;
const ERROR_INVALID_BOUNTY_AMOUNT: Int = 1005;
const ERROR_UNAUTHORIZED_CANCELLATION: Int = 1006;
const ERROR_TASK_NOT_ACTIVE: Int = 1007;
const ERROR_EMPTY_FULFILLMENT_DATA: Int = 1008;
const ERROR_TASK_NOT_FULFILLED: Int = 1009;
const ERROR_INSUFFICIENT_FUNDS: Int = 1010;

contract TaskRegistry with Deployable {
    // State variables
    verifier: Address;
    totalTasks: Int = 0;
    tasks: map<Int, Task>;
    usd_master: Address; // USD Jetton Master address
    
    init(verifier: Address, usd_master: Address) {
        self.verifier = verifier;
        self.usd_master = usd_master;
    }
    
    // Handle USD token transfer notifications for task creation
    receive(msg: JettonTransferNotification) {
        // Calculate the expected USD wallet address for this contract
        let expectedUsdWallet: Address = contractAddress(initOf USDJettonWallet(self.usd_master, myAddress()));
        
        // Only accept transfers from our USD wallet
        require(sender() == expectedUsdWallet, "Invalid USD sender");
        require(msg.amount > 0, "Invalid bounty amount");
        
        let payload: Slice = msg.forward_payload;
        let description: String = "Default Task";
        let completionConditions: String = "Complete the task";
        
        // For now, just use default values
        // TODO: Parse custom task data from forward_payload when Tact supports it
        
        // Create task
        let taskId: Int = self.totalTasks;
        self.totalTasks = self.totalTasks + 1;
        
        let task: Task = Task{
            requester: msg.sender,
            description: description,
            bounty: msg.amount,
            completionConditions: completionConditions,
            status: TASK_STATUS_ACTIVE,
            fulfiller: null,
            fulfillmentData: "",
            createdAt: now(),
            fulfilledAt: 0
        };
        
        self.tasks.set(taskId, task);
        
        // Emit event
        emit(TaskCreated{
            taskId: taskId,
            requester: msg.sender,
            description: description,
            bounty: msg.amount,
            completionConditions: completionConditions
        }.toCell());
    }
    
    // Cancel a task
    receive(msg: CancelTask) {
        require(msg.taskId >= 0 && msg.taskId < self.totalTasks, "Task not found");
        let task: Task? = self.tasks.get(msg.taskId);
        require(task != null, "Task not found");
        
        let taskData: Task = task!!;
        
        // Only the requester can cancel their own task
        require(taskData.requester == sender(), "Unauthorized cancellation");
        
        // Can only cancel active tasks
        require(taskData.status == TASK_STATUS_ACTIVE, "Task not active");
        
        // Update task status
        taskData.status = TASK_STATUS_CANCELLED;
        self.tasks.set(msg.taskId, taskData);
        
        // Return USD tokens to requester via jetton transfer
        let refundAmount: Int = taskData.bounty;
        let usdWallet: Address = contractAddress(initOf USDJettonWallet(self.usd_master, myAddress()));
        send(SendParameters{
            to: usdWallet,
            value: ton("0.05"), // Gas for USD transfer
            mode: SendIgnoreErrors,
            bounce: false,
            body: JettonTransfer{
                query_id: 0,
                amount: refundAmount,
                destination: taskData.requester,
                response_destination: taskData.requester,
                custom_payload: null,
                forward_ton_amount: ton("0.01"),
                forward_payload: emptySlice()
            }.toCell()
        });
        
        // Emit event
        emit(TaskCancelled{
            taskId: msg.taskId,
            requester: taskData.requester,
            refundAmount: refundAmount
        }.toCell());
    }
    
    // Fulfill a task
    receive(msg: FulfilTask) {
        require(msg.fulfillmentData != "", "Empty fulfillment data");
        require(msg.taskId >= 0 && msg.taskId < self.totalTasks, "Task not found");
        
        let task: Task? = self.tasks.get(msg.taskId);
        require(task != null, "Task not found");
        
        let taskData: Task = task!!;
        
        // Can only fulfill active tasks
        require(taskData.status == TASK_STATUS_ACTIVE, "Task not active");
        
        // Update task with fulfillment data
        taskData.status = TASK_STATUS_FULFILLED;
        taskData.fulfiller = sender();
        taskData.fulfillmentData = msg.fulfillmentData;
        taskData.fulfilledAt = now();
        
        self.tasks.set(msg.taskId, taskData);
        
        // Emit event
        emit(TaskFulfilled{
            taskId: msg.taskId,
            fulfiller: sender(),
            fulfillmentData: msg.fulfillmentData
        }.toCell());
    }
    
    // Complete a task (verifier only)
    receive(msg: CompleteTask) {
        require(sender() == self.verifier, "Unauthorized completion");
        require(msg.taskId >= 0 && msg.taskId < self.totalTasks, "Task not found");
        
        let task: Task? = self.tasks.get(msg.taskId);
        require(task != null, "Task not found");
        
        let taskData: Task = task!!;
        
        // Can only complete fulfilled tasks
        require(taskData.status == TASK_STATUS_FULFILLED, "Task not fulfilled");
        require(taskData.fulfiller != null, "No fulfiller");
        
        // Update task status
        taskData.status = TASK_STATUS_COMPLETED;
        self.tasks.set(msg.taskId, taskData);
        
        // Transfer USD payment to fulfiller via jetton transfer
        let payment: Int = taskData.bounty;
        let fulfiller: Address = taskData.fulfiller!!;
        let usdWallet: Address = contractAddress(initOf USDJettonWallet(self.usd_master, myAddress()));
        
        send(SendParameters{
            to: usdWallet,
            value: ton("0.05"), // Gas for USD transfer
            mode: SendIgnoreErrors,
            bounce: false,
            body: JettonTransfer{
                query_id: 0,
                amount: payment,
                destination: fulfiller,
                response_destination: fulfiller,
                custom_payload: null,
                forward_ton_amount: ton("0.01"),
                forward_payload: emptySlice()
            }.toCell()
        });
        
        // Emit event
        emit(TaskCompleted{
            taskId: msg.taskId,
            fulfiller: fulfiller,
            payment: payment
        }.toCell());
    }
    
    // Update verifier (verifier only)
    receive(msg: UpdateVerifier) {
        require(sender() == self.verifier, "Unauthorized");
        
        let oldVerifier: Address = self.verifier;
        self.verifier = msg.newVerifier;
        
        // Emit event
        emit(VerifierUpdated{
            oldVerifier: oldVerifier,
            newVerifier: msg.newVerifier
        }.toCell());
    }
    
    // Withdraw excess funds (verifier only)
    receive(msg: WithdrawFunds) {
        require(sender() == self.verifier, "Unauthorized");
        require(msg.amount > 0, "Invalid amount");
        
        send(SendParameters{
            to: msg.to,
            value: msg.amount,
            mode: SendIgnoreErrors,
            bounce: false
        });
    }
    
    // Getter functions
    get fun getVerifier(): Address {
        return self.verifier;
    }
    
    get fun getTotalTasks(): Int {
        return self.totalTasks;
    }
    
    get fun getTask(taskId: Int): Task? {
        return self.tasks.get(taskId);
    }
    
    get fun getBalance(): Int {
        return myBalance();
    }
    
    get fun getUSDMaster(): Address {
        return self.usd_master;
    }
    
    get fun getUSDWallet(): Address {
        return contractAddress(initOf USDJettonWallet(self.usd_master, myAddress()));
    }
    
    // Check if task exists
    get fun taskExists(taskId: Int): Bool {
        if (taskId < 0 || taskId >= self.totalTasks) {
            return false;
        }
        return self.tasks.get(taskId) != null;
    }
}
