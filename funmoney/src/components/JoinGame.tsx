'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Users,
  Coins,
  Timer,
  RefreshCcw,
  ExternalLink,
} from 'lucide-react';
import { formatEther, parseEther } from 'viem';
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract, useChainId } from 'wagmi';
import { getContractInfo } from '../constants';
import GameSearchCard from './GameSearchCard';
import toast from 'react-hot-toast';
import { extractErrorMessages } from '../utils';
import { Game } from '../types';
import { ErrorBoundary } from 'react-error-boundary';


export default function JoinGame() {
      const chainId = useChainId();
      const { abi, contractAddress, networkName } = getContractInfo(chainId);
      
      const {
        data: hash,
        error,
        isPending,
        writeContract,
      } = useWriteContract();
            const { isLoading: isConfirming, isSuccess: isConfirmed } =
              useWaitForTransactionReceipt({
                hash,
              });
  const [activeGames, setActiveGames] = useState<Game>();
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState<number>();
  const [refreshToken, setRefreshToken] = useState('')
  const account = useAccount()
  const userAddress = account.address || undefined
  const isTxnLoading = isPending || isConfirming

  const proofedSearchQuery = searchQuery || 0


      const gameResult = useReadContract({
        abi,
        address: contractAddress as `0x${string}`,
        functionName: 'getGameById',
        args: [BigInt(proofedSearchQuery)],
        scopeKey: refreshToken
      }) 

      const data = gameResult.data as Game | undefined


      



  const handleSearch = async () => {
    setIsLoading(true);
    try {
      // Fetch active games logic will go here
      
      setActiveGames(data as Game | undefined);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGame = async(id: bigint | undefined,stake:bigint | undefined)=>{
    const toastId = toast.loading('Preparing to join game...',)
try {
  await writeContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: 'joinGame',
    args: [id],
    value: (stake),
  });
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
        console.error('Error joining game:', err);
}
  }


useEffect(() => {
      if (isConfirmed) {
        toast.success('Game joined successfully! 🎮', {
          duration: 3000,
          icon: '🎉',
        });
        // Reset form
      }
      setRefreshToken(Date.now().toString())
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

  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <div className='space-y-6 text-white'>
        {/* Network Info */}
        <div className='text-sm bg-gray-800 p-3 rounded-lg border border-gray-700 flex items-center justify-between'>
          <span>Active Network: <span className='text-blue-400'>{networkName}</span></span>
        </div>
        
        {/* Search and Refresh Section */}
        <div className='flex gap-4'>
          <div className='flex-1 relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
            <input
              type='number'
              placeholder='Search game by ID'
              value={searchQuery}
              onChange={(e) => setSearchQuery(Number(e.target.value))}
              className='w-full pl-10 pr-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-white'
            />
          </div>
          <button
            onClick={handleSearch}
            className='p-3 bg-gray-800 border-2 border-gray-700 rounded-lg hover:border-gray-600 transition-colors'
          >
            {/* // this should be search */}
            <RefreshCcw
              className={`w-5 h-5 text-gray-400 ${
                isLoading ? 'animate-spin' : ''
              }`}
            />
          </button>
        </div>

        {/* Active Games List */}
        <div className='space-y-4'>
          <div className='flex justify-between items-center'>
            <h2 className='text-xl font-semibold text-gray-200'>
              Search game by ID
            </h2>
          </div>

          <div className='space-y-4'>
            {!activeGames ? (
              <div className='text-center py-8 bg-gray-800 rounded-lg'>
                <Users className='w-12 h-12 text-gray-600 mx-auto mb-3' />
                <p className='text-gray-400'>No active games found</p>
                <button
                  onClick={handleSearch}
                  className='mt-4 text-blue-400 hover:text-blue-300 text-sm flex items-center justify-center gap-2'
                >
                  <RefreshCcw className='w-4 h-4' />
                  Refresh games
                </button>
              </div>
            ) : (
              <GameSearchCard
                game={data}
                isLoading={isTxnLoading}
                onJoinGame={() => handleJoinGame(data?.gameId, data?.stake)}
                userAddress={userAddress}
              />
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
