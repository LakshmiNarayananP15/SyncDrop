import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  CheckCircle,
  File,
  HardDrive,
  Loader2,
  Monitor,
  QrCode,
  Signal,
  Smartphone,
  UploadCloud,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

// Dynamic API Routing using the local network IP
const API_URL = `http://${window.location.hostname}:5000`;

// --- Custom Hooks ---
function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkIsMobile = () => {
      // 768px is the md breakpoint in Tailwind
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkIsMobile();
    
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return isMobile;
}

// --- Mobile Uploader Component ---
function MobileUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [totalProgressBytes, setTotalProgressBytes] = useState(0);
  const abortRef = useRef<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback((newFiles: File[]) => {
    setFiles(prev => {
      let hasOversized = false;
      let hasDuplicates = false;
      
      const validFiles = newFiles.filter(file => {
        // 50MB size limit
        if (file.size > 50 * 1024 * 1024) {
          hasOversized = true;
          return false;
        }
        // Duplicate prevention
        const isDuplicate = prev.some(existing => existing.name === file.name && existing.size === file.size);
        if (isDuplicate) {
          hasDuplicates = true;
          return false;
        }
        return true;
      });

      if (hasOversized && hasDuplicates) {
        setErrorMessage("Some files skipped: Exceeds 50MB limit & duplicates found.");
      } else if (hasOversized) {
        setErrorMessage("Some files skipped: Size exceeds 50MB limit.");
      } else if (hasDuplicates) {
        setErrorMessage("Some files skipped: Duplicates detected.");
      } else {
        setErrorMessage(null);
      }

      if (validFiles.length > 0) {
        return [...prev, ...validFiles];
      }
      return prev;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  }, [processFiles]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [processFiles]);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    setProgress(0);
    setSuccess(false);
    setCurrentFileIndex(0);
    setTotalProgressBytes(0);
    abortRef.current = false;

    const totalSizeBytes = files.reduce((acc, f) => acc + f.size, 0);
    let cumulativeBytes = 0;

    for (let i = 0; i < files.length; i++) {
        if (abortRef.current) break;
        setCurrentFileIndex(i);
        const file = files[i];
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.upload.addEventListener("progress", (e) => {
                    if (e.lengthComputable && !abortRef.current) {
                        const currentTotal = cumulativeBytes + e.loaded;
                        setTotalProgressBytes(currentTotal);
                        setProgress((currentTotal / totalSizeBytes) * 100);
                    }
                });
                xhr.addEventListener("load", () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        cumulativeBytes += file.size;
                        resolve(null);
                    } else {
                        reject(new Error("Upload failed"));
                    }
                });
                xhr.addEventListener("error", () => reject(new Error("Network error")));
                xhr.addEventListener("abort", () => resolve(null));
                
                xhr.open("POST", `${API_URL}/`);
                xhr.setRequestHeader("Accept", "application/json");
                xhr.send(formData);
                
                const checkAbort = setInterval(() => {
                    if (abortRef.current) {
                        xhr.abort();
                        clearInterval(checkAbort);
                    }
                }, 100);
                
                xhr.addEventListener("loadend", () => clearInterval(checkAbort));
            });
        } catch (error) {
            setErrorMessage(`Failed to upload ${file.name}`);
            break;
        }
    }

    if (abortRef.current) {
        setUploading(false);
        setProgress(0);
        setTotalProgressBytes(0);
        return;
    }

    setUploading(false);
    setSuccess(true);
    
    // Reset after showing success state for a moment
    setTimeout(() => {
        setFiles([]);
        setSuccess(false);
        setProgress(0);
        setTotalProgressBytes(0);
    }, 3000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full p-4 sm:p-6"
    >
      <div className="flex items-center justify-between mb-8 h-16 border-b border-white/5 bg-white/5 backdrop-blur-md z-10 -mx-4 -mt-4 px-8 sm:-mx-6 sm:-mt-6">
        <div className="flex items-center gap-3">
          <img src="/syncdrop-logo.svg" alt="SyncDrop Logo" className="w-8 h-8 drop-shadow-md rounded-xl" />
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            SyncDrop
          </h1>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
          <Signal className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-blue-400 font-mono tracking-wide">Connected</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!success ? (
          <motion.div 
            key="upload-zone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col"
          >
            {/* Error Message */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between"
                >
                  <span className="text-xs text-red-400 font-medium">{errorMessage}</span>
                  <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-300">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Drag & Drop Zone */}
            <div
              className={`relative group flex flex-col items-center justify-center min-h-[200px] p-8 border-2 border-dashed rounded-3xl transition-all duration-300 backdrop-blur-md mb-6 ${
                isDragging
                  ? 'border-blue-400 bg-blue-500/20'
                  : 'border-blue-500/40 bg-blue-500/5 hover:border-blue-400/60 hover:bg-blue-500/10'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <UploadCloud className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200 text-center">Tap to select files</h3>
              <p className="text-[10px] text-slate-500 mt-1 text-center max-w-[200px]">
                Photos, Documents, Videos
              </p>
            </div>

            {/* Selected Files List */}
            {files.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex-1 flex flex-col gap-2 overflow-hidden"
              >
                <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-2">
                  <span>Selected ({files.length})</span>
                </div>
                <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                  {files.map((file, idx) => (
                    <div key={`${file.name}-${idx}`} className="flex items-center justify-between p-3 rounded-xl bg-white/5 backdrop-blur-sm">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="overflow-hidden">
                          <p className="text-xs font-medium text-slate-200 truncate max-w-[180px]">{file.name}</p>
                          <p className="text-[10px] text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                        className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Action Area */}
            <div className="mt-4 mb-4">
              {uploading ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-white/10 pb-2">
                    <div className="overflow-hidden pr-4">
                      <p className="text-[10px] text-emerald-400 font-bold uppercase mb-1 flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Transferring {currentFileIndex + 1} of {files.length}
                      </p>
                      <p className="text-sm text-slate-200 font-medium truncate max-w-[200px]">
                        {files[currentFileIndex]?.name || '...'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                        {(totalProgressBytes / (1024 * 1024)).toFixed(1)} MB / {(files.reduce((a, b) => a + b.size, 0) / (1024 * 1024)).toFixed(1)} MB
                      </p>
                      <p className="text-sm text-slate-300 font-bold">
                        {Math.round(progress)}%
                      </p>
                    </div>
                  </div>
                  
                  <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-emerald-500 relative"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ ease: "linear" }}
                    />
                  </div>

                  <button
                    onClick={() => { abortRef.current = true; }}
                    className="w-full py-3 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 mt-2"
                  >
                    Cancel Transfer
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={files.length === 0}
                  className={`w-full py-4 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-2
                    ${files.length > 0 
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 cursor-pointer' 
                      : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
                    }`}
                >
                  <UploadCloud className="w-5 h-5" />
                  Send Files
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="success-state"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-3xl" />
              <CheckCircle className="w-32 h-32 text-emerald-400 relative z-10 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]" />
            </div>
            <h2 className="text-3xl font-bold text-slate-100 mt-8 mb-2">Transfer Complete</h2>
            <p className="text-slate-400 text-center">Your files have been successfully dropped to the host device.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- Desktop Dashboard Component ---
function DesktopDashboard() {
  const [recentTransfers, setRecentTransfers] = useState<{id: string, name: string, size: string, time: string}[]>([]);
  const downloadQueue = useRef<string[]>([]);
  const isDownloading = useRef(false);

  useEffect(() => {
    const processQueue = () => {
      if (isDownloading.current || downloadQueue.current.length === 0) return;
      
      isDownloading.current = true;
      const fileName = downloadQueue.current.shift();
      
      if (fileName) {
        const link = document.createElement('a');
        link.href = `${API_URL}/api/download/${encodeURIComponent(fileName)}`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => {
          isDownloading.current = false;
          processQueue();
        }, 1000); // 1-second delay between downloads
      }
    };

    fetch(`${API_URL}/api/files`)
      .then(res => res.json())
      .then(data => setRecentTransfers(data))
      .catch(console.error);

    const sse = new EventSource(`${API_URL}/api/stream`);
    sse.onmessage = (e) => {
      const newFile = JSON.parse(e.data);
      setRecentTransfers(prev => [newFile, ...prev]);
      
      // Deduplicate downloads across multiple open tabs using localStorage
      const downloadKey = `downloaded_${newFile.id}`;
      if (!localStorage.getItem(downloadKey)) {
        localStorage.setItem(downloadKey, 'true');
        
        // Clean up the lock after 10 seconds to keep localStorage clean
        setTimeout(() => localStorage.removeItem(downloadKey), 10000);
        
        // Add to queue and start processing
        downloadQueue.current.push(newFile.name);
        processQueue();
      }
    };

    return () => {
      sse.close();
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col p-8 items-center min-h-[calc(100vh-4rem)]">
      
      <header className="absolute top-0 left-0 right-0 h-16 w-full px-8 flex items-center justify-between border-b border-white/5 bg-white/5 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <img src="/syncdrop-logo.svg" alt="SyncDrop Logo" className="w-9 h-9 drop-shadow-md rounded-[14px]" />
          <h1 className="text-2xl font-bold tracking-tight text-white">SyncDrop</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20 text-xs font-mono text-blue-400">
            IP: {window.location.hostname}:5000
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 w-full max-w-5xl mx-auto mt-20 flex-1">
        {/* Main Connection Card */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-10 flex flex-col items-center justify-start shadow-2xl relative overflow-hidden group"
        >
          {/* Subtle background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[100%] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="bg-white p-4 rounded-xl mb-6 shadow-lg relative z-10 mt-4">
            <div className="w-48 h-48 bg-slate-100 flex items-center justify-center border-4 border-slate-100 overflow-hidden">
              <img src={`${API_URL}/api/qr`} alt="QR Code" className="w-full h-full object-cover" />
            </div>
          </div>
          
          <h2 className="text-2xl font-semibold mb-2 mt-4 relative z-10">Scan to Connect</h2>
          <p className="text-slate-400 mb-4 text-center max-w-sm relative z-10">
            Open SyncDrop on your mobile device to start
          </p>
          
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs py-2.5 px-4 rounded-xl mb-8 relative z-10">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Both devices must be on the <strong>same Wi-Fi network</strong></span>
          </div>

          <div className="flex items-center gap-3 py-3 px-6 bg-blue-500/10 border border-blue-500/20 rounded-full relative z-10">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-sm text-blue-400 font-medium tracking-wide">Waiting for incoming files...</span>
          </div>
        </motion.div>

        {/* Info & Recent Transfers */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col gap-6"
        >
          {/* Session Details */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
              <Signal className="w-4 h-4 text-emerald-400" />
              Session Details
            </h3>
            <div className="space-y-3 font-mono text-[11px] sm:text-xs">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-slate-400">Local IP endpoint:</span>
                <span className="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">{API_URL}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-slate-400">Active port:</span>
                <span className="text-slate-300">5000</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-400">Network protocol:</span>
                <span className="text-slate-300">TCP / WebSockets</span>
              </div>
            </div>
          </div>

          {/* Recent Transfers */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-xl flex-1 flex flex-col">
            <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center justify-between">
              Recent Transfers
              <span className="text-[10px] font-normal text-slate-500 px-2 py-0.5 bg-white/5 rounded">Session Active</span>
            </h3>
            
            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
              {recentTransfers.map((item, idx) => (
                <motion.a 
                  href={`${API_URL}/api/download/${encodeURIComponent(item.name)}`}
                  download={item.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + (idx * 0.1) }}
                  key={item.id} 
                  className="flex items-center p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <File className="w-5 h-5" />
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{item.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.size} • {item.time}</p>
                  </div>
                  <span className="text-emerald-400 ml-2">
                    <CheckCircle className="w-5 h-5" />
                  </span>
                </motion.a>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

    </div>
  );
}

// --- Main App Wrapper ---
export default function App() {
  const isMobile = useIsMobile();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200 antialiased selection:bg-blue-500/30 overflow-hidden flex flex-col relative">
      
      {/* Global Offline Banner */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-500/90 backdrop-blur-md text-white text-center py-2.5 px-4 text-sm font-semibold z-[100] shadow-lg flex items-center justify-center gap-2 border-b border-red-600 w-full"
          >
            <AlertTriangle className="w-4 h-4" />
            Wi-Fi Disconnected: Please connect to a network to use SyncDrop.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden h-full w-full">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/30 rounded-full blur-[120px]" />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 w-full h-full min-h-screen mx-auto flex flex-col">
        {isMobile ? <MobileUploader /> : <DesktopDashboard />}
      </div>
      
    </div>
  );
}
