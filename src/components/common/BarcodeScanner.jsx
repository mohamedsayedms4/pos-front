import React, { useEffect, useRef, useState, useCallback } from 'react';
import Api from '../../services/api';

/**
 * High-performance barcode scanner using:
 * 1. Native BarcodeDetector API (hardware-accelerated, instant on mobile Chrome)
 * 2. zxing-wasm fallback for browsers without native support
 * 3. Server-side ZXing Java fallback via photo capture button
 */
const BarcodeScanner = ({
    onResult,
    onError,
    facingMode = "environment"
}) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const isScanning = useRef(true);
    const decoderRef = useRef(null); // Native BarcodeDetector or null
    const zxingRef = useRef(null);   // zxing-wasm module (lazy loaded)
    const scanTimerRef = useRef(null);
    const [torchOn, setTorchOn] = useState(false);
    const [hasTorch, setHasTorch] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false); // Server scan in progress

    // Initialize the best available decoder (only once)
    const decoderInitialized = useRef(false);
    const initDecoder = useCallback(async () => {
        if (decoderInitialized.current) return;
        decoderInitialized.current = true;

        // Strategy 1: Native BarcodeDetector (Chrome Android, Edge, etc.)
        if ('BarcodeDetector' in window) {
            try {
                const formats = await window.BarcodeDetector.getSupportedFormats();
                const needed = ['ean_13', 'code_128', 'code_39', 'upc_a', 'ean_8'];
                const hasFormats = needed.some(f => formats.includes(f));
                if (hasFormats) {
                    decoderRef.current = new window.BarcodeDetector({
                        formats: needed.filter(f => formats.includes(f))
                    });
                    console.log('[Scanner] Using native BarcodeDetector API ✅');
                    return;
                }
            } catch (e) {
                console.warn('[Scanner] BarcodeDetector init failed:', e);
            }
        }

        // Strategy 2: zxing-wasm fallback
        try {
            const zxing = await import('zxing-wasm');
            zxingRef.current = zxing;
            console.log('[Scanner] Using zxing-wasm fallback ✅');
        } catch (e) {
            console.error('[Scanner] No client-side decoder available:', e);
        }
    }, []);

    // Toggle flashlight/torch
    const toggleTorch = useCallback(async () => {
        if (!streamRef.current) return;
        const track = streamRef.current.getVideoTracks()[0];
        if (!track) return;
        try {
            const newState = !torchOn;
            await track.applyConstraints({ advanced: [{ torch: newState }] });
            setTorchOn(newState);
        } catch (e) {
            console.warn('[Scanner] Torch not supported:', e);
        }
    }, [torchOn]);

    // ─── Capture photo and send to backend for server-side decoding ───
    const captureAndSendToServer = useCallback(async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || isCapturing) return;

        setIsCapturing(true);

        try {
            const ctx = canvas.getContext('2d');
            const vw = video.videoWidth;
            const vh = video.videoHeight;

            // ─── Step 1: Crop to scan-target area (matches the green overlay: 75% x 40%) ───
            const cropW = Math.floor(vw * 0.75);
            const cropH = Math.floor(vh * 0.40);
            const cropX = Math.floor((vw - cropW) / 2);
            const cropY = Math.floor((vh - cropH) / 2);

            canvas.width = cropW;
            canvas.height = cropH;
            ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

            console.log(`[Scanner] Cropped frame: ${cropW}x${cropH} (from ${vw}x${vh})`);

            const croppedBlob = await new Promise(resolve =>
                canvas.toBlob(resolve, 'image/jpeg', 0.92)
            );

            if (!croppedBlob) {
                setIsCapturing(false);
                return;
            }

            console.log(`[Scanner] Sending cropped image to server (${(croppedBlob.size / 1024).toFixed(1)} KB)...`);

            // ─── Step 2: Try cropped image first ───
            let res = await Api.scanBarcodeFromImage(croppedBlob);

            // ─── Step 3: If cropped fails, try full image as fallback ───
            if (!res.success) {
                console.log('[Scanner] Cropped scan failed, retrying with FULL image...');
                canvas.width = vw;
                canvas.height = vh;
                ctx.drawImage(video, 0, 0, vw, vh);

                const fullBlob = await new Promise(resolve =>
                    canvas.toBlob(resolve, 'image/jpeg', 0.90)
                );

                if (fullBlob) {
                    console.log(`[Scanner] Sending full image to server (${(fullBlob.size / 1024).toFixed(1)} KB)...`);
                    res = await Api.scanBarcodeFromImage(fullBlob);
                }
            }

            if (res.success && res.data?.barcode) {
                isScanning.current = false;
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                onResult(res.data.barcode);
            } else {
                if (onError) onError(new Error(res.message || 'لم يتم العثور على باركود'));
            }
        } catch (err) {
            console.error('[Scanner] Server scan error:', err);
            if (onError) onError(err);
        } finally {
            setIsCapturing(false);
        }
    }, [isCapturing, onResult, onError]);

    // ─── Try to get camera with a specific set of constraints ───
    const tryGetCamera = async (constraints, label) => {
        try {
            console.log(`[Scanner] Trying camera: ${label}...`);
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log(`[Scanner] ✅ Camera started: ${label}`);
            return stream;
        } catch (err) {
            console.warn(`[Scanner] ❌ Camera failed (${label}):`, err.name, err.message);
            return null;
        }
    };

    // Start camera with progressive fallback
    useEffect(() => {
        let cancelled = false;
        isScanning.current = true;

        const startCamera = async () => {
            let newStream = null;

            // Attempt 1: High resolution + advanced focus
            newStream = await tryGetCamera({
                video: {
                    facingMode: { ideal: facingMode },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    advanced: [
                        { focusMode: 'continuous' },
                        { exposureMode: 'continuous' }
                    ]
                },
                audio: false
            }, 'HD 1080p + autofocus');

            // Attempt 2: Medium resolution, no advanced constraints
            if (!newStream) {
                newStream = await tryGetCamera({
                    video: {
                        facingMode: { ideal: facingMode },
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: false
                }, '720p basic');
            }

            // Attempt 3: Just the back camera, no resolution preference
            if (!newStream) {
                newStream = await tryGetCamera({
                    video: { facingMode: facingMode },
                    audio: false
                }, 'basic back camera');
            }

            // Attempt 4: Any camera at all
            if (!newStream) {
                newStream = await tryGetCamera({
                    video: true,
                    audio: false
                }, 'any available camera');
            }

            if (cancelled) {
                newStream?.getTracks().forEach(t => t.stop());
                return;
            }

            if (!newStream) {
                console.error('[Scanner] All camera attempts failed!');
                if (onError) onError(new Error('تعذر تشغيل الكاميرا — تأكد من السماح بصلاحية الكاميرا'));
                return;
            }

            streamRef.current = newStream;

            // Check torch + focus capabilities
            const track = newStream.getVideoTracks()[0];
            if (track) {
                const settings = track.getSettings?.();
                console.log(`[Scanner] Camera active: ${track.label}, ${settings?.width}x${settings?.height}`);

                const caps = track.getCapabilities?.();
                if (caps?.torch) {
                    setHasTorch(true);
                }
                // Try to apply continuous focus after camera starts
                try {
                    await track.applyConstraints({
                        advanced: [{ focusMode: 'continuous' }]
                    });
                } catch (e) { /* Not supported on this device */ }
            }

            if (videoRef.current && !cancelled) {
                videoRef.current.srcObject = newStream;
                videoRef.current.play().catch(() => {});
            }
        };

        Promise.all([initDecoder(), startCamera()]);

        return () => {
            cancelled = true;
            isScanning.current = false;
            if (scanTimerRef.current) {
                cancelAnimationFrame(scanTimerRef.current);
                clearTimeout(scanTimerRef.current);
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, [facingMode, initDecoder, onError]);

    // Decode a single frame using the best available decoder
    const decodeFrame = useCallback(async (source) => {
        if (decoderRef.current) {
            const results = await decoderRef.current.detect(source);
            if (results.length > 0) {
                return results[0].rawValue;
            }
            return null;
        }

        if (zxingRef.current) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            if (!canvas || !video) return null;

            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            const cropW = Math.floor(video.videoWidth * 0.7);
            const cropH = Math.floor(video.videoHeight * 0.4);
            const cropX = Math.floor((video.videoWidth - cropW) / 2);
            const cropY = Math.floor((video.videoHeight - cropH) / 2);

            canvas.width = cropW;
            canvas.height = cropH;
            ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
            if (!blob) return null;

            try {
                const results = await zxingRef.current.readBarcodesFromImageFile(blob, {
                    tryHarder: false,
                    formats: ["EAN-13", "Code-128", "Code-39", "UPC-A", "EAN-8"],
                    maxNumberOfSymbols: 1
                });
                if (results.length > 0) {
                    return results[0].text;
                }
            } catch (e) { /* empty frame */ }
            return null;
        }

        return null;
    }, []);

    // High-speed client-side scanning loop
    useEffect(() => {
        const video = videoRef.current;
        if (!streamRef.current || !video) return;

        let frameCount = 0;

        const scanLoop = async () => {
            if (!isScanning.current) return;

            if (video.readyState >= video.HAVE_ENOUGH_DATA) {
                try {
                    const result = await decodeFrame(video);

                    if (result && isScanning.current) {
                        isScanning.current = false;
                        if (navigator.vibrate) navigator.vibrate(100);
                        onResult(result);
                        return;
                    }
                } catch (err) {
                    if (frameCount % 100 === 0) {
                        console.debug('[Scanner] Frame decode skip:', err.message);
                    }
                }
                frameCount++;
            }

            if (isScanning.current) {
                scanTimerRef.current = requestAnimationFrame(scanLoop);
            }
        };

        const startTimer = setTimeout(() => {
            if (isScanning.current) {
                scanTimerRef.current = requestAnimationFrame(scanLoop);
            }
        }, 600);

        return () => {
            clearTimeout(startTimer);
            if (scanTimerRef.current) {
                cancelAnimationFrame(scanTimerRef.current);
            }
        };
    }, [streamRef.current, decodeFrame, onResult]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#000' }}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {/* Hidden canvas for processing */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* ─── Torch toggle ─── */}
            {hasTorch && (
                <button
                    onClick={toggleTorch}
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: torchOn ? 'rgba(255, 200, 0, 0.9)' : 'rgba(0,0,0,0.6)',
                        color: torchOn ? '#000' : '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '44px',
                        height: '44px',
                        fontSize: '22px',
                        cursor: 'pointer',
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        transition: 'all 0.2s ease'
                    }}
                    title={torchOn ? 'إيقاف الفلاش' : 'تشغيل الفلاش'}
                >
                    {torchOn ? '🔦' : '💡'}
                </button>
            )}

            {/* ─── Capture & Send to Server button ─── */}
            <button
                onClick={captureAndSendToServer}
                disabled={isCapturing}
                style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: isCapturing
                        ? 'rgba(100, 100, 100, 0.8)'
                        : 'linear-gradient(135deg, #00c853, #00e676)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '28px',
                    padding: '12px 24px',
                    fontSize: '15px',
                    fontWeight: 'bold',
                    cursor: isCapturing ? 'wait' : 'pointer',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 15px rgba(0,200,83,0.4)',
                    transition: 'all 0.3s ease',
                    whiteSpace: 'nowrap'
                }}
            >
                {isCapturing ? (
                    <>
                        <span style={{
                            display: 'inline-block',
                            width: '18px',
                            height: '18px',
                            border: '3px solid rgba(255,255,255,0.3)',
                            borderTop: '3px solid #fff',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite'
                        }} />
                        جاري التحليل...
                    </>
                ) : (
                    <>📸 التقاط وتحليل</>
                )}
            </button>

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default BarcodeScanner;
