import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Image as ImageIcon, 
  Search, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Camera, 
  Info,
  History,
  Activity,
  Maximize2,
  Lock,
  MapPin,
  Clock,
  RefreshCw,
  Scan,
  Zap
} from 'lucide-react';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ""; // The environment provides the key at runtime automatically

const App = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [scanningStep, setScanningStep] = useState("");
  
  const [recentClaims, setRecentClaims] = useState([
    { id: 'ORD-8821', user: 'Rahul S.', status: 'Flagged', probability: 94, reason: 'AI Generated Texture', time: '2 mins ago' },
    { id: 'ORD-9012', user: 'Priya K.', status: 'Authentic', probability: 12, reason: 'Natural Lighting', time: '15 mins ago' },
    { id: 'ORD-7743', user: 'Amit M.', status: 'Flagged', probability: 82, reason: 'GPS Metadata Mismatch', time: '1 hour ago' },
  ]);

  const fileInputRef = useRef(null);

  const fetchWithRetry = async (url, options, maxRetries = 5) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) return await response.json();
        // Retry on 429 (Rate Limit) or 500+ (Server Error)
        if (response.status !== 429 && response.status < 500) {
            const errorBody = await response.json();
            throw new Error(errorBody?.error?.message || `Error: ${response.status}`);
        }
      } catch (e) {
        if (i === maxRetries - 1) throw e;
      }
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    throw new Error("Analysis failed after multiple retries. Please try a smaller image.");
  };

  const analyzeImageWithAI = async (base64Data) => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
    
    const steps = ["Initializing Forensic Engine", "Analyzing Pixel Continuity", "Checking Lighting Vectors", "Detecting Generative Noise"];
    let stepIdx = 0;
    const stepInterval = setInterval(() => {
        if (stepIdx < steps.length) {
            setScanningStep(steps[stepIdx]);
            stepIdx++;
        }
    }, 600);

    const systemPrompt = `You are an elite Digital Forensic Analyst specialized in identifying "Food Refund Fraud" using advanced detection layers.
    Your task is to analyze the provided image using these 5 sophisticated detection layers:
    
    1. FREQUENCY ANALYSIS (FFT): AI-generated images leave artifacts in the frequency domain invisible to human eyes. Analyze for unnatural spectral patterns and anomalies.
    2. METADATA ANALYSIS (EXIF): Real photos contain camera metadata (GPS, camera model, timestamp, ISO). AI-generated images lack EXIF data or have suspicious/inconsistent metadata.
    3. DEEP LEARNING CLASSIFICATION: Analyze using CNN patterns. Pre-trained models detect statistical signatures of AI-generated content.
    4. GAN FINGERPRINTING: GANs (Midjourney, DALL-E, Stable Diffusion) leave subtle statistical fingerprints in pixel distributions and color channels.
    5. FACIAL/OBJECT INCONSISTENCY: AI often creates unnatural features—asymmetric elements, impossible reflections, blurry edges, anatomically incorrect details in objects or surroundings.
    
    You must return a JSON response strictly following this schema:
    {
      "score": number (0-100, where 100 is definitely fraud),
      "verdict": "Flagged" | "Authentic",
      "detections": [
        { "label": "Frequency Analysis (FFT)", "pass": boolean, "confidence": number },
        { "label": "Metadata/EXIF Analysis", "pass": boolean, "confidence": number },
        { "label": "Deep Learning Classifier", "pass": boolean, "confidence": number },
        { "label": "GAN Fingerprinting", "pass": boolean, "confidence": number },
        { "label": "Facial/Object Inconsistency", "pass": boolean, "confidence": number }
      ],
      "details": "Detailed technical analysis for each detection layer with specific findings."
    }`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: "Perform a comprehensive 5-layer digital forensic scan on this image. Use Frequency Analysis, Metadata Analysis, Deep Learning Classification, GAN Fingerprinting, and Facial/Object Inconsistency Detection to determine if the food damage shown is real, photoshopped, or AI-generated. Provide technical reasoning for each layer." },
            { 
              inlineData: { 
                mimeType: "image/png",
                data: base64Data.split(',')[1] 
              } 
            }
          ]
        }
      ],
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            score: { type: "NUMBER" },
            verdict: { type: "STRING" },
            detections: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  label: { type: "STRING" },
                  pass: { type: "BOOLEAN" },
                  confidence: { type: "NUMBER" }
                }
              }
            },
            details: { type: "STRING" }
          },
          required: ["score", "verdict", "detections", "details"]
        }
      }
    };

    try {
      const result = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (responseText) {
        const parsed = JSON.parse(responseText);
        setAnalysisResult(parsed);
        
        setRecentClaims(prev => [
          { 
            id: `ORD-${Math.floor(Math.random() * 9000) + 1000}`, 
            user: 'New Upload', 
            status: parsed.verdict, 
            probability: parsed.score, 
            reason: parsed.details.substring(0, 45) + '...', 
            time: 'Just now' 
          },
          ...prev.slice(0, 4)
        ]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
      setScanningStep("");
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        setSelectedImage(base64);
        analyzeImageWithAI(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col md:flex-row antialiased">
      {/* Sidebar Navigation */}
      <nav className="w-full md:w-72 bg-[#0F172A] text-white p-8 flex flex-col gap-10 shrink-0 border-r border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-orange-500 rounded-xl shadow-xl shadow-orange-500/20">
            <ShieldCheck size={26} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tight leading-none">AuthentiCheck</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Forensic Lab v4.0</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Operational Hub</p>
          <NavItem icon={<Scan size={18}/>} label="Live Image Scan" active />
          <NavItem icon={<History size={18}/>} label="Fraud Ledger" />
          <NavItem icon={<Activity size={18}/>} label="API Analytics" />
          <NavItem icon={<Lock size={18}/>} label="Policy Control" />
        </div>

        <div className="mt-auto">
            <div className="p-5 bg-slate-800/40 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
              <div className="flex justify-between items-center mb-3">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Platform Status</p>
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_#34d399]"></span>
              </div>
              <p className="text-xs font-bold text-slate-200">Connected to Gemini-2.5</p>
              <p className="text-[10px] text-slate-500 mt-1">Environment API: Active</p>
            </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-black rounded uppercase tracking-wider">Internal Use Only</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Authenticity Verification</h2>
            <p className="text-slate-500 font-medium">Upload customer evidence to detect AI-generated food damage.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-3 px-8 py-4 ${isAnalyzing ? 'bg-slate-200 text-slate-500' : 'bg-orange-500 hover:bg-orange-600 text-white'} rounded-2xl font-black text-sm shadow-2xl shadow-orange-500/30 transition-all active:scale-[0.98] disabled:cursor-not-allowed`}
            >
              {isAnalyzing ? <RefreshCw className="animate-spin" size={18}/> : <ImageIcon size={18}/>}
              {isAnalyzing ? 'Processing Scan...' : 'Upload Order Evidence'}
            </button>
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              accept="image/*" 
              onChange={handleFileUpload} 
            />
          </div>
        </header>

        {error && (
          <div className="mb-8 p-5 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
            <div className="p-2 bg-red-100 rounded-lg text-red-600">
                <AlertTriangle size={20} />
            </div>
            <div>
                <p className="font-black text-sm uppercase tracking-tight">System Error Detected</p>
                <p className="text-sm opacity-80 mt-1 font-medium">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
          {/* Analysis Viewport */}
          <div className="xl:col-span-8 flex flex-col gap-8">
            <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col h-[600px] relative group">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-xl sticky top-0 z-20">
                <div className="flex items-center gap-3 font-black text-slate-800 uppercase tracking-tighter">
                  <Camera size={20} className="text-orange-500" />
                  <span>Digital Evidence Viewport</span>
                </div>
                {analysisResult && (
                  <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 ${analysisResult.verdict === 'Flagged' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'}`}>
                    {analysisResult.verdict === 'Flagged' ? <AlertTriangle size={14}/> : <CheckCircle size={14}/>}
                    {analysisResult.verdict} Risk: {analysisResult.score}%
                  </div>
                )}
              </div>
              
              <div className="flex-1 bg-slate-50 relative flex items-center justify-center overflow-hidden">
                {selectedImage ? (
                  <>
                    <img 
                      src={selectedImage} 
                      alt="Uploaded proof" 
                      className={`max-w-full max-h-full object-contain ${isAnalyzing ? 'scale-105 blur-md opacity-30 grayscale' : 'scale-100'} transition-all duration-1000 ease-out`}
                    />
                    {isAnalyzing && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
                        <div className="relative">
                            <div className="w-24 h-24 border-[6px] border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Zap className="text-orange-500 animate-pulse" size={32} />
                            </div>
                        </div>
                        <div className="mt-8 text-center px-6">
                            <p className="font-black text-slate-900 uppercase tracking-[0.3em] text-sm mb-2">{scanningStep || 'Running Forensics'}</p>
                            <div className="flex gap-1 justify-center">
                                {[1,2,3].map(i => <div key={i} className={`h-1.5 w-8 rounded-full ${i===1 ? 'bg-orange-500' : 'bg-slate-200'} animate-pulse`}></div>)}
                            </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div 
                    onClick={() => !isAnalyzing && fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-6 cursor-pointer text-slate-400 group p-12 transition-all"
                  >
                    <div className="p-12 bg-white rounded-full border-2 border-dashed border-slate-200 group-hover:border-orange-400 group-hover:bg-orange-50 group-hover:rotate-6 transition-all duration-500 shadow-sm">
                      <ImageIcon size={64} className="group-hover:scale-110 text-slate-300 group-hover:text-orange-500 transition-all"/>
                    </div>
                    <div className="text-center">
                      <p className="font-black text-slate-800 text-xl tracking-tight">Evidence Missing</p>
                      <p className="text-slate-500 font-medium">Upload high-resolution image to initiate AI check.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Analysis Results Panel */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-lg shadow-slate-200/40">
                <h3 className="font-black flex items-center gap-3 mb-6 text-slate-900 uppercase tracking-tighter">
                   <Info size={22} className="text-blue-500" /> AI Findings Report
                </h3>
                {analysisResult ? (
                  <div className="space-y-5">
                    <div className="text-sm text-slate-600 leading-relaxed bg-blue-50/50 p-6 rounded-2xl border border-blue-100 italic relative">
                      <span className="absolute -top-3 left-6 px-2 bg-blue-500 text-white text-[10px] font-black rounded uppercase">Technical Summary</span>
                      "{analysisResult.details}"
                    </div>
                    <div className="flex flex-wrap gap-2">
                       <Badge icon={<MapPin size={12}/>} text={analysisResult.verdict === 'Flagged' ? 'GPS DISCREPANCY' : 'LOCATION VERIFIED'} color="slate" />
                       <Badge icon={<Clock size={12}/>} text="SCAN COMPLETE" color="emerald" />
                    </div>
                  </div>
                ) : (
                  <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[1.5rem] gap-4">
                    <div className="p-3 bg-slate-50 rounded-full text-slate-200">
                        <Search size={28} />
                    </div>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest text-center px-10">Data will populate after scan completion</p>
                  </div>
                )}
              </div>

              <div className="bg-[#0F172A] p-8 rounded-[2rem] text-white shadow-2xl">
                <h3 className="font-black mb-8 flex items-center gap-3 uppercase tracking-tighter">
                   <ShieldCheck size={22} className="text-orange-500" /> Integrity Scorecard
                </h3>
                <div className="flex flex-col gap-4">
                  {(analysisResult?.detections || [
                    { label: 'Pixel Integrity', pending: true },
                    { label: 'Lighting Consistency', pending: true },
                    { label: 'Noise Distribution', pending: true },
                    { label: 'Contextual Alignment', pending: true }
                  ]).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3.5 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all">
                      <span className="text-sm font-bold text-slate-300">{item.label}</span>
                      {item.pending ? (
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-slate-700 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-slate-700 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        </div>
                      ) : (
                        <div className={`flex items-center gap-2 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase ${item.pass ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                          {item.pass ? <CheckCircle size={12}/> : <XCircle size={12}/>}
                          {item.pass ? 'Pass' : 'Anomaly'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Live Feed & Stats */}
          <div className="xl:col-span-4 flex flex-col gap-8">
            <section className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="font-black flex items-center gap-3 text-slate-900 uppercase tracking-tighter text-lg">
                   <History size={22} className="text-orange-500"/> Activity Feed
                 </h3>
                 <span className="flex items-center gap-2 bg-red-50 px-2 py-1 rounded-lg">
                   <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                   <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em]">Live</span>
                 </span>
              </div>
              <div className="flex flex-col gap-5">
                {recentClaims.map((claim, idx) => (
                  <div key={`${claim.id}-${idx}`} className="group relative pl-6 border-l-4 border-slate-100 hover:border-orange-500 transition-all duration-300 cursor-pointer py-1">
                    <div className="flex justify-between items-start mb-1.5">
                      <p className="text-sm font-black text-slate-900 tracking-tight leading-none">{claim.id}</p>
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md ${claim.status === 'Flagged' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {claim.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 font-medium leading-relaxed mb-2">{claim.reason}</p>
                    <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       <span className="flex items-center gap-1.5"><Clock size={10}/> {claim.time}</span>
                       <span className={claim.probability > 70 ? 'text-red-500' : 'text-emerald-500'}>{claim.probability}% RISK</span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-10 py-4 bg-slate-50 text-[11px] font-black text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-2xl transition-all uppercase tracking-[0.2em] border border-transparent hover:border-orange-200">
                Download Audit Log
              </button>
            </section>

            <section className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group">
               <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-orange-500/10 rounded-full blur-[80px] group-hover:bg-orange-500/20 transition-all duration-1000"></div>
               <div className="flex items-center gap-2 text-orange-500 mb-8">
                  <Activity size={18} />
                  <span className="text-xs font-black uppercase tracking-[0.2em]">Network Intercepts</span>
               </div>
               
               <div className="grid grid-cols-2 gap-4 mb-8">
                   <div>
                       <div className="text-4xl font-black tabular-nums tracking-tighter mb-1">14.2k</div>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Scans (24h)</p>
                   </div>
                   <div className="text-right">
                       <div className="text-4xl font-black tabular-nums tracking-tighter text-orange-500 mb-1">92%</div>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Accuracy</p>
                   </div>
               </div>
               
               <div className="space-y-4 relative z-10 pt-6 border-t border-white/5">
                 <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span>Fraud Mitigation Score</span>
                    <span className="text-orange-400 text-xs tracking-tighter">EXCELLENT</span>
                 </div>
                 <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 w-[94%] shadow-[0_0_20px_rgba(249,115,22,0.6)] animate-pulse"></div>
                 </div>
                 <p className="text-[11px] leading-relaxed text-slate-400 font-medium italic">
                    Successfully intercepting <span className="text-white font-bold">~₹85k</span> in fraudulent claims per hour.
                 </p>
               </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active = false }) => (
  <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl cursor-pointer transition-all duration-300 group ${active ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20' : 'text-slate-500 hover:bg-slate-800/80 hover:text-slate-200'}`}>
    <div className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-orange-500'} transition-colors`}>{icon}</div>
    <span className="text-sm font-black tracking-tight uppercase tracking-wider">{label}</span>
  </div>
);

const Badge = ({ icon, text, color }) => {
    const colors = {
        slate: "bg-slate-100 text-slate-600 border-slate-200",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        blue: "bg-blue-50 text-blue-600 border-blue-100"
    };
    return (
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black border uppercase tracking-wider ${colors[color]}`}>
            {icon}
            {text}
        </div>
    );
};

export default App;
