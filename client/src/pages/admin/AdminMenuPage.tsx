import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { MenuCategory, MenuItem } from '../../types/index.js';
import { VegBadge } from '../../components/common/VegBadge.js';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Loader2,
  Utensils,
  FolderPlus,
  Sliders,
} from 'lucide-react';
import { CustomizationModal } from '../../components/admin/CustomizationModal.js';

export const AdminMenuPage: React.FC = () => {
  const { restaurant, isManager } = useAuth();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');

  // Modal States
  const [isItemModalOpen, setIsItemModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);

  // Item Form Fields
  const [formCategoryId, setFormCategoryId] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formPrice, setFormPrice] = useState<string>('');
  const [formImageUrl, setFormImageUrl] = useState<string>('');
  const [formIsVeg, setFormIsVeg] = useState<boolean>(true);
  const [formIsFeatured, setFormIsFeatured] = useState<boolean>(false);
  const [formIsAvailable, setFormIsAvailable] = useState<boolean>(true);

  // Category Form Fields
  const [catName, setCatName] = useState<string>('');
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  const loadMenu = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminMenu();
      setCategories(data);
      if (data.length > 0 && !formCategoryId) {
        setFormCategoryId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load menu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormName('');
    setFormDescription('');
    setFormPrice('');
    setFormImageUrl('');
    setFormIsVeg(true);
    setFormIsFeatured(false);
    setFormIsAvailable(true);
    if (categories.length > 0) {
      setFormCategoryId(categories[0].id);
    }
    setIsItemModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormCategoryId(item.categoryId);
    setFormName(item.name);
    setFormDescription(item.description);
    setFormPrice(item.price.toString());
    setFormImageUrl(item.imageUrl || '');
    setFormIsVeg(item.isVeg);
    setFormIsFeatured(item.isFeatured);
    setFormIsAvailable(item.isAvailable);
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      const payload = {
        categoryId: formCategoryId,
        name: formName,
        description: formDescription,
        price: parseFloat(formPrice),
        imageUrl: formImageUrl || undefined,
        isVeg: formIsVeg,
        isFeatured: formIsFeatured,
        isAvailable: formIsAvailable,
      };

      if (editingItem) {
        await api.updateMenuItem(editingItem.id, payload);
      } else {
        await api.createMenuItem(payload);
      }

      setIsItemModalOpen(false);
      loadMenu();
    } catch (err: any) {
      alert(`Error saving dish: ${err.message}`);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleSoldOut = async (itemId: string) => {
    try {
      await api.toggleItemAvailability(itemId);
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((item) =>
            item.id === itemId ? { ...item, isAvailable: !item.isAvailable } : item
          ),
        }))
      );
    } catch (err: any) {
      alert(`Failed to update item availability: ${err.message}`);
    }
  };

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (!confirm(`Are you sure you want to remove "${itemName}" from the menu?`)) return;
    try {
      await api.deleteMenuItem(itemId);
      loadMenu();
    } catch (err: any) {
      alert(`Failed to delete item: ${err.message}`);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setFormSubmitting(true);
    try {
      await api.createCategory({ name: catName.trim(), sortOrder: categories.length + 1 });
      setCatName('');
      setIsCategoryModalOpen(false);
      loadMenu();
    } catch (err: any) {
      alert(`Failed to create category: ${err.message}`);
    } finally {
      setFormSubmitting(false);
    }
  };

  const currencySymbol = restaurant?.currencySymbol || '₹';

  const allItems = categories.flatMap((c) => c.items);
  const filteredCategories = categories
    .map((cat) => {
      if (selectedCategoryId !== 'all' && cat.id !== selectedCategoryId) return null;
      const items = cat.items.filter((i) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q);
      });
      return { ...cat, items };
    })
    .filter(Boolean) as MenuCategory[];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cream-300 pb-4">
        <div>
          <h1 className="font-serif text-xl md:text-2xl font-bold text-charcoal-900 tracking-tight">
            {isManager ? 'Menu Catalog & Pricing' : 'Dish Availability & Menu'}
          </h1>
          <p className="text-xs text-charcoal-600 font-normal mt-0.5">
            {isManager
              ? 'Manage food descriptions, real-time sold out states, prices, and categories'
              : 'View menu catalog and toggle dish availability during service'}
          </p>
        </div>

        {isManager && (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
              className="touch-press btn-outline flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5 text-charcoal-700" />
              <span>+ Add Category</span>
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="touch-press btn-primary flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg shadow-subtle transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Menu Dish</span>
            </button>
          </div>
        )}
      </div>

      {!isManager && (
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3.5 text-xs text-amber-950 flex items-center gap-2.5">
          <Utensils className="w-4 h-4 text-amber-800 flex-shrink-0" />
          <span className="font-medium">
            Staff operations: Tap the availability toggle on any dish below to immediately mark it as Available or Sold Out on the guest menu.
          </span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-cream-300 shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategoryId('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              selectedCategoryId === 'all'
                ? 'bg-charcoal-900 text-white shadow-2xs'
                : 'text-charcoal-700 hover:text-charcoal-900 hover:bg-cream-100'
            }`}
          >
            All Items ({allItems.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategoryId(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategoryId === c.id
                  ? 'bg-charcoal-900 text-white shadow-2xs'
                  : 'text-charcoal-700 hover:text-charcoal-900 hover:bg-cream-100'
              }`}
            >
              {c.name} ({c.items.length})
            </button>
          ))}
        </div>


        <div className="relative w-full sm:w-56">
          <Search className="w-3.5 h-3.5 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search dish or ingredient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-cream-100/60 border border-cream-300 rounded-lg text-xs outline-none focus:border-charcoal-800 text-charcoal-900"
          />
        </div>
      </div>

      {/* Categories & Dish Rows */}
      {loading ? (
        <div className="p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-charcoal-700 mx-auto mb-2" />
          <p className="text-xs text-charcoal-500">Loading menu items...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCategories.map((cat) => (
            <div key={cat.id} className="bg-white rounded-xl border border-cream-300 shadow-subtle overflow-hidden">
              <div className="px-5 py-3 bg-cream-100/70 border-b border-cream-300 flex items-center justify-between">
                <h3 className="font-serif font-bold text-sm text-charcoal-900 tracking-tight">
                  {cat.name} ({cat.items.length})
                </h3>
              </div>

              <div className="divide-y divide-cream-300/60">
                {cat.items.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 flex items-center justify-between gap-4 transition-colors hover:bg-cream-50/50 ${
                      !item.isAvailable ? 'bg-cream-100/40' : ''
                    }`}
                  >
                    {/* Item Thumbnail & Info */}
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-11 h-11 rounded-lg object-cover border border-cream-300 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-cream-200 border border-cream-300 flex items-center justify-center text-charcoal-500 flex-shrink-0">
                          <Utensils className="w-4 h-4" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <VegBadge isVeg={item.isVeg} size="sm" />
                          <h4 className="font-semibold text-xs text-charcoal-900 truncate">{item.name}</h4>
                          {item.isFeatured && (
                            <span className="text-[9px] font-bold text-bronze-700 bg-bronze-100 px-1.5 py-0.2 rounded uppercase">
                              Signature
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-charcoal-500 truncate mt-0.5 font-light">{item.description}</p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-xs font-bold text-charcoal-900 whitespace-nowrap">
                      {currencySymbol}{item.price.toFixed(0)}
                    </div>

                    {/* Instant Sold Out Toggle Button */}
                    <div>
                      <button
                        type="button"
                        onClick={() => handleToggleSoldOut(item.id)}
                        className={`touch-press text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                          item.isAvailable
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-900 border-rose-200'
                        }`}
                        title="Toggle availability"
                      >
                        <span className={`w-2 h-2 rounded-full ${item.isAvailable ? 'bg-emerald-600' : 'bg-rose-500'}`} />
                        <span>{item.isAvailable ? 'Available' : 'Sold out'}</span>
                      </button>
                    </div>

                    {/* Options Customizer, Edit & Delete (Manager Only) */}
                    {isManager && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCustomizingItem(item)}
                          className="touch-press btn-outline px-2.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1 text-charcoal-900 hover:bg-cream-100"
                          title="Manage customizations"
                        >
                          <Sliders className="w-3 h-3 text-bronze-700" />
                          <span>Options {item.customizationGroups?.length ? `(${item.customizationGroups.length})` : ''}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="touch-press p-2 text-charcoal-600 hover:text-charcoal-950 rounded-lg transition-colors hover:bg-cream-100"
                          title="Edit dish"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id, item.name)}
                          className="touch-press p-2 text-charcoal-400 hover:text-rose-600 rounded-lg transition-colors hover:bg-rose-50"
                          title="Delete dish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Dish Modal */}
      {isItemModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-950/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setIsItemModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-modal max-h-[90vh] overflow-y-auto relative border border-cream-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsItemModalOpen(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-cream-100 hover:bg-cream-200 text-charcoal-600 flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <h3 className="font-serif text-base font-bold text-charcoal-900 mb-0.5">
              {editingItem ? 'Edit Dish Details' : 'Add New Menu Item'}
            </h3>
            <p className="text-[11px] text-charcoal-500 mb-4 font-light">
              Updates immediately sync with digital table menus.
            </p>

            <form onSubmit={handleSaveItem} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-charcoal-700 mb-1">Category</label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full p-2 bg-cream-100/70 border border-cream-300 rounded-lg focus:border-charcoal-800 outline-none text-charcoal-900"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-charcoal-700 mb-1">Price ({currencySymbol})</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="249"
                    className="w-full p-2 bg-cream-100/70 border border-cream-300 rounded-lg focus:border-charcoal-800 outline-none font-bold text-charcoal-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-charcoal-700 mb-1">Dish Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Margherita Wood-Fired Pizza"
                  className="w-full p-2 bg-cream-100/70 border border-cream-300 rounded-lg focus:border-charcoal-800 outline-none font-semibold text-charcoal-900"
                />
              </div>

              <div>
                <label className="block font-medium text-charcoal-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="San Marzano tomato sauce, fresh buffalo mozzarella, sweet basil..."
                  className="w-full p-2 bg-cream-100/70 border border-cream-300 rounded-lg focus:border-charcoal-800 outline-none resize-none text-charcoal-900"
                />
              </div>

              <div>
                <label className="block font-medium text-charcoal-700 mb-1">Photo Image URL</label>
                <input
                  type="url"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2 bg-cream-100/70 border border-cream-300 rounded-lg focus:border-charcoal-800 outline-none text-charcoal-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <label className="flex items-center gap-2 p-2.5 border border-cream-300 rounded-lg cursor-pointer bg-cream-50">
                  <input
                    type="checkbox"
                    checked={formIsVeg}
                    onChange={(e) => setFormIsVeg(e.target.checked)}
                    className="w-3.5 h-3.5 text-emerald-700 rounded"
                  />
                  <span className="font-medium text-charcoal-800">Vegetarian</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 border border-cream-300 rounded-lg cursor-pointer bg-cream-50">
                  <input
                    type="checkbox"
                    checked={formIsFeatured}
                    onChange={(e) => setFormIsFeatured(e.target.checked)}
                    className="w-3.5 h-3.5 text-bronze-700 rounded"
                  />
                  <span className="font-medium text-charcoal-800">Signature</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 border border-cream-300 rounded-lg cursor-pointer bg-cream-50">
                  <input
                    type="checkbox"
                    checked={formIsAvailable}
                    onChange={(e) => setFormIsAvailable(e.target.checked)}
                    className="w-3.5 h-3.5 text-charcoal-900 rounded"
                  />
                  <span className="font-medium text-charcoal-800">Available</span>
                </label>
              </div>

              <div className="pt-3 border-t border-cream-300 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="btn-outline px-4 py-2 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="btn-primary px-4 py-2 rounded-lg text-xs font-bold shadow-subtle flex items-center gap-1.5"
                >
                  {formSubmitting && <Loader2 className="w-3 h-3 animate-spin text-white" />}
                  <span>{editingItem ? 'Save Changes' : 'Create Dish'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isCategoryModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-950/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setIsCategoryModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-modal relative border border-cream-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsCategoryModalOpen(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-cream-100 hover:bg-cream-200 text-charcoal-600 flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <h3 className="font-serif text-base font-bold text-charcoal-900 mb-0.5">Add Category</h3>
            <p className="text-[11px] text-charcoal-500 mb-3 font-light">
              e.g. Artisanal Coffees, Handcrafted Pastas
            </p>

            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-charcoal-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Wood-Fired Sourdough"
                  className="w-full p-2 bg-cream-100/70 border border-cream-300 rounded-lg focus:border-charcoal-800 outline-none text-charcoal-900 font-semibold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="btn-outline px-3.5 py-1.5 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="btn-primary px-4 py-1.5 rounded-lg text-xs font-bold shadow-subtle flex items-center gap-1.5"
                >
                  {formSubmitting && <Loader2 className="w-3 h-3 animate-spin text-white" />}
                  <span>Save Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customizations Manager Modal */}
      <CustomizationModal
        item={customizingItem}
        currencySymbol={currencySymbol}
        onClose={() => setCustomizingItem(null)}
        onMenuUpdated={loadMenu}
      />
    </div>
  );
};
