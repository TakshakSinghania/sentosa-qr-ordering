import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Minus, Check, AlertCircle } from 'lucide-react';
import { MenuItem, CustomizationGroup, OrderItemCustomization } from '../../types/index.js';
import { VegBadge } from '../common/VegBadge.js';

interface ItemDetailModalProps {
  item: MenuItem | null;
  currencySymbol: string;
  onClose: () => void;
  onAddToCart: (
    item: MenuItem,
    quantity: number,
    instructions?: string,
    selectedOptionIds?: string[],
    customizations?: OrderItemCustomization[]
  ) => void;
  isRestaurantOpen: boolean;
  editMode?: boolean;
  initialQuantity?: number;
  initialInstructions?: string;
  initialOptionIds?: string[];
}

const QUICK_INSTRUCTIONS = [
  'Less spicy',
  'No onions or garlic',
  'Extra crispy',
  'Gluten sensitive',
  'Serve piping hot',
];

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  currencySymbol,
  onClose,
  onAddToCart,
  isRestaurantOpen,
  editMode = false,
  initialQuantity = 1,
  initialInstructions = '',
  initialOptionIds = [],
}) => {
  const [quantity, setQuantity] = useState<number>(initialQuantity);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [customNote, setCustomNote] = useState<string>('');
  
  // Selected option IDs mapped by group ID: groupId -> Set of option IDs
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  const initialOptionIdsKey = (initialOptionIds || []).join(',');

  // Initialize or reset selections when item changes
  useEffect(() => {
    if (!item) return;

    setQuantity(initialQuantity || 1);
    
    // Parse initial instructions
    if (initialInstructions) {
      const parts = initialInstructions.split(',').map((s) => s.trim());
      const matchedChips = parts.filter((p) => QUICK_INSTRUCTIONS.includes(p));
      const unmatchedNotes = parts.filter((p) => !QUICK_INSTRUCTIONS.includes(p));
      setSelectedChips(matchedChips);
      setCustomNote(unmatchedNotes.join(', '));
    } else {
      setSelectedChips([]);
      setCustomNote('');
    }

    const initialMap: Record<string, string[]> = {};

    if (item.customizationGroups && item.customizationGroups.length > 0) {
      for (const group of item.customizationGroups) {
        const availableOptions = (group.options || []).filter((opt) => opt.isAvailable !== false);
        
        if (initialOptionIds && initialOptionIds.length > 0) {
          const matched = availableOptions
            .filter((opt) => initialOptionIds.includes(opt.id))
            .map((opt) => opt.id);
          initialMap[group.id] = matched;
        } else if (group.required && group.type === 'SINGLE' && availableOptions.length > 0) {
          // Pre-select first available option for required single-select
          initialMap[group.id] = [availableOptions[0].id];
        } else {
          initialMap[group.id] = [];
        }
      }
    }

    setSelections(initialMap);
  }, [item?.id, initialQuantity, initialInstructions, initialOptionIdsKey]);

  // Validation Hook (must run before any early return)
  const validationError = useMemo(() => {
    if (!item || !item.customizationGroups) return null;

    for (const group of item.customizationGroups) {
      const chosen = selections[group.id] || [];
      if (group.required && chosen.length === 0) {
        return `Please select an option for "${group.name}".`;
      }
      if (group.minSelections > 0 && chosen.length < group.minSelections) {
        return `Please choose at least ${group.minSelections} option(s) for "${group.name}".`;
      }
      if (group.maxSelections > 0 && chosen.length > group.maxSelections) {
        return `Please choose at most ${group.maxSelections} option(s) for "${group.name}".`;
      }
    }
    return null;
  }, [item, selections]);

  // Calculate Unit and Total Price Hook (must run before any early return)
  const { unitPrice, selectedSnapshot, allSelectedOptionIds } = useMemo(() => {
    if (!item) {
      return {
        unitPrice: 0,
        selectedSnapshot: [] as OrderItemCustomization[],
        allSelectedOptionIds: [] as string[],
      };
    }

    let addOns = 0;
    const snapshots: OrderItemCustomization[] = [];
    const allOptionIds: string[] = [];

    if (item.customizationGroups) {
      for (const group of item.customizationGroups) {
        const chosenIds = selections[group.id] || [];
        for (const optId of chosenIds) {
          const opt = group.options?.find((o) => o.id === optId);
          if (opt) {
            addOns += opt.priceAddition;
            allOptionIds.push(opt.id);
            snapshots.push({
              groupName: group.name,
              optionName: opt.name,
              priceAddition: opt.priceAddition,
            });
          }
        }
      }
    }

    const unit = item.price + addOns;
    return {
      unitPrice: unit,
      selectedSnapshot: snapshots,
      allSelectedOptionIds: allOptionIds,
    };
  }, [item, selections]);

  // Safe early return after all React hooks have executed unconditionally
  if (!item) return null;

  const canOrder = isRestaurantOpen && item.isAvailable;

  const toggleChip = (chip: string) => {
    setSelectedChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  };

  const handleSelectSingle = (groupId: string, optionId: string) => {
    setSelections((prev) => ({
      ...prev,
      [groupId]: [optionId],
    }));
  };

  const handleToggleMulti = (group: CustomizationGroup, optionId: string) => {
    setSelections((prev) => {
      const current = prev[group.id] || [];
      if (current.includes(optionId)) {
        return {
          ...prev,
          [group.id]: current.filter((id) => id !== optionId),
        };
      } else {
        if (group.maxSelections > 0 && current.length >= group.maxSelections) {
          // Reached limit
          return prev;
        }
        return {
          ...prev,
          [group.id]: [...current, optionId],
        };
      }
    });
  };

  const totalCalculation = unitPrice * quantity;

  const handleConfirm = () => {
    if (validationError) return;

    const instructionsParts = [...selectedChips];
    if (customNote.trim()) {
      instructionsParts.push(customNote.trim());
    }
    const combinedInstructions = instructionsParts.length > 0 ? instructionsParts.join(', ') : undefined;

    onAddToCart(item, quantity, combinedInstructions, allSelectedOptionIds, selectedSnapshot);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 transition-all animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative bg-[#ebeae7] w-full max-w-lg rounded-t-[28px] sm:rounded-2xl shadow-modal max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200 border-t sm:border border-[#bdb8ad]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Sheet Drag Indicator Handle */}
        <div className="sm:hidden absolute top-2 left-1/2 -translate-x-1/2 z-30 w-10 h-1.5 rounded-full bg-[#bdb8ad]/60 pointer-events-none" />

        {/* Close Icon with 40x40 Touch Target */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 w-9 h-9 bg-[#3a3530]/80 hover:bg-[#3a3530] backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all active:scale-95 shadow-sm"
          title="Close"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Scrollable Modal Body */}
        <div className="overflow-y-auto flex-1 pb-6 no-scrollbar">
          {/* Featured Food Image */}
          <div className="relative w-full h-48 sm:h-56 bg-[#f4f3f0]">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#8d7d6d] text-xs">
                No photo available
              </div>
            )}
            {!item.isAvailable && (
              <div className="absolute inset-0 bg-[#3a3530]/75 flex items-center justify-center">
                <span className="bg-[#3a3530] text-white text-[11px] font-bold px-3.5 py-1 rounded-md">
                  Currently sold out
                </span>
              </div>
            )}
          </div>

          <div className="p-5 sm:p-6">
            {/* Dietary Badge & Category */}
            <div className="flex items-center gap-2 mb-2">
              <VegBadge isVeg={item.isVeg} size="md" />
              <span className="text-xs font-semibold text-[#5b554f]">
                {item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
              </span>
              {item.isFeatured && (
                <span className="text-[11px] font-semibold text-[#4f7897] bg-[#e8eff4] px-2 py-0.5 rounded-md">
                  Barista recommendation
                </span>
              )}
            </div>

            {/* Title & Base Price */}
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-sans text-xl sm:text-2xl font-bold text-[#3a3530] tracking-tight leading-tight">
                {item.name}
              </h2>
              <div className="text-base sm:text-lg font-bold text-[#3a3530] whitespace-nowrap">
                {currencySymbol}{item.price.toFixed(0)}
              </div>
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-[#5b554f] mt-2 leading-relaxed font-light">
              {item.description}
            </p>

            {/* Customization Groups */}
            {canOrder && item.customizationGroups && item.customizationGroups.length > 0 && (
              <div className="mt-6 space-y-5">
                {item.customizationGroups.map((group) => {
                  const currentSelected = selections[group.id] || [];
                  const isSingle = group.type === 'SINGLE';

                  return (
                    <div
                      key={group.id}
                      className="bg-white rounded-2xl p-4 border border-[#bdb8ad]/60 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-xs md:text-sm text-[#3a3530]">
                            {group.name}
                          </h4>
                          {group.required ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-950">
                              Required
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-[#8d7d6d] bg-[#f4f3f0] px-1.5 py-0.5 rounded-md">
                              Optional
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-[#8d7d6d] font-medium">
                          {isSingle
                            ? 'Select 1'
                            : group.maxSelections > 0
                            ? `Up to ${group.maxSelections}`
                            : 'Select multiple'}
                        </span>
                      </div>

                      {/* Options List */}
                      <div className="mt-3 space-y-2">
                        {group.options?.map((opt) => {
                          const isSelected = currentSelected.includes(opt.id);
                          const isSoldOut = opt.isAvailable === false;
                          const disabled =
                            isSoldOut ||
                            (!isSelected &&
                              !isSingle &&
                              group.maxSelections > 0 &&
                              currentSelected.length >= group.maxSelections);

                          return (
                            <label
                              key={opt.id}
                              onClick={(e) => {
                                if (disabled) return;
                                if (isSingle) {
                                  handleSelectSingle(group.id, opt.id);
                                } else {
                                  e.preventDefault();
                                  handleToggleMulti(group, opt.id);
                                }
                              }}
                              className={`flex items-center justify-between p-3 min-h-[44px] rounded-xl border transition-all cursor-pointer select-none touch-press active:scale-[0.98] ${
                                isSoldOut
                                  ? 'opacity-40 bg-[#f4f3f0] border-[#bdb8ad] cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-[#e8eff4] border-[#6492b3] shadow-2xs ring-1 ring-[#6492b3]/30'
                                  : disabled
                                  ? 'opacity-45 border-[#bdb8ad]/40 cursor-not-allowed bg-[#f4f3f0]'
                                  : 'border-[#bdb8ad]/60 hover:border-[#6492b3] bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-4 h-4 ${
                                    isSingle ? 'rounded-full' : 'rounded-md'
                                  } flex items-center justify-center border transition-all ${
                                    isSelected
                                      ? 'bg-[#6492b3] border-[#6492b3] text-white shadow-2xs'
                                      : 'border-[#bdb8ad] bg-white'
                                  }`}
                                >
                                  {isSelected && (
                                    <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />
                                  )}
                                </div>
                                <span className={`text-xs ${
                                  isSelected ? 'text-[#3a3530] font-bold' : 'text-[#5b554f] font-medium'
                                }`}>
                                  {opt.name}
                                </span>
                              </div>

                              <div className="text-xs font-semibold">
                                {isSoldOut ? (
                                  <span className="text-[10px] text-[#8d7d6d] font-semibold bg-[#f4f3f0] px-1.5 py-0.5 rounded">
                                    Sold out
                                  </span>
                                ) : opt.priceAddition > 0 ? (
                                  <span className={isSelected ? 'text-[#4f7897] font-bold' : 'text-[#5b554f] font-semibold'}>
                                    +{currencySymbol}{opt.priceAddition.toFixed(0)}
                                  </span>
                                ) : (
                                  <span className="text-[#8d7d6d] font-normal">Included</span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <hr className="my-6 border-[#bdb8ad]/60" />

            {/* Preparation Preferences */}
            {canOrder && (
              <div>
                <label className="block text-xs font-semibold text-[#3a3530] mb-2.5">
                  Chef's notes & preparation preferences
                </label>

                {/* Quick Preferences Chips */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {QUICK_INSTRUCTIONS.map((chip) => {
                    const isSelected = selectedChips.includes(chip);
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => toggleChip(chip)}
                        className={`text-xs px-3 py-2 min-h-[38px] rounded-xl transition-all flex items-center gap-1.5 select-none touch-press active:scale-[0.97] ${
                          isSelected
                            ? 'btn-glass-selected shadow-2xs'
                            : 'btn-glass-secondary border-[#bdb8ad] hover:border-[#6492b3]'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-[#4f7897] stroke-[3]" />}
                        <span className={isSelected ? 'text-[#4f7897] font-bold' : 'text-[#5b554f] font-medium'}>
                          {chip}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Note Input with Safe Mobile Font Size */}
                <textarea
                  placeholder="Any extra instructions for the kitchen..."
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  rows={2}
                  maxLength={150}
                  className="w-full text-base sm:text-xs p-3 bg-white border border-[#bdb8ad]/80 rounded-xl focus:border-[#6492b3] outline-none transition-colors resize-none text-[#3a3530] placeholder-[#8d7d6d]"
                />
              </div>
            )}

            {validationError && (
              <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-950 text-xs font-medium">
                <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Stepper & Add / Update Button */}
        <div className="p-4 pb-safe bg-white/95 backdrop-blur-md border-t border-[#bdb8ad]/60 flex items-center gap-3">
          {canOrder ? (
            <>
              {/* Stepper with >=40px Touch Targets */}
              <div className="flex items-center border border-[#bdb8ad] rounded-xl bg-[#ebeae7] px-1 py-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center rounded-lg text-[#3a3530] hover:bg-white active:scale-90 transition-transform font-black"
                  title="Decrease"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
                <span className="w-8 text-center font-bold text-sm text-[#3a3530] select-none">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-10 h-10 flex items-center justify-center rounded-lg text-[#3a3530] hover:bg-white active:scale-90 transition-transform font-black"
                  title="Increase"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>

              {/* Add / Update Order Button */}
              <button
                type="button"
                onClick={handleConfirm}
                disabled={Boolean(validationError)}
                className="btn-primary flex-1 py-3 px-5 min-h-[44px] rounded-xl flex items-center justify-between text-xs font-bold tracking-wide shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{editMode ? 'Update order' : 'Add to order'}</span>
                <span className="font-mono text-sm tracking-tight">{currencySymbol}{totalCalculation.toFixed(0)}</span>
              </button>
            </>
          ) : (
            <div className="w-full text-center py-3 text-xs font-semibold text-[#8d7d6d] bg-[#f4f3f0] rounded-xl">
              Dish is currently unavailable
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
