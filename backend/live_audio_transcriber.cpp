#include <iostream>
#include <fstream>
#include <vector>
#include <cmath>
#include <string>
#include <complex>
#include <numeric>
#include <atomic>
#include <chrono>
#include <thread>
#include <limits>
#include "portaudio.h"
#include "portmidi.h"
#include <fftw3.h>
#include <deque>
#include <algorithm>
#include <utility>
struct Detection {
    double timeSec;
    double frequencyHz;
    int midiNote;
};

// The buffer size is the number of frames PortAudio will deliver in each callback.
// The FFT requires a power of 2, so we'll use a slightly different size.
#define SAMPLE_RATE 48000
#define FFT_SIZE 8192  // Doubled from 4096
#define HOP_SIZE (FFT_SIZE / 2)
#define FRAMES_PER_BUFFER HOP_SIZE

// Noise reduction parameters
#define NOISE_GATE_THRESHOLD 0.005f  // Amplitude threshold for noise gate
#define SPECTRAL_MAGNITUDE_THRESHOLD 5.0  // Increased from 5.0 for better noise rejection
#define MIN_FREQUENCY 80.0   // Minimum frequency to consider (Hz)
#define MAX_FREQUENCY 2000.0 // Maximum frequency to consider (Hz)
#define CONSECUTIVE_DETECTIONS_REQUIRED 1  // Require 3 consecutive detections for note on
#define CONSECUTIVE_SILENCE_REQUIRED 1   // Require 2 consecutive silences for note off

// --- Helper Functions ---

// Noise gate function to filter out low-amplitude ambient noise
bool passesNoiseGate(const std::vector<float>& audioData) {
    float maxAmplitude = 0.0f;
    for (float sample : audioData) {
        float absSample = std::abs(sample);
        if (absSample > maxAmplitude) {
            maxAmplitude = absSample;
        }
    }
    return maxAmplitude > NOISE_GATE_THRESHOLD;
}

std::string getNoteName(int noteNumber) {
    if (noteNumber <= 0 || noteNumber > 127) {
        return "N/A";
    }
    const std::string noteNames[] = {"C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"};
    int octave = (noteNumber / 12) - 1;
    int noteIndex = noteNumber % 12;
    return noteNames[noteIndex] + std::to_string(octave);
}

int frequencyToMidiNote(double frequency) {
    if (frequency <= 0) {
        return 0; 
    }
    return static_cast<int>(round(69 + 12 * log2(frequency / 440.0)));
}

// --- Fast Fourier Transform (FFT) using FFTW ---

// Global FFTW plan and data for reuse
fftw_plan fftw_plan_ptr = nullptr;
fftw_complex* fftw_input = nullptr;
fftw_complex* fftw_output = nullptr;

void initializeFFTW() {
    fftw_input = (fftw_complex*) fftw_malloc(sizeof(fftw_complex) * FFT_SIZE);
    fftw_output = (fftw_complex*) fftw_malloc(sizeof(fftw_complex) * FFT_SIZE);
    fftw_plan_ptr = fftw_plan_dft_1d(FFT_SIZE, fftw_input, fftw_output, FFTW_FORWARD, FFTW_ESTIMATE);
}

void cleanupFFTW() {
    if (fftw_plan_ptr) {
        fftw_destroy_plan(fftw_plan_ptr);
        fftw_plan_ptr = nullptr;
    }
    if (fftw_input) {
        fftw_free(fftw_input);
        fftw_input = nullptr;
    }
    if (fftw_output) {
        fftw_free(fftw_output);
        fftw_output = nullptr;
    }
}

void fft(const std::vector<float>& input, std::vector<std::complex<double>>& output) {
    for (size_t i = 0; i < FFT_SIZE; ++i) {
        fftw_input[i][0] = (i < input.size()) ? input[i] : 0.0;
        fftw_input[i][1] = 0.0;
    }
    
    fftw_execute(fftw_plan_ptr);
    
    output.resize(FFT_SIZE);
    for (size_t i = 0; i < FFT_SIZE; ++i) {
        output[i] = std::complex<double>(fftw_output[i][0], fftw_output[i][1]);
    }
}

double detectFundamentalFrequency(const std::vector<float>& audioData) {
    // First check if audio passes noise gate
    if (!passesNoiseGate(audioData)) {
        return 0.0;
    }
    
    std::vector<std::complex<double>> fftData;
    fft(audioData, fftData);

    double maxMagnitude = 0;
    int maxIndex = -1;
    
    // Calculate frequency range indices
    int minIndex = static_cast<int>((MIN_FREQUENCY * FFT_SIZE) / SAMPLE_RATE);
    int maxIndexLimit = static_cast<int>((MAX_FREQUENCY * FFT_SIZE) / SAMPLE_RATE);
    
    // Limit to valid range
    minIndex = std::max(1, minIndex);
    maxIndexLimit = std::min(static_cast<int>(fftData.size() / 2), maxIndexLimit);
    
    for (int i = minIndex; i < maxIndexLimit; ++i) {
        double magnitude = std::abs(fftData[i]);
        if (magnitude > maxMagnitude) {
            maxMagnitude = magnitude;
            maxIndex = i;
        }
    }

    if (maxIndex > 0 && maxMagnitude > SPECTRAL_MAGNITUDE_THRESHOLD) {
        double frequency = (static_cast<double>(maxIndex) * SAMPLE_RATE) / FFT_SIZE;
        // Additional frequency range check
        if (frequency >= MIN_FREQUENCY && frequency <= MAX_FREQUENCY) {
            return frequency;
        }
    }
    return 0.0;
}

// --- PortAudio Callback Function ---

// Globals for real-time and non-real-time communication
int lastMidiNote = 0;
PmStream* midiStream = nullptr;
std::atomic<bool> noteChanged(false);
std::atomic<bool> shouldStop(false);
int currentMidiNote = 0;
double currentFrequency = 0.0;
int noteOffMidiNote = 0; // Track which note was turned off
unsigned long callbackCount = 0;

// Temporal smoothing variables
int consecutiveDetections = 0;
int consecutiveSilences = 0;
int pendingMidiNote = 0;
double pendingFrequency = 0.0;
// Buffer for 50% overlap analysis
std::deque<float> overlapBuffer;
// Track processed audio frames to compute timestamps at window centers
uint64_t framesProcessed = 0;

static int paCallback(const void* inputBuffer, void* outputBuffer,
                      unsigned long framesPerBuffer,
                      const PaStreamCallbackTimeInfo* timeInfo,
                      PaStreamCallbackFlags statusFlags,
                      void* userData) {
    
    std::vector<Detection>* recordedDetections = static_cast<std::vector<Detection>*>(userData);
    const float* in = (const float*)inputBuffer;

    // Append new samples to overlap buffer
    for (unsigned long i = 0; i < framesPerBuffer; ++i) {
        overlapBuffer.push_back(in[i]);
    }

    // Process as many windows as are available (typically one per callback with 50% overlap)
    while (overlapBuffer.size() >= FFT_SIZE) {
        std::vector<float> audioWindow(FFT_SIZE);
        std::copy(overlapBuffer.begin(), overlapBuffer.begin() + FFT_SIZE, audioWindow.begin());

        double fundamentalFrequency = detectFundamentalFrequency(audioWindow);
        int newMidiNote = frequencyToMidiNote(fundamentalFrequency);
        // Timestamp at the center of the analysis window
        double timestampSec = (static_cast<double>(framesProcessed) + (FFT_SIZE / 2.0)) / static_cast<double>(SAMPLE_RATE);

        // Temporal smoothing logic
        if (newMidiNote > 0 && fundamentalFrequency > 200) {
            // Valid note detected
            if (newMidiNote == pendingMidiNote) {
                consecutiveDetections++;
            } else {
                // Different note detected, reset counter
                consecutiveDetections = 1;
                pendingMidiNote = newMidiNote;
                pendingFrequency = fundamentalFrequency;
            }
            consecutiveSilences = 0; // Reset silence counter
            
            // Check if we have enough consecutive detections to trigger note on
            if (consecutiveDetections >= CONSECUTIVE_DETECTIONS_REQUIRED && newMidiNote != lastMidiNote) {
                recordedDetections->push_back(Detection{timestampSec, fundamentalFrequency, newMidiNote});
                
                if (lastMidiNote > 0) {
                    Pm_WriteShort(midiStream, 0, Pm_Message(0x90, lastMidiNote, 0));
                }
                Pm_WriteShort(midiStream, 0, Pm_Message(0x90, newMidiNote, 100));
                lastMidiNote = newMidiNote;
                currentMidiNote = newMidiNote;
                currentFrequency = fundamentalFrequency;
                noteChanged = true;
            }
        } else {
            // No valid note detected
            consecutiveSilences++;
            consecutiveDetections = 0; // Reset detection counter
            
            // Check if we have enough consecutive silences to trigger note off
            if (consecutiveSilences >= CONSECUTIVE_SILENCE_REQUIRED && lastMidiNote > 0) {
                Pm_WriteShort(midiStream, 0, Pm_Message(0x90, lastMidiNote, 0));
                noteOffMidiNote = lastMidiNote; // Store which note was turned off
                lastMidiNote = 0;
                currentMidiNote = 0;
                currentFrequency = 0.0;
                noteChanged = true;
            }
        }

        // Advance by hop size to achieve 50% overlap
        for (size_t i = 0; i < HOP_SIZE; ++i) {
            overlapBuffer.pop_front();
        }
        framesProcessed += HOP_SIZE;
    }
    
    callbackCount++;
    return paContinue;
}

int main() {
    PaError paErr;
    PmError pmErr;
    PaStream* stream;
    
    std::vector<Detection> recordedDetections;
    
    std::cout << "Initializing FFTW..." << std::endl;
    initializeFFTW();
    
    std::cout << "Initializing PortAudio..." << std::endl;
    paErr = Pa_Initialize();
    if (paErr != paNoError) {
        std::cerr << "PortAudio error: " << Pa_GetErrorText(paErr) << std::endl;
        cleanupFFTW();
        return 1;
    }
    
    std::cout << "Initializing PortMidi..." << std::endl;
    pmErr = Pm_Initialize();
    if (pmErr != pmNoError) {
        std::cerr << "PortMidi error: " << Pm_GetErrorText(pmErr) << std::endl;
        Pa_Terminate();
        return 1;
    }

    int outputDevice = -1;
    for (int i = 0; i < Pm_CountDevices(); ++i) {
        const PmDeviceInfo* info = Pm_GetDeviceInfo(i);
        if (info && info->output) {
            std::cout << "Found MIDI output device: " << info->name << " at index " << i << std::endl;
            outputDevice = i;
            break; 
        }
    }

    if (outputDevice == -1) {
        std::cerr << "Error: No MIDI output device found. You may need a virtual MIDI cable or a connected device." << std::endl;
        Pa_Terminate();
        Pm_Terminate();
        return 1;
    }
    
    pmErr = Pm_OpenOutput(&midiStream, outputDevice, NULL, 0, NULL, NULL, 0);
    if (pmErr != pmNoError) {
        std::cerr << "PortMidi error: " << Pm_GetErrorText(pmErr) << std::endl;
        Pa_Terminate();
        Pm_Terminate();
        cleanupFFTW();
        return 1;
    }
    
    PaStreamParameters inputParameters;
    inputParameters.device = Pa_GetDefaultInputDevice();
    if (inputParameters.device == paNoDevice) {
        std::cerr << "Error: No default input device found." << std::endl;
        Pa_Terminate();
        Pm_Terminate();
        cleanupFFTW();
        return 1;
    }
    inputParameters.channelCount = 1;
    inputParameters.sampleFormat = paFloat32;
    inputParameters.suggestedLatency = Pa_GetDeviceInfo(inputParameters.device)->defaultLowInputLatency;
    inputParameters.hostApiSpecificStreamInfo = NULL;
    
    paErr = Pa_OpenStream(
        &stream,
        &inputParameters,
        NULL,
        SAMPLE_RATE,
        FRAMES_PER_BUFFER,
        paClipOff,
        paCallback,
        &recordedDetections);
    if (paErr != paNoError) {
        std::cerr << "PortAudio error: " << Pa_GetErrorText(paErr) << std::endl;
        Pa_Terminate();
        Pm_Terminate();
        cleanupFFTW();
        return 1;
    }
    
    std::cout << "Starting live audio transcription to MIDI. Hum or play a note! Press Enter to stop." << std::endl;
    paErr = Pa_StartStream(stream);
    if (paErr != paNoError) {
        std::cerr << "PortAudio error: " << Pa_GetErrorText(paErr) << std::endl;
        Pa_CloseStream(stream);
        Pa_Terminate();
        Pm_Terminate();
        cleanupFFTW();
        return 1;
    }
    
    // Start input monitoring thread
    std::thread inputThread([]() {
        std::cout << "Press Enter to stop recording and save data..." << std::endl;
        std::cin.get(); // Wait for Enter key
        shouldStop = true;
    });
    
    // Main loop for I/O and user interaction
    while(!shouldStop.load()) {
        // Non-real-time I/O handling
        if (noteChanged.load()) {
            if (currentMidiNote > 0) {
                std::cout << "Detected Frequency: " << currentFrequency << " Hz -> Transcribed Note: " << getNoteName(currentMidiNote) << std::endl;
            } else {
                // Display note off message
                if (noteOffMidiNote > 0) {
                    std::cout << "Note Off: " << getNoteName(noteOffMidiNote) << std::endl;
                    noteOffMidiNote = 0; // Reset after displaying
                }
            }
            noteChanged = false;
        }

        // Log callback count periodically
        static auto lastLogTime = std::chrono::steady_clock::now();
        auto currentTime = std::chrono::steady_clock::now();
        if (std::chrono::duration_cast<std::chrono::seconds>(currentTime - lastLogTime).count() >= 5) {
            std::cout << "Callbacks processed in last 5s: " << callbackCount << std::endl;
            callbackCount = 0;
            lastLogTime = currentTime;
        }

        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }
    
    // Wait for input thread to finish
    inputThread.join();

    if (lastMidiNote > 0) {
        Pm_WriteShort(midiStream, 0, Pm_Message(0x90, lastMidiNote, 0));
    }
    paErr = Pa_StopStream(stream);
    if (paErr != paNoError) {
        std::cerr << "PortAudio error: " << Pa_GetErrorText(paErr) << std::endl;
    }
    paErr = Pa_CloseStream(stream);
    if (paErr != paNoError) {
        std::cerr << "PortAudio error: " << Pa_GetErrorText(paErr) << std::endl;
    }
    
    Pm_Close(midiStream);
    Pm_Terminate();
    Pa_Terminate();
    cleanupFFTW();
    std::cout << "Transcription stopped and cleaned up." << std::endl;
    
    // Save the recorded detections (frequency, midi) to a file
    std::cout << "Saving recorded detections to frequency_data.txt..." << std::endl;
    std::ofstream outputFile("frequency_data.txt");
    if (outputFile.is_open()) {
        for (const auto& det : recordedDetections) {
            outputFile << det.timeSec << "," << det.frequencyHz << "," << det.midiNote << "\n";
        }
        outputFile.close();
        std::cout << "Successfully saved " << recordedDetections.size() << " detections (time_s,freq_hz,midi) to frequency_data.txt" << std::endl;
        std::cout << "Format: time_seconds,frequency_hz,midi_note per line." << std::endl;
    } else {
        std::cerr << "Error: Unable to open frequency_data.txt for writing." << std::endl;
    }

    return 0;
}