import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import math

# --- Helper Functions for Note Names ---

# Function to get the frequency for a given MIDI note number.
def get_frequency_for_note(midi_note):
    return 440.0 * (2.0 ** ((midi_note - 69.0) / 12.0))

# Function to get the note name and octave from a MIDI note number.
def get_note_name(midi_note):
    if midi_note < 0 or midi_note > 127:
        return ""
    note_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    note_index = midi_note % 12
    octave = (midi_note // 12) - 1
    return f"{note_names[note_index]}{octave}"

# Read the data from the file (supports "freq", "freq,midi" or "time,freq,midi")
frequencies = []
midis = []
times = []
with open('frequency_data.txt', 'r') as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        parts = line.split(',')
        try:
            if len(parts) >= 3:
                t = float(parts[0])
                freq = float(parts[1])
                midi = int(parts[2])
                times.append(t)
                frequencies.append(freq)
                midis.append(midi)
            elif len(parts) == 2:
                freq = float(parts[0])
                midi = int(parts[1])
                frequencies.append(freq)
                midis.append(midi)
            elif len(parts) == 1:
                frequencies.append(float(parts[0]))
        except ValueError:
            continue
has_midi = len(midis) == len(frequencies) and len(frequencies) > 0

# --- Smoothing the data using a moving average filter ---
def smooth_data(data, window_size):
    if len(data) < window_size:
        return data

    smoothed = []
    for i in range(len(data)):
        start_index = max(0, i - window_size // 2)
        end_index = min(len(data), i + window_size // 2 + 1)
        window = data[start_index:end_index]
        smoothed.append(sum(window) / len(window))
    return smoothed

# Apply the smoothing filter with a window size of 10
window_size = 10
smoothed_frequencies = smooth_data(frequencies, window_size)

# --- Prepare MIDI label ticks for left axis (will be set dynamically when MIDI exists) ---

# --- Generate X-axis (Time in Seconds) ---
if len(times) == len(frequencies) and len(times) > 0:
    x_time = times
else:
    sample_rate = 48000
    frames_per_buffer = 2048  # matches hop size in the C++ recorder
    seconds_per_frame = frames_per_buffer / sample_rate
    x_time = [i * seconds_per_frame for i in range(len(frequencies))]

# Create a DataFrame for Plotly
data = {
    'Time (s)': x_time,
    'Raw Frequency (Hz)': frequencies,
    'Smoothed Frequency (Hz)': smoothed_frequencies
}
if has_midi:
    data['MIDI Note'] = midis
    data['MIDI Frequency (Hz)'] = [get_frequency_for_note(m) for m in midis]
df = pd.DataFrame(data)

# Add note names to the DataFrame for hover text
df['Raw Note'] = df['Raw Frequency (Hz)'].apply(lambda f: get_note_name(round(69 + 12 * math.log2(f / 440.0))))
df['Smoothed Note'] = df['Smoothed Frequency (Hz)'].apply(lambda f: get_note_name(round(69 + 12 * math.log2(f / 440.0))))
if has_midi:
    df['MIDI Note Name'] = df['MIDI Note'].apply(get_note_name)

# Create the figure
fig = go.Figure()

# Add the raw data trace (right axis: frequency)
fig.add_trace(go.Scatter(
    x=df['Time (s)'],
    y=df['Raw Frequency (Hz)'],
    mode='lines',
    name='Raw Data',
    line=dict(color='gray', width=1),
    opacity=0.5,
    yaxis='y2',
    hovertext=df['Raw Note'] + '<br>' + df['Raw Frequency (Hz)'].round(2).astype(str) + ' Hz',
    hovertemplate='%{hovertext}<extra></extra>'
))

# Add the smoothed data trace (right axis: frequency)
fig.add_trace(go.Scatter(
    x=df['Time (s)'],
    y=df['Smoothed Frequency (Hz)'],
    mode='lines',
    name=f'Smoothed Data (Window Size: {window_size})',
    line=dict(color='blue', width=2),
    yaxis='y2',
    hovertext=df['Smoothed Note'] + '<br>' + df['Smoothed Frequency (Hz)'].round(2).astype(str) + ' Hz',
    hovertemplate='%{hovertext}<extra></extra>'
))

# Add MIDI-derived traces if available
if has_midi:
    # MIDI converted to frequency (right axis) for comparison
    fig.add_trace(go.Scatter(
        x=df['Time (s)'],
        y=df['MIDI Frequency (Hz)'],
        mode='lines',
        name='MIDI as Frequency',
        line=dict(color='red', width=1),
        yaxis='y2',
        hovertext=df['MIDI Note'].astype(str) + ' (' + df['MIDI Note Name'] + ')',
        hovertemplate='%{hovertext}<extra></extra>'
    ))

    # Discrete MIDI note numbers on left y-axis
    fig.add_trace(go.Scatter(
        x=df['Time (s)'],
        y=df['MIDI Note'],
        mode='lines+markers',
        name='MIDI Note (Discrete)',
        line=dict(color='crimson', width=1),
        marker=dict(size=4),
        hovertext=df['MIDI Note'].astype(str) + ' (' + df['MIDI Note Name'] + ')',
        hovertemplate='%{hovertext}<extra></extra>'
    ))

# Update layout
fig.update_layout(
    title='Detected Notes Over Time (Left: Note/MIDI, Right: Frequency Hz)',
    xaxis_title='Time (seconds)'
)

# Configure axes: left = MIDI notes with names; right = frequency in Hz (log)
if has_midi:
    midi_min = max(0, int(min(midis)) if len(midis) > 0 else 0)
    midi_max = min(127, int(max(midis)) if len(midis) > 0 else 127)
    fig.update_layout(
        yaxis=dict(
            title='Note (MIDI)',
            tickmode='array',
            tickvals=list(range(midi_min, midi_max + 1)),
            ticktext=[f"{get_note_name(m)} ({m})" for m in range(midi_min, midi_max + 1)],
            range=[midi_min - 1, midi_max + 1]
        ),
        yaxis2=dict(
            title='Frequency (Hz)',
            overlaying='y',
            side='right',
            type='log'
        )
    )
else:
    # If no MIDI, keep a single frequency axis on the right for consistency
    fig.update_layout(
        yaxis2=dict(
            title='Frequency (Hz)',
            overlaying='y',
            side='right',
            type='log'
        )
    )

fig.show()