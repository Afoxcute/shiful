'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/router'; // Import useRouter
import { Home, GamepadIcon, History } from 'lucide-react';
import { useAccount } from 'wagmi';
import { toast } from 'react-hot-toast'; 
import Image from 'next/image';
import { useConnect, useDisconnect } from 'wagmi';
import { useEffect, useMemo } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

import '@rainbow-me/rainbowkit/styles.css';

const NAV_ITEMS = [
  {
    path: '/',
    label: 'Home',
    icon: Home,
  },
  {
    path: '/game',
    label: 'Game',
    icon: GamepadIcon,
  },
  {
    path: '/history',
    label: 'History',
    icon: History,
  },
];

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const router = useRouter(); // Initialize useRouter

  const handleLinkClick = (path: string) => {
    if (!isConnected && path !== '/') {
      toast.error('Please connect your wallet to access this feature.'); // Show error message
    }
  };

  return (
    <div className='flex flex-col min-h-screen bg-gray-800'>
      {/* Header */}
      <header className='fixed top-0 left-0 right-0 h-14 bg-gray-900 shadow-lg z-50'>
        <div className='flex items-center justify-between h-full px-4'>
          <Image
            src='/rps-img.webp' // Update with your image path
            alt='Rock Paper scissor' // Provide an alt text for accessibility
            width={40} // Set the desired width
            height={40} // Set the desired height
            className='ml-2' // Add margin to the left for spacing
          />
          <ConnectButton />
        </div>
      </header>

      {/* Main Content */}
      <main className='flex-1 mt-14 mb-16 overflow-y-auto bg-gray-800'>
        <div className='container mx-auto px-4 py-6 max-w-lg'>{children}</div>
      </main>

      {/* Footer Navigation */}
      <footer className='fixed bottom-0 left-0 right-0 h-16 bg-gray-900 border-t border-gray-800'>
        <nav className='h-full'>
          <ul className='flex items-center justify-around h-full'>
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
              const isActive =
                pathname === path ||
                (path === '/game' && router.asPath.startsWith('/game')); // Update active condition
              return (
                <li key={path} className='flex-1'>
                  <Link
                    href={isConnected || path === '/' ? path : '#'} // Disable link if not connected
                    onClick={() => handleLinkClick(path)} // Handle click
                    className={`flex flex-col items-center justify-center h-full transition-colors duration-200 ${
                      isActive
                        ? 'text-blue-500'
                        : 'text-gray-400 hover:text-blue-500'
                    } ${
                      !isConnected && path !== '/'
                        ? 'cursor-not-allowed opacity-50'
                        : ''
                    }`} // Add styles for disabled state
                  >
                    <Icon size={24} className='mb-1' />
                    <span className='text-xs'>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </footer>
    </div>
  );
};

export default Layout;