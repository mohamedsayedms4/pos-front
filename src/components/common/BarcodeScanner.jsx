import React, { useEffect, useRef, useState } from 'react';
import { readBarcodesFromImageFile } from 'zxing-wasm';

const BarcodeScanner = ({ 
    onResult, 
    onError,
    facingMode = "environment"
}) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const isScanning = useRef(true);

    useEffect(() => {
        const startCamera = async () => {
            try {
                const constraints = {
                    video: {
                        facingMode: facingMode,
                        width: { ideal: 1280 }, // Good balance for sharp barcodes
                        height: { ideal: 720 },
                        focusMode: 'continuous'
                    }
                };
                const newStream = await navigator.mediaDevices.getUserMedia(constraints);
                setStream(newStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = newStream;
                }
            } catch (err) {
                console.error("Camera access error:", err);
                if (onError) onError(err);
            }
        };

        startCamera();

        return () => {
            isScanning.current = false;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [facingMode]);

    useEffect(() => {
        if (!stream) return;

        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        const scanLoop = async () => {
            if (!isScanning.current || !video || video.paused || video.ended) return;

            // Draw current frame to hidden canvas
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                try {
                    // This is where the WASM magic happens
                    const results = await readBarcodesFromImageFile(canvas, {
                        tryHarder: true, // More accurate
                        formats: ["EAN-13", "Code-128", "Code-39", "UPC-A", "EAN-8"], // Specific 1D formats for speed
                        maxNumberOfSymbols: 1
                    });

                    if (results.length > 0 && isScanning.current) {
                        const code = results[0].text;
                        onResult(code);
                        isScanning.current = false; // Stop further scans
                    }
                } catch (err) {
                    // Normal during empty frames
                }
            }

            // High frequency scanning loop (approx ~15-20 fps)
            if (isScanning.current) {
                setTimeout(() => {
                    requestAnimationFrame(scanLoop);
                }, 50); 
            }
        };

        const timer = setTimeout(scanLoop, 1000); // Wait for video to stabilize
        return () => clearTimeout(timer);
    }, [stream, onResult]);

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
        </div>
    );
};

export default BarcodeScanner;
