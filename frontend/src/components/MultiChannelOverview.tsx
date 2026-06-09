import React, { useEffect, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { useEEGStore } from '../store/eeg';
import { MultiChannelComparison, ChannelSnapshot } from '../types';
import axios from 'axios';

const ALL_CHANNELS = ['Fp1', 'Fp2', 'F3', 'F4', 'C3', 'C4', 'P3', 'P4', 'O1', 'O2'];
const CHANNEL_NAMES: Record<string, string> = {
  Fp1: '左前额', Fp2: '右前额', F3: '左额', F4: '右额',
  C3: '左中央', C4: '右中央', P3: '左顶', P4: '右顶',
  O1: '左枕', O2: '右枕'
};

const CHANNEL_COLORS: Record<string, string> = {
  Fp1: '#1976d2', Fp2: '#42a5f5', F3: '#7b1fa2', F4: '#ab47bc',
  C3: '#00897b', C4: '#26a69a', P3: '#ef6c00', P4: '#ffa726',
  O1: '#c62828', O2: '#ef5350',
};

const BAND_LABELS = ['delta', 'theta', 'alpha', 'beta', 'gamma'];
const BAND_NAMES: Record<string, string> = { delta: 'Delta', theta: 'Theta', alpha: 'Alpha', beta: 'Beta', gamma: 'Gamma' };
const BAND_COLORS = ['#1565c0', '#2e7d32', '#f9a825', '#e53935', '#6a1b9a'];

const SAMPLE_RATE = 256;

const generateMockComparison = (channels: string[]): MultiChannelComparison => {
  const length = Math.floor(SAMPLE_RATE * 3);
  const time = Array.from({ length }, (_, i) => i / SAMPLE_RATE);
  const snapshots: ChannelSnapshot[] = channels.map(ch => {
    const alphaFreq = 8 + Math.random() * 4;
    const betaFreq = 15 + Math.random() * 10;
    const waveform = time.map(t =>
      0.5 * Math.sin(2 * Math.PI * alphaFreq * t) +
      0.3 * Math.sin(2 * Math.PI * betaFreq * t) +
      0.2 * (Math.random() * 2 - 1)
    );
    const total = 10 + Math.random() * 5;
    const bandPower = {
      delta: total * (0.2 + Math.random() * 0.1),
      theta: total * (0.15 + Math.random() * 0.1),
      alpha: total * (0.25 + Math.random() * 0.15),
      beta: total * (0.3 + Math.random() * 0.15),
      gamma: total * (0.1 + Math.random() * 0.05),
    };
    const bpTotal = bandPower.delta + bandPower.theta + bandPower.alpha + bandPower.beta + bandPower.gamma + 1e-10;
    const focus = Math.min(100, Math.max(0, (bandPower.beta / bpTotal) * 300 + (Math.random() - 0.5) * 10));
    const relaxation = Math.min(100, Math.max(0, (bandPower.alpha / bpTotal) * 300 + (Math.random() - 0.5) * 10));
    const fatigue = Math.min(100, Math.max(0, (bandPower.theta / bpTotal) * 300 + (Math.random() - 0.5) * 10));
    const scores = { focused: focus, relaxed: relaxation, fatigued: fatigue };
    const maxScore = Math.max(...Object.values(scores));
    let status: 'focused' | 'relaxed' | 'fatigued' | 'neutral' = 'neutral';
    let statusLabel = '平稳';
    let statusColor = '#757575';
    if (maxScore >= 50) {
      const maxKey = (Object.keys(scores) as (keyof typeof scores)[]).find(k => scores[k] === maxScore)!;
      status = maxKey;
      if (status === 'focused') { statusLabel = '专注'; statusColor = '#1976d2'; }
      else if (status === 'relaxed') { statusLabel = '放松'; statusColor = '#388e3c'; }
      else { statusLabel = '疲劳'; statusColor = '#d32f2f'; }
    }
    return {
      channel: ch,
      channelName: CHANNEL_NAMES[ch] || ch,
      bandPower,
      brainState: {
        focus: Math.round(focus * 10) / 10,
        relaxation: Math.round(relaxation * 10) / 10,
        fatigue: Math.round(fatigue * 10) / 10,
        status,
        statusLabel,
        statusColor,
        timestamp: Date.now(),
      },
      waveform,
      time,
    };
  });
  return { channels: snapshots, timestamp: Date.now() };
};

const ChannelPill: React.FC<{
  channel: string;
  selected: boolean;
  onToggle: () => void;
}> = ({ channel, selected, onToggle }) => (
  <button
    onClick={onToggle}
    style={{
      padding: selected ? '6px 14px' : '5px 12px',
      borderRadius: '16px',
      border: selected ? `2px solid ${CHANNEL_COLORS[channel]}` : '1px solid #ddd',
      background: selected ? CHANNEL_COLORS[channel] : '#f5f5f5',
      color: selected ? '#fff' : '#666',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: selected ? 700 : 400,
      transition: 'all 0.2s ease',
      whiteSpace: 'nowrap',
    }}
  >
    {channel} {CHANNEL_NAMES[channel]}
  </button>
);

const WaveformSection: React.FC<{ data: MultiChannelComparison }> = ({ data }) => {
  const step = Math.max(1, Math.floor(data.channels[0]?.time.length / 200));
  const chartData = data.channels[0]?.time
    ?.filter((_, i) => i % step === 0)
    .map((t, idx) => {
      const point: Record<string, number | string> = { t: t.toFixed(3) };
      data.channels.forEach(snap => {
        const sampledIdx = idx * step;
        point[snap.channel] = sampledIdx < snap.waveform.length
          ? Number(snap.waveform[sampledIdx].toFixed(4))
          : 0;
      });
      return point;
    }) || [];

  return (
    <div style={{ marginBottom: '16px' }}>
      <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: '#333', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>📈</span> 多通道波形对比
      </h4>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData}>
          <XAxis dataKey="t" tick={{ fontSize: 9 }} />
          <YAxis tick={{ fontSize: 9 }} domain={['auto', 'auto']} />
          <Tooltip
            formatter={(value: number, name: string) => [value.toFixed(4), `${name} (${CHANNEL_NAMES[name] || name})`]}
            labelFormatter={(label: string) => `t = ${label}s`}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} formatter={(value: string) => `${value} ${CHANNEL_NAMES[value] || ''}`} />
          {data.channels.map(snap => (
            <Line
              key={snap.channel}
              type="monotone"
              dataKey={snap.channel}
              stroke={CHANNEL_COLORS[snap.channel]}
              dot={false}
              strokeWidth={1.5}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const BandPowerSection: React.FC<{ data: MultiChannelComparison }> = ({ data }) => {
  const barData = BAND_LABELS.map(band => {
    const point: Record<string, number | string> = { name: BAND_NAMES[band] };
    data.channels.forEach(snap => {
      point[snap.channel] = Number(((snap.bandPower as any)[band] || 0).toFixed(2));
    });
    return point;
  });

  return (
    <div style={{ marginBottom: '16px' }}>
      <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: '#333', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>📊</span> 频段能量对比
      </h4>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={barData} barGap={2} barCategoryGap="20%">
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 9 }} />
          <Tooltip
            formatter={(value: number, name: string) => [value.toFixed(2), `${name} (${CHANNEL_NAMES[name] || name})`]}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} formatter={(value: string) => `${value} ${CHANNEL_NAMES[value] || ''}`} />
          {data.channels.map(snap => (
            <Bar
              key={snap.channel}
              dataKey={snap.channel}
              fill={CHANNEL_COLORS[snap.channel]}
              radius={[3, 3, 0, 0]}
              opacity={0.85}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const StateRadarSection: React.FC<{ data: MultiChannelComparison }> = ({ data }) => {
  const radarData = [
    { metric: '专注度', ...Object.fromEntries(data.channels.map(s => [s.channel, Math.round(s.brainState.focus)])) },
    { metric: '放松度', ...Object.fromEntries(data.channels.map(s => [s.channel, Math.round(s.brainState.relaxation)])) },
    { metric: '疲劳度', ...Object.fromEntries(data.channels.map(s => [s.channel, Math.round(s.brainState.fatigue)])) },
  ];

  return (
    <div style={{ marginBottom: '16px' }}>
      <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: '#333', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>🎯</span> 脑状态雷达图
      </h4>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={radarData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
          {data.channels.map(snap => (
            <Radar
              key={snap.channel}
              name={`${snap.channel} (${snap.channelName})`}
              dataKey={snap.channel}
              stroke={CHANNEL_COLORS[snap.channel]}
              fill={CHANNEL_COLORS[snap.channel]}
              fillOpacity={0.15}
              strokeWidth={2}
            />
          ))}
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

const StateDiffTable: React.FC<{ data: MultiChannelComparison }> = ({ data }) => {
  if (data.channels.length < 2) return null;

  const metrics = ['focus', 'relaxation', 'fatigue'] as const;
  const metricLabels: Record<string, string> = { focus: '专注度', relaxation: '放松度', fatigue: '疲劳度' };
  const metricColors: Record<string, string> = { focus: '#1976d2', relaxation: '#388e3c', fatigue: '#d32f2f' };

  const rows = metrics.map(metric => {
    const values = data.channels.map(s => s.brainState[metric]);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const diff = max - min;
    const maxCh = data.channels[values.indexOf(max)];
    const minCh = data.channels[values.indexOf(min)];
    return { metric, label: metricLabels[metric], color: metricColors[metric], max, min, diff, maxChannel: maxCh, minChannel: minCh };
  });

  return (
    <div style={{ marginBottom: '16px' }}>
      <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: '#333', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>🔀</span> 脑区状态差异
      </h4>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#f5f7fa' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e0e0e0' }}>指标</th>
              <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, borderBottom: '2px solid #e0e0e0' }}>最高</th>
              <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, borderBottom: '2px solid #e0e0e0' }}>最低</th>
              <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, borderBottom: '2px solid #e0e0e0' }}>差异</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e0e0e0' }}>差异分布</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.metric} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px 10px', fontWeight: 500, color: row.color }}>{row.label}</td>
                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                  <span style={{ color: CHANNEL_COLORS[row.maxChannel.channel], fontWeight: 600 }}>{row.max.toFixed(1)}</span>
                  <span style={{ fontSize: '10px', color: '#999', marginLeft: '4px' }}>{row.maxChannel.channel}</span>
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                  <span style={{ color: CHANNEL_COLORS[row.minChannel.channel], fontWeight: 600 }}>{row.min.toFixed(1)}</span>
                  <span style={{ fontSize: '10px', color: '#999', marginLeft: '4px' }}>{row.minChannel.channel}</span>
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: row.diff > 30 ? '#d32f2f' : row.diff > 15 ? '#f9a825' : '#388e3c' }}>
                  {row.diff.toFixed(1)}
                </td>
                <td style={{ padding: '8px 10px' }}>
                  <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                    {data.channels.map(snap => {
                      const val = snap.brainState[row.metric];
                      const barWidth = Math.max(2, val);
                      return (
                        <div key={snap.channel} title={`${snap.channel}: ${val.toFixed(1)}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: '0 0 auto' }}>
                          <div style={{
                            width: `${barWidth * 0.7}px`,
                            maxWidth: '70px',
                            height: '10px',
                            background: CHANNEL_COLORS[snap.channel],
                            borderRadius: '3px',
                            opacity: 0.8,
                          }} />
                          <span style={{ fontSize: '9px', color: '#999' }}>{snap.channel}</span>
                        </div>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ChannelStateCards: React.FC<{ data: MultiChannelComparison }> = ({ data }) => (
  <div style={{ marginBottom: '16px' }}>
    <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: '#333', display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span>🧠</span> 各通道脑状态概览
    </h4>
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(data.channels.length, 5)}, 1fr)`, gap: '10px' }}>
      {data.channels.map(snap => (
        <div
          key={snap.channel}
          style={{
            padding: '12px',
            borderRadius: '10px',
            background: `linear-gradient(135deg, ${snap.brainState.statusColor}12, ${snap.brainState.statusColor}06)`,
            border: `2px solid ${snap.brainState.statusColor}40`,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '10px', color: '#999' }}>{CHANNEL_NAMES[snap.channel]}</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: CHANNEL_COLORS[snap.channel], margin: '4px 0' }}>{snap.channel}</div>
          <div style={{
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: '10px',
            background: snap.brainState.statusColor,
            color: '#fff',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '8px',
          }}>
            {snap.brainState.statusLabel}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>专注</span><span style={{ fontWeight: 600, color: '#1976d2' }}>{snap.brainState.focus.toFixed(0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>放松</span><span style={{ fontWeight: 600, color: '#388e3c' }}>{snap.brainState.relaxation.toFixed(0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>疲劳</span><span style={{ fontWeight: 600, color: '#d32f2f' }}>{snap.brainState.fatigue.toFixed(0)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const MultiChannelOverview: React.FC = () => {
  const {
    comparisonChannels,
    multiChannelComparison,
    comparisonLoading,
    setComparisonChannels,
    toggleComparisonChannel,
    setMultiChannelComparison,
    setComparisonLoading,
  } = useEEGStore();

  const intervalRef = useRef<number | null>(null);

  const fetchComparison = async () => {
    const state = useEEGStore.getState();
    if (state.playbackMode) return;
    state.setComparisonLoading(true);
    let result: MultiChannelComparison;
    try {
      const { data } = await axios.get(`/api/eeg/multi-channel-comparison?channels=${state.comparisonChannels.join(',')}&duration=3`);
      result = {
        channels: data.channels.map((ch: any) => ({
          ...ch,
          bandPower: ch.bandPower,
          brainState: ch.brainState,
        })),
        timestamp: data.timestamp,
      };
    } catch {
      result = generateMockComparison(state.comparisonChannels);
    }
    state.setMultiChannelComparison(result);
    state.setComparisonLoading(false);
  };

  useEffect(() => {
    fetchComparison();
    intervalRef.current = window.setInterval(fetchComparison, 4000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [comparisonChannels]);

  return (
    <div style={{ padding: '16px', background: '#fff', borderRadius: '12px', margin: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🔬</span>
          <span>多通道对比总览</span>
          <span style={{ fontSize: '13px', color: '#666', fontWeight: 400 }}>
            {comparisonChannels.length} 个通道
          </span>
          {comparisonLoading && <span style={{ fontSize: '12px', color: '#999' }}>刷新中...</span>}
        </h3>
        <span style={{ fontSize: '11px', color: '#999' }}>
          {multiChannelComparison ? `更新于 ${new Date(multiChannelComparison.timestamp).toLocaleTimeString()}` : ''}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px', padding: '10px', background: '#f5f7fa', borderRadius: '8px' }}>
        <span style={{ fontSize: '12px', color: '#666', lineHeight: '30px', marginRight: '4px' }}>选择通道：</span>
        {ALL_CHANNELS.map(ch => (
          <ChannelPill
            key={ch}
            channel={ch}
            selected={comparisonChannels.includes(ch)}
            onToggle={() => toggleComparisonChannel(ch)}
          />
        ))}
      </div>

      {!multiChannelComparison ? (
        <div style={{ color: '#999', padding: '40px 0', textAlign: 'center' }}>等待数据中...</div>
      ) : (
        <>
          <ChannelStateCards data={multiChannelComparison} />
          <WaveformSection data={multiChannelComparison} />
          <BandPowerSection data={multiChannelComparison} />
          <StateRadarSection data={multiChannelComparison} />
          <StateDiffTable data={multiChannelComparison} />
        </>
      )}
    </div>
  );
};
