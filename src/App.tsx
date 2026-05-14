import { useState, useMemo, useEffect, FC, useRef, RefObject } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Search, Printer, FileText, Database, X, Download, Loader2, Plus } from "lucide-react";
import { Equipment } from "./types";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface StickerCardProps {
  equipment: Equipment;
  innerRef?: (el: HTMLDivElement | null) => void;
}

const StickerCard: FC<StickerCardProps> = ({ equipment, innerRef }) => {
  return (
    <div 
      ref={innerRef}
      data-sn={equipment.serialNumber}
      className="sticker-container sticker-export-target group relative print:break-inside-avoid"
    >
      <div className="sticker-content">
        <div className="sticker-body">
          {/* Header/QR Area - centered at top */}
          <div className="qr-wrapper-centered">
            <QRCodeCanvas
              value={equipment.workId}
              size={140}
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
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [rawData, setRawData] = useState("");
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSNs, setSelectedSNs] = useState<Set<string>>(new Set());
  const [manualData, setManualData] = useState({
    sn: "",
    rental: "",
    workId: "",
    owner: ""
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const stickerRefs = useRef<(HTMLDivElement | null)[]>([]);
  
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
    let result = equipments;
    if (searchQuery.trim()) {
      result = result.filter((e) =>
        e.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedSNs.size > 0) {
      result = result.filter((e) => selectedSNs.has(e.serialNumber));
    }
    
    return result;
  }, [equipments, searchQuery, selectedSNs]);

  const toggleSNSelection = (sn: string) => {
    const newSelected = new Set(selectedSNs);
    if (newSelected.has(sn)) {
      newSelected.delete(sn);
    } else {
      newSelected.add(sn);
    }
    setSelectedSNs(newSelected);
  };

  const selectAllFiltered = () => {
    const currentFiltered = equipments.filter((e) =>
      e.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const newSelected = new Set(selectedSNs);
    currentFiltered.forEach(e => newSelected.add(e.serialNumber));
    setSelectedSNs(newSelected);
  };

  const clearSelection = () => {
    setSelectedSNs(new Set());
  };

  const clearData = () => {
    if (confirm("Are you sure you want to clear all data?")) {
      setEquipments([]);
      localStorage.removeItem("ccu_equipments");
    }
  };

  const addManualItem = () => {
    if (!manualData.sn.trim()) return;
    
    setEquipments(prev => [...prev, {
      serialNumber: manualData.sn,
      rentalEquipment: manualData.rental,
      workId: manualData.workId,
      blOwner: manualData.owner
    }]);
    
    setManualData({
      sn: "",
      rental: "",
      workId: "",
      owner: ""
    });
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
      const totalSteps = filteredEquipments.length * 2;
      let currentStep = 0;

      for (let i = 0; i < filteredEquipments.length; i++) {
        const item = filteredEquipments[i];
        
        // Process twice for each item
        for (let copy = 0; copy < 2; copy++) {
          const element = stickerRefs.current[i * 2 + copy];
          
          if (element) {
            try {
              const canvas = await html2canvas(element, {
                scale: 3,
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
              
              const imgData = canvas.toDataURL("image/png");
              
              if (currentStep > 0) pdf.addPage([4, 3], "landscape");
              pdf.addImage(imgData, "PNG", 0, 0, 4, 3);
            } catch (itemError) {
              console.error(`Error processing copy ${copy} of item ${i}:`, itemError);
            }
          }
          
          currentStep++;
          setExportProgress(Math.round((currentStep / totalSteps) * 100));
          await new Promise(resolve => setTimeout(resolve, 80));
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
      <aside className="w-[380px] p-8 flex flex-col space-y-8 input-panel group print:hidden">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center font-black text-2xl shadow-inner border border-primary-dark">C</div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tighter uppercase leading-none">CCU Automation</h1>
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-1">Label Management System</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Plus className="w-3 h-3" />
            1. Manual Add (Single Item)
          </label>
          <div className="bg-primary/10 p-4 rounded-2xl space-y-3 border border-primary/20">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Serial Number"
                value={manualData.sn}
                onChange={(e) => setManualData({...manualData, sn: e.target.value})}
                className="w-full p-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-primary shadow-sm"
              />
              <input
                type="text"
                placeholder="Rental Equipment"
                value={manualData.rental}
                onChange={(e) => setManualData({...manualData, rental: e.target.value})}
                className="w-full p-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-primary shadow-sm"
              />
              <input
                type="text"
                placeholder="Work ID"
                value={manualData.workId}
                onChange={(e) => setManualData({...manualData, workId: e.target.value})}
                className="w-full p-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-primary shadow-sm"
              />
              <input
                type="text"
                placeholder="BL Owner"
                value={manualData.owner}
                onChange={(e) => setManualData({...manualData, owner: e.target.value})}
                className="w-full p-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-primary shadow-sm"
              />
            </div>
            <button
              onClick={addManualItem}
              disabled={!manualData.sn.trim()}
              className="w-full py-2 bg-primary hover:bg-primary-dark text-ink font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              Add One Item
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <FileText className="w-3 h-3" />
            2. Import Data (Excel Tab-Separated)
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
            3. Search Serial Number
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

        <div className="space-y-3">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Database className="w-3 h-3" />
            4. Review & Select Objects
          </label>
          {equipments.length > 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm flex flex-col max-h-[400px]">
              <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                    Review List
                  </span>
                  <span className="text-[9px] font-bold text-primary-dark mt-1">
                    {selectedSNs.size > 0 ? `${selectedSNs.size} of ${equipments.length} selected` : 'Select items to export'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={selectAllFiltered}
                    className="px-2 py-1 bg-primary/20 hover:bg-primary/30 rounded-lg text-[9px] font-bold text-primary-dark uppercase transition-colors"
                  >
                    Select All
                  </button>
                  <button 
                    onClick={clearSelection}
                    className="px-2 py-1 bg-red-50 hover:bg-red-100 rounded-lg text-[9px] font-bold text-red-500 uppercase transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-1 space-y-1">
                {equipments
                  .filter(e => e.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((item, idx) => (
                    <label 
                      key={`select-${item.serialNumber}-${idx}`}
                      className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                        selectedSNs.has(item.serialNumber) 
                          ? 'bg-primary/5 border-primary/20 shadow-sm' 
                          : 'hover:bg-gray-50 border-transparent'
                      }`}
                    >
                      <div className="pt-0.5">
                        <input 
                          type="checkbox"
                          checked={selectedSNs.has(item.serialNumber)}
                          onChange={() => toggleSNSelection(item.serialNumber)}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-mono font-black truncate text-gray-900 group-hover:text-primary transition-colors">
                            {item.serialNumber}
                          </span>
                          <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase">
                            ID: {item.workId}
                          </span>
                        </div>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[9px] text-gray-500 truncate italic">
                            {item.rentalEquipment}
                          </span>
                          <span className="text-[9px] text-gray-400 truncate border-l border-gray-200 pl-2">
                            {item.blOwner}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))
                }
              </div>
            </div>
          ) : (
            <div className="p-8 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-300">
               <Database className="w-8 h-8 mb-2 opacity-20" />
               <p className="text-[10px] font-bold uppercase tracking-widest">Buffer Empty</p>
            </div>
          )}
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
      <main className="flex-1 bg-preview-bg flex flex-col items-center justify-center relative overflow-hidden print:hidden">
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
            filteredEquipments.flatMap((item, idx) => [
              <StickerCard 
                key={`${item.serialNumber}-${idx}-1`} 
                equipment={item} 
                innerRef={(el) => (stickerRefs.current[idx * 2] = el)}
              />,
              <StickerCard 
                key={`${item.serialNumber}-${idx}-2`} 
                equipment={item} 
                innerRef={(el) => (stickerRefs.current[idx * 2 + 1] = el)}
              />
            ])
          )}
        </div>
      </main>

      {/* Print-only container */}
      <div className="hidden print:block w-full">
        {filteredEquipments.flatMap((item, idx) => [
          <StickerCard key={`print-${item.serialNumber}-${idx}-1`} equipment={item} />,
          <StickerCard key={`print-${item.serialNumber}-${idx}-2`} equipment={item} />
        ])}
      </div>
    </div>
  );
}

