import { useState, useMemo, useEffect, FC } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Search, Printer, FileText, Database, X } from "lucide-react";
import { Equipment } from "./types";

interface StickerCardProps {
  equipment: Equipment;
}

const StickerCard: FC<StickerCardProps> = ({ equipment }) => {
  return (
    <div className="sticker-container group relative print:break-inside-avoid shadow-2xl">
      <div className="sticker-content">
        <div className="sticker-body">
          {/* Header/QR Area */}
          <div className="qr-wrapper">
            <QRCodeSVG
              value={equipment.workId}
              size={85}
              level="H"
              includeMargin={false}
            />
          </div>

          {/* Details Area */}
          <div className="label-text-container">
            <div className="detail-row">
              <span className="detail-label">Serial Number</span>
              <span className="detail-value-mono truncate">{equipment.serialNumber}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Equipment</span>
              <span className="detail-value truncate">{equipment.rentalEquipment}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Work ID</span>
              <span className="detail-value truncate">{equipment.workId}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Owner</span>
              <span className="detail-value truncate">{equipment.blOwner}</span>
            </div>
          </div>

          {/* Footer Branding */}
          <div className="slb-footer">
              SLB-PRIVATE
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

  return (
    <div className="flex h-screen w-full bg-bg-soft print:hidden print:block print:h-auto overflow-hidden">
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
            className="w-full h-48 p-4 text-xs font-mono border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none bg-gray-50 transition-all resize-none shadow-sm"
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
              className="w-full py-4 px-12 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none text-sm font-semibold transition-all shadow-sm"
            />
            <Search className="absolute left-4 top-4 w-4 h-4 text-gray-400" />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-4 top-4 text-gray-300 hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-auto pt-8 border-t border-gray-100">
           <button
            onClick={() => window.print()}
            disabled={equipments.length === 0}
            className="w-full btn-accent disabled:opacity-30 disabled:cursor-not-allowed group shadow-xl"
          >
            <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="uppercase tracking-widest">Print Sticker (4x3)</span>
          </button>
          <p className="mt-4 text-[9px] text-gray-400 text-center font-mono opacity-60">ZPL COMPATIBLE • 300 DPI THERMAL READY</p>
        </div>
      </aside>

      {/* Main Preview Area */}
      <main className="flex-1 bg-preview-bg flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-8 left-8 text-white/40 pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Live Output Preview</p>
          </div>
          <p className="text-[9px] font-mono tracking-widest">ACTIVE BUFFER: {filteredEquipments.length} UNITS</p>
        </div>

        {/* Stickers Viewport */}
        <div className="w-full h-full overflow-y-auto custom-scrollbar p-12 flex flex-col items-center gap-12 print:hidden">
          {filteredEquipments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-white/20">
              <Database className="w-16 h-16 mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest">No Data in Buffer</p>
            </div>
          ) : (
            filteredEquipments.map((item, idx) => (
              <StickerCard key={`${item.serialNumber}-${idx}`} equipment={item} />
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

