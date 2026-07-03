import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/index.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api.js';
import {
  addToCart,
  updateQuantity,
  removeItem,
  applyItemDiscountOverride,
  setCustomer,
  setCoupon,
  setPointsToRedeem,
  setPaymentMethod,
  updateSplitPayment,
  clearCart,
} from '../store/cartSlice.js';
import {
  Search,
  Barcode,
  Trash2,
  UserPlus,
  Plus,
  Minus,
  CreditCard,
  QrCode,
  DollarSign,
  Receipt,
  Ticket,
  Printer,
  Download,
  Percent,
} from 'lucide-react';

export default function PosTerminal() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const cart = useSelector((state: RootState) => state.cart);

  // Local UI States
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [couponCode, setCouponCode] = useState('');
  
  // Modals & Customer Form
  const [custSearch, setCustSearch] = useState('');
  const [showCustModal, setShowCustModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [receiptSale, setReceiptSale] = useState<any | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // 1. Queries for Products, Categories, Customers
  const { data: prodData } = useQuery({
    queryKey: ['posProducts', selectedCategory, productSearch],
    queryFn: async () => {
      const res = await api.get('/products', {
        params: {
          search: productSearch,
          categoryId: selectedCategory || undefined,
          limit: 100,
        },
      });
      return res.data;
    },
  });

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/products/categories');
      return res.data;
    },
  });

  const { data: custData } = useQuery({
    queryKey: ['customers', custSearch],
    queryFn: async () => {
      const res = await api.get('/customers', {
        params: { search: custSearch },
      });
      return res.data;
    },
    enabled: custSearch.length > 1,
  });

  // 2. Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/sales', payload);
      return res.data;
    },
    onSuccess: (data) => {
      setReceiptSale(data.sale);
      dispatch(clearCart());
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
    onError: (err: any) => {
      alert(err.message || 'Checkout failed');
    },
  });

  // 3. Barcode simulator: Auto-add item on matching barcode
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeSearch) return;

    try {
      const res = await api.get('/products', { params: { search: barcodeSearch } });
      const matchingProduct = res.data.products.find(
        (p: any) => p.barcode === barcodeSearch || p.sku === barcodeSearch
      );

      if (matchingProduct) {
        dispatch(addToCart(matchingProduct));
        setBarcodeSearch('');
      } else {
        alert('Product not found with this SKU/barcode.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Keyboard Shortcuts (F2: Clear, F8: Pay)
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        dispatch(clearCart());
      } else if (e.key === 'F8') {
        e.preventDefault();
        triggerCheckout();
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [cart]);

  // Cart pricing calculation helper
  const calculateCartSummary = () => {
    let subtotal = 0;
    let gst = 0;
    let totalDiscount = 0;

    cart.items.forEach((item) => {
      const itemSubtotal = item.sellingPrice * item.quantity;
      const discountPercent = item.discount + item.discountPercentOverride;
      const discountVal = (item.sellingPrice * discountPercent) / 100 * item.quantity;
      const priceAfterDiscount = item.sellingPrice - ((item.sellingPrice * discountPercent) / 100);
      const gstVal = (priceAfterDiscount - (priceAfterDiscount / (1 + item.gstPercent / 100))) * item.quantity;

      subtotal += itemSubtotal;
      totalDiscount += discountVal;
      gst += gstVal;
    });

    let couponDiscount = 0;
    if (cart.coupon) {
      const preCouponTotal = subtotal - totalDiscount;
      if (preCouponTotal >= cart.coupon.minOrderAmount) {
        if (cart.coupon.discountType === 'PERCENTAGE') {
          couponDiscount = (preCouponTotal * cart.coupon.value) / 100;
        } else {
          couponDiscount = Math.min(cart.coupon.value, preCouponTotal);
        }
        totalDiscount += couponDiscount;
      }
    }

    if (cart.pointsToRedeem > 0) {
      totalDiscount += cart.pointsToRedeem;
    }

    const total = Math.max(0, subtotal - totalDiscount);

    return { subtotal, gst, discount: totalDiscount, total };
  };

  const { subtotal, gst, discount, total } = calculateCartSummary();

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    try {
      const res = await api.get('/products'); // Mock coupon logic query
      // For demonstration, match coupon constants
      const coupons = [
        { id: '1', code: 'WELCOME10', discountType: 'PERCENTAGE' as const, value: 10, minOrderAmount: 100 },
        { id: '2', code: 'FLAT50', discountType: 'FIXED' as const, value: 50, minOrderAmount: 500 },
      ];
      const match = coupons.find((c) => c.code.toUpperCase() === couponCode.toUpperCase());
      if (match) {
        dispatch(setCoupon(match));
      } else {
        alert('Invalid or expired coupon code');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/customers', {
        name: newCustName,
        phone: newCustPhone,
      });
      dispatch(setCustomer({
        id: res.data.customer.id,
        name: res.data.customer.name,
        phone: res.data.customer.phone,
        loyaltyPoints: res.data.customer.loyaltyPoints,
      }));
      setShowCustModal(false);
      setNewCustName('');
      setNewCustPhone('');
    } catch (err: any) {
      alert(err.message || 'Failed to add customer');
    }
  };

  const triggerCheckout = () => {
    if (cart.items.length === 0) {
      alert('Cart is empty');
      return;
    }

    const payload: any = {
      customerId: cart.customer?.id || null,
      items: cart.items.map((i) => ({
        productId: i.id,
        quantity: i.quantity,
        discountPercent: i.discountPercentOverride,
      })),
      paymentMethod: cart.paymentMethod,
      couponCode: cart.coupon?.code || null,
      pointsToRedeem: cart.pointsToRedeem,
    };

    if (cart.paymentMethod === 'SPLIT') {
      const splits = [];
      if (cart.splitPayments.CASH > 0) splits.push({ method: 'CASH', amount: cart.splitPayments.CASH });
      if (cart.splitPayments.CARD > 0) splits.push({ method: 'CARD', amount: cart.splitPayments.CARD });
      if (cart.splitPayments.UPI > 0) splits.push({ method: 'UPI', amount: cart.splitPayments.UPI });
      payload.splitPayments = splits;
    }

    checkoutMutation.mutate(payload);
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col lg:flex-row gap-6">
      {/* Left panel: Product catalogue list */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-5 rounded-3xl">
        {/* Search Barcode & Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <form onSubmit={handleBarcodeSubmit} className="relative">
            <Barcode size={18} className="absolute left-3 top-3.5 text-gray-400" />
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="Scan/Type Barcode (Press Enter)"
              value={barcodeSearch}
              onChange={(e) => setBarcodeSearch(e.target.value)}
              className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700/50 rounded-2xl py-3 pl-10 pr-4 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm"
            />
          </form>

          <div className="relative">
            <Search size={18} className="absolute left-3 top-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products by name/SKU..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700/50 rounded-2xl py-3 pl-10 pr-4 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm"
            />
          </div>
        </div>

        {/* Category Horizontal Filter list */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 border-b border-gray-100 dark:border-zinc-800/50 scrollbar-thin">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap ${
              selectedCategory === ''
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            All Items
          </button>
          {catData?.categories.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Catalogue Products Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-1">
          {prodData?.products.map((prod: any) => (
            <button
              key={prod.id}
              onClick={() => dispatch(addToCart(prod))}
              disabled={prod.currentStock === 0}
              className="p-3 bg-white dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-800 hover:border-brand-500 hover:shadow-lg rounded-2xl flex flex-col text-left group transition-all relative overflow-hidden disabled:opacity-50"
            >
              <div className="h-24 bg-gray-50 dark:bg-zinc-800/50 rounded-xl mb-2.5 overflow-hidden flex items-center justify-center">
                {prod.imageUrl ? (
                  <img src={prod.imageUrl} alt={prod.name} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300" />
                ) : (
                  <Barcode className="text-gray-300" size={32} />
                )}
              </div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{prod.brand?.name}</p>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 line-clamp-2 mt-0.5">{prod.name}</h3>
              
              <div className="flex justify-between items-baseline mt-auto pt-2 border-t border-gray-50 dark:border-zinc-800">
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">₹{prod.sellingPrice}</span>
                <span className="text-[10px] bg-brand-500/10 text-brand-600 px-1.5 py-0.5 rounded font-bold">
                  {prod.currentStock} {prod.unit}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel: Active Billing Checkout checkout grid */}
      <div className="w-full lg:w-[420px] flex flex-col bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-5 rounded-3xl">
        {/* Customer Select Option */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search shopper by phone..."
              value={custSearch}
              onChange={(e) => setCustSearch(e.target.value)}
              className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700/50 rounded-xl py-2 pl-9 pr-3 outline-none focus:border-brand-500 text-xs"
            />
            {/* Auto-suggest dropdown search */}
            {custSearch && custData?.customers && custData.customers.length > 0 && (
              <div className="absolute left-0 right-0 top-11 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl z-30 shadow-xl max-h-40 overflow-y-auto">
                {custData.customers.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      dispatch(setCustomer(c));
                      setCustSearch('');
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-zinc-800 flex justify-between"
                  >
                    <span>{c.name} ({c.phone})</span>
                    <span className="text-brand-500 font-bold">{c.loyaltyPoints} Pts</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowCustModal(true)}
            className="p-2 border border-gray-200 dark:border-zinc-700 hover:border-brand-500 rounded-xl text-gray-500 hover:text-brand-500 transition-colors"
          >
            <UserPlus size={18} />
          </button>
        </div>

        {cart.customer && (
          <div className="mb-4 p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl flex items-center justify-between">
            <div className="text-xs">
              <p className="font-bold text-gray-800 dark:text-gray-200">{cart.customer.name}</p>
              <p className="text-gray-400">{cart.customer.phone}</p>
            </div>
            <div className="text-right">
              <span className="text-xs bg-brand-500 text-white px-2 py-0.5 rounded-full font-bold">
                {cart.customer.loyaltyPoints} Pts
              </span>
              <button
                onClick={() => dispatch(setCustomer(null))}
                className="block text-[10px] text-red-500 hover:underline mt-1 text-right w-full"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Selected Items Checkout Cart scroll */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
          {cart.items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 py-12">
              <Receipt size={40} className="mb-2 stroke-1" />
              <p className="text-xs font-semibold">Active Cart Is Empty</p>
              <p className="text-[10px] text-gray-500">Scan barcode or select catalog items.</p>
            </div>
          ) : (
            cart.items.map((item) => (
              <div key={item.id} className="p-3 bg-gray-50 dark:bg-zinc-800/30 rounded-xl flex justify-between gap-3 items-center">
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate">{item.name}</h4>
                  <p className="text-[10px] text-gray-400 font-medium">₹{item.sellingPrice} • Tax: {item.gstPercent}%</p>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity - 1 }))}
                    className="p-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-600 hover:bg-gray-100"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                  <button
                    onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity + 1 }))}
                    className="p-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-600 hover:bg-gray-100"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                <div className="text-right flex-shrink-0 min-w-16">
                  <p className="text-xs font-bold text-gray-900 dark:text-gray-100">₹{(item.sellingPrice * item.quantity).toFixed(2)}</p>
                  <button
                    onClick={() => dispatch(removeItem(item.id))}
                    className="text-[10px] text-red-500 hover:underline inline-flex items-center gap-0.5 mt-0.5"
                  >
                    <Trash2 size={10} /> Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Coupons & Loyalty point redeeming inputs */}
        <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-zinc-800/50 mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Coupon Code (e.g. WELCOME10)"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="flex-1 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
            />
            <button
              onClick={handleApplyCoupon}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold"
            >
              Apply
            </button>
          </div>

          {cart.coupon && (
            <div className="flex justify-between items-center text-xs bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl text-emerald-600 font-semibold">
              <span>Promo {cart.coupon.code} active</span>
              <button
                onClick={() => dispatch(setCoupon(null))}
                className="text-red-500 hover:underline"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Invoice pricing summary */}
        <div className="bg-gray-50 dark:bg-zinc-800/30 p-4 rounded-2xl mb-4 space-y-2">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>Item Discount</span>
            <span>- ₹{discount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>GST Tax (Inc)</span>
            <span>₹{gst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-200 dark:border-zinc-800">
            <span>Grand Total</span>
            <span className="text-brand-500">₹{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mb-4">
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Payment Method</label>
          <div className="grid grid-cols-4 gap-2">
            {(['CASH', 'CARD', 'UPI', 'SPLIT'] as const).map((method) => (
              <button
                key={method}
                onClick={() => dispatch(setPaymentMethod(method))}
                className={`py-2 rounded-xl text-[10px] font-bold tracking-wider transition-all border ${
                  cart.paymentMethod === method
                    ? 'bg-brand-500 border-brand-500 text-white shadow-lg shadow-brand-500/20'
                    : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                {method}
              </button>
            ))}
          </div>

          {/* Split Mode Inputs */}
          {cart.paymentMethod === 'SPLIT' && (
            <div className="grid grid-cols-3 gap-2 mt-3 bg-gray-50 dark:bg-zinc-800/20 p-2.5 rounded-xl border border-gray-200/50 dark:border-zinc-800">
              <div>
                <label className="text-[9px] font-bold text-gray-400">CASH (₹)</label>
                <input
                  type="number"
                  value={cart.splitPayments.CASH || ''}
                  onChange={(e) => dispatch(updateSplitPayment({ method: 'CASH', amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full text-xs font-semibold bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-1.5 outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-gray-400">CARD (₹)</label>
                <input
                  type="number"
                  value={cart.splitPayments.CARD || ''}
                  onChange={(e) => dispatch(updateSplitPayment({ method: 'CARD', amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full text-xs font-semibold bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-1.5 outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-gray-400">UPI (₹)</label>
                <input
                  type="number"
                  value={cart.splitPayments.UPI || ''}
                  onChange={(e) => dispatch(updateSplitPayment({ method: 'UPI', amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full text-xs font-semibold bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-1.5 outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Pay Button */}
        <button
          onClick={triggerCheckout}
          disabled={checkoutMutation.isPending || cart.items.length === 0}
          className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-2xl py-4 font-bold transition-all shadow-xl shadow-brand-500/20 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {checkoutMutation.isPending ? 'Processing...' : `Charge ₹${total.toFixed(2)} (F8)`}
        </button>
      </div>

      {/* Inline Customer Add Modal */}
      {showCustModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-3xl w-full max-w-sm">
            <h3 className="text-base font-bold mb-4">Add Shopper Profile</h3>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustModal(false)}
                  className="flex-1 py-2 bg-gray-100 dark:bg-zinc-800 rounded-xl text-xs font-semibold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold"
                >
                  Save Shopper
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checkout Success Print Receipt Modal */}
      {receiptSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-3xl w-full max-w-sm flex flex-col max-h-[85vh]">
            <h3 className="text-base font-bold text-brand-500 mb-4 flex items-center gap-1.5">
              <Receipt size={18} />
              Checkout Successful!
            </h3>

            {/* Thermal Receipt preview simulator */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-zinc-800/40 rounded-2xl border border-gray-100 dark:border-zinc-800 pos-invoice-paper text-xs text-zinc-700 dark:text-zinc-300 select-all whitespace-pre-wrap leading-relaxed">
              <div className="text-center font-bold text-sm mb-1">PALMART STORE</div>
              <div className="text-center text-[10px] mb-2">GSTIN: 29AAACP1234A1Z1</div>
              <hr className="border-dashed border-gray-300 dark:border-zinc-700 mb-2" />
              <div>Ticket: {receiptSale.id.slice(0, 16)}</div>
              <div>Date: {new Date(receiptSale.createdAt).toLocaleString()}</div>
              <div>Cashier: {receiptSale.cashier?.name}</div>
              <div>Shopper: {receiptSale.customer?.name || 'Walk-in'}</div>
              <hr className="border-dashed border-gray-300 dark:border-zinc-700 my-2" />
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-left font-bold">
                    <th>Desc</th>
                    <th>Qty</th>
                    <th className="text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptSale.items.map((item: any) => (
                    <tr key={item.id}>
                      <td>{item.product.name}</td>
                      <td>{item.quantity}</td>
                      <td className="text-right">₹{item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <hr className="border-dashed border-gray-300 dark:border-zinc-700 my-2" />
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{receiptSale.subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>- ₹{receiptSale.discountAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm">
                <span>Total Paid:</span>
                <span>₹{receiptSale.totalAmount.toFixed(2)}</span>
              </div>
              <div className="text-center text-[9px] mt-4 font-sans font-medium text-gray-400">
                Thank you for shopping at PalMart!
              </div>
            </div>

            {/* Print and Close buttons */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <a
                href={`/api/reports/invoice/${receiptSale.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold text-center shadow-lg"
              >
                <Download size={14} /> Download PDF
              </a>
              <button
                onClick={() => setReceiptSale(null)}
                className="py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-lg"
              >
                Close Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
