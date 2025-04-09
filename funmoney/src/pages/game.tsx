'use client';

import { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import CreateGame from '../components/CreateGame';
import JoinGame from '../components/JoinGame';
import { ErrorBoundary } from 'react-error-boundary';


export default function GamePage() {
  const [activeTab, setActiveTab] = useState('create');

  return (
      <div className='space-y-6'>
        {/* Tabs */}
        <div className='flex space-x-2 bg-gray-800 p-1 rounded-lg'>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-colors ${
              activeTab === 'create'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Plus className='w-4 h-4' />
            <span>Create Game</span>
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-colors ${
              activeTab === 'join'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className='w-4 h-4' />
            <span>Join Game</span>
          </button>
        </div>

        {/* Content */}
        {activeTab === 'create' ? <CreateGame /> : <JoinGame />}
      </div>
  );
}
