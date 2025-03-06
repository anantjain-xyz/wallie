import React, { useState, useEffect, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Transition } from '@headlessui/react';
import classnames from 'classnames';
import { createPortal } from 'react-dom';

// Import icons
import { BsCollectionFill as IssuesIcon } from 'react-icons/bs';
import { BsGearFill as SettingsIcon } from 'react-icons/bs';
import { BsSearch as SearchIcon } from 'react-icons/bs';
import { BsPencilSquare as AddIcon } from 'react-icons/bs';

interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateIssue: () => void;
  onNavigate: (path: string) => void;
}

interface CommandOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string[];
  path?: string;
  action: () => void;
}

const CommandBar: React.FC<CommandBarProps> = ({ 
  isOpen, 
  onClose, 
  onCreateIssue,
  onNavigate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Define command options
  const commandOptions: CommandOption[] = [
    {
      id: 'issues',
      label: 'Go to Issues',
      icon: <IssuesIcon className="w-3 h-3 text-gray-500" />,
      shortcut: ['g', 'i'],
      path: '/',
      action: () => {
        onNavigate('/');
        onClose();
      }
    },
    {
      id: 'search',
      label: 'Go to Search',
      icon: <SearchIcon className="w-3 h-3 text-gray-500" />,
      shortcut: ['/'],
      path: '/search',
      action: () => {
        onNavigate('/search');
        onClose();
      }
    },
    {
      id: 'settings',
      label: 'Go to Settings',
      icon: <SettingsIcon className="w-3 h-3 text-gray-500" />,
      shortcut: ['g', 's'],
      path: '/settings',
      action: () => {
        onNavigate('/settings');
        onClose();
      }
    },
    {
      id: 'create-issue',
      label: 'Create new issue',
      icon: <AddIcon className="w-3 h-3 text-gray-500" />,
      shortcut: ['c'],
      action: () => {
        onCreateIssue();
        onClose();
      }
    }
  ];

  // Filter options based on search query
  const filteredOptions = commandOptions.filter(option => 
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const timeoutId = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      
      // Clean up the timeout when component unmounts or effect re-runs
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useHotkeys('down', (e) => {
    if (isOpen) {
      e.preventDefault();
      setSelectedOptionIndex(prev => 
        prev < filteredOptions.length - 1 ? prev + 1 : prev
      );
    }
  }, { enableOnFormTags: true }, [isOpen, filteredOptions.length]);

  useHotkeys('up', (e) => {
    if (isOpen) {
      e.preventDefault();
      setSelectedOptionIndex(prev => prev > 0 ? prev - 1 : 0);
    }
  }, { enableOnFormTags: true }, [isOpen]);

  useHotkeys('enter', () => {
    if (isOpen && filteredOptions.length > 0) {
      filteredOptions[selectedOptionIndex].action();
    }
  }, { enableOnFormTags: true }, [isOpen, filteredOptions, selectedOptionIndex]);

  useHotkeys('esc', () => {
    if (isOpen) {
      onClose();
    }
  }, { enableOnFormTags: true }, [isOpen, onClose]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedOptionIndex(0);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setSelectedOptionIndex(0);
  };

  const renderShortcut = (shortcut: string[] | undefined) => {
    if (!shortcut) return null;
    
    return (
      <div className="flex items-center space-x-1">
        {shortcut.map((key, index) => (
          <React.Fragment key={`${key}`}>
            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-50 rounded">
              {key}
            </kbd>
            {index < shortcut.length - 1 && <span className="text-gray-400">+</span>}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const commandBar = (
    <Transition
      show={isOpen}
      enter="transition ease-out duration-200"
      enterFrom="transform opacity-0 scale-95"
      enterTo="transform opacity-100 scale-100"
      leave="transition ease-in duration-150"
      leaveFrom="transform opacity-100 scale-100"
      leaveTo="transform opacity-0 scale-95"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20"
    >
      <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="p-2">
          <div className="flex items-center px-3 py-2 border-b border-gray-200">
            <SearchIcon className="w-3 h-3 text-gray-400 mr-2" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a command or search..."
              className="w-full bg-transparent border-none outline-none text-gray-800 placeholder-gray-400"
              value={searchQuery}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="py-2 max-h-80 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={option.id}
                  className={classnames(
                    "flex items-center justify-between px-3 py-2 cursor-pointer",
                    {
                      "bg-purple-50": index === selectedOptionIndex
                    }
                  )}
                  onClick={() => option.action()}
                  onMouseEnter={() => setSelectedOptionIndex(index)}
                >
                  <div className="flex items-center">
                    {option.icon}
                    <span className="ml-3 text-gray-700">{option.label}</span>
                  </div>
                  {renderShortcut(option.shortcut)}
                </div>
              ))
            ) : (
              <div className="px-3 py-6 text-center text-gray-500">
                No commands found
              </div>
            )}
          </div>
        </div>
      </div>
    </Transition>
  );

  // Get the root-modal element for portal
  const modalRoot = document.getElementById('root-modal');
  
  // If modalRoot doesn't exist yet, return null
  if (!modalRoot) return null;
  
  return createPortal(commandBar, modalRoot);
};

export default CommandBar; 