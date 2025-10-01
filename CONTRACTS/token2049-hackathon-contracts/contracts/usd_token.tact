import "@stdlib/deploy";

// Standard Jetton messages
message JettonTransfer {
    query_id: Int as uint64;
    amount: Int as coins;
    destination: Address;
    response_destination: Address?;
    custom_payload: Cell?;
    forward_ton_amount: Int as coins;
    forward_payload: Slice as remaining;
}

message JettonTransferNotification {
    query_id: Int as uint64;
    amount: Int as coins;
    sender: Address;
    forward_payload: Slice as remaining;
}

message JettonBurn {
    query_id: Int as uint64;
    amount: Int as coins;
    response_destination: Address?;
    custom_payload: Cell?;
}

// Jetton Master messages
message JettonMint {
    query_id: Int as uint64;
    amount: Int as coins;
    to: Address;
}

message JettonChangeAdmin {
    query_id: Int as uint64;
    new_admin: Address;
}

// Internal transfer message
message JettonInternalTransfer {
    query_id: Int as uint64;
    amount: Int as coins;
    from: Address;
    response_address: Address?;
    forward_ton_amount: Int as coins;
    forward_payload: Slice as remaining;
}

// Burn notification message
message JettonBurnNotification {
    query_id: Int as uint64;
    amount: Int as coins;
    sender: Address;
    response_destination: Address?;
}

// USD Token Jetton Master contract
contract USDJettonMaster with Deployable {
    total_supply: Int as coins;
    admin: Address;
    content: Cell;
    
    init(admin: Address, content: Cell) {
        self.total_supply = 0;
        self.admin = admin;
        self.content = content;
    }
    
    receive(msg: JettonMint) {
        require(sender() == self.admin, "Only admin can mint");
        self.total_supply = self.total_supply + msg.amount;
        
        let wallet_init: StateInit = self.get_wallet_init(msg.to);
        send(SendParameters{
            to: contractAddress(wallet_init),
            value: ton("0.05"),
            bounce: false,
            mode: SendIgnoreErrors,
            body: JettonInternalTransfer{
                query_id: msg.query_id,
                amount: msg.amount,
                from: myAddress(),
                response_address: msg.to,
                forward_ton_amount: 0,
                forward_payload: emptySlice()
            }.toCell(),
            code: wallet_init.code,
            data: wallet_init.data
        });
    }
    
    receive(msg: JettonChangeAdmin) {
        require(sender() == self.admin, "Only admin can change admin");
        self.admin = msg.new_admin;
    }
    
    get fun get_wallet_address(owner: Address): Address {
        let wallet_init: StateInit = self.get_wallet_init(owner);
        return contractAddress(wallet_init);
    }
    
    get fun get_jetton_data(): JettonData {
        return JettonData{
            total_supply: self.total_supply,
            mintable: true,
            admin_address: self.admin,
            jetton_content: self.content,
            jetton_wallet_code: self.get_wallet_code()
        };
    }
    
    fun get_wallet_init(owner: Address): StateInit {
        return initOf USDJettonWallet(myAddress(), owner);
    }
    
    fun get_wallet_code(): Cell {
        let wallet_init: StateInit = initOf USDJettonWallet(myAddress(), myAddress());
        return wallet_init.code;
    }
}

// Jetton data structure
struct JettonData {
    total_supply: Int;
    mintable: Bool;
    admin_address: Address;
    jetton_content: Cell;
    jetton_wallet_code: Cell;
}

// USD Token Jetton Wallet contract
contract USDJettonWallet {
    balance: Int as coins;
    owner: Address;
    jetton_master: Address;
    
    init(jetton_master: Address, owner: Address) {
        self.balance = 0;
        self.owner = owner;
        self.jetton_master = jetton_master;
    }
    
    receive(msg: JettonTransfer) {
        require(sender() == self.owner, "Only owner can transfer");
        require(self.balance >= msg.amount, "Insufficient balance");
        
        self.balance = self.balance - msg.amount;
        
        let wallet_init: StateInit = initOf USDJettonWallet(self.jetton_master, msg.destination);
        send(SendParameters{
            to: contractAddress(wallet_init),
            value: msg.forward_ton_amount,
            bounce: false,
            mode: SendIgnoreErrors,
            body: JettonInternalTransfer{
                query_id: msg.query_id,
                amount: msg.amount,
                from: self.owner,
                response_address: msg.response_destination,
                forward_ton_amount: msg.forward_ton_amount,
                forward_payload: msg.forward_payload
            }.toCell(),
            code: wallet_init.code,
            data: wallet_init.data
        });
    }
    
    receive(msg: JettonInternalTransfer) {
        require(sender() == self.jetton_master || sender() == contractAddress(initOf USDJettonWallet(self.jetton_master, msg.from)), "Invalid sender");
        
        self.balance = self.balance + msg.amount;
        
        if (msg.forward_ton_amount > 0) {
            send(SendParameters{
                to: self.owner,
                value: msg.forward_ton_amount,
                bounce: false,
                mode: SendIgnoreErrors,
                body: JettonTransferNotification{
                    query_id: msg.query_id,
                    amount: msg.amount,
                    sender: msg.from,
                    forward_payload: msg.forward_payload
                }.toCell()
            });
        }
    }
    
    receive(msg: JettonBurn) {
        require(sender() == self.owner, "Only owner can burn");
        require(self.balance >= msg.amount, "Insufficient balance");
        
        self.balance = self.balance - msg.amount;
        
        send(SendParameters{
            to: self.jetton_master,
            value: ton("0.01"),
            bounce: false,
            mode: SendIgnoreErrors,
            body: JettonBurnNotification{
                query_id: msg.query_id,
                amount: msg.amount,
                sender: self.owner,
                response_destination: msg.response_destination
            }.toCell()
        });
    }
    
    get fun get_wallet_data(): JettonWalletData {
        let wallet_init: StateInit = initOf USDJettonWallet(self.jetton_master, self.owner);
        return JettonWalletData{
            balance: self.balance,
            owner: self.owner,
            jetton_master: self.jetton_master,
            jetton_wallet_code: wallet_init.code
        };
    }
}

struct JettonWalletData {
    balance: Int;
    owner: Address;
    jetton_master: Address;
    jetton_wallet_code: Cell;
}
