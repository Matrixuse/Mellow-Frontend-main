import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import AudioEngine from '../services/audioEngine';

const presets = ['flat','bass','rock','jazz','vocal'];
const bands = [60, 230, 910, 3600, 14000];

const EqualizerPage = () => {
    const [gains, setGains] = useState([0,0,0,0,0]);
    const [preset, setPreset] = useState('flat');
    const [normalization, setNormalization] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        AudioEngine.setEQ(gains);
    }, [gains]);

    useEffect(() => {
        AudioEngine.enableNormalization(!!normalization);
    }, [normalization]);

    const applyPreset = (p) => {
        setPreset(p);
        AudioEngine.setPreset(p);
        // try to reflect preset in UI: AudioEngine doesn't return values, so we set an approximate mapping
        const mapping = {
            flat: [0,0,0,0,0],
            bass: [4,2,0,-1,-2],
            rock: [3,1,0,1,3],
            jazz: [2,1,0,1,2],
            vocal: [-1,0,2,3,2]
        };
        if (mapping[p]) setGains(mapping[p]);
    };

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto min-h-screen overflow-auto pb-24">
            <div className="flex items-center gap-3 mb-4">
                <button aria-label="Back" onClick={() => navigate(-1)} className="p-2 rounded-md bg-transparent hover:bg-gray-800/40 text-white">
                    <ChevronLeft size={20} />
                </button>
                <h2 className="text-xl md:text-2xl font-semibold">Equalizer</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800 p-4 rounded-md md:sticky md:top-20 order-2 md:order-1">
                    <h3 className="font-medium mb-2">Presets</h3>
                    <div className="flex gap-2 flex-wrap">
                        {presets.map(p => (
                            <button key={p} onClick={() => applyPreset(p)} className={`px-3 py-1 rounded ${preset===p? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>{p}</button>
                        ))}
                    </div>
                    <div className="mt-4">
                        <label className="flex items-center gap-2"><input type="checkbox" checked={normalization} onChange={(e) => setNormalization(e.target.checked)} /> <span className="text-sm">Enable volume normalization (basic)</span></label>
                    </div>
                </div>
                <div className="bg-gray-800 p-4 rounded-md order-1 md:order-2">
                    <h3 className="font-medium mb-2">Bands</h3>
                    <div className="flex md:gap-3 gap-2 items-end md:h-48 flex-nowrap overflow-x-auto justify-center">
                        {bands.map((b, idx) => (
                            <div key={b} className="flex flex-col items-center flex-shrink-0 gap-2">
                                <input
                                    className={`w-2 h-40 appearance-none`}
                                    style={{
                                        writingMode: 'bt-lr',
                                        WebkitAppearance: 'slider-vertical',
                                        appearance: 'slider-vertical'
                                    }}
                                    type="range" min={-12} max={12} value={gains[idx]} onChange={(e) => setGains(g => { const copy = [...g]; copy[idx] = Number(e.target.value); return copy; })}
                                />
                                <div className="text-xs text-gray-300 text-center">{b}Hz</div>
                                <div className="text-xs text-gray-400 text-center">{gains[idx]} dB</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EqualizerPage;
