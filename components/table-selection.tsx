"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store";

import { selectTable as setBookingTable, updateTablePosition } from "@/lib/slices/bookingSlice";
import { setCurrentTableRoute, setStep } from "@/lib/slices/flowSlice";

import { DndContext, useDraggable, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import TableCard from "./table-card";
import { initFromLocal, selectSortedTables } from "@/lib/slices/tablesSlice";

type DraggableItemProps = {
  table: {
    id: string;
    position?: { x: number; y: number };
    [k: string]: any;
  };
  baseZ: number;
  snap?: number;
};

function DraggableItem({ table, baseZ, snap = 20 }: DraggableItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: table.id });
  const visual: any =
    transform ? { x: Math.round(transform.x / snap) * snap, y: Math.round(transform.y / snap) * snap } : null;

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(visual ?? transform),
    zIndex: isDragging ? 10000 : baseZ,
    position: "absolute",
    left: table.position?.x ?? 0,
    top: table.position?.y ?? 0,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TableCard table={table} showHandle listeners={listeners} attributes={attributes} />
    </div>
  );
}

export default function TableSelection() {
  const dispatch = useAppDispatch();

  // 1) Load/seed tables from localStorage once on mount
  useEffect(() => {
    dispatch(initFromLocal({ seedIfEmpty: true, alsoMergeMissingDefaults: false }));
  }, [dispatch]);

  // 2) Read tables (sorted) from store
  const tables = useAppSelector(selectSortedTables);

  // 3) Arrange mode state + z-index management for drag visuals
  const [arrangeMode, setArrangeMode] = useState(false);
  const [zMap, setZMap] = useState<Record<string | number, number>>({});
  const zRef = useRef(1);
  const SNAP = 20;

  const sorted = useMemo(() => tables, [tables]);

  // 4) Select a table and advance to next step
  const handleSelect = (id: string | number) => {
    const t = sorted.find((tb) => String(tb.id) === String(id));
    // booking: which table is active
    dispatch(setBookingTable(String(id)));
    // optional route string (if you show per-table page)
    if (t) dispatch(setCurrentTableRoute(`/table/${t.number}`));
    // flow: go to the seat-selection step (or whatever your next step is)
    dispatch(setStep("seat-selection"));
  };

  // 5) DnD handlers (only in arrange mode)
  const handleDragStart = (e: DragStartEvent) => {
    if (!arrangeMode) return;
    const id = String(e.active.id);
    setZMap((prev) => ({ ...prev, [id]: (zRef.current += 1) }));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    if (!arrangeMode) return;
    const { active, delta } = e;
    if (!delta.x && !delta.y) return;

    const t = sorted.find((x) => String(x.id) === String(active.id));
    if (!t) return;

    const snapped = {
      x: Math.round(((t.position?.x ?? 0) + delta.x) / SNAP) * SNAP,
      y: Math.round(((t.position?.y ?? 0) + delta.y) / SNAP) * SNAP,
    };

    dispatch(updateTablePosition({ tableId: String(t.id), position: snapped, snap: SNAP }));
  };

  return (
    <div className="relative text-white p-3 sm:p-6 overflow-hidden">
      {/* Background image (faded, click-through) */}
      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: "url('/floor-2.jpg')", opacity: 0.5 }}
      />
      {/* Optional dark overlay for readability */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />

      {/* Content */}
      <div className="relative max-w-[1400px] mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="my-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Select Your Dining</h1>
            <p className="text-gray-300 mt-1">Tap a Dining to continue or enter Arrange Mode to change layout.</p>
          </div>
          <div className="flex justify-center sm:justify-end">
            <button
              type="button"
              onClick={() => setArrangeMode((v) => !v)}
              className={`px-4 py-2 rounded-md font-semibold transition-colors ${
                arrangeMode ? "bg-yellow-500 text-black hover:bg-yellow-400" : "bg-white/10 hover:bg-white/20"
              }`}
            >
              {arrangeMode ? "Exit Arrange Mode" : "Enter Arrange Mode"}
            </button>
          </div>
        </div>

        {/* Normal (non-arrange) mode */}
        {!arrangeMode && (
          <div className="relative py-4 sm:py-6">
            <div className="relative z-10 h-[950px] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-6 sm:gap-4">
                {sorted.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelect(t.id)}
                    className="block w-full text-left transition-transform focus:outline-none"
                    aria-label={`Select table ${t.number}`}
                  >
                    <TableCard table={t} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Arrange mode */}
        {arrangeMode && (
          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="relative min-h-[520px] md:min-h-[620px] rounded-2xl border border-gray-700 overflow-hidden">
              {/* 20px grid backdrop */}
              <div className="absolute inset-0 pointer-events-none">
                <svg width="100%" height="100%">
                  <defs>
                    <pattern id="grid20" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid20)" />
                </svg>
              </div>

              {sorted.map((t) => (
                <DraggableItem
                  key={t.id}
                  table={t}
                  baseZ={zMap[String(t.id)] ?? 1}
                  snap={SNAP}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-center text-gray-400">
              Snaps every 20px • Overlap allowed • Drag the yellow “Drag” badge on each card
            </p>
          </DndContext>
        )}
      </div>
    </div>
  );
}
