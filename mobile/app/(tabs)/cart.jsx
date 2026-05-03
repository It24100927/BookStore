import { useState, useEffect, useRef } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator,
  StyleSheet, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform,
  Animated, Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useCartStore } from "../../store/cartStore";
import { useAuthStore } from "../../store/authStore";
import { API_URL } from "../../constants/api";
import COLORS from "../../constants/colors";

// ─── Card brand images ──────────────────────────────────────────────────────
const CARD_IMAGES = {
  visa: require("../../assets/images/visa-card.png"),
  mastercard: require("../../assets/images/mastercard-card.png"),
  amex: require("../../assets/images/amex-card.png"),
  generic: require("../../assets/images/generic-card.png"),
};

// ─── Card type detection ──────────────────────────────────────────────────────
const detectCardType = (num) => {
  const n = num.replace(/\s+/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  return null;
};

const formatCardNumber = (value) => {
  const v = value.replace(/\D/g, "").slice(0, 16);
  return v.replace(/(.{4})/g, "$1 ").trim();
};

const formatExpiry = (value) => {
  const v = value.replace(/\D/g, "").slice(0, 4);
  if (v.length >= 3) return `${v.slice(0, 2)}/${v.slice(2)}`;
  return v;
};

// ─── Card brand logos (real images) ────────────────────────────────────────────
function CardBrandBadge({ type, size = "small" }) {
  const isSmall = size === "small";
  const badgeW = isSmall ? 38 : 52;
  const badgeH = isSmall ? 24 : 34;

  if (type === "visa") {
    return (
      <View style={{ backgroundColor: "#1A1F71", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: isSmall ? 13 : 16, fontStyle: "italic", letterSpacing: 1 }}>VISA</Text>
      </View>
    );
  }
  if (type === "mastercard") {
    const circleSize = isSmall ? 22 : 30;
    return (
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: circleSize, height: circleSize, borderRadius: circleSize / 2, backgroundColor: "#EB001B", marginRight: -(circleSize * 0.35), opacity: 0.95 }} />
        <View style={{ width: circleSize, height: circleSize, borderRadius: circleSize / 2, backgroundColor: "#F79E1B", opacity: 0.95 }} />
      </View>
    );
  }
  if (type === "amex") {
    return (
      <View style={{ backgroundColor: "#2E77BC", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }}>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: isSmall ? 10 : 13, letterSpacing: 1 }}>AMEX</Text>
      </View>
    );
  }
  return <Ionicons name="card-outline" size={isSmall ? 24 : 30} color={COLORS.textMuted} />;
}

// ─── Realistic Card Image Showcase ─────────────────────────────────────────────
function CardImageShowcase({ cardType, cardNumber, cardHolder, cardExpiry }) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const prevType = useRef(cardType);

  useEffect(() => {
    if (prevType.current !== cardType) {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.3, duration: 150, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
      prevType.current = cardType;
    }
  }, [cardType]);

  const imageSource = cardType ? CARD_IMAGES[cardType] : CARD_IMAGES.generic;

  return (
    <Animated.View style={[s.cardShowcase, { opacity: fadeAnim }]}>
      <Image
        source={imageSource}
        style={s.cardShowcaseImage}
        contentFit="contain"
        transition={200}
      />
      {/* Overlay card details on the image */}
      <View style={s.cardOverlay}>
        <View style={s.cardOverlayTop}>
          <View style={s.cardChipPlaceholder} />
          {cardType && <CardBrandBadge type={cardType} size="large" />}
        </View>
        <Text style={s.cardOverlayNumber}>
          {cardNumber || "•••• •••• •••• ••••"}
        </Text>
        <View style={s.cardOverlayBottom}>
          <View>
            <Text style={s.cardOverlayLabel}>CARD HOLDER</Text>
            <Text style={s.cardOverlayValue}>{cardHolder || "YOUR NAME"}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.cardOverlayLabel}>EXPIRES</Text>
            <Text style={s.cardOverlayValue}>{cardExpiry || "MM/YY"}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Accepted Cards Strip ──────────────────────────────────────────────────────
function AcceptedCardsStrip() {
  return (
    <View style={s.acceptedStrip}>
      <Text style={s.acceptedLabel}>We Accept</Text>
      <View style={s.acceptedLogos}>
        <Image source={CARD_IMAGES.visa} style={s.acceptedCardImg} contentFit="contain" />
        <Image source={CARD_IMAGES.mastercard} style={s.acceptedCardImg} contentFit="contain" />
        <Image source={CARD_IMAGES.amex} style={s.acceptedCardImg} contentFit="contain" />
      </View>
    </View>
  );
}

// ─── Main Cart Screen ─────────────────────────────────────────────────────────
export default function CartScreen() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const { items, removeFromCart, updateQuantity, clearCart, getCartTotal, getItemCount } = useCartStore();

  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [paymentStep, setPaymentStep] = useState(1); // 1 = address, 2 = payment, 3 = review

  // Step 1: Address
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");

  // Step 2: Payment
  const [paymentMethod, setPaymentMethod] = useState("Cash on Delivery");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCVV, setCardCVV] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardFocused, setCardFocused] = useState(null);

  const cardType = detectCardType(cardNumber);
  const hasSavedCard = !!(user?.paymentCard?.cardNumber);

  useEffect(() => {
    if (checkoutModalVisible) {
      setPaymentStep(1);
      setStreet(user?.address?.street || "");
      setPostalCode(user?.address?.postalCode || "");
      setCountry(user?.address?.country || "");
      setPaymentMethod(hasSavedCard ? "Card" : "Cash on Delivery");
      // Pre-fill card from saved profile
      if (hasSavedCard) {
        setCardNumber(user.paymentCard.cardNumber || "");
        setCardExpiry(user.paymentCard.expiryDate || "");
        setCardCVV("");
        setCardHolder(user?.username || "");
      }
    }
  }, [checkoutModalVisible, user]);

  const validateStep = () => {
    if (paymentStep === 1) {
      if (!street.trim() || !postalCode.trim() || !country.trim()) {
        Alert.alert("Missing Address", "Please fill in your complete delivery address.");
        return false;
      }
    }
    if (paymentStep === 2 && paymentMethod === "Card") {
      const cleanNum = cardNumber.replace(/\s/g, "");
      if (cleanNum.length < 13) { Alert.alert("Invalid Card", "Please enter a valid card number."); return false; }
      if (cardExpiry.length < 5) { Alert.alert("Invalid Card", "Please enter a valid expiry date (MM/YY)."); return false; }
      if (cardCVV.length < 3) { Alert.alert("Invalid Card", "Please enter a valid CVV."); return false; }
      if (!cardHolder.trim()) { Alert.alert("Invalid Card", "Please enter the cardholder name."); return false; }
      // Check expiry
      const [mm, yy] = cardExpiry.split("/");
      const now = new Date();
      const expYear = 2000 + Number(yy);
      const expMonth = Number(mm);
      if (expMonth < 1 || expMonth > 12 || expYear < now.getFullYear() ||
        (expYear === now.getFullYear() && expMonth < now.getMonth() + 1)) {
        Alert.alert("Expired Card", "Your card appears to be expired.");
        return false;
      }
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep()) return;
    if (paymentStep < 3) setPaymentStep((p) => p + 1);
  };

  const goBack = () => {
    if (paymentStep > 1) setPaymentStep((p) => p - 1);
  };

  const processCheckout = async () => {
    if (!validateStep()) return;
    try {
      setCheckingOut(true);
      const orderItems = items.map((i) => ({ book: i.bookId, quantity: i.quantity }));
      const payload = {
        orderItems,
        shippingAddress: { street: street.trim(), postalCode: postalCode.trim(), country: country.trim() },
        paymentMethod,
      };

      const currentToken = useAuthStore.getState().token;
      const response = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Checkout failed");

      await clearCart();
      setCheckoutModalVisible(false);
      Alert.alert("🎉 Order Placed!", "Your order has been placed successfully.", [
        { text: "View Orders", onPress: () => router.push("/orders") },
        { text: "OK" },
      ]);
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setCheckingOut(false);
    }
  };

  // ── Cart item renderer ──────────────────────────────────────────────────────
  const renderItem = ({ item }) => (
    <View style={s.card}>
      <Image source={item.image} style={s.image} contentFit="cover" />
      <View style={s.info}>
        <Text style={s.title} numberOfLines={2}>{item.title}</Text>
        {item.originalPrice && item.originalPrice > item.price ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Text style={[s.price, { textDecorationLine: "line-through", fontSize: 12, color: COLORS.textMuted }]}>
              Rs. {item.originalPrice?.toFixed(2)}
            </Text>
            <Text style={s.price}>Rs. {item.price?.toFixed(2)}</Text>
          </View>
        ) : (
          <Text style={s.price}>Rs. {item.price?.toFixed(2)}</Text>
        )}
        <View style={s.qtyRow}>
          <TouchableOpacity style={s.qtyBtn} onPress={() => updateQuantity(item.bookId, item.quantity - 1)}>
            <Ionicons name="remove" size={16} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={s.qtyText}>{item.quantity}</Text>
          <TouchableOpacity
            style={s.qtyBtn}
            onPress={() => {
              if (item.quantity >= item.stockCount) { Alert.alert("Limit", `Only ${item.stockCount} in stock`); return; }
              updateQuantity(item.bookId, item.quantity + 1);
            }}
          >
            <Ionicons name="add" size={16} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={s.lineTotal}>Rs. {(item.price * item.quantity).toFixed(2)}</Text>
        </View>
      </View>
      <TouchableOpacity style={s.removeBtn} onPress={() => removeFromCart(item.bookId)}>
        <Ionicons name="close-circle" size={22} color={COLORS.danger} />
      </TouchableOpacity>
    </View>
  );

  // ── Step indicators ─────────────────────────────────────────────────────────
  const renderSteps = () => (
    <View style={s.stepsRow}>
      {["Address", "Payment", "Review"].map((label, i) => {
        const step = i + 1;
        const done = paymentStep > step;
        const active = paymentStep === step;
        return (
          <View key={label} style={s.stepItem}>
            <View style={[s.stepDot, active && s.stepDotActive, done && s.stepDotDone]}>
              {done
                ? <Ionicons name="checkmark" size={12} color="#fff" />
                : <Text style={[s.stepNum, active && { color: "#fff" }]}>{step}</Text>
              }
            </View>
            <Text style={[s.stepLabel, active && s.stepLabelActive]}>{label}</Text>
            {i < 2 && <View style={[s.stepLine, done && s.stepLineDone]} />}
          </View>
        );
      })}
    </View>
  );

  // ── Step 1: Address ─────────────────────────────────────────────────────────
  const renderAddressStep = () => (
    <View style={s.stepContent}>
      <View style={s.sectionHeader}>
        <View style={s.sectionIconBg}>
          <Ionicons name="location" size={18} color={COLORS.primary} />
        </View>
        <Text style={s.sectionTitle}>Delivery Address</Text>
      </View>

      {user?.address?.street && (
        <TouchableOpacity
          style={[s.savedAddressBtn, street === user.address.street && s.savedAddressBtnActive]}
          onPress={() => { setStreet(user.address.street); setPostalCode(user.address.postalCode || ""); setCountry(user.address.country || ""); }}
        >
          <Ionicons name="location" size={18} color={street === user.address.street ? COLORS.primary : COLORS.textMuted} />
          <View style={{ flex: 1 }}>
            <Text style={s.savedAddressLabel}>Saved Address</Text>
            <Text style={s.savedAddressText} numberOfLines={2}>
              {[user.address.street, user.address.postalCode, user.address.country].filter(Boolean).join(", ")}
            </Text>
          </View>
          {street === user.address.street && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
        </TouchableOpacity>
      )}

      <Text style={s.fieldLabel}>Street Address *</Text>
      <TextInput
        style={[s.input, !street.trim() && s.inputError]}
        multiline
        numberOfLines={3}
        value={street}
        onChangeText={setStreet}
        placeholder="e.g. 123 Main Street, Apt 4B"
        placeholderTextColor={COLORS.placeholderText}
      />

      <View style={s.twoCol}>
        <View style={{ flex: 1 }}>
          <Text style={s.fieldLabel}>Postal Code *</Text>
          <TextInput
            style={s.input}
            value={postalCode}
            onChangeText={setPostalCode}
            placeholder="10001"
            placeholderTextColor={COLORS.placeholderText}
            keyboardType="numeric"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.fieldLabel}>Country *</Text>
          <TextInput
            style={s.input}
            value={country}
            onChangeText={setCountry}
            placeholder="Sri Lanka"
            placeholderTextColor={COLORS.placeholderText}
          />
        </View>
      </View>

      {!user?.address?.street && (
        <TouchableOpacity onPress={() => { setCheckoutModalVisible(false); router.push("/edit-profile"); }}>
          <Text style={s.linkText}>💾 Save address to profile for next time →</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── Step 2: Payment ─────────────────────────────────────────────────────────
  const renderPaymentStep = () => (
    <View style={s.stepContent}>
      <View style={s.sectionHeader}>
        <View style={s.sectionIconBg}>
          <Ionicons name="card" size={18} color={COLORS.primary} />
        </View>
        <Text style={s.sectionTitle}>Payment Method</Text>
      </View>

      {/* Method selector */}
      <View style={s.methodRow}>
        <TouchableOpacity
          style={[s.methodChip, paymentMethod === "Card" && s.methodChipActive]}
          onPress={() => setPaymentMethod("Card")}
        >
          <Ionicons name="card" size={18} color={paymentMethod === "Card" ? "#fff" : COLORS.textSecondary} />
          <Text style={[s.methodChipText, paymentMethod === "Card" && s.methodChipTextActive]}>Card</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.methodChip, paymentMethod === "Cash on Delivery" && s.methodChipActive]}
          onPress={() => setPaymentMethod("Cash on Delivery")}
        >
          <Ionicons name="cash" size={18} color={paymentMethod === "Cash on Delivery" ? "#fff" : COLORS.textSecondary} />
          <Text style={[s.methodChipText, paymentMethod === "Cash on Delivery" && s.methodChipTextActive]}>Cash on Delivery</Text>
        </TouchableOpacity>
      </View>

      {paymentMethod === "Card" && (
        <View>
          {/* Accepted Cards Strip */}
          <AcceptedCardsStrip />

          {/* Realistic Card Image Showcase */}
          <CardImageShowcase
            cardType={cardType}
            cardNumber={cardNumber}
            cardHolder={cardHolder}
            cardExpiry={cardExpiry}
          />

          {hasSavedCard && (
            <View style={s.savedCardNotice}>
              <Ionicons name="shield-checkmark" size={14} color={COLORS.success} />
              <Text style={s.savedCardNoticeText}>Using saved card ending in {user.paymentCard.cardNumber.slice(-4)}</Text>
            </View>
          )}

          {/* Card fields */}
          <Text style={s.fieldLabel}>Card Number *</Text>
          <View style={[s.inputWithIcon, cardFocused === "num" && s.inputFocused]}>
            <Ionicons name="card-outline" size={18} color={COLORS.textMuted} />
            <TextInput
              style={s.inputInner}
              value={cardNumber}
              onChangeText={(v) => setCardNumber(formatCardNumber(v))}
              placeholder="0000 0000 0000 0000"
              placeholderTextColor={COLORS.placeholderText}
              keyboardType="numeric"
              maxLength={19}
              onFocus={() => setCardFocused("num")}
              onBlur={() => setCardFocused(null)}
            />
            {cardType && <CardBrandBadge type={cardType} />}
          </View>

          <Text style={s.fieldLabel}>Cardholder Name *</Text>
          <View style={[s.inputWithIcon, cardFocused === "name" && s.inputFocused]}>
            <Ionicons name="person-outline" size={18} color={COLORS.textMuted} />
            <TextInput
              style={s.inputInner}
              value={cardHolder}
              onChangeText={setCardHolder}
              placeholder="Name on card"
              placeholderTextColor={COLORS.placeholderText}
              autoCapitalize="characters"
              onFocus={() => setCardFocused("name")}
              onBlur={() => setCardFocused(null)}
            />
          </View>

          <View style={s.twoCol}>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Expiry (MM/YY) *</Text>
              <View style={[s.inputWithIcon, cardFocused === "exp" && s.inputFocused]}>
                <TextInput
                  style={[s.inputInner, { paddingLeft: 4 }]}
                  value={cardExpiry}
                  onChangeText={(v) => setCardExpiry(formatExpiry(v))}
                  placeholder="MM/YY"
                  placeholderTextColor={COLORS.placeholderText}
                  keyboardType="numeric"
                  maxLength={5}
                  onFocus={() => setCardFocused("exp")}
                  onBlur={() => setCardFocused(null)}
                />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>CVV *</Text>
              <View style={[s.inputWithIcon, cardFocused === "cvv" && s.inputFocused]}>
                <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={s.inputInner}
                  value={cardCVV}
                  onChangeText={setCvvRaw => setCardCVV(setCvvRaw.replace(/\D/g, "").slice(0, 4))}
                  placeholder="•••"
                  placeholderTextColor={COLORS.placeholderText}
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={4}
                  onFocus={() => setCardFocused("cvv")}
                  onBlur={() => setCardFocused(null)}
                />
              </View>
            </View>
          </View>

          <View style={s.secureNotice}>
            <Ionicons name="lock-closed" size={12} color={COLORS.success} />
            <Text style={s.secureNoticeText}>256-bit SSL encrypted. Your data is safe.</Text>
          </View>
        </View>
      )}

      {paymentMethod === "Cash on Delivery" && (
        <View style={s.codBox}>
          <Ionicons name="cash-outline" size={34} color={COLORS.success} />
          <Text style={s.codTitle}>Cash on Delivery</Text>
          <Text style={s.codDesc}>You will pay Rs. {getCartTotal().toFixed(2)} when your order arrives at your doorstep.</Text>
        </View>
      )}
    </View>
  );

  // ── Step 3: Review ──────────────────────────────────────────────────────────
  const renderReviewStep = () => (
    <View style={s.stepContent}>
      <View style={s.sectionHeader}>
        <View style={s.sectionIconBg}>
          <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
        </View>
        <Text style={s.sectionTitle}>Order Review</Text>
      </View>

      {/* Summary cards */}
      <View style={s.reviewCard}>
        <View style={s.reviewCardHeader}>
          <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
          <Text style={s.reviewCardTitle}>Deliver To</Text>
          <TouchableOpacity onPress={() => setPaymentStep(1)}>
            <Text style={s.editLink}>Edit</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.reviewCardValue}>{street}</Text>
        <Text style={s.reviewCardSub}>{postalCode}, {country}</Text>
      </View>

      <View style={s.reviewCard}>
        <View style={s.reviewCardHeader}>
          <Ionicons name="card-outline" size={16} color={COLORS.textSecondary} />
          <Text style={s.reviewCardTitle}>Payment</Text>
          <TouchableOpacity onPress={() => setPaymentStep(2)}>
            <Text style={s.editLink}>Edit</Text>
          </TouchableOpacity>
        </View>
        {paymentMethod === "Card" ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <CardBrandBadge type={cardType} />
            <Text style={s.reviewCardValue}>•••• •••• •••• {cardNumber.replace(/\s/g, "").slice(-4)}</Text>
          </View>
        ) : (
          <Text style={s.reviewCardValue}>Cash on Delivery</Text>
        )}
      </View>

      {/* Item list */}
      <View style={s.reviewCard}>
        <View style={s.reviewCardHeader}>
          <Ionicons name="bag-outline" size={16} color={COLORS.textSecondary} />
          <Text style={s.reviewCardTitle}>Items ({getItemCount()})</Text>
        </View>
        {items.map((item) => (
          <View key={item.bookId} style={s.reviewItemRow}>
            <Text style={s.reviewItemTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={s.reviewItemMeta}>×{item.quantity} — Rs. {(item.price * item.quantity).toFixed(2)}</Text>
          </View>
        ))}
        <View style={s.reviewTotal}>
          <Text style={s.reviewTotalLabel}>Free Shipping</Text>
          <Text style={s.reviewTotalValue}>Rs. 0</Text>
        </View>
        <View style={[s.reviewTotal, { borderTopWidth: 1.5, borderTopColor: COLORS.border, marginTop: 8, paddingTop: 12 }]}>
          <Text style={[s.reviewTotalLabel, { fontWeight: "900", color: COLORS.textDark }]}>Total</Text>
          <Text style={[s.reviewTotalValue, { fontSize: 20, color: COLORS.primary }]}>Rs. {getCartTotal().toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Shopping Cart</Text>
          <Text style={s.headerSub}>{getItemCount()} item(s)</Text>
        </View>
        {items.length > 0 && (
          <TouchableOpacity onPress={() => Alert.alert("Clear Cart?", "Remove all items?", [
            { text: "Cancel", style: "cancel" },
            { text: "Clear", style: "destructive", onPress: clearCart },
          ])}>
            <Text style={s.clearBtn}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.bookId}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Ionicons name="bag-outline" size={52} color={COLORS.primary} />
            </View>
            <Text style={s.emptyTitle}>Your cart is empty</Text>
            <Text style={s.emptyDesc}>Browse our collection and add books you love</Text>
            <TouchableOpacity style={s.browseBtn} onPress={() => router.push("/")}>
              <Text style={s.browseBtnText}>Browse Store</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {items.length > 0 && (
        <View style={s.footer}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotal ({getItemCount()} items)</Text>
            <Text style={s.totalValue}>Rs. {getCartTotal().toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={s.checkoutBtn} onPress={() => setCheckoutModalVisible(true)}>
            <Ionicons name="bag-check-outline" size={20} color="#fff" />
            <Text style={s.checkoutText}>Proceed to Checkout</Text>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Checkout Modal ─────────────────────────────────────────── */}
      <Modal visible={checkoutModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={s.modalOverlay}>
            <View style={s.modalContent}>
              {/* Drag handle */}
              <View style={s.modalHandle} />

              {/* Modal header */}
              <View style={s.modalHeader}>
                <TouchableOpacity
                  style={s.modalBackBtn}
                  onPress={paymentStep === 1 ? () => setCheckoutModalVisible(false) : goBack}
                >
                  <Ionicons name={paymentStep === 1 ? "close" : "arrow-back"} size={22} color={COLORS.textDark} />
                </TouchableOpacity>
                <Text style={s.modalTitle}>
                  {paymentStep === 1 ? "Delivery" : paymentStep === 2 ? "Payment" : "Confirm Order"}
                </Text>
                <View style={{ width: 36 }} />
              </View>

              {/* Step indicators */}
              {renderSteps()}

              {/* Step content */}
              <ScrollView
                contentContainerStyle={s.modalScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {paymentStep === 1 && renderAddressStep()}
                {paymentStep === 2 && renderPaymentStep()}
                {paymentStep === 3 && renderReviewStep()}
              </ScrollView>

              {/* Footer action */}
              <View style={s.modalFooter}>
                {paymentStep < 3 ? (
                  <TouchableOpacity style={s.confirmBtn} onPress={goNext} activeOpacity={0.85}>
                    <Text style={s.confirmText}>
                      {paymentStep === 1 ? "Continue to Payment" : "Review Order"}
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[s.confirmBtn, s.confirmBtnFinal]} onPress={processCheckout} disabled={checkingOut} activeOpacity={0.85}>
                    {checkingOut ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={22} color="#fff" />
                        <Text style={s.confirmText}>
                          {paymentMethod === "Cash on Delivery" ? "Place Order" : `Pay Rs. ${getCartTotal().toFixed(2)}`}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
    backgroundColor: COLORS.cardBackground, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 2,
  },
  headerTitle: { fontSize: 24, fontWeight: "900", color: COLORS.textDark },
  headerSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  clearBtn: { fontSize: 13, fontWeight: "700", color: COLORS.danger },

  // List
  list: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 10 },
  card: {
    flexDirection: "row", backgroundColor: COLORS.cardBackground, borderRadius: 16,
    padding: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  image: { width: 76, height: 108, borderRadius: 10 },
  info: { flex: 1, marginLeft: 12, justifyContent: "space-between" },
  title: { fontSize: 14, fontWeight: "700", color: COLORS.textDark, lineHeight: 19, marginBottom: 4 },
  price: { fontSize: 16, fontWeight: "900", color: COLORS.primary, marginBottom: 8 },
  qtyRow: { flexDirection: "row", alignItems: "center" },
  qtyBtn: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: COLORS.inputBackground,
    borderWidth: 1, borderColor: COLORS.border, justifyContent: "center", alignItems: "center",
  },
  qtyText: { fontSize: 15, fontWeight: "800", color: COLORS.textDark, marginHorizontal: 12 },
  lineTotal: { fontSize: 13, fontWeight: "700", color: COLORS.accent, marginLeft: "auto" },
  removeBtn: { position: "absolute", top: 8, right: 8 },

  // Footer
  footer: {
    backgroundColor: COLORS.cardBackground, borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 34,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.08, elevation: 8,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  totalLabel: { fontSize: 14, color: COLORS.textSecondary, fontWeight: "500" },
  totalValue: { fontSize: 24, fontWeight: "900", color: COLORS.primary },
  checkoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 16,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  checkoutText: { color: "#fff", fontSize: 16, fontWeight: "800", flex: 1, textAlign: "center" },

  // Empty
  empty: { alignItems: "center", paddingTop: 90, paddingBottom: 40 },
  emptyIcon: {
    width: 110, height: 110, borderRadius: 55, backgroundColor: COLORS.primaryGlow,
    borderWidth: 2, borderColor: COLORS.primaryBorder, justifyContent: "center", alignItems: "center", marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: COLORS.textDark },
  emptyDesc: { fontSize: 14, color: COLORS.textSecondary, marginTop: 6, textAlign: "center" },
  browseBtn: {
    marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 14, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  browseBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: COLORS.cardBackground, maxHeight: "94%",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20,
  },
  modalHandle: {
    width: 44, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
    alignSelf: "center", marginTop: 12, marginBottom: 4,
  },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalBackBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.inputBackground,
    justifyContent: "center", alignItems: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: COLORS.textDark },

  // Steps
  stepsRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingHorizontal: 24, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  stepItem: { flexDirection: "row", alignItems: "center" },
  stepDot: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.inputBackground,
    borderWidth: 2, borderColor: COLORS.border, justifyContent: "center", alignItems: "center",
  },
  stepDotActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stepDotDone: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  stepNum: { fontSize: 12, fontWeight: "800", color: COLORS.textMuted },
  stepLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: "600", marginLeft: 6 },
  stepLabelActive: { color: COLORS.primary },
  stepLine: { width: 28, height: 2, backgroundColor: COLORS.border, marginHorizontal: 6 },
  stepLineDone: { backgroundColor: COLORS.success },

  modalScroll: { padding: 20, paddingBottom: 8 },
  stepContent: {},

  // Section header
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  sectionIconBg: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.primaryGlow,
    justifyContent: "center", alignItems: "center",
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: COLORS.textDark },

  // Address step
  savedAddressBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: COLORS.inputBackground, borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 16,
  },
  savedAddressBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow },
  savedAddressLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase" },
  savedAddressText: { fontSize: 14, color: COLORS.textDark, marginTop: 2 },

  fieldLabel: { fontSize: 12, fontWeight: "700", color: COLORS.textSecondary, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },
  input: {
    backgroundColor: COLORS.inputBackground, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.textPrimary, fontSize: 15, marginBottom: 14,
  },
  inputError: { borderColor: COLORS.danger + "60" },
  twoCol: { flexDirection: "row", gap: 12 },
  linkText: { color: COLORS.primary, fontSize: 13, fontWeight: "600", marginTop: 2, marginBottom: 4 },

  // Payment step
  methodRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  methodChip: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 12, borderRadius: 14, backgroundColor: COLORS.inputBackground,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  methodChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  methodChipText: { fontSize: 14, fontWeight: "700", color: COLORS.textSecondary },
  methodChipTextActive: { color: "#fff" },

  // Card image showcase
  cardShowcase: {
    marginBottom: 20, borderRadius: 18, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 10,
    position: "relative", aspectRatio: 1.586,
  },
  cardShowcaseImage: {
    width: "100%", height: "100%", borderRadius: 18,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18, padding: 22, justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.30)",
  },
  cardOverlayTop: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
  },
  cardChipPlaceholder: {
    width: 42, height: 30, borderRadius: 6,
    backgroundColor: "rgba(255,215,0,0.55)",
    borderWidth: 1, borderColor: "rgba(255,215,0,0.7)",
  },
  cardOverlayNumber: {
    fontSize: 22, color: "#fff", fontWeight: "700", letterSpacing: 3,
    textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  cardOverlayBottom: {
    flexDirection: "row", justifyContent: "space-between",
  },
  cardOverlayLabel: {
    fontSize: 9, color: "rgba(255,255,255,0.7)", fontWeight: "700",
    letterSpacing: 1, marginBottom: 3, textTransform: "uppercase",
  },
  cardOverlayValue: {
    fontSize: 14, color: "#fff", fontWeight: "700", letterSpacing: 1,
    textShadowColor: "rgba(0,0,0,0.4)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },

  // Accepted cards strip
  acceptedStrip: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 12, marginBottom: 16, paddingVertical: 10,
    backgroundColor: COLORS.inputBackground, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  acceptedLabel: {
    fontSize: 12, fontWeight: "700", color: COLORS.textMuted,
    textTransform: "uppercase", letterSpacing: 0.6,
  },
  acceptedLogos: {
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  acceptedCardImg: {
    width: 52, height: 34, borderRadius: 4,
  },

  savedCardNotice: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: COLORS.successBg, borderRadius: 8, padding: 10, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.successGlow,
  },
  savedCardNoticeText: { fontSize: 12, color: COLORS.success, fontWeight: "600" },

  inputWithIcon: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: COLORS.inputBackground, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 14, height: 52, marginBottom: 14,
  },
  inputFocused: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow },
  inputInner: { flex: 1, color: COLORS.textPrimary, fontSize: 15, fontWeight: "600" },

  secureNotice: {
    flexDirection: "row", alignItems: "center", gap: 6,
    justifyContent: "center", marginTop: 4, marginBottom: 8,
  },
  secureNoticeText: { fontSize: 11, color: COLORS.textMuted, fontWeight: "500" },

  codBox: {
    alignItems: "center", padding: 28, backgroundColor: COLORS.inputBackground,
    borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, gap: 10,
  },
  codTitle: { fontSize: 18, fontWeight: "800", color: COLORS.textDark },
  codDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: "center", lineHeight: 20 },

  // Review step
  reviewCard: {
    backgroundColor: COLORS.inputBackground, borderRadius: 14,
    padding: 14, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  reviewCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  reviewCardTitle: { flex: 1, fontSize: 13, fontWeight: "700", color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: 0.4 },
  editLink: { fontSize: 12, color: COLORS.primary, fontWeight: "700" },
  reviewCardValue: { fontSize: 15, fontWeight: "700", color: COLORS.textDark },
  reviewCardSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  reviewItemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  reviewItemTitle: { flex: 1, fontSize: 13, color: COLORS.textDark, fontWeight: "500" },
  reviewItemMeta: { fontSize: 13, color: COLORS.textSecondary, fontWeight: "600" },
  reviewTotal: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  reviewTotalLabel: { fontSize: 14, color: COLORS.textSecondary, fontWeight: "600" },
  reviewTotalValue: { fontSize: 16, color: COLORS.textDark, fontWeight: "800" },

  // Modal footer
  modalFooter: {
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 36,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
  },
  confirmBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: COLORS.primary, paddingVertical: 17, borderRadius: 16,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  confirmBtnFinal: { backgroundColor: COLORS.success, shadowColor: COLORS.success },
  confirmText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
