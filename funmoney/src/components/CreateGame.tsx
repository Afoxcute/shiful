'use client';

import React, { useState } from 'react';
import { Trophy, Coins, Swords, Timer, Info } from 'lucide-react';
import { parseEther } from 'viem';
import { useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent, useChainId } from 'wagmi';
import { getContractInfo } from '../constants';
import toast from 'react-hot-toast';
import { extractErrorMessages } from '../utils';
import { ErrorBoundary } from 'react-error-boundary';


const GAME_TYPES = [
  {
    id: 0,
    name: 'Quick Match',
    description: 'Single round, winner takes all',
    icon: Timer,
    matches: 'One Round',
  },
  {
    id: 1,
    name: 'Best of Three',
    description: 'First to win 2 rounds',
    icon: Swords,
    matches: '3 Rounds',
  },
  {
    id: 2,
    name: 'Championship',
    description: 'First to win 3 rounds',
    icon: Trophy,
    matches: '5 Rounds',
  },
];

export default function CreateGame() {
    const chainId = useChainId();
    const { abi, contractAddress, networkName } = getContractInfo(chainId);
    
    const { data: hash, error, isPending, writeContract } = useWriteContract();

          useWatchContractEvent({
            address: contractAddress as `0x${string}`,
            abi,
            eventName: 'GameCreated',
            onLogs(logs: any) {
              const createdGameID = logs && logs[0]?.args?.gameId
                    toast.success(`Game of ID ${createdGameID} created`, {
                      duration: 3000,
                    });
            },
          });
    
      const { isLoading: isConfirming, isSuccess: isConfirmed } =
        useWaitForTransactionReceipt({
          hash,
        });
        
  const [selectedType, setSelectedType] = useState(0);
  const [stakeAmount, setStakeAmount] = useState<string>('');
  


  const handleCreateGame = async () => {
    if (!stakeAmount) return;

    const toastId = toast.loading('Preparing to create game...', {
      icon: '⚔️',
      duration: 3000,
    });

    try {
      await writeContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: 'createGame',
        args: [BigInt(selectedType)],
        value: parseEther(stakeAmount),
      });

  

      // Update loading toast when transaction is sent
      toast.loading('Waiting for transaction confirmation...', {
        id: toastId,
        icon: '⏳',
        duration: 3000,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create game',
        {
          id: toastId,
          duration: 3000,
          icon: '❌',
        }
      );
      console.error('Error creating game:', err);
    }
  };

    React.useEffect(() => {
      if (isConfirmed) {
        // Reset form
        setSelectedType(0);
        setStakeAmount('');
      }
    }, [isConfirmed]);

    React.useEffect(() => {
      if (error) {
        toast.error(extractErrorMessages(error?.message), {
          duration: 3000,
          icon: '❌',
        });
        console.log(error);
        
      }
    }, [error]);

    const isLoading = isPending || isConfirming;


  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <div className='space-y-6 text-white'>
        {/* Network Info */}
        <div className='text-sm bg-gray-800 p-3 rounded-lg border border-gray-700 flex items-center justify-between'>
          <span>Active Network: <span className='text-blue-400'>{networkName}</span></span>
        </div>
        
        {/* Game Type Selection */}
        <div className='space-y-4'>
          <h2 className='text-xl font-semibold text-gray-200'>
            Select Game Type
          </h2>
          <div className='grid gap-4'>
            {GAME_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`flex items-center p-4 rounded-lg border-2 transition-all duration-200 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg ${
                      isSelected ? 'bg-blue-500/20' : 'bg-gray-700'
                    }`}
                  >
                    <Icon
                      className={`w-6 h-6 ${
                        isSelected ? 'text-blue-400' : 'text-gray-400'
                      }`}
                    />
                  </div>
                  <div className='ml-4 flex-1 text-left'>
                    <h3 className='font-medium'>{type.name}</h3>
                    <p className='text-sm text-gray-400'>{type.description}</p>
                  </div>
                  <span className='text-sm font-medium px-3 py-1 rounded-full bg-gray-700'>
                    {type.matches}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stake Amount Input */}
        <div className='space-y-4'>
          <h2 className='text-xl font-semibold text-gray-200'>
            Set Stake Amount
          </h2>
          <div className='relative'>
            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
              <Coins className='h-5 w-5 text-gray-400' />
            </div>
            <input
              type='number'
              step='0.001'
              min='0'
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              placeholder='Enter ETH amount'
              className='w-full pl-10 pr-12 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-white'
            />
            <div className='absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none'>
              <span className='text-gray-400'>ETH</span>
            </div>
          </div>
          <p className='flex items-center text-sm text-gray-400'>
            <Info className='w-4 h-4 mr-1' />
            Stake must be greater than 0 ETH
          </p>
        </div>

        {/* Create Game Button */}
        <button
          onClick={handleCreateGame}
          disabled={!stakeAmount || isLoading}
          className={`w-full py-4 rounded-lg font-semibold flex items-center justify-center space-x-2
          ${
            !stakeAmount
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:opacity-90'
          }
        `}
        >
          {isLoading ? (
            <div className='w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin' />
          ) : (
            <>
              <Swords className='w-5 h-5' />
              <span>Create Game</span>
            </>
          )}
        </button>
      </div>
    </ErrorBoundary>
  );
}
