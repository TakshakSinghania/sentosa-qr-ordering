import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, MenuItem, OrderItemCustomization } from '../types/index.js';

interface CartContextType {
  items: CartItem[];
  specialNote: string;
  totalItemsCount: number;
  subtotal: number;
  addItem: (
    item: MenuItem,
    quantity?: number,
    specialInstructions?: string,
    selectedOptionIds?: string[],
    customizations?: OrderItemCustomization[]
  ) => void;
  updateQuantity: (cartLineIdOrMenuItemId: string, quantity: number) => void;
  removeItem: (cartLineIdOrMenuItemId: string) => void;
  editCartItem: (
    oldCartLineId: string,
    quantity: number,
    specialInstructions?: string,
    selectedOptionIds?: string[],
    customizations?: OrderItemCustomization[]
  ) => void;
  clearCart: () => void;
  setSpecialNote: (note: string) => void;
  initSession: (slug: string, token: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function computeLineId(menuItemId: string, optionIds: string[] = [], instructions = ''): string {
  const sorted = [...optionIds].sort().join('_');
  return `${menuItemId}::${sorted}::${instructions.trim()}`;
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [specialNote, setSpecialNote] = useState<string>('');
  const [sessionKey, setSessionKey] = useState<string>('');

  const initSession = (slug: string, token: string) => {
    const key = `cafe_cart_${slug}_${token}`;
    setSessionKey(key);
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure every item has a valid cartLineId
        const restoredItems: CartItem[] = (parsed.items || []).map((item: any) => ({
          ...item,
          cartLineId: item.cartLineId || computeLineId(item.menuItemId, item.selectedOptionIds, item.specialInstructions),
          basePrice: item.basePrice !== undefined ? item.basePrice : item.price,
          selectedOptionIds: item.selectedOptionIds || [],
          customizations: item.customizations || [],
        }));
        setItems(restoredItems);
        setSpecialNote(parsed.specialNote || '');
      }
    } catch {
      // Ignore sessionStorage parsing errors
    }
  };

  useEffect(() => {
    if (sessionKey) {
      sessionStorage.setItem(sessionKey, JSON.stringify({ items, specialNote }));
    }
  }, [items, specialNote, sessionKey]);

  const addItem = (
    item: MenuItem,
    quantity = 1,
    specialInstructions?: string,
    selectedOptionIds: string[] = [],
    customizations: OrderItemCustomization[] = []
  ) => {
    const cleanInstructions = specialInstructions || '';
    const lineId = computeLineId(item.id, selectedOptionIds, cleanInstructions);

    const addOnsPrice = customizations.reduce((sum, c) => sum + (c.priceAddition || 0), 0);
    const unitPrice = item.price + addOnsPrice;

    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.cartLineId === lineId);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      }

      return [
        ...prev,
        {
          cartLineId: lineId,
          menuItemId: item.id,
          name: item.name,
          basePrice: item.price,
          price: unitPrice,
          imageUrl: item.imageUrl,
          isVeg: item.isVeg,
          quantity,
          specialInstructions: cleanInstructions.trim() ? cleanInstructions.trim() : undefined,
          selectedOptionIds,
          customizations,
        },
      ];
    });
  };

  const editCartItem = (
    oldCartLineId: string,
    quantity: number,
    specialInstructions?: string,
    selectedOptionIds: string[] = [],
    customizations: OrderItemCustomization[] = []
  ) => {
    setItems((prev) => {
      const itemToEdit = prev.find((i) => i.cartLineId === oldCartLineId);
      if (!itemToEdit) return prev;

      const cleanInstructions = specialInstructions || '';
      const newLineId = computeLineId(itemToEdit.menuItemId, selectedOptionIds, cleanInstructions);
      const addOnsPrice = customizations.reduce((sum, c) => sum + (c.priceAddition || 0), 0);
      const unitPrice = itemToEdit.basePrice + addOnsPrice;

      // Filter out the old line
      const otherItems = prev.filter((i) => i.cartLineId !== oldCartLineId);

      // Check if another existing item matches the new configuration
      const existingSameConfig = otherItems.find((i) => i.cartLineId === newLineId);
      if (existingSameConfig) {
        return otherItems.map((i) =>
          i.cartLineId === newLineId
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }

      return [
        ...otherItems,
        {
          ...itemToEdit,
          cartLineId: newLineId,
          price: unitPrice,
          quantity,
          specialInstructions: cleanInstructions.trim() ? cleanInstructions.trim() : undefined,
          selectedOptionIds,
          customizations,
        },
      ];
    });
  };

  const updateQuantity = (cartLineIdOrMenuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(cartLineIdOrMenuItemId);
      return;
    }

    setItems((prev) =>
      prev.map((i) =>
        i.cartLineId === cartLineIdOrMenuItemId || i.menuItemId === cartLineIdOrMenuItemId
          ? { ...i, quantity }
          : i
      )
    );
  };

  const removeItem = (cartLineIdOrMenuItemId: string) => {
    setItems((prev) =>
      prev.filter(
        (i) => i.cartLineId !== cartLineIdOrMenuItemId && i.menuItemId !== cartLineIdOrMenuItemId
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    setSpecialNote('');
    if (sessionKey) {
      sessionStorage.removeItem(sessionKey);
    }
  };

  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        specialNote,
        totalItemsCount,
        subtotal,
        addItem,
        updateQuantity,
        removeItem,
        editCartItem,
        clearCart,
        setSpecialNote,
        initSession,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
