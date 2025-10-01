# TaskRegistry Test Suite

This directory contains comprehensive tests for the TaskRegistry smart contract, organized into separate test files for better maintainability and clarity.

## Test Files Overview

### 📋 Test Organization

The test suite is split into **8 focused test files**, each covering a specific area of functionality:

#### 1. `TaskRegistry.deployment.spec.ts`
- **4 tests** covering contract deployment
- Verifies initial state and configuration
- Tests verifier setup and initial values

#### 2. `TaskRegistry.createTask.spec.ts`
- **7 tests** covering task creation functionality
- Input validation (empty descriptions, conditions, invalid bounty)
- Sufficient funds validation
- Multiple task handling
- Balance tracking

#### 3. `TaskRegistry.cancelTask.spec.ts`
- **5 tests** covering task cancellation
- Authorization checks (only requester can cancel)
- State validation (can only cancel active tasks)
- Refund functionality
- Edge cases (non-existent tasks, already cancelled)

#### 4. `TaskRegistry.fulfilTask.spec.ts`
- **7 tests** covering task fulfillment
- Fulfillment data validation
- State transitions (active → fulfilled)
- Prevention of multiple fulfillments
- Timestamp tracking
- Cross-user fulfillment scenarios

#### 5. `TaskRegistry.completeTask.spec.ts`
- **8 tests** covering task completion by verifier
- Verifier-only authorization
- Bounty transfer to fulfiller
- State validation (only fulfilled tasks can be completed)
- Prevention of double completion
- Multiple task scenarios

#### 6. `TaskRegistry.verifierManagement.spec.ts`
- **6 tests** covering verifier management
- Verifier updates and authorization
- Permission transfers
- Access control validation
- Verifier role transitions

#### 7. `TaskRegistry.fundManagement.spec.ts`
- **8 tests** covering fund operations
- Withdrawal functionality (verifier only)
- Amount validation (positive amounts only)
- Balance integrity
- Multiple withdrawal scenarios
- Different recipient addresses

#### 8. `TaskRegistry.getters.spec.ts`
- **9 tests** covering getter functions and state queries
- Contract info retrieval
- Task existence checks
- Balance tracking
- State integrity across operations
- Data consistency validation

## 📊 Test Statistics

- **Total Test Files**: 8
- **Total Tests**: 54
- **Coverage Areas**: 
  - ✅ Contract deployment
  - ✅ Task lifecycle (create → fulfill → complete)
  - ✅ Access control and authorization
  - ✅ Fund management and transfers
  - ✅ Input validation and error handling
  - ✅ State management and data integrity
  - ✅ Edge cases and security scenarios

## 🧪 Test Categories

### ✅ **Positive Test Cases**
- Valid operations with correct parameters
- Successful state transitions
- Proper fund transfers
- Multi-user scenarios

### ❌ **Negative Test Cases**
- Invalid input validation
- Unauthorized access attempts
- Invalid state transitions
- Edge case handling

### 🔐 **Security Test Cases**
- Access control validation
- Authorization checks
- Fund security
- State integrity

### 💰 **Financial Test Cases**
- Bounty handling
- Fund withdrawals
- Balance tracking
- Gas cost considerations

## 🏃‍♂️ Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test TaskRegistry.createTask.spec.ts
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

## 🎯 Test Quality Features

### **Comprehensive Setup**
- Consistent `beforeEach` setup across all test files
- Fresh blockchain and contract instances for each test
- Proper treasury account initialization

### **Realistic Scenarios**
- Multi-user interactions
- Real bounty amounts and gas calculations
- Proper transaction validation

### **Error Handling**
- Validation of failed transactions
- Proper error condition testing
- Edge case coverage

### **State Verification**
- Thorough state checks after operations
- Data integrity validation
- Cross-operation consistency

## 📝 Test Structure Pattern

Each test file follows a consistent pattern:

```typescript
describe('TaskRegistry - [Functionality Area]', () => {
    // Setup phase
    beforeEach(async () => {
        // Initialize blockchain and contracts
    });

    // Test cases
    it('should [expected behavior]', async () => {
        // Arrange: Set up test conditions
        // Act: Execute the functionality
        // Assert: Verify results
    });
});
```

## 🔧 Maintenance

### Adding New Tests
1. Identify the appropriate test file based on functionality
2. Follow the existing test pattern
3. Include both positive and negative test cases
4. Verify transaction success/failure appropriately

### Updating Tests
1. Maintain consistency across similar test patterns
2. Update all relevant test files when contract changes
3. Ensure test names clearly describe expected behavior

## 🚀 Benefits of Split Test Structure

1. **Better Organization**: Easy to locate tests for specific functionality
2. **Faster Development**: Developers can run tests for specific areas
3. **Easier Maintenance**: Changes to specific features only require updates to relevant test files
4. **Clearer Documentation**: Each file serves as documentation for its respective functionality
5. **Parallel Development**: Multiple developers can work on different test areas simultaneously

This comprehensive test suite ensures the TaskRegistry contract is robust, secure, and ready for production deployment on the TON blockchain.
