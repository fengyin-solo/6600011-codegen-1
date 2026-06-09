from fastapi import APIRouter
from ..services.eeg_processor import generate_mock_eeg, compute_band_power, compute_spectrogram, compute_brain_state, compute_correlation, SAMPLE_RATE, CHANNELS, CHANNEL_NAMES

router = APIRouter(prefix="/eeg", tags=["eeg"])

DOWNSAMPLE_FACTOR = 4

@router.get("/stream")
async def stream_eeg(duration: float = 5.0):
    return generate_mock_eeg(duration)

@router.get("/bands/{channel}")
async def band_power(channel: str):
    data = generate_mock_eeg(5.0)
    if channel in data['data']:
        return {'channel': channel, 'bands': compute_band_power(data['data'][channel], SAMPLE_RATE)}
    return {'error': 'Channel not found'}

@router.get("/brain-state/{channel}")
async def brain_state(channel: str):
    data = generate_mock_eeg(5.0)
    if channel in data['data']:
        return {'channel': channel, 'state': compute_brain_state(data['data'][channel], SAMPLE_RATE)}
    return {'error': 'Channel not found'}

@router.get("/spectrogram/{channel}")
async def spectrogram(channel: str):
    data = generate_mock_eeg(5.0)
    if channel in data['data']:
        return {'channel': channel, 'spectrogram': compute_spectrogram(data['data'][channel], SAMPLE_RATE)}
    return {'error': 'Channel not found'}

@router.get("/correlation/{channel}")
async def correlation(channel: str, duration: float = 3.0):
    data = generate_mock_eeg(duration)
    if channel not in data['data']:
        return {'error': 'Channel not found'}
    return compute_correlation(channel, data['data'], SAMPLE_RATE)

@router.get("/channels")
async def list_channels():
    from ..services.eeg_processor import CHANNELS
    return {'channels': CHANNELS}

@router.get("/sample/{channel}")
async def full_sample(channel: str, duration: float = 3.0):
    data = generate_mock_eeg(duration)
    if channel not in data['data']:
        return {'error': 'Channel not found'}
    channel_data = data['data'][channel]
    return {
        'channel': channel,
        'eeg': data,
        'bands': compute_band_power(channel_data, SAMPLE_RATE),
        'brainState': compute_brain_state(channel_data, SAMPLE_RATE),
        'correlation': compute_correlation(channel, data['data'], SAMPLE_RATE)
    }

@router.get("/multi-channel-comparison")
async def multi_channel_comparison(channels: str = 'Fp1,Fp2,O1,O2', duration: float = 3.0):
    requested = [ch.strip() for ch in channels.split(',') if ch.strip() in CHANNELS]
    if not requested:
        requested = CHANNELS[:4]
    data = generate_mock_eeg(duration)
    import time
    full_time = data['time']
    ds_time = [round(full_time[i], 4) for i in range(0, len(full_time), DOWNSAMPLE_FACTOR)]
    snapshots = []
    for ch in requested:
        ch_data = data['data'][ch]
        ds_waveform = [round(float(ch_data[i]), 6) for i in range(0, len(ch_data), DOWNSAMPLE_FACTOR)]
        snapshots.append({
            'channel': ch,
            'channelName': CHANNEL_NAMES.get(ch, ch),
            'bandPower': compute_band_power(ch_data, SAMPLE_RATE),
            'brainState': compute_brain_state(ch_data, SAMPLE_RATE),
            'waveform': ds_waveform,
            'time': ds_time,
        })
    return {
        'channels': snapshots,
        'timestamp': int(time.time() * 1000),
    }
