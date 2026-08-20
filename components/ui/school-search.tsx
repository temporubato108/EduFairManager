"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { School, Check, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import schoolsData from "@/lib/data/schools.json";

interface SchoolItem {
  name: string;
  region: string;
}

interface SchoolSearchProps {
  name?: string;
  value?: string;
  onChange?: (schoolName: string, region: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SchoolSearch({
  name = "school_name",
  value = "",
  onChange,
  required = true,
  disabled = false,
  className,
}: SchoolSearchProps) {
  const [searchTerm, setSearchTerm] = useState(value);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value
  useEffect(() => {
    if (value !== searchTerm && !isOpen) {
      setSearchTerm(value);
    }
  }, [value, isOpen, searchTerm]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Filter schools (up to 15 items for high performance)
  const filteredSchools = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];
    
    const results: SchoolItem[] = [];
    for (let i = 0; i < schoolsData.length; i++) {
      const s = schoolsData[i];
      if (s.name.toLowerCase().includes(query)) {
        results.push(s);
        if (results.length >= 15) break;
      }
    }
    return results;
  }, [searchTerm]);

  const handleSelect = (school: SchoolItem) => {
    setSearchTerm(school.name);
    setSelectedRegion(school.region);
    setIsOpen(false);
    if (onChange) {
      onChange(school.name, school.region);
    }
  };

  const handleCustomInput = () => {
    const clean = searchTerm.trim();
    if (!clean) return;
    setSelectedRegion("기타");
    setIsOpen(false);
    if (onChange) {
      onChange(clean, "기타");
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Hidden form fields for native FormData support */}
      <input type="hidden" name={name} value={searchTerm} />
      <input type="hidden" name="region" value={selectedRegion} />

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <School className="h-4 w-4" />
        </div>

        <Input
          type="text"
          placeholder="학교명을 입력하세요"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            if (onChange) {
              onChange(e.target.value, selectedRegion);
            }
          }}
          onFocus={() => {
            if (searchTerm.trim()) setIsOpen(true);
          }}
          required={required}
          disabled={disabled}
          autoComplete="off"
          className="pl-10 pr-10 bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-[#2C2C2E] text-slate-800 dark:text-white placeholder-slate-400 rounded-xl h-11 text-xs sm:text-sm font-medium focus-visible:ring-2 focus-visible:ring-indigo-500"
        />

        {searchTerm.trim() && (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
          </button>
        )}
      </div>

      {/* Floating Auto-complete Dropdown */}
      {isOpen && searchTerm.trim().length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-[#1E1E1E] border border-slate-200 dark:border-[#2C2C2E] rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          {filteredSchools.length > 0 ? (
            <div className="p-1.5 space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>전국 초·중·고 검색 결과 ({filteredSchools.length}개)</span>
                <span>지역</span>
              </div>
              {filteredSchools.map((school) => {
                const isSelected = searchTerm === school.name && selectedRegion === school.region;
                return (
                  <button
                    key={`${school.name}-${school.region}`}
                    type="button"
                    onClick={() => handleSelect(school)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-colors",
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate">{school.name}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600 flex-shrink-0" />}
                    </div>
                    <span className="flex-shrink-0 ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-[#121212] text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-[#2C2C2E]">
                      {school.region}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-slate-500">
              <p>일치하는 학교명을 찾을 수 없습니다.</p>
            </div>
          )}

          {/* Direct Custom Input Fallback Option */}
          <div className="border-t border-slate-100 dark:border-[#2C2C2E] p-1.5 bg-slate-50/70 dark:bg-[#151515]">
            <button
              type="button"
              onClick={handleCustomInput}
              className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>&apos;{searchTerm.trim()}&apos; (목록에 없는 학교 직접 입력)</span>
            </button>
          </div>
        </div>
      )}

      {/* Selected Tag Pill */}
      {selectedRegion && !isOpen && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">선택된 학교:</span>
          <span className="font-bold text-slate-800 dark:text-white">{searchTerm}</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 dark:bg-[#1E1E1E] border border-slate-200 dark:border-[#2C2C2E] font-bold text-slate-600 dark:text-slate-300">
            {selectedRegion}
          </span>
        </div>
      )}
    </div>
  );
}
