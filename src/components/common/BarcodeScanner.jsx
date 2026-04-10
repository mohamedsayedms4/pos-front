import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const BarcodeScanner = ({ 
    onResult, 
    onError, 
    onClose, 
    fps = 10, 
    qrbox = 250, 
    facingMode = "environment" // "user" for front, "environment" for back
}) => {
    const scannerId = "barcode-scanner-region";
    const scannerRef = useRef(null);

    useEffect(() => {
        const html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;

        // RADICAL OPTIMIZATION:
        // 1. We remove qrbox entirely. Cropping in JS is extremely slow.
        // 2. We use a standard resolution (640x480) which is perfect for barcodes and very fast to decode.
        const config = { 
            fps: 15, // Balanced FPS to prevent CPU choking
            aspectRatio: 1.333334, // 4:3 is more natural for barcodes
            videoConstraints: {
                facingMode: facingMode,
                width: { ideal: 640 },
                height: { ideal: 480 }
            },
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: true // The "Magic" ingredient for speed
            }
        };

        const startScanner = async () => {
            try {
                // Focus only on common 1D POS formats if possible
                // Starting with default but with high-performance config
                await html5QrCode.start(
                    { facingMode: facingMode }, 
                    config, 
                    (decodedText) => {
                        onResult(decodedText);
                    },
                    () => {
                        // Silent fail for "no barcode in frame"
                    }
                );
            } catch (err) {
                console.error("Scanner error:", err);
                if (onError) onError(err);
            }
        };

        startScanner();

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().then(() => {
                    scannerRef.current.clear();
                }).catch(err => console.warn("Cleanup error:", err));
            }
        };
    }, [onResult, onError, facingMode, fps, qrbox]);

    return (
        <div id={scannerId} style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#000' }}></div>
    );
};

export default BarcodeScanner;
