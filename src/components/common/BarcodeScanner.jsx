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

        const config = { 
            fps: fps, 
            qrbox: qrbox,
            aspectRatio: 1.0 
        };

        const startScanner = async () => {
            try {
                await html5QrCode.start(
                    { facingMode: facingMode }, 
                    config, 
                    (decodedText, decodedResult) => {
                        onResult(decodedText, decodedResult);
                    },
                    (errorMessage) => {
                        // Error handling is often just noise for "no code found in frame"
                        if (onError) onError(errorMessage);
                    }
                );
            } catch (err) {
                console.error("Failed to start scanner:", err);
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
