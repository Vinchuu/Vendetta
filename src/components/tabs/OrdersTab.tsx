import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShoppingCart, CheckCircle, AlertTriangle, Plus, Edit, Trash2, Save, X, ShoppingBag, Landmark, Sparkles, DollarSign } from "lucide-react";
import { apiService as firestoreService, Item, Order } from "@/lib/apiService";
import { soundFx } from "@/lib/soundEffects";

const getItemId = (item: Item): string => item.id || (item as any)._id || '';
const getOrderId = (order: Order): string => order.id || (order as any)._id || '';

interface EditItemFormProps {
  item: Item;
  onSave: (updates: Partial<Item>) => void;
  onCancel: () => void;
}

const EditItemForm = ({ item, onSave, onCancel }: EditItemFormProps) => {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description || '');
  const [price, setPrice] = useState(item.price.toString());
  const [category, setCategory] = useState(item.category || 'gear');

  const handleSave = () => {
    const updates: Partial<Item> = {};
    if (name !== item.name) updates.name = name;
    if (description !== item.description) updates.description = description;
    if (parseFloat(price) !== item.price) updates.price = parseFloat(price) || 0;
    if (category !== item.category) updates.category = category;
    
    onSave(updates);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 bg-input"
          placeholder="Item name"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-2 py-1 bg-input border border-border rounded text-xs text-foreground"
        >
          <option value="gear">Arsenal Gear</option>
          <option value="syndicate">Syndicate Deal</option>
        </select>
      </div>
      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="bg-input"
        placeholder="Description"
      />
      <div className="flex gap-2">
        <Input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="bg-input flex-1"
          placeholder="Price"
        />
        <Button onClick={handleSave} size="sm" className="btn-gang">
          <Save className="w-4 h-4" />
        </Button>
        <Button onClick={onCancel} size="sm" variant="outline">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

type UserMode = "admin" | "gangmember" | "viewer2";

interface OrdersTabProps {
  userMode?: UserMode | null;
}

function readRoleFallback(): UserMode | null {
  try {
    const ls = typeof window !== "undefined" ? localStorage.getItem("app.role") : null;
    if (typeof ls === "string") {
      const v = ls.trim().toLowerCase();
      if (v === "admin" || v === "gangmember" || v === "viewer2") return v as UserMode;
    }
  } catch {}
  return null;
}

export const OrdersTab = (props: OrdersTabProps) => {
  const raw = props?.userMode ?? null;
  const normalizedFromProp = typeof raw === "string" ? (raw.trim().toLowerCase() as UserMode) : null;
  const fallback = normalizedFromProp ?? readRoleFallback();

  const mode: UserMode | null = fallback;
  const isAllowed = mode === "admin" || mode === "gangmember";
  const isAdmin = mode === "admin";

  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter category tab for Arsenal items
  const [catalogCategory, setCatalogCategory] = useState<'all' | 'arsenal' | 'syndicate'>('all');
  
  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    description: "",
    category: "syndicate"
  });
  
  const [editingItem, setEditingItem] = useState<string | null>(null);

  // Form State for placing orders
  const [memberName, setMemberName] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [orderCategory, setOrderCategory] = useState<'arsenal' | 'syndicate'>('syndicate');

  // Cart Stack for multi-item orders
  const [cartStack, setCartStack] = useState<{
    itemId: string;
    itemName: string;
    quantity: number;
    price: number;
  }[]>([]);

  useEffect(() => {
    let isCancelled = false;
    
    // Safety timeout to guarantee loading disappears even on slow connection
    const safetyTimer = setTimeout(() => {
      if (!isCancelled) setLoading(false);
    }, 1500);
    
    const fetchData = async () => {
      try {
        const [itemsData, ordersData] = await Promise.all([
          firestoreService.getItems(),
          firestoreService.getOrders()
        ]);
        
        if (!isCancelled) {
          setAvailableItems(prev => (Array.isArray(itemsData) && itemsData.length > 0 ? itemsData : (prev.length > 0 ? prev : itemsData)));
          setOrders(prev => (Array.isArray(ordersData) && ordersData.length > 0 ? ordersData : (prev.length > 0 ? prev : ordersData)));
          if (itemsData.length > 0 && !selectedItemId) {
            setSelectedItemId(getItemId(itemsData[0]));
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        if (!isCancelled) setLoading(false);
      }
    };
    
    fetchData();

    const unsubItems = firestoreService.subscribeToItems((newItems) => {
      if (!isCancelled && Array.isArray(newItems)) {
        setAvailableItems(newItems);
        if (newItems.length > 0 && !selectedItemId) {
          setSelectedItemId(getItemId(newItems[0]));
        }
        setLoading(false);
      }
    });

    const unsubOrders = firestoreService.subscribeToOrders((newOrders) => {
      if (!isCancelled && Array.isArray(newOrders)) {
        setOrders(newOrders);
        setLoading(false);
      }
    });

    return () => {
      isCancelled = true;
      clearTimeout(safetyTimer);
      unsubItems();
      unsubOrders();
    };
  }, []);

  const addToCartStack = (itemToUse?: Item, qtyToUse?: number) => {
    const targetItemId = itemToUse ? getItemId(itemToUse) : selectedItemId;
    const targetQty = typeof qtyToUse === 'number' ? qtyToUse : (quantity || 1);

    const itemObj = itemToUse || availableItems.find(i => getItemId(i) === targetItemId);
    if (!itemObj) return;

    const itemId = getItemId(itemObj);

    soundFx.playGunSound();

    setCartStack(prev => {
      const existingIndex = prev.findIndex(i => i.itemId === itemId);
      if (existingIndex !== -1) {
        return prev.map((item, idx) => 
          idx === existingIndex 
            ? { ...item, quantity: item.quantity + targetQty }
            : item
        );
      } else {
        return [...prev, {
          itemId,
          itemName: itemObj.name,
          quantity: targetQty,
          price: itemObj.price
        }];
      }
    });
  };

  const removeFromCartStack = (itemId: string) => {
    setCartStack(prev => prev.filter(item => item.itemId !== itemId));
  };

  const submitStackedOrder = async () => {
    if (!memberName.trim()) {
      alert("Please enter a Member Name for the order.");
      return;
    }
    if (cartStack.length === 0) {
      alert("Please add at least one item to your order stack.");
      return;
    }

    const totalAmount = cartStack.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const orderPayload = {
      memberId: 'mem_user',
      memberName: memberName.trim(),
      items: cartStack,
      totalAmount,
      status: 'pending' as const,
      category: orderCategory,
      orderDate: new Date().toISOString()
    };

    try {
      await firestoreService.addOrder(orderPayload);
      setCartStack([]);
      setMemberName("");
      setQuantity(1);

      const [updatedItems, updatedOrders] = await Promise.all([
        firestoreService.getItems(),
        firestoreService.getOrders()
      ]);
      setAvailableItems(updatedItems);
      setOrders(updatedOrders);

      if (orderCategory === 'syndicate') {
        alert('🤝 Syndicate Deal Requested! Leader can now approve & take payment to deposit funds into Syndicate Bank.');
      } else {
        alert('✅ Order placed successfully!');
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      alert('Failed to place order. Please try again.');
    }
  };

  // Leader Action: Accept Payment & Deposit to Syndicate Bank (or Approve / Reject)
  const updateOrderStatus = async (orderId: string, status: Order['status'], isDeposit?: boolean) => {
    if (!orderId) return;
    try {
      const targetOrder = orders.find(o => o.id === orderId);
      await firestoreService.updateOrder(orderId, { status });

      if ((status === 'completed' || isDeposit) && targetOrder) {
        // Auto-log Treasury Income Transaction
        const categoryKey = (targetOrder as any).category === 'syndicate' ? 'syndicate_deal' : 'arsenal_order';
        const categoryLabel = (targetOrder as any).category === 'syndicate' ? 'Syndicate Deal' : 'Arsenal Order';

        await firestoreService.addTransaction({
          description: `🎯 Payment Collected: ${targetOrder.memberName} (${categoryLabel})`,
          amount: targetOrder.totalAmount,
          type: 'income',
          category: categoryKey,
          date: new Date().toISOString().split('T')[0]
        }).catch(err => console.error("Error logging auto transaction:", err));

        soundFx.playCashSound();
      }

      const updatedOrders = await firestoreService.getOrders();
      setOrders(updatedOrders);
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status.');
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!orderId) return;
    try {
      await firestoreService.deleteOrder(orderId);
      const updatedOrders = await firestoreService.getOrders();
      setOrders(updatedOrders);
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Failed to delete order.');
    }
  };

  const addItem = async () => {
    if (newItem.name.trim() && newItem.price) {
      const item = {
        name: newItem.name.trim(),
        price: parseFloat(newItem.price),
        description: newItem.description.trim(),
        category: newItem.category || 'syndicate'
      };
      
      try {
        await firestoreService.addItem(item);
        setNewItem({ name: "", price: "", description: "", category: "syndicate" });
        const updatedItems = await firestoreService.getItems();
        setAvailableItems(updatedItems);
      } catch (error) {
        console.error('Error adding item:', error);
      }
    }
  };

  const updateItem = async (itemId: string, updates: Partial<Item>) => {
    try {
      await firestoreService.updateItem(itemId, updates);
      setEditingItem(null);
      const updatedItems = await firestoreService.getItems();
      setAvailableItems(updatedItems);
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      await firestoreService.deleteItem(itemId);
      const updatedItems = await firestoreService.getItems();
      setAvailableItems(updatedItems);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  if (!isAllowed) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
        <p>Only Leaders and Gang Members can access Arsenal & Syndicate Deals.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading Syndicate deals & items...</p>
        </div>
      </div>
    );
  }

  const filteredCatalogItems = availableItems.filter(item => {
    if (catalogCategory === 'arsenal') return item.category !== 'syndicate';
    if (catalogCategory === 'syndicate') return item.category === 'syndicate';
    return true;
  });

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const syndicateOrdersCount = orders.filter(o => (o as any).category === 'syndicate').length;
  const totalValue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, order) => sum + order.totalAmount, 0);

  const cartTotal = cartStack.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-gang">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-rajdhani text-muted-foreground">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-orbitron font-bold text-gang-glow">
              {orders.length}
            </div>
          </CardContent>
        </Card>

        <Card className="card-gang border-red-600/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-rajdhani text-red-300 flex items-center">
              <Sparkles className="w-4 h-4 mr-1 text-yellow-400" />
              Syndicate Deals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-orbitron font-bold text-red-400">
              {syndicateOrdersCount}
            </div>
          </CardContent>
        </Card>

        <Card className="card-gang">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-rajdhani text-muted-foreground">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-orbitron font-bold text-warning">
              {pendingOrders}
            </div>
          </CardContent>
        </Card>

        <Card className="card-gang">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-rajdhani text-muted-foreground">Total Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-orbitron font-bold text-gang-neon">
              ${totalValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Catalog Items & Category Filter */}
      <Card className="card-gang">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="font-orbitron text-gang-glow flex items-center">
            <Landmark className="w-6 h-6 mr-2 text-red-500" />
            Gang Arsenal & Syndicate Meeting Items
          </CardTitle>

          {/* Category Filter Tabs */}
          <div className="flex bg-black/40 p-1 rounded-lg border border-red-600/30">
            <button
              onClick={() => setCatalogCategory('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                catalogCategory === 'all' ? 'bg-red-600 text-white shadow' : 'text-red-300 hover:text-white'
              }`}
            >
              All Items ({availableItems.length})
            </button>
            <button
              onClick={() => setCatalogCategory('syndicate')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center ${
                catalogCategory === 'syndicate' ? 'bg-red-600 text-white shadow' : 'text-red-300 hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3 mr-1 text-yellow-400" />
              Syndicate Deals
            </button>
            <button
              onClick={() => setCatalogCategory('arsenal')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                catalogCategory === 'arsenal' ? 'bg-red-600 text-white shadow' : 'text-red-300 hover:text-white'
              }`}
            >
              Arsenal Weapons
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {filteredCatalogItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Landmark className="w-12 h-12 mx-auto mb-3 opacity-50 text-red-400" />
              <p>No items found in this category.</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCatalogItems.map((item) => {
              const itemId = getItemId(item);
              const isSyndicate = item.category === 'syndicate';

              return (
                <div
                  key={itemId}
                  className={`p-4 rounded-lg border transition-colors flex items-center justify-between ${
                    isSyndicate 
                      ? 'bg-red-950/40 border-red-600/40 hover:border-red-500' 
                      : 'bg-muted/50 border-border/50 hover:border-primary/50'
                  }`}
                >
                  <div className="flex-1 pr-4">
                    {editingItem === itemId && isAdmin ? (
                      <EditItemForm 
                        item={item}
                        onSave={(updates) => updateItem(itemId, updates)}
                        onCancel={() => setEditingItem(null)}
                      />
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg text-white">{item.name}</h3>
                          {isSyndicate ? (
                            <Badge className="bg-red-600 text-white text-[10px]">
                              🤝 Syndicate Deal
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] border-red-600/30 text-red-300">
                              Arsenal
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingItem !== itemId && (
                      <div className="text-xl font-orbitron font-bold text-success mr-2">
                        ${item.price.toLocaleString()}
                      </div>
                    )}
                    
                    {/* Quick Add to Stack Button */}
                    {editingItem !== itemId && (
                      <Button
                        size="sm"
                        onClick={() => addToCartStack(item, 1)}
                        className="bg-red-900/40 hover:bg-red-800/60 text-red-200 border border-red-600/40"
                        title="Add to Order Stack"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Stack
                      </Button>
                    )}

                    {isAdmin && editingItem !== itemId && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingItem(itemId)}
                          className="hover:bg-primary/10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteItem(itemId)}
                          className="hover:bg-destructive/10 text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add New Item (Admin Only) */}
          {isAdmin && (
            <Card className="border-dashed border-2 border-red-600/30 bg-black/20 mt-4">
              <CardContent className="p-4">
                <h4 className="font-rajdhani font-bold mb-3 text-gang-glow flex items-center">
                  <Plus className="w-4 h-4 mr-1" /> Add New Catalog / Syndicate Item
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    placeholder="Item name (e.g. Syndicate Supply Crate)"
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    className="bg-input"
                  />
                  <Input
                    placeholder="Description"
                    value={newItem.description}
                    onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                    className="bg-input"
                  />
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                    className="px-3 py-2 bg-input border border-border rounded-md text-foreground font-medium text-sm"
                  >
                    <option value="syndicate">🤝 Syndicate Meeting Deal</option>
                    <option value="gear">🔫 Standard Arsenal Weaponry</option>
                  </select>
                  <div className="flex gap-2 md:col-span-3">
                    <Input
                      type="number"
                      placeholder="Price ($)"
                      value={newItem.price}
                      onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                      className="bg-input flex-1"
                    />
                    <Button onClick={addItem} className="btn-gang">
                      <Plus className="w-4 h-4 mr-2" /> Save to Catalog
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Multi-Item Order Stacker Form */}
      <Card className="card-gang border-red-600/40">
        <CardHeader>
          <CardTitle className="font-orbitron text-gang-glow flex items-center justify-between">
            <div className="flex items-center">
              <ShoppingBag className="w-5 h-5 mr-2" />
              Build Order Stack (Arsenal & Syndicate Deals)
            </div>
            {cartStack.length > 0 && (
              <Badge className="bg-red-600 text-white">
                {cartStack.reduce((sum, i) => sum + i.quantity, 0)} Items Stacked
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-red-950/30 border border-red-600/30 rounded-lg flex items-center justify-between text-xs text-red-200">
            <span className="flex items-center">
              <Landmark className="w-4 h-4 mr-2 text-yellow-400 inline" />
              <strong>Syndicate Auto-Deposit:</strong> Accepting payment for Syndicate orders automatically deposits cash into the Syndicate Bank / Gang Fund!
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOrderCategory('syndicate')}
                className={`px-3 py-1 rounded font-bold transition-all ${
                  orderCategory === 'syndicate' ? 'bg-red-600 text-white' : 'bg-black/40 text-red-300'
                }`}
              >
                🤝 Syndicate Deal
              </button>
              <button
                type="button"
                onClick={() => setOrderCategory('arsenal')}
                className={`px-3 py-1 rounded font-bold transition-all ${
                  orderCategory === 'arsenal' ? 'bg-red-600 text-white' : 'bg-black/40 text-red-300'
                }`}
              >
                🔫 Arsenal Order
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              placeholder="Member Name (e.g. Tatya Vinchu)"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              className="bg-input font-medium"
            />
            
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="px-3 py-2 bg-input border border-border rounded-md text-foreground font-medium"
            >
              {availableItems.map(item => {
                const id = getItemId(item);
                return (
                  <option key={id} value={id}>
                    {item.category === 'syndicate' ? '🤝 ' : '🔫 '}{item.name} (${item.price.toLocaleString()})
                  </option>
                );
              })}
            </select>

            <Input
              type="number"
              min={1}
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || 1)}
              className="bg-input"
            />

            <Button onClick={() => addToCartStack()} variant="outline" className="border-red-600/50 text-red-300 hover:bg-red-900/30">
              <Plus className="w-4 h-4 mr-2" /> Add to Order Stack
            </Button>
          </div>

          {/* Stacked Items Display */}
          {cartStack.length > 0 ? (
            <div className="mt-4 p-4 bg-red-950/40 rounded-lg border border-red-600/40 space-y-3">
              <h4 className="font-orbitron text-sm font-semibold text-red-300 uppercase">Stacked Items in Cart:</h4>
              <div className="space-y-2">
                {cartStack.map((item) => (
                  <div key={item.itemId} className="flex items-center justify-between bg-black/50 px-3 py-2 rounded border border-red-600/20">
                    <span className="font-rajdhani font-semibold text-white">
                      {item.quantity}x {item.itemName}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-orbitron text-success font-bold">
                        ${(item.price * item.quantity).toLocaleString()}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromCartStack(item.itemId)}
                        className="h-7 w-7 p-0 text-destructive hover:bg-destructive/20"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-red-600/30">
                <span className="font-orbitron font-bold text-white">Total Order Value:</span>
                <span className="text-2xl font-orbitron font-bold text-success">${cartTotal.toLocaleString()}</span>
              </div>

              <Button onClick={submitStackedOrder} className="w-full btn-gang py-3 text-lg font-bold">
                <ShoppingCart className="w-5 h-5 mr-2" /> Request {orderCategory === 'syndicate' ? 'Syndicate Deal' : 'Order'} (${cartTotal.toLocaleString()})
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic text-center pt-2">
              Select items above and click "+ Add to Order Stack" to build a multi-item order!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Orders List & Leader Payment Acceptance */}
      <Card className="card-gang">
        <CardHeader>
          <CardTitle className="font-orbitron text-gang-glow">
            📋 Active Orders & Syndicate Payments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {orders.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No orders placed yet.</p>
          ) : (
            orders.map((order) => {
              const orderId = getOrderId(order);
              const isSyndicate = (order as any).category === 'syndicate';

              return (
                <div 
                  key={orderId} 
                  className={`p-4 rounded-lg border space-y-3 ${
                    isSyndicate ? 'bg-red-950/30 border-red-600/40' : 'bg-muted/50 border-border/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-white">{order.memberName}</h3>
                        {isSyndicate && (
                          <Badge className="bg-red-600 text-white text-[10px]">
                            🤝 Syndicate Deal
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Order ID: {orderId} | {new Date(order.orderDate).toLocaleString()}
                      </p>
                    </div>
                    <Badge 
                      className={
                        order.status === 'pending' ? 'bg-warning text-black font-bold' :
                        order.status === 'approved' ? 'bg-blue-600 text-white font-bold' :
                        order.status === 'completed' ? 'bg-success text-white font-bold' :
                        'bg-destructive text-white font-bold'
                      }
                    >
                      {order.status === 'completed' ? '✅ PAID & DEPOSITED' : order.status.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 bg-black/40 p-3 rounded border border-border/30">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm py-1 border-b border-border/20 last:border-0">
                        <span className="font-medium">{item.quantity}x {item.itemName}</span>
                        <span className="text-red-300 font-semibold">${(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center pt-1">
                    <span className="font-semibold text-muted-foreground">Total Value:</span>
                    <span className="text-xl font-orbitron font-bold text-success">
                      ${order.totalAmount.toLocaleString()}
                    </span>
                  </div>
                  
                  {/* Leader Controls (Accept Payment & Auto-Deposit / Approve / Reject) */}
                  {isAdmin && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
                      {order.status !== 'completed' && order.status !== 'cancelled' && (
                        <>
                          {/* Main Button: Accept Money & Deposit to Syndicate Bank */}
                          <Button 
                            size="sm" 
                            onClick={() => updateOrderStatus(orderId, 'completed', true)}
                            className="bg-success hover:bg-success/80 text-white font-bold"
                            title="Accept payment and automatically deposit money into the Syndicate Bank / Gang Fund"
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Accept Money & Deposit to Syndicate Bank (${order.totalAmount.toLocaleString()})
                          </Button>

                          {order.status === 'pending' && (
                            <Button 
                              size="sm" 
                              onClick={() => updateOrderStatus(orderId, 'approved')}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                          )}

                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => updateOrderStatus(orderId, 'cancelled')}
                            className="font-medium"
                          >
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}

                      {order.status === 'completed' && (
                        <span className="text-xs text-success font-semibold flex items-center py-1">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Funds deposited in Syndicate Bank & Money Moves
                        </span>
                      )}

                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => deleteOrder(orderId)}
                        className="text-destructive border-destructive/30 hover:bg-destructive/10 ml-auto"
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
};
