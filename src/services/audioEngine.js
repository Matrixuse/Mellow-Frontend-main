// Lightweight audio engine using Web Audio API
// Provides equalizer (5 bands) and basic volume normalization

const AudioEngine = (() => {
    let ctx = null;
    let masterGain = null;
    let analyser = null;
    let eqNodes = [];
    let primary = null; // HTMLAudioElement currently audible
    let primarySource = null;
    let primaryGain = null;
    let isInitialized = false;
    let normalizationEnabled = false;

    const bands = [60, 230, 910, 3600, 14000]; // 5-band eq

    function init(primaryAudioElement) {
        if (!primaryAudioElement) return;
        if (isInitialized) return;
        try {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = ctx.createGain();
            masterGain.gain.value = 1.0;
            analyser = ctx.createAnalyser();
            analyser.fftSize = 2048;

            // build EQ chain
            eqNodes = bands.map((freq) => {
                const f = ctx.createBiquadFilter();
                f.type = 'peaking';
                f.frequency.value = freq;
                f.Q.value = 1;
                f.gain.value = 0;
                return f;
            });

            // connect: eqNodes[0] -> ... -> masterGain -> analyser -> destination
            let last = eqNodes.length ? eqNodes[0] : masterGain;
            for (let i = 1; i < eqNodes.length; i++) {
                eqNodes[i - 1].connect(eqNodes[i]);
                last = eqNodes[i];
            }
            if (eqNodes.length) {
                last.connect(masterGain);
            } else {
                // connect master directly if no eq
                // noop
            }
            masterGain.connect(analyser);
            analyser.connect(ctx.destination);

            // setup primary audio element
            primary = primaryAudioElement;
            primary.crossOrigin = 'anonymous';

            // create media element source and gain node
            primarySource = ctx.createMediaElementSource(primary);
            primaryGain = ctx.createGain();
            primaryGain.gain.value = 1.0;

            // connect sources into eq chain (source -> gain -> eq[0])
            if (eqNodes.length) {
                primarySource.connect(primaryGain);
                primaryGain.connect(eqNodes[0]);
            } else {
                primarySource.connect(primaryGain);
                primaryGain.connect(masterGain);
            }

            isInitialized = true;
        } catch (e) {
            console.warn('AudioEngine init failed', e);
        }
    }

    function setEQ(gainArray) {
        if (!eqNodes || eqNodes.length === 0) return;
        for (let i = 0; i < eqNodes.length && i < gainArray.length; i++) {
            eqNodes[i].gain.value = Number(gainArray[i]) || 0;
        }
    }

    function setPreset(name) {
        const presets = {
            flat: [0,0,0,0,0],
            bass: [4,2,0,-1,-2],
            rock: [3,1,0,1,3],
            jazz: [2,1,0,1,2],
            vocal: [-1,0,2,3,2]
        };
        if (presets[name]) setEQ(presets[name]);
    }

    function enableNormalization(v) {
        normalizationEnabled = !!v;
    }

    // naive normalization: measure RMS for a short window and adjust master gain
    async function applyNormalizationToElement(el) {
        if (!normalizationEnabled || !ctx || !analyser) return;
        try {
            // create an OfflineAudioContext to compute RMS quickly is expensive
            // simpler approach: play quietly for a short moment and measure analyser data
            // We'll schedule a short measurement after 'play' starts
            await new Promise((res) => setTimeout(res, 300));
            const data = new Float32Array(analyser.fftSize);
            analyser.getFloatTimeDomainData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
            const rms = Math.sqrt(sum / data.length);
            // target RMS (heuristic)
            const target = 0.05;
            if (rms > 0) {
                const factor = target / rms;
                masterGain.gain.setValueAtTime(Math.min(2.0, Math.max(0.3, factor)), ctx.currentTime);
            }
        } catch (e) {
            // ignore
        }
    }

    // Play a URL immediately
    function playNow(url) {
        if (!primary) return;
        try {
            primary.src = url;
            primary.load();
            primary.play().catch(console.error);
            // reset master gain
            if (masterGain) masterGain.gain.setValueAtTime(1.0, ctx.currentTime);
            if (normalizationEnabled) applyNormalizationToElement(primary);
        } catch (e) {
            console.warn('playNow error', e);
        }
    }

    function resumeContextIfNeeded() {
        if (ctx && ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }
    }

    function pause() {
        try { if (primary) primary.pause(); } catch(e){}
    }
    function setVolume(v) { if (masterGain) masterGain.gain.setValueAtTime(Number(v) || 1.0, ctx.currentTime); }

    return {
        init,
        playNow,
        setEQ,
        setPreset,
        enableNormalization,
        resumeContextIfNeeded,
        pause,
        setVolume
    };
})();

export default AudioEngine;
