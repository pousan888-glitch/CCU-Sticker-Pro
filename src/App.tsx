import { useState, useMemo, useEffect, FC, useRef, RefObject } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Search, Printer, FileText, Database, X, Download, Loader2 } from "lucide-react";
import { Equipment } from "./types";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface StickerCardProps {
  equipment: Equipment;
}

const StickerCard: FC<StickerCardProps> = ({ equipment }) => {
  return (
    <div 
      data-sn={equipment.serialNumber}
      className="sticker-container sticker-export-target group relative print:break-inside-avoid"
    >
      <div className="sticker-content">
        <div className="sticker-body">
          {/* Header/QR Area - centered at top */}
          <div className="qr-wrapper-centered">
            <QRCodeCanvas
              value={equipment.workId}
              size={120}
              level="H"
              includeMargin={false}
              bgColor="transparent"
            />
          </div>

          {/* Details Area - Word style */}
          <div className="label-text-container-word">
            <div className="word-row">
              <span className="word-label">Serial Number</span>
              <span className="word-value">{equipment.serialNumber}</span>
            </div>
            <div className="word-row">
              <span className="word-label">Rental Equipment</span>
              <span className="word-value">{equipment.rentalEquipment}</span>
            </div>
            <div className="word-row">
              <span className="word-label">Work ID</span>
              <span className="word-value">{equipment.workId}</span>
            </div>
            <div className="word-row">
              <span className="word-label">BL Owner</span>
              <span className="word-value">{equipment.blOwner}</span>
            </div>
          </div>

          {/* Footer Branding - specific casing */}
          <div className="slb-footer-centered">
              SLB-Private
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [rawData, setRawData] = useState("");
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  
  useEffect(() => {
    const saved = localStorage.getItem("ccu_equipments");
    if (saved) {
      try {
        setEquipments(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved data", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("ccu_equipments", JSON.stringify(equipments));
  }, [equipments]);

  const processData = () => {
    if (!rawData.trim()) return;
    const rows = rawData.trim().split("\n");
    const parsed: Equipment[] = rows.map((row) => {
      const cols = row.split("\t");
      return {
        serialNumber: cols[0]?.trim() || "N/A",
        rentalEquipment: cols[1]?.trim() || "N/A",
        workId: cols[2]?.trim() || "N/A",
        blOwner: cols[3]?.trim() || "N/A",
      };
    });
    setEquipments(parsed);
    setRawData("");
  };

  const filteredEquipments = useMemo(() => {
    if (!searchQuery.trim()) return equipments;
    return equipments.filter((e) =>
      e.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [equipments, searchQuery]);

  const clearData = () => {
    if (confirm("Are you sure you want to clear all data?")) {
      setEquipments([]);
      localStorage.removeItem("ccu_equipments");
    }
  };

  const downloadPDFFull = async () => {
    if (filteredEquipments.length === 0) return;
    
    setIsExporting(true);
    setExportProgress(0);
    
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "in",
      format: [4, 3],
      compress: true
    });

    try {
      for (let i = 0; i < filteredEquipments.length; i++) {
        const item = filteredEquipments[i];
        
        // Find element by Serial Number data attribute for more stability
        const element = document.querySelector(`[data-sn="${item.serialNumber}"]`) as HTMLDivElement;
        
        if (element) {
          try {
            const canvas = await html2canvas(element, {
              scale: 3, // Ultra sharpness for printing
              useCORS: true,
              allowTaint: true,
              backgroundColor: "#ffffff",
              logging: false,
              onclone: (clonedDoc) => {
                const targets = clonedDoc.getElementsByClassName('sticker-export-target');
                for (let j = 0; j < targets.length; j++) {
                  (targets[j] as HTMLElement).style.overflow = 'visible';
                }

                const styles = clonedDoc.getElementsByTagName('style');
                for (let j = 0; j < styles.length; j++) {
                  const s = styles[j];
                  if (s.innerHTML.includes('oklch') || s.innerHTML.includes('oklab')) {
                    s.innerHTML = s.innerHTML.replace(/(oklch|oklab)\([^)]+\)/g, '#000000');
                  }
                }
              },
              width: element.offsetWidth,
              height: element.offsetHeight,
              scrollX: 0,
              scrollY: 0,
              windowWidth: document.documentElement.offsetWidth,
              windowHeight: document.documentElement.offsetHeight
            });
            
            const imgData = canvas.toDataURL("image/png"); // PNG for maximum text clarity
            
            if (i > 0) pdf.addPage([4, 3], "landscape");
            pdf.addImage(imgData, "PNG", 0, 0, 4, 3);
          } catch (itemError) {
            console.error(`Error processing item ${i} (SN: ${item.serialNumber}):`, itemError);
            // Continue with other items instead of failing everything
          }
          
          const nextProgress = Math.round(((i + 1) / filteredEquipments.length) * 100);
          setExportProgress(nextProgress);
          
          // Yield to UI thread to prevent freezing and allow progress bar to update
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          console.warn(`Element for SN: ${item.serialNumber} not found.`);
        }
      }
      
      setExportProgress(100);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      pdf.save(`CCU_Labels_${timestamp}.pdf`);
    } catch (error) {
      console.error("PDF Export error:", error);
      alert(`Error generating PDF: ${error instanceof Error ? error.message : String(error)}\n\nTips:\n1. Try exporting fewer items (use Search to filter).\n2. Ensure the stickers are visible on screen.`);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  return (
    <div className="flex h-screen w-full bg-bg-soft print:h-auto print:static print:block overflow-hidden print:overflow-visible">
      {/* Sidebar - Hidden in Print */}
      <aside className="w-[380px] p-8 flex flex-col space-y-8 input-panel group">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center font-black text-2xl shadow-inner border border-primary-dark">C</div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tighter uppercase leading-none">CCU Automation</h1>
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-1">Label Management System</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <FileText className="w-3 h-3" />
            1. Import Data (Excel Tab-Separated)
          </label>
          <textarea
            id="excel_data"
            value={rawData}
            onChange={(e) => setRawData(e.target.value)}
            placeholder="Paste Excel columns here...&#10;SN	Rental	WorkID	Owner"
            className="w-full h-48 p-4 text-xs font-mono border border-gray-200 rounded-2xl focus:ring-4 focus:ring-[#ffed0033] focus:border-primary outline-none bg-gray-50 transition-all resize-none shadow-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={processData}
              disabled={!rawData.trim()}
              className="flex-1 btn-primary text-xs uppercase tracking-widest"
            >
              Process Data
            </button>
            {equipments.length > 0 && (
              <button onClick={clearData} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Search className="w-3 h-3" />
            2. Search Serial Number
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search SN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-4 px-12 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-[#ffed0033] focus:border-primary outline-none text-sm font-semibold transition-all shadow-sm"
            />
            <Search className="absolute left-4 top-4 w-4 h-4 text-gray-400" />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-4 top-4 text-gray-300 hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-auto pt-8 border-t border-gray-100 space-y-3">
          <button
            onClick={downloadPDFFull}
            disabled={equipments.length === 0 || isExporting}
            className="w-full py-4 px-6 bg-ink text-white rounded-xl font-bold flex items-center justify-center space-x-2 transition-all hover:bg-gray-800 active:scale-[0.98] disabled:opacity-30 shadow-lg relative overflow-hidden"
          >
            {isExporting && (
              <div 
                className="absolute left-0 top-0 h-full bg-[#ffed0033] transition-all duration-300 pointer-events-none" 
                style={{ width: `${exportProgress}%` }}
              />
            )}
            {isExporting ? (
              <Loader2 className="w-5 h-5 animate-spin z-10" />
            ) : (
              <Download className="w-5 h-5 z-10" />
            )}
            <span className="uppercase tracking-widest text-xs z-10">
              {isExporting ? `Exporting ${exportProgress}%` : 'Download PDF (Direct)'}
            </span>
          </button>

           <button
            onClick={() => window.print()}
            disabled={equipments.length === 0 || isExporting}
            className="w-full btn-accent disabled:opacity-30 disabled:cursor-not-allowed group shadow-xl"
          >
            <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="uppercase tracking-widest">Print Browser (4x3)</span>
          </button>
          <p className="mt-4 text-[9px] text-gray-400 text-center font-mono opacity-60 uppercase">ZPL READY • 300 DPI • 4x3 Landscape</p>
        </div>
      </aside>

      {/* Main Preview Area */}
      <main className="flex-1 bg-preview-bg flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-8 left-8 text-black/40 pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Live Output Preview</p>
          </div>
          <p className="text-[9px] font-mono tracking-widest uppercase">ACTIVE BUFFER: {filteredEquipments.length} UNITS</p>
        </div>

        {/* Stickers Viewport */}
        <div className="w-full h-full overflow-y-auto custom-scrollbar p-12 flex flex-col items-center gap-12 print:hidden">
          {filteredEquipments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-black/20">
              <Database className="w-16 h-16 mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest">No Data in Buffer</p>
            </div>
          ) : (
            filteredEquipments.map((item, idx) => (
              <StickerCard 
                key={`${item.serialNumber}-${idx}`} 
                equipment={item} 
              />
            ))
          )}
        </div>
      </main>

      {/* Print-only container */}
      <div className="hidden print:block w-full">
        {filteredEquipments.map((item, idx) => (
          <StickerCard key={`print-${item.serialNumber}-${idx}`} equipment={item} />
        ))}
      </div>
    </div>
  );
}

