'use client';

import type { NextPage } from "next";
import { useAccount, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

import Link from "next/link";
import { Gamepad2, Wallet, Sword, ScrollText, Shield } from 'lucide-react';
import Head from "next/head";

const Home: NextPage = () => {
    const { isConnected } = useAccount();
      const { connect } = useConnect();

  return (
    <>
      <Head>
        <title>Blockchain Rock Paper Scissors</title>
        <meta
          name='description'
          content='Challenge players worldwide in the ultimate game of strategy'
        />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <link rel='icon' href='/favicon.ico' />
      </Head>
      <div className='flex flex-col items-center space-y-8 text-white'>
        {/* Hero Section */}
        <div className='text-center space-y-4'>
          <div className='flex justify-center space-x-4 text-4xl mb-6'>
            <Shield className='w-12 h-12 text-blue-400 animate-pulse' />
            <Sword className='w-12 h-12 text-purple-400 animate-pulse delay-100' />
            <ScrollText className='w-12 h-12 text-green-400 animate-pulse delay-200' />
          </div>
          <h1 className='text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 bg-clip-text text-transparent'>
            Blockchain Rock Paper Scissors
          </h1>
          <p className='text-gray-300 text-lg'>
            Challenge players worldwide in the ultimate game of strategy
          </p>
        </div>

        {/* Features Grid */}
        <div className='grid grid-cols-1 gap-6 w-full max-w-md'>
          <div className='bg-gray-700 p-4 rounded-lg flex items-start space-x-4'>
            <div className='bg-blue-500/10 p-2 rounded-lg'>
              <Gamepad2 className='w-6 h-6 text-blue-400' />
            </div>
            <div>
              <h3 className='font-semibold text-lg text-blue-400'>
                Play to Earn
              </h3>
              <p className='text-gray-300 text-sm'>
                Win ETH by outsmarting your opponents in this classic game
              </p>
            </div>
          </div>

          <div className='bg-gray-700 p-4 rounded-lg flex items-start space-x-4'>
            <div className='bg-purple-500/10 p-2 rounded-lg'>
              <Shield className='w-6 h-6 text-purple-400' />
            </div>
            <div>
              <h3 className='font-semibold text-lg text-purple-400'>
                Secure Gameplay
              </h3>
              <p className='text-gray-300 text-sm'>
                Built on blockchain technology for transparent and fair matches
              </p>
            </div>
          </div>

          <div className='bg-gray-700 p-4 rounded-lg flex items-start space-x-4'>
            <div className='bg-green-500/10 p-2 rounded-lg'>
              <ScrollText className='w-6 h-6 text-green-400' />
            </div>
            <div>
              <h3 className='font-semibold text-lg text-green-400'>
                Track Records
              </h3>
              <p className='text-gray-300 text-sm'>
                View your game history and earnings on the blockchain
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className='w-full max-w-md space-y-4'>
          {!isConnected ? (
            <button
              onClick={() => connect({ connector: injected() })}
              className='w-full bg-gray-700 hover:bg-gray-600 transition-colors duration-200 rounded-lg flex flex-col items-center justify-center p-6'
            >
              <div className='bg-yellow-500/10 p-3 rounded-full mb-3'>
                <Wallet className='w-6 h-6 text-yellow-400' />
              </div>
              <span className='text-gray-300'>
                Connect your wallet to start playing
              </span>
            </button>
          ) : (
            <Link
              href='/game'
              className='bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold py-4 px-8 rounded-lg w-full flex items-center justify-center space-x-2 hover:opacity-90 transition-opacity'
            >
              <Gamepad2 className='w-5 h-5' />
              <span>Play Now</span>
            </Link>
          )}
        </div>

        {/* Additional Info */}
        <div className='text-center text-gray-400 text-sm'>
          <p>Built with ❤️ on Ethereum</p>
        </div>
      </div>
    </>
  );
};

export default Home;
