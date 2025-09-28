import { useState, useRef, useEffect } from 'react';
import Fuse from 'fuse.js';
import { MIDI_INSTRUMENTS } from '../services/api';

interface InstrumentSearchProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const InstrumentSearch: React.FC<InstrumentSearchProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredInstruments, setFilteredInstruments] = useState(MIDI_INSTRUMENTS);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize Fuse.js for fuzzy search
  const fuse = new Fuse(MIDI_INSTRUMENTS, {
    keys: ['label'],
    threshold: 0.3, // Lower threshold = more strict matching
    ignoreLocation: true,
    findAllMatches: true,
  });

  // Get the current selected instrument
  const selectedInstrument = MIDI_INSTRUMENTS.find(inst => inst.value === value);

  useEffect(() => {
    // Set initial search term to selected instrument label
    if (selectedInstrument && !isOpen) {
      setSearchTerm(selectedInstrument.label);
    }
  }, [selectedInstrument, isOpen]);

  useEffect(() => {
    // Filter instruments based on search term
    if (searchTerm.trim()) {
      const results = fuse.search(searchTerm);
      setFilteredInstruments(results.map(result => result.item));
    } else {
      setFilteredInstruments(MIDI_INSTRUMENTS);
    }
    setHighlightedIndex(-1);
  }, [searchTerm]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset search term to selected instrument when closing
        if (selectedInstrument) {
          setSearchTerm(selectedInstrument.label);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedInstrument]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setSearchTerm(''); // Clear search term when focusing to allow fresh search
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredInstruments.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredInstruments.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredInstruments[highlightedIndex]) {
          selectInstrument(filteredInstruments[highlightedIndex]);
        } else if (filteredInstruments.length === 1) {
          selectInstrument(filteredInstruments[0]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        if (selectedInstrument) {
          setSearchTerm(selectedInstrument.label);
        }
        inputRef.current?.blur();
        break;
    }
  };

  const selectInstrument = (instrument: typeof MIDI_INSTRUMENTS[0]) => {
    onChange(instrument.value);
    setSearchTerm(instrument.label);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [highlightedIndex]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        placeholder="Search for an instrument..."
        className="w-full p-2 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400"
        autoComplete="off"
      />
      
      {/* Search icon - properly centered accounting for input padding */}
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="w-4 h-4 text-gray-400"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
      </div>

      {/* Dropdown list */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
          <ul ref={listRef} className="py-1">
            {filteredInstruments.length > 0 ? (
              filteredInstruments.map((instrument, index) => (
                <li
                  key={instrument.value}
                  onClick={() => selectInstrument(instrument)}
                  className={`px-3 py-2 cursor-pointer transition-colors ${
                    index === highlightedIndex
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-600'
                  } ${
                    instrument.value === value
                      ? 'bg-blue-700 text-blue-200 font-medium'
                      : 'text-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{instrument.label}</span>
                    {instrument.value === value && (
                      <span className="text-blue-400">✓</span>
                    )}
                  </div>
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-gray-400 italic">
                No instruments found
              </li>
            )}
          </ul>
        </div>
      )}
      
      {/* Selected instrument indicator */}
      {selectedInstrument && !isOpen && (
        <div className="mt-1 text-sm text-gray-400">
          Selected: {selectedInstrument.label}
        </div>
      )}
    </div>
  );
};

export default InstrumentSearch;
