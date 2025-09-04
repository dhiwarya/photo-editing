import React, { useState, useRef, useCallback, useEffect } from 'react';

// Icons and Spinners
const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
    </svg>
);

const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-pink-500"></div>
    </div>
);

// Image Panel Component
interface ImagePanelProps {
    src: string | null;
    isLoading?: boolean;
    children?: React.ReactNode;
}

const ImagePanel: React.FC<ImagePanelProps> = ({ src, isLoading = false, children }) => {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (src) {
            const img = new Image();
            img.src = src;
            img.onload = () => setIsLoaded(true);
        } else {
            setIsLoaded(false);
        }
    }, [src]);

    return (
        <div className="bg-slate-800 rounded-lg aspect-square flex justify-center items-center p-4 transition-all duration-300">
            {isLoading ? (
                <LoadingSpinner />
            ) : src ? (
                <img 
                    src={src} 
                    alt="User content" 
                    className={`max-w-full max-h-full object-contain rounded-md transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} 
                />
            ) : (
                children
            )}
        </div>
    );
};


// Main App Component
const App: React.FC = () => {
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [processedImageURL, setProcessedImageURL] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        document.title = 'Heroic Duotone Photo Editor';
    }, []);

    const applyDuotoneFilter = useCallback((img: HTMLImageElement) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
            setError('Could not get canvas context.');
            return;
        }

        const aspectRatio = img.width / img.height;
        let drawWidth = canvas.width;
        let drawHeight = drawWidth / aspectRatio;
        if (drawHeight > canvas.height) {
            drawHeight = canvas.height;
            drawWidth = drawHeight * aspectRatio;
        }
        const x = (canvas.width - drawWidth) / 2;
        const y = (canvas.height - drawHeight) / 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, x, y, drawWidth, drawHeight);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Colors: Hero Green (dark) and Pink (light)
        const darkColor = { r: 27, g: 96, b: 47 };
        const lightColor = { r: 247, g: 132, b: 197 };

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            
            // Adjust exposure to be lighter (gamma correction)
            const gamma = 0.9;
            const correctedGray = 255 * Math.pow(gray / 255, 1 / gamma);
            const normalizedGray = correctedGray / 255;

            data[i] = darkColor.r + (lightColor.r - darkColor.r) * normalizedGray;
            data[i + 1] = darkColor.g + (lightColor.g - darkColor.g) * normalizedGray;
            data[i + 2] = darkColor.b + (lightColor.b - darkColor.b) * normalizedGray;
        }

        ctx.putImageData(imageData, 0, 0);
        setProcessedImageURL(canvas.toDataURL('image/png'));
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (!originalImage) return;

        setIsLoading(true);
        setProcessedImageURL(null);
        setError(null);

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => applyDuotoneFilter(img);
        img.onerror = () => {
            setError('Failed to load the image. Please try a different file.');
            setIsLoading(false);
        };
        img.src = originalImage;

    }, [originalImage, applyDuotoneFilter]);

    const handleFileChange = (files: FileList | null) => {
        if (files && files[0]) {
            const file = files[0];
            if (!file.type.startsWith('image/')) {
                setError('Please upload an image file (e.g., JPG, PNG).');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                setOriginalImage(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const onUploadClick = () => fileInputRef.current?.click();

    const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, isEntering: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(isEntering);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleFileChange(e.dataTransfer.files);
    };

    const handleReset = () => {
        setOriginalImage(null);
        setProcessedImageURL(null);
        setError(null);
        setIsLoading(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const UploadBox = () => (
        <div
            onClick={onUploadClick}
            onDragEnter={(e) => handleDragEvents(e, true)}
            onDragLeave={(e) => handleDragEvents(e, false)}
            onDragOver={(e) => handleDragEvents(e, true)}
            onDrop={handleDrop}
            className={`cursor-pointer w-full h-full border-4 border-dashed rounded-lg flex flex-col justify-center items-center text-center p-8 transition-colors duration-300 ${isDragging ? 'border-pink-500 bg-slate-700' : 'border-slate-600 hover:border-slate-500'}`}
        >
            <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFileChange(e.target.files)}
                accept="image/*"
                className="hidden"
                aria-label="File uploader"
            />
            <UploadIcon />
            <p className="mt-4 text-slate-400 font-semibold">
                Drag & Drop your photo here
            </p>
            <p className="text-slate-500 text-sm">or click to browse</p>
        </div>
    );

    return (
        <div className="min-h-screen text-white font-sans flex flex-col items-center p-4 sm:p-8">
             <canvas ref={canvasRef} width="1024" height="1024" className="hidden" aria-hidden="true"></canvas>
            <header className="w-full max-w-5xl text-center mb-8">
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
                    Heroic <span className="text-pink-500">Duotone</span> Photo Editor
                </h1>
                <p className="text-slate-400 mt-2 text-lg">
                    Transform your photos with a heroic duotone effect to become the giga chad we need.
                </p>
            </header>

            {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-md relative mb-6 w-full max-w-5xl" role="alert">
                    <strong className="font-bold">Error:</strong>
                    <span className="block sm:inline ml-2">{error}</span>
                </div>
            )}

            <main className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8">
                <section className="flex flex-col gap-4">
                    <h2 className="text-2xl font-semibold text-slate-300 text-center">Original Photo</h2>
                    <ImagePanel src={originalImage}>
                       {originalImage ? null : <UploadBox />}
                    </ImagePanel>
                </section>
                <section className="flex flex-col gap-4">
                    <h2 className="text-2xl font-semibold text-slate-300 text-center">Heroic Version</h2>
                    <ImagePanel src={processedImageURL} isLoading={isLoading}>
                        <div className="text-slate-500 text-center">
                            <p>Your processed image will appear here.</p>
                        </div>
                    </ImagePanel>
                    {processedImageURL && (
                        <div className="flex flex-col sm:flex-row gap-4">
                            <a
                                href={processedImageURL}
                                download="heroic-photo.png"
                                className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-4 rounded-lg w-full text-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-pink-500 transform hover:scale-105"
                            >
                                Download Image
                            </a>
                            <button
                                onClick={handleReset}
                                className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-lg w-full text-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-slate-500 transform hover:scale-105"
                            >
                                Convert Another
                            </button>
                        </div>
                    )}
                </section>
            </main>
            <footer className="w-full max-w-5xl text-center mt-8">
                <p className="text-slate-500 text-sm">
                    Made by <a href="https://github.com/dhiwarya" target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:underline">Dhiwa Kusumah</a>
                </p>
            </footer>
        </div>
    );
};

export default App;