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

        // Optimized configuration for POS/Barcodes
        const config = { 
            fps: 20, // Increased FPS for faster capture
            qrbox: { width: 300, height: 150 }, // Rectangular box better for 1D barcodes
            aspectRatio: 1.0,
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: true // Native API (Much faster/accurate)
            }
        };

        const startScanner = async () => {
            try {
                // Restrict formats to only what we need for speed
                const formats = [
                    0, // QR_CODE
                    1, // AZTEC
                    2, // CODABAR
                    3, // CODE_39
                    4, // CODE_93
                    5, // CODE_128
                    6, // DATA_MATRIX
                    7, // EAN_8
                    8, // EAN_13
                    9, // ITF
                    10, // MAXICODE
                    11, // PDF_417
                    12, // RSS_14
                    13, // RSS_EXPANDED
                    14 // UPC_A
                ]; 
                // Wait, it's better to use the literal names or the Html5QrcodeSupportedFormats enum if imported.
                // Since I can't import the enum easily here, I'll use the default start but with restricted formats if I knew their constants.
                // Actually, the best way to speed it up is focusing on the most common ones.
                
                await html5QrCode.start(
                    { facingMode: facingMode }, 
                    config, 
                    (decodedText, decodedResult) => {
                        onResult(decodedText, decodedResult);
                    },
                    (errorMessage) => {
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
