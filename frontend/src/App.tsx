import React, { useState } from 'react';
import { WaveformChart } from './components/WaveformChart';
import { BandPowerChart } from './components/BandPowerChart';
import { ChannelSelector } from './components/ChannelSelector';
import { BrainStateDashboard } from './components/BrainStateDashboard';
import { CorrelationChart } from './components/CorrelationChart';
import { RecordingPanel } from './components/RecordingPanel';
import { MultiChannelOverview } from './components/MultiChannelOverview';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'single' | 'multi'>('single');

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <nav style={{ width: '220px', background: '#0d1b2a', color: '#fff', padding: '20px 0', boxShadow: '2px 0 8px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 16px', marginBottom: '8px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, letterSpacing: '1px' }}>🧠 EEG Lab</h2>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>脑电数据分析平台</div>
        </div>
        <div style={{ padding: '0 16px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '4px', background: '#1e293b', borderRadius: '8px', padding: '3px' }}>
            <button
              onClick={() => setActiveTab('single')}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'single' ? '#1565c0' : 'transparent',
                color: activeTab === 'single' ? '#fff' : '#94a3b8',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: activeTab === 'single' ? 600 : 400,
                transition: 'all 0.2s ease',
              }}
            >
              单通道
            </button>
            <button
              onClick={() => setActiveTab('multi')}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'multi' ? '#1565c0' : 'transparent',
                color: activeTab === 'multi' ? '#fff' : '#94a3b8',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: activeTab === 'multi' ? 600 : 400,
                transition: 'all 0.2s ease',
              }}
            >
              多通道对比
            </button>
          </div>
        </div>
        {activeTab === 'single' && <ChannelSelector />}
        {activeTab === 'multi' && (
          <div style={{ padding: '16px', fontSize: '12px', color: '#94a3b8', lineHeight: '1.6' }}>
            <div style={{ marginBottom: '8px', color: '#90caf9', fontWeight: 500 }}>使用说明</div>
            <div>在右侧面板中选择要对比的脑区通道，系统将同时展示各通道的波形、频段能量和脑状态差异。</div>
          </div>
        )}
      </nav>
      <main style={{ flex: 1, overflow: 'auto', background: '#f5f7fa' }}>
        {activeTab === 'single' ? (
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 600px', minWidth: 0 }}>
              <WaveformChart />
              <BandPowerChart />
              <CorrelationChart />
            </div>
            <div style={{ flex: '0 0 340px', maxWidth: '400px' }}>
              <BrainStateDashboard />
              <RecordingPanel />
            </div>
          </div>
        ) : (
          <MultiChannelOverview />
        )}
      </main>
    </div>
  );
};
export default App;
