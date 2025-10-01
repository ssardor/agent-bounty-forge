import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useSwitchChain,
} from "wagmi";
import {
  CONTRACT_ADDRESSES,
  VERIFIER_ADDRESS,
  ITaskRegistryABI,
} from "../contracts/config";
import { parseUnits } from "viem";
import { useToast } from "@/hooks/use-toast";

export function useTaskContract() {
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { toast } = useToast();

  const {
    writeContract: writeTaskContract,
    data: writeContractData,
    isPending: isWritePending,
    isError: isWriteError,
    error: writeError,
  } = useWriteContract();

  // Wait for transaction receipt
  const {
    isLoading: isTransactionLoading,
    isSuccess: isTransactionSuccess,
    isError: isTransactionError,
    error: transactionError,
  } = useWaitForTransactionReceipt({
    hash: writeContractData,
  });

  // Function to create a new task
  const createTask = async (
    description: string,
    bountyAmount: string,
    conditions: string
  ) => {
    try {
      // Check if we're on the correct network
      if (chainId !== 137) {
        toast({
          title: "Неправильная сеть",
          description: "Пожалуйста, переключитесь на сеть Polygon",
          variant: "destructive",
        });
        switchChain({ chainId: 137 });
        return Promise.reject(new Error("Wrong network"));
      }

      // Convert bounty amount to proper units (USDC has 6 decimals)
      const bountyInWei = parseUnits(bountyAmount, 6);

      // Call the contract
      const result = await writeTaskContract({
        address: CONTRACT_ADDRESSES.polygon.TaskRegistry,
        abi: ITaskRegistryABI.abi,
        functionName: "createTask",
        args: [description, bountyInWei, conditions],
        account: address,
        chain: null,
      });

      return result;
    } catch (error) {
      console.error("Error creating task:", error);
      toast({
        title: "Ошибка создания задачи",
        description:
          "Произошла ошибка при создании задачи. Попробуйте еще раз.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Function to cancel a task
  const cancelTask = async (taskId: bigint) => {
    try {
      // Check if we're on the correct network
      if (chainId !== 137) {
        toast({
          title: "Неправильная сеть",
          description: "Пожалуйста, переключитесь на сеть Polygon",
          variant: "destructive",
        });
        switchChain({ chainId: 137 });
        return Promise.reject(new Error("Wrong network"));
      }

      // Call the contract
      const result = await writeTaskContract({
        address: CONTRACT_ADDRESSES.polygon.TaskRegistry,
        abi: ITaskRegistryABI.abi,
        functionName: "cancelTask",
        args: [taskId],
        account: address,
        chain: null,
      });

      return result;
    } catch (error) {
      console.error("Error cancelling task:", error);
      toast({
        title: "Ошибка отмены задачи",
        description: "Произошла ошибка при отмене задачи. Попробуйте еще раз.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Function to fulfil a task
  const fulfilTask = async (
    taskId: bigint,
    resultData: string,
    agentAddress: `0x${string}`
  ) => {
    try {
      // Check if we're on the correct network
      if (chainId !== 137) {
        toast({
          title: "Неправильная сеть",
          description: "Пожалуйста, переключитесь на сеть Polygon",
          variant: "destructive",
        });
        switchChain({ chainId: 137 });
        return Promise.reject(new Error("Wrong network"));
      }

      // Call the contract
      const result = await writeTaskContract({
        address: CONTRACT_ADDRESSES.polygon.TaskRegistry,
        abi: ITaskRegistryABI.abi,
        functionName: "fulfilTask",
        args: [taskId, resultData, agentAddress],
        account: address,
        chain: null,
      });

      return result;
    } catch (error) {
      console.error("Error fulfilling task:", error);
      toast({
        title: "Ошибка выполнения задачи",
        description:
          "Произошла ошибка при выполнении задачи. Попробуйте еще раз.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Function to complete a task (only verifier)
  const completeTask = async (taskId: bigint) => {
    try {
      // Check if we're on the correct network
      if (chainId !== 137) {
        toast({
          title: "Неправильная сеть",
          description: "Пожалуйста, переключитесь на сеть Polygon",
          variant: "destructive",
        });
        switchChain({ chainId: 137 });
        return Promise.reject(new Error("Wrong network"));
      }

      // Check if the current user is the verifier
      if (address?.toLowerCase() !== VERIFIER_ADDRESS.toLowerCase()) {
        toast({
          title: "Недостаточно прав",
          description: "Только верификатор может завершать задачи",
          variant: "destructive",
        });
        return Promise.reject(new Error("Insufficient permissions"));
      }

      // Call the contract
      const result = await writeTaskContract({
        address: CONTRACT_ADDRESSES.polygon.TaskRegistry,
        abi: ITaskRegistryABI.abi,
        functionName: "completeTask",
        args: [taskId],
        account: address,
        chain: null,
      });

      return result;
    } catch (error) {
      console.error("Error completing task:", error);
      toast({
        title: "Ошибка завершения задачи",
        description:
          "Произошла ошибка при завершении задачи. Попробуйте еще раз.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    createTask,
    cancelTask,
    fulfilTask,
    completeTask,
    isWritePending,
    isWriteError,
    isTransactionLoading,
    isTransactionSuccess,
    isTransactionError,
    transactionHash: writeContractData,
    transactionError,
    writeError,
  };
}
