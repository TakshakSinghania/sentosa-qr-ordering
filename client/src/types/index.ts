export interface RestaurantInfo {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  phone?: string | null;
  address?: string | null;
  currency: string;
  currencySymbol: string;
  taxRate: number;
  serviceChargeRate: number;
  isOpen: boolean;
}

export interface TableInfo {
  id: string;
  tableNumber: string;
  token: string;
  capacity?: number;
  isActive?: boolean;
  isOccupied?: boolean;
  activeOrdersCount?: number;
  qrDataUrl?: string;
  menuUrl?: string;
}

export interface CustomizationOption {
  id: string;
  customizationGroupId?: string;
  name: string;
  priceAddition: number;
  isAvailable?: boolean;
  sortOrder?: number;
}

export interface CustomizationGroup {
  id: string;
  menuItemId?: string;
  name: string;
  type: 'SINGLE' | 'MULTI';
  required: boolean;
  minSelections: number;
  maxSelections: number;
  sortOrder?: number;
  options: CustomizationOption[];
}

export interface OrderItemCustomization {
  id?: string;
  groupName: string;
  optionName: string;
  priceAddition: number;
}

export interface WaiterRequest {
  id: string;
  tableNumber: string;
  tableId?: string;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'COMPLETED' | 'CANCELLED';
  reason?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt?: string;
  acknowledgedAt?: string | null;
  completedAt?: string | null;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string | null;
  isVeg: boolean;
  isAvailable: boolean;
  isFeatured: boolean;
  customizationGroups?: CustomizationGroup[];
}

export interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  items: MenuItem[];
}

export interface CartItem {
  cartLineId: string; // Unique composite key for distinct customization lines
  menuItemId: string;
  name: string;
  basePrice: number;
  price: number; // Unit price including selected customizations
  quantity: number;
  imageUrl?: string | null;
  isVeg: boolean;
  specialInstructions?: string;
  selectedOptionIds?: string[];
  customizations?: OrderItemCustomization[];
}

export interface OrderItemRecord {
  id: string;
  orderId?: string;
  menuItemId?: string | null;
  name: string;
  nameSnapshot?: string;
  price: number;
  priceSnapshot?: number;
  quantity: number;
  itemTotal: number;
  specialInstructions?: string | null;
  customizations?: OrderItemCustomization[];
}

export interface OrderRecord {
  id: string;
  orderNumber: number;
  orderToken: string;
  tableToken?: string;
  tableNumber?: string;
  table?: { tableNumber: string; token?: string };
  restaurant?: { name: string; slug: string; phone?: string; currencySymbol: string };
  customerName?: string | null;
  customerPhone?: string | null;
  customerNote?: string | null;
  subtotal: number;
  taxAmount: number;
  serviceCharge: number;
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  updatedAt?: string;
  items: OrderItemRecord[];
  payment?: {
    gateway: string;
    gatewayPaymentId?: string;
    status: string;
  } | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface CustomerProfile {
  id: string;
  restaurantId?: string;
  name: string;
  phone: string;
  email?: string | null;
  createdAt?: string;
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
  phone: string;
  resendCooldownSeconds: number;
  expiresInSeconds: number;
  isExistingCustomer?: boolean;
  customerName?: string;
}

export interface CustomerAuthResponse {
  token: string;
  customer: CustomerProfile;
}

export interface CustomerOrderRecord extends OrderRecord {
  customerId?: string | null;
  tableToken?: string;
}


