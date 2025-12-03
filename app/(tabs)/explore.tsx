import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { onValue, ref } from 'firebase/database';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View, ImageBackground, ScrollView, Dimensions } from 'react-native';
import { db } from '../firebase';

// Pastikan path ini benar untuk gambar Tugu Anda
const HERO = require('../../assets/images/tugu.jpg');
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// MODIFIKASI: Menyesuaikan CARD_WIDTH agar memenuhi lebar layar penuh
const CAROUSEL_HORIZONTAL_PADDING = 16; // Padding horizontal yang sama dengan contentWrapper
const CARD_SPACING = 16; // Jarak antar kartu di dalam carousel

// CARD_WIDTH = Lebar layar dikurangi padding kiri/kanan.
const CARD_WIDTH = SCREEN_WIDTH - (CAROUSEL_HORIZONTAL_PADDING * 2);
const SNAP_WIDTH = CARD_WIDTH + CARD_SPACING; // Jarak snap: Card Width + Spacing

export default function TabTwoScreen() {
  const router = useRouter();
  const [hotels, setHotels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [featuredIndex, setFeaturedIndex] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const fabScale = useRef(new Animated.Value(0)).current;

  const cardAnims = useRef<Animated.Value[]>([]).current;

  const scrollViewRef = useRef<ScrollView>(null);
  const mainScrollViewRef = useRef<ScrollView>(null);

  // Efek Samping untuk memuat data dari Firebase
  useEffect(() => {
    const pointsRef = ref(db, 'points/');
    const off = onValue(
      pointsRef,
      (snap) => {
        const val = snap.val();
        if (!val) {
          setHotels([]);
          setLoading(false);
          return;
        }
        const arr = Object.keys(val).map((k) => ({ id: k, ...val[k] }));
        setHotels(arr);
        setLoading(false);

        cardAnims.length = arr.length;
        for (let i = 0; i < arr.length; i++) {
          if (!cardAnims[i]) {
            cardAnims[i] = new Animated.Value(0);
          }
        }

        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
        ]).start();

        arr.forEach((_, index) => {
          Animated.spring(cardAnims[index], {
            toValue: 1,
            tension: 60,
            friction: 8,
            delay: index * 80 + 200,
            useNativeDriver: true,
          }).start();
        });
      },
      (err) => {
        console.error('explore onValue', err);
        setLoading(false);
      }
    );
    return () => off();
  }, []);

  // Efek Samping untuk animasi FAB
  useEffect(() => {
    Animated.spring(fabScale, {
      toValue: 1,
      tension: 50,
      friction: 5,
      delay: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  // Auto scroll featured carousel
  useEffect(() => {
    if (hotels.length < 3) return;

    const interval = setInterval(() => {
      setFeaturedIndex((prev) => {
        const next = (prev + 1) % 3;
        scrollViewRef.current?.scrollTo({
          x: next * SNAP_WIDTH,
          animated: true,
        });
        return next;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [hotels.length]);

  const featuredHotels = hotels.slice(0, 3);
  const regularHotels = hotels.slice(3);
  const totalHotels = hotels.length;


  // Variabel untuk konten utama (di bawah Hero)
  const MainContent = (
    <Animated.View
      style={[
        styles.contentWrapper,
        {
          opacity: fadeAnim,
          transform: [{
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [15, 0]
            })
          }]
        },
      ]}
    >
      {/* Featured Hotels Carousel */}
      {featuredHotels.length > 0 && (
        <View style={styles.featuredSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleWrapper}>
              <IconSymbol size={20} color="#f59e0b" name="star.fill" />
              <Text style={styles.sectionTitle}>Hotel Pilihan</Text>
            </View>
            <View style={styles.carouselDots}>
              {featuredHotels.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === featuredIndex && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          </View>

          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={SNAP_WIDTH}
            contentContainerStyle={styles.carouselContent}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(event) => {
              const contentOffsetX = event.nativeEvent.contentOffset.x;
              const newIndex = Math.round(contentOffsetX / SNAP_WIDTH);
              setFeaturedIndex(newIndex);
            }}
          >
            {featuredHotels.map((item, index) => (
              <Animated.View
                key={item.id}
                style={[
                  styles.featuredCard,
                  {
                    opacity: cardAnims[index] || 1,
                    transform: [
                      {
                        translateY: (cardAnims[index] || new Animated.Value(1)).interpolate({
                          inputRange: [0, 1],
                          outputRange: [30, 0],
                        }),
                      },
                    ],
                    marginLeft: index === 0 ? 0 : 0,
                    marginRight: index < featuredHotels.length - 1 ? CARD_SPACING : 0,
                    width: CARD_WIDTH,
                  }
                ]}
              >
                <View style={styles.featuredCardInner}>
                  {/* Icon & Info */}
                  <View style={styles.featuredTop}>
                    <View style={styles.featuredIconContainer}>
                      <Text style={styles.featuredHotelIcon}>🏨</Text>
                      <View style={styles.featuredBadge}>
                        <IconSymbol size={10} color="#fff" name="sparkles" />
                      </View>
                    </View>

                    <View style={styles.featuredInfo}>
                      <Text style={styles.featuredTitle} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <View style={styles.featuredLocation}>
                        <IconSymbol size={12} color="#f97316" name="mappin.circle.fill" />
                        <Text style={styles.featuredAddress} numberOfLines={1}>
                          {item.alamat || 'Lokasi tidak tersedia'}
                        </Text>
                      </View>
                      {item.bintang && (
                        <View style={styles.featuredRating}>
                          {[...Array(item.bintang)].map((_, i) => (
                            <IconSymbol key={i} size={12} color="#fbbf24" name="star.fill" />
                          ))}
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Review Button */}
                  <TouchableOpacity
                    style={styles.featuredReviewBtn}
                    onPress={() =>
                      router.push(
                        `/forminputulasan?id=${item.id}&name=${encodeURIComponent(item.name)}`
                      )
                    }
                    activeOpacity={0.8}
                  >
                    <IconSymbol size={18} color="#fff" name="square.and.pencil" />
                    <Text style={styles.featuredReviewText}>Tulis Ulasan</Text>
                    <IconSymbol size={14} color="#fff" name="chevron.right" />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Regular Hotels List */}
      {regularHotels.length > 0 && (
        <View style={styles.regularSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleWrapper}>
              <IconSymbol size={18} color="#0ea5e9" name="list.bullet" />
              <Text style={styles.sectionTitle}>Semua Hotel</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{regularHotels.length}</Text>
            </View>
          </View>

          {regularHotels.map((item, index) => (
            <Animated.View
              key={item.id}
              style={[
                {
                  opacity: cardAnims[index + 3] || 1,
                  transform: [
                    {
                      translateY: (cardAnims[index + 3] || new Animated.Value(1)).interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    },
                  ],
                }]}
            >
              <View style={styles.regularCard}>
                {/* Left: Icon */}
                <View style={styles.regularIconSection}>
                  <View style={styles.regularIconContainer}>
                    <Text style={styles.regularHotelIcon}>🏨</Text>
                  </View>
                  {item.bintang && (
                    <View style={styles.regularRatingBadge}>
                      <IconSymbol size={9} color="#fbbf24" name="star.fill" />
                      <Text style={styles.regularRatingText}>{item.bintang}</Text>
                    </View>
                  )}
                </View>

                {/* Middle: Info */}
                <View style={styles.regularContent}>
                  <Text style={styles.regularTitle} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <View style={styles.regularLocation}>
                    <IconSymbol size={11} color="#f97316" name="mappin" />
                    <Text style={styles.regularAddress} numberOfLines={2}>
                      {item.alamat || 'Alamat tidak tersedia'}
                    </Text>
                  </View>
                </View>

                {/* Right: Review Button */}
                <TouchableOpacity
                  style={styles.regularReviewBtn}
                  onPress={() =>
                    router.push(
                      `/forminputulasan?id=${item.id}&name=${encodeURIComponent(item.name)}`
                    )
                  }
                  activeOpacity={0.75}
                >
                  {/* Ikon Review */}
                  <View style={styles.regularReviewInner}>
                    <IconSymbol size={20} color="#fff" name="square.and.pencil" />
                    <Text style={styles.regularReviewText}>Review</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </Animated.View>
          ))}
        </View>
      )}

      <View style={styles.bottomSpacing} />
    </Animated.View>
  );

  return (
    <ThemedView style={styles.wrapper}>
      <ScrollView
        ref={mainScrollViewRef}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section dengan Image Background */}
        <Animated.View style={[styles.heroWrap, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <ImageBackground
            source={HERO}
            style={styles.heroImage}
            imageStyle={{ borderRadius: 20 }}
          >
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <View style={styles.iconWrapper}>
                <IconSymbol
                  size={64}
                  color="#fff"
                  name="building.2.crop.circle.fill"
                  style={styles.headerIcon}
                />
              </View>
              <Text style={styles.heroTitle}>Jelajahi Hotel</Text>
              <Text style={styles.heroSubtitle}>Platform Ulasan Hotel Terbaik di Yogyakarta. Temukan dan ulas hotel favorit Anda!</Text>
              <View style={styles.heroBadges}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>✨ Ulasan</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>📍 Lokasi</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>🚀 Cepat</Text>
                </View>
              </View>
            </View>
          </ImageBackground>
        </Animated.View>

        {/* Header Section BARU (Pemisahan Visual & Fix Kotak Hitam) */}
        <View style={styles.titleContainerModified}>
          <View style={styles.headerContent}>
            <View style={styles.titleWrapper}>
              <View style={styles.titleRow}>
                <View style={styles.iconBadgeModified}>
                  <IconSymbol size={22} color="#0ea5e9" name="star.circle.fill" />
                </View>
                <View>
                  <ThemedText
                    type="title"
                    style={{
                      fontFamily: Fonts.rounded,
                      fontSize: 24,
                      fontWeight: '900',
                      color: '#0ea5e9', // JUDUL BERWARNA BIRU
                      letterSpacing: -0.3,
                    }}
                  >
                    Daftar Hotel
                  </ThemedText>
                  <Text style={styles.subtitleInline}>
                    Temukan hotel terbaik untuk Anda
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.statsContainer}>
              <View style={styles.statsInner}>
                {/* IKON TOTAL: Mungkin tidak muncul karena warna ikon putih di atas latar belakang biru tua yang ukurannya kecil. */}
                <IconSymbol size={16} color="#fff" name="building.2.fill" />
                <Text style={styles.statsNumber}>{totalHotels}</Text>
                <Text style={styles.statsLabel}>TOTAL</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Conditional Rendering untuk Loading/Empty/Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#0ea5e9" />
              <Text style={styles.loadingText}>Memuat data hotel...</Text>
            </View>
          </View>
        ) : hotels.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrapper}>
                <IconSymbol size={60} color="#94a3b8" name="building.2.slash" />
              </View>
              <Text style={styles.emptyTitle}>Belum Ada Hotel</Text>
              <Text style={styles.emptyText}>
                Tambahkan hotel pertama dan mulai berbagi ulasan dengan menekan tombol '+' di bawah.
              </Text>
              <View style={styles.emptyActions}>
                <Text style={styles.emptyActionText}>👇 Tap tombol + di bawah</Text>
              </View>
            </View>
          </View>
        ) : (
          MainContent
        )}

      </ScrollView>

      {/* FAB Button */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            transform: [{ scale: fabScale }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/forminput')}
          activeOpacity={0.85}
        >
          <View style={styles.fabInner}>
            <IconSymbol size={24} color="#ffffff" name="plus.circle.fill" />
            <Text style={styles.fabText}>Tambah Hotel</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // --- GAYA UMUM ---
  wrapper: { flex: 1, backgroundColor: '#f8fafc' },
  container: { paddingBottom: 40 },

  // --- HERO SECTION ---
  heroWrap: {
    marginBottom: 20,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  heroImage: {
    width: '100%',
    height: 300,
    justifyContent: 'flex-end',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 20,
  },
  heroContent: {
    padding: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  iconWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 16,
  },
  headerIcon: {
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.3,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#e2e8f0',
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  heroBadges: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // --- MODIFIKASI HEADER CONTENT (Pemisahan Visual) ---
  titleContainerModified: {
    marginBottom: 20,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    paddingBottom: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleWrapper: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadgeModified: {
    backgroundColor: '#dbeafe',
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#93c5fd',
  },
  subtitleInline: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },

  statsContainer: {
    backgroundColor: '#0ea5e9',
    padding: 2,
    borderRadius: 14,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  statsInner: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    gap: 3,
    minWidth: 70,
  },
  statsNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  statsLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    marginTop: 0, // Mengubah marginTop menjadi 0 atau kecil
  },

  // --- LOADING/EMPTY STATE ---
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    backgroundColor: '#f8fafc',
    flex: 1,
  },
  loadingCard: {
    backgroundColor: '#ffffff',
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#475569',
    fontWeight: '700',
  },

  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#f8fafc',
    flex: 1,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    padding: 36,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  emptyIconWrapper: {
    backgroundColor: '#f1f5f9',
    padding: 20,
    borderRadius: 100,
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 18,
  },
  emptyActions: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  emptyActionText: {
    fontSize: 13,
    color: '#0369a1',
    fontWeight: '700',
  },

  contentWrapper: {
    paddingHorizontal: 0,
  },

  // --- FEATURED SECTION (CAROUSEL) ---
  featuredSection: {
    marginBottom: 28,
    paddingHorizontal: CAROUSEL_HORIZONTAL_PADDING,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  sectionTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  carouselDots: {
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
  },
  dotActive: {
    backgroundColor: '#f59e0b',
    width: 20,
  },

  carouselContent: {
    paddingHorizontal: 0,
  },
  featuredCard: {
    width: CARD_WIDTH,
    marginRight: CARD_SPACING,
  },
  featuredCardInner: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  featuredTop: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  featuredIconContainer: {
    position: 'relative',
  },
  featuredHotelIcon: {
    fontSize: 52,
    width: 64,
    height: 64,
    textAlign: 'center',
    lineHeight: 64,
    backgroundColor: '#dbeafe',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#93c5fd',
    overflow: 'hidden',
  },
  featuredBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#f59e0b',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  featuredInfo: {
    flex: 1,
    gap: 6,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  featuredLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  featuredAddress: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    flex: 1,
  },
  featuredRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  featuredReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0ea5e9',
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    borderWidth: 2,
    borderColor: '#38bdf8',
  },
  featuredReviewText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  // --- REGULAR SECTION ---
  regularSection: {
    marginBottom: 28,
    paddingHorizontal: 16,
  },
  countBadge: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  regularCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
    alignItems: 'center',
  },
  regularIconSection: {
    alignItems: 'center',
    gap: 5,
  },
  regularIconContainer: {
    width: 52,
    height: 52,
    backgroundColor: '#dbeafe',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#93c5fd',
  },
  regularHotelIcon: {
    fontSize: 26,
  },
  regularRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 2,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  regularRatingText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#92400e',
  },
  regularContent: {
    flex: 1,
    gap: 5,
    justifyContent: 'center',
  },
  regularTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  regularLocation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  regularAddress: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
  },
  regularReviewBtn: {
    justifyContent: 'center',
  },
  regularReviewInner: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
    minWidth: 72,
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    borderWidth: 2,
    borderColor: '#38bdf8',
    flexDirection: 'row', // MEMASTIKAN IKON MUNCUL: Harus diatur sebagai baris
  },
  regularReviewText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 0.3,
  },

  // --- FAB ---
  fabContainer: {
    position: 'absolute',
    right: 18,
    bottom: 18,
  },
  fab: {
    shadowColor: '#0284c7',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  fabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    backgroundColor: '#0284c7',
    borderRadius: 50,
    gap: 8,
    borderWidth: 2,
    borderColor: '#38bdf8',
  },
  fabText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.3,
  },

  bottomSpacing: {
    height: 100,
  },
});