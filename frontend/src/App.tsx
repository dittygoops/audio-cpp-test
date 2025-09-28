import { useState, useEffect } from 'react';
import TrackList from './components/TrackList';
import MultiTrackPlayer from './components/MultiTrackPlayer';
import './App.css';

function App() {
  const [midiFiles, setMidiFiles] = useState<string[]>([]);
  const [isMusicalScrollActive, setIsMusicalScrollActive] = useState(true);
  const [accumulatedScroll, setAccumulatedScroll] = useState(0);


  const handleMidiFilesUpdate = (files: string[]) => {
    setMidiFiles(files);
  };

  // Handle scroll-based note animation with scroll locking
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isMusicalScrollActive) {
        e.preventDefault();
        e.stopPropagation();
        
        // Accumulate scroll delta for musical animation (half duration)
        setAccumulatedScroll(prev => {
          const newScroll = Math.max(0, Math.min(100, prev + e.deltaY * 0.06));
          
          // When musical scroll reaches 100%, allow normal scrolling
          if (newScroll >= 100) {
            setIsMusicalScrollActive(false);
          }
          
          return newScroll;
        });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isMusicalScrollActive) {
        // Prevent arrow keys, page up/down, space, home, end from scrolling
        if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Space', 'Home', 'End'].includes(e.code)) {
          e.preventDefault();
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isMusicalScrollActive) {
        e.preventDefault();
      }
    };

    const handleScroll = () => {
      // Normal scroll behavior after musical animation
      // (Currently no additional scroll handling needed)
    };

    // Control note animation based on accumulated scroll
    const animateNotes = () => {
      const musicalNotes = document.querySelectorAll('.musical-note');
      const progress = accumulatedScroll / 100; // 0 to 1
      
      musicalNotes.forEach((note, index) => {
        const noteElement = note as HTMLElement;
        const baseDelay = index * 0.1; // More staggered notes
        const noteProgress = Math.max(0, Math.min(1, (progress * 1.5 + baseDelay) % 1)); // Slower movement
        
        if (isMusicalScrollActive) {
          // Move notes left across the staff during musical scroll (reversed direction)
          const xPosition = 95 - (noteProgress * 110); // 95vw to -15vw (right to left)
          noteElement.style.transform = `translateX(${xPosition}vw) translateY(-50%)`;
          noteElement.style.opacity = noteProgress > 0.05 && noteProgress < 0.95 ? '0.8' : '0.1';
        } else {
          // Fade out notes when musical scroll is complete
          noteElement.style.opacity = '0.05';
        }
      });
    };

    // Add event listeners with comprehensive scroll prevention
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('scroll', handleScroll, { passive: false });
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    // Prevent scrolling via CSS when musical scroll is active
    if (isMusicalScrollActive) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    // Animation loop
    const animationFrame = requestAnimationFrame(function animate() {
      animateNotes();
      requestAnimationFrame(animate);
    });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchmove', handleTouchMove);
      document.body.style.overflow = 'auto'; // Restore scrolling on cleanup
      cancelAnimationFrame(animationFrame);
    };
  }, [isMusicalScrollActive, accumulatedScroll]);

  return (
    <div className="bg-gray-900">
      {/* Full Screen Tutorial Section */}
      <section className="min-h-screen flex flex-col justify-center items-center relative overflow-hidden">
        {/* Animated Gradient Background */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900"
          style={{
            backgroundSize: '400% 400%',
            animation: 'gradientFlow 8s ease infinite'
          }}
        />
        
        {/* Additional flowing gradient layer */}
        <div 
          className="absolute inset-0 bg-gradient-to-tr from-purple-900/50 via-transparent to-cyan-900/50"
          style={{
            backgroundSize: '300% 300%',
            animation: 'gradientFlow 12s ease infinite reverse'
          }}
        />
        
        {/* Musical Staff Background */}
        <div className="absolute inset-0 opacity-30" id="musical-staff">
          
          {/* Musical Progress Indicator - Left Side */}
          {isMusicalScrollActive && (
            <div className="absolute bottom-4 left-4 z-20">
              <div className="bg-gray-800/80 rounded-full px-4 py-2 backdrop-blur-sm">
                <div className="flex items-center space-x-3">
                  <span className="text-blue-300 text-sm">♪ Playing Music</span>
                  <div className="w-32 h-2 bg-gray-600 rounded-full">
                    <div 
                      className="h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full transition-all duration-200"
                      style={{ width: `${accumulatedScroll}%` }}
                    />
                  </div>
                  <span className="text-gray-300 text-xs">{Math.round(accumulatedScroll)}%</span>
                </div>
              </div>
            </div>
          )}
          {/* Staff Lines - Larger and More Prominent */}
          {[...Array(5)].map((_, i) => (
            <div
              key={`staff-${i}`}
              className="absolute w-full h-1 bg-gradient-to-r from-blue-400/50 via-purple-400/70 to-cyan-400/50"
              style={{
                top: `${25 + i * 12}%`,
                transform: 'translateY(-50%)'
              }}
            />
          ))}
          
          {/* Massive Treble Clef - Lower Position */}
          <div 
            className="absolute text-blue-400/60 flex items-center justify-center"
            style={{
              left: '0.5%',
              top: '45%',
              width: '480px',
              height: '960px',
              fontSize: '800px',
              transform: 'translateY(-50%)',
              fontFamily: 'serif',
              lineHeight: '1'
            }}
          >
            𝄞
          </div>
          
          {/* Musical Notes - Properly positioned on staff */}
          {[...Array(20)].map((_, i) => {
            const noteTypes = ['♪', '♫', '♬', '♩', '♭', '♯'];
            const note = noteTypes[i % noteTypes.length];
            
            // Staff line positions: 25%, 37%, 49%, 61%, 73% (from staff lines calculation)
            // Staff space positions: 31%, 43%, 55%, 67% (between lines)
            // Additional positions above and below staff
            const staffPositions = [
              13, // Above staff (high)
              19, // Above staff (medium)
              25, // Top line (F)
              31, // Space (E)
              37, // Line (D)
              43, // Space (C)
              49, // Middle line (B)
              55, // Space (A)
              61, // Line (G)
              67, // Space (F)
              73, // Bottom line (E)
              79, // Below staff (medium)
              85  // Below staff (low)
            ];
            
            const staffPosition = staffPositions[i % staffPositions.length];
            
            return (
              <div
                key={`note-${i}`}
                className="absolute text-9xl text-blue-300/80 musical-note"
                style={{
                  left: `${15 + (i * 4)}%`,
                  top: `${staffPosition}%`,
                  transform: 'translateX(100vw) translateY(-50%)',
                  opacity: '0.3',
                  transition: 'transform 0.1s ease-out, opacity 0.2s ease-out'
                }}
                data-note-index={i}
              >
                {note}
              </div>
            );
          })}
          
          {/* Additional floating notes - Larger */}
          {[...Array(15)].map((_, i) => (
            <div
              key={`float-note-${i}`}
              className="absolute text-3xl text-purple-300/60"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${20 + Math.random() * 60}%`,
                animation: `floatNote ${6 + Math.random() * 6}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 3}s`
              }}
            >
              {['♪', '♫', '♬'][Math.floor(Math.random() * 3)]}
            </div>
          ))}
        </div>
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 bg-gray-800/80 backdrop-blur-sm shadow-sm border-b border-gray-700 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <svg 
                    width="32" 
                    height="32" 
                    viewBox="0 0 32 32" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-blue-400"
                  >
                    <defs>
                      <linearGradient id="waveformGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#A855F7" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.4" />
                      </linearGradient>
                    </defs>
                    {/* Waveform background with gradient */}
                    <path 
                      d="M4 16h2v4h-2v-4zM8 14h2v8h-2v-8zM12 12h2v12h-2v-12zM16 10h2v16h-2v-16zM20 12h2v12h-2v-12zM24 14h2v8h-2v-8zM28 16h2v4h-2v-4z" 
                      fill="url(#waveformGradient)"
                    />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-white">
                  YN Beats
                </h1>
              </div>
              <div className="text-sm text-gray-300">
                Beats From Your Bed
              </div>
            </div>
          </div>
        </header>

        {/* Tutorial Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center -mt-20">
          <div className="mb-8">
            <h2 
              className="text-4xl md:text-5xl font-bold text-white mb-4"
              style={{ animation: 'slideInFromLeft 1.2s ease-out forwards' }}
            >
              Create Music with AI
            </h2>
            <p 
              className="text-xl text-gray-300 mb-8"
              style={{ animation: 'slideInFromLeft 1.2s ease-out 0.3s forwards' }}
            >
              Transform your ideas into professional MIDI compositions
            </p>
          </div>

          {/* Custom Instructions Card */}
          <div 
            className="relative max-w-2xl mx-auto"
            style={{ animation: 'flyInFromSide 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.6s forwards' }}
          >
            {/* Layered background effects */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/8 via-purple-600/8 to-cyan-600/8 rounded-3xl blur-xl transform rotate-1"></div>
            <div className="absolute inset-0 bg-gray-800/25 rounded-3xl transform -rotate-1"></div>
            
            {/* Main content */}
            <div className="relative bg-gray-800/30 backdrop-blur-sm border border-gray-600/20 rounded-3xl p-10 shadow-2xl">
              {/* Subtle accent border */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 rounded-3xl blur-sm -z-10"></div>
              
              <h3 
                className="text-2xl font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-10 opacity-0"
                style={{ animation: 'textReveal 0.8s ease-out 2.0s forwards' }}
              >
                Create Music with Your Voice
              </h3>
              
              <ol className="text-left space-y-8 text-xl">
                <li 
                  className="flex items-start space-x-5 opacity-0"
                  style={{ animation: 'textReveal 0.6s ease-out 2.4s forwards' }}
                >
                  <span className="flex-shrink-0 w-12 h-12 bg-gray-700 text-blue-300 rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg border border-gray-600">1</span>
                  <span className="font-medium text-gray-100 leading-relaxed">Play any instrument with your voice</span>
                </li>
                <li 
                  className="flex items-start space-x-5 opacity-0"
                  style={{ animation: 'textReveal 0.6s ease-out 2.7s forwards' }}
                >
                  <span className="flex-shrink-0 w-12 h-12 bg-gray-700 text-blue-300 rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg border border-gray-600">2</span>
                  <span className="font-medium text-gray-100 leading-relaxed">Layer tracks to form rhythms and harmonies</span>
                </li>
                <li 
                  className="flex items-start space-x-5 opacity-0"
                  style={{ animation: 'textReveal 0.6s ease-out 3.0s forwards' }}
                >
                  <span className="flex-shrink-0 w-12 h-12 bg-gray-700 text-blue-300 rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg border border-gray-600">3</span>
                  <span className="font-medium text-gray-100 leading-relaxed">Enjoy and save your creations</span>
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* Custom Scroll Indicator - Center */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
          <p className="text-gray-300 mb-4 text-sm font-medium tracking-wide">Scroll down to get started</p>
          <div className="flex justify-center">
            <div className="relative">
              {/* Animated arrows */}
              <div className="flex flex-col items-center space-y-1">
                <div 
                  className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-blue-400"
                  style={{ animation: 'arrowPulse 2s ease-in-out infinite' }}
                />
                <div 
                  className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-purple-400"
                  style={{ animation: 'arrowPulse 2s ease-in-out infinite', animationDelay: '0.2s' }}
                />
                <div 
                  className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-cyan-400"
                  style={{ animation: 'arrowPulse 2s ease-in-out infinite', animationDelay: '0.4s' }}
                />
              </div>
              
              {/* Glowing background circle */}
              <div 
                className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-lg"
                style={{ animation: 'glow 3s ease-in-out infinite alternate' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-900 relative overflow-hidden">
        {/* Sparkle Effects */}
        {[...Array(12)].map((_, i) => (
          <div
            key={`sparkle-${i}`}
            className="absolute pointer-events-none"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `shootingStar ${3 + Math.random() * 4}s linear infinite`,
              animationDelay: `${Math.random() * 8}s`
            }}
          >
            <div className="w-1 h-1 bg-white rounded-full opacity-30">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent w-12 h-0.5 -translate-x-6 -translate-y-0.25 opacity-20"></div>
            </div>
          </div>
        ))}
        
        <div className="space-y-8">

          {/* Track List */}
          <TrackList onMidiFilesChange={handleMidiFilesUpdate} />

          {/* Multi-Track Player Section */}
          {midiFiles.length > 0 && (
            <MultiTrackPlayer 
              midiFiles={midiFiles}
              onTrackUpdate={(tracks) => {
                console.log('Multi-track player updated:', tracks);
              }}
            />
          )}
        </div>
      </main>

    </div>
  );
}

export default App;
