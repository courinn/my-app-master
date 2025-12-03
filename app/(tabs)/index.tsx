import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Dimensions, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../providers/AuthProvider';

const HERO = require('../../assets/images/tugu.jpg');
const { width } = Dimensions.get('window');

// Keep a small set of fallback testimonials to show when DB has none
const FALLBACK_TESTIMONIALS = [
  {
    id: '1',
    name: 'Budi Santoso',
    role: 'Wisatawan',
    comment: 'Aplikasi yang sangat membantu! Menemukan hotel di Yogyakarta jadi mudah dan cepat.',
    rating: 5,
  },
  {
    id: '2',
    name: 'Siti Rahayu',
    role: 'Travel Blogger',
    comment: 'Interface yang user-friendly dan informasi hotelnya lengkap. Recommended!',
    rating: 5,
  },
];

const FEATURES_HIGHLIGHT = [
  {
    id: '1',
    icon: '🎯',
    title: 'Pencarian Akurat',
    desc: 'Filter berdasarkan bintang, lokasi, dan harga',
  },
  {
    id: '2',
    icon: '⚡',
    title: 'Loading Cepat',
    desc: 'Optimasi performa untuk pengalaman terbaik',
  },
  {
    id: '3',
    icon: '🔒',
    title: 'Data Aman',
    desc: 'Sistem keamanan terjamin dan terpercaya',
  },
];

export default function HomeScreen() {
  const { user, role, loading, signOut } = useAuth();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [testimonials, setTestimonials] = useState<any[]>(FALLBACK_TESTIMONIALS);
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(30);
  const scaleAnim = new Animated.Value(0.95);

  // fetch recent reviews from Firebase and show them in testimonials
  useEffect(() => {
    let mounted = true;
    try {
      const { ref, onValue } = require('firebase/database');
      const { db } = require('../firebase');
      const pointsRef = ref(db, 'points/');
      const off = onValue(pointsRef, (snap: any) => {
        if (!mounted) return;
        const val = snap.val();
        if (!val) {
          setTestimonials(FALLBACK_TESTIMONIALS);
          return;
        }
        const reviews: any[] = [];
        Object.keys(val).forEach((k) => {
          const point = val[k];
          if (point && point.reviews && typeof point.reviews === 'object') {
            Object.keys(point.reviews).forEach((rk) => {
              const r = point.reviews[rk] || {};
              reviews.push({
                id: rk,
                hotelId: k,
                hotelName: point.name || '',
                name: r.userName || 'Anonim',
                role: r.userName ? 'Pengunjung' : 'Anonim',
                comment: r.comment || '',
                rating: r.rating || 0,
                createdAt: r.createdAt || null,
              });
            });
          }
        });
        // sort by createdAt desc if available
        reviews.sort((a, b) => {
          if (!a.createdAt && !b.createdAt) return 0;
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        if (reviews.length === 0) setTestimonials(FALLBACK_TESTIMONIALS);
        else setTestimonials(reviews.slice(0, 8));
      }, (err: any) => { console.error('fetch testimonials error', err); setTestimonials(FALLBACK_TESTIMONIALS); });

      return () => { mounted = false; off(); };
    } catch (err) {
      console.error('testimonials effect error', err);
      setTestimonials(FALLBACK_TESTIMONIALS);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    return () => clearInterval(timer);
  }, []);

  // Auto-scroll testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => {
        if (!testimonials || testimonials.length === 0) return 0;
        return (prev + 1) % testimonials.length;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 11) return '☀️ Selamat Pagi';
    if (hour < 15) return '🌤️ Selamat Siang';
    if (hour < 18) return '🌅 Selamat Sore';
    return '🌙 Selamat Malam';
  };

  const formatTime = () => {
    return currentTime.toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = () => {
    return currentTime.toLocaleDateString('id-ID', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading) return (
    <View style={styles.center}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Text style={styles.loadingText}>⏳ Memuat status pengguna...</Text>
      </Animated.View>
    </View>
  );

  return (
    <ThemedView style={styles.wrapper}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Hero Section with Image Background */}
        <Animated.View style={[styles.heroWrap, { opacity: fadeAnim }]}>
          <ImageBackground source={HERO} style={styles.heroImage} imageStyle={{ borderRadius: 20 }}>
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Text style={styles.greeting}>{getGreeting()}</Text>
                <View style={styles.timeCard}>
                  <Text style={styles.timeText}>{formatTime()}</Text>
                  <Text style={styles.dateText}>{formatDate()}</Text>
                </View>
              </Animated.View>
              <ThemedText type="title" style={styles.heroTitle}>Hotel Finder Yogyakarta</ThemedText>
              <Text style={styles.heroSubtitle}>
                Platform pencarian hotel terpercaya di Yogyakarta. 
                Temukan akomodasi terbaik dengan mudah, cepat, dan akurat.
              </Text>
              <View style={styles.heroBadges}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>✨ Real-time</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>🚀 Cepat</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>📱 Mudah</Text>
                </View>
              </View>
            </View>
          </ImageBackground>
        </Animated.View>

        {/* CTA Buttons */}
        <Animated.View style={[styles.ctaContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity 
            style={styles.ctaPrimary} 
            onPress={() => router.push('/(tabs)/gmap')} 
            activeOpacity={0.85}
          >
            <Text style={styles.ctaIcon}>📍</Text>
            <Text style={styles.ctaText}>Buka Peta</Text>
            <Text style={styles.ctaSubtext}>Temukan lokasi hotel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.ctaSecondary} 
            onPress={() => router.push('/(tabs)/lokasi')} 
            activeOpacity={0.85}
          >
            <Text style={styles.ctaIcon}>📋</Text>
            <Text style={styles.ctaTextSecondary}>Daftar Hotel</Text>
            <Text style={styles.ctaSubtextSecondary}>Lihat semua hotel</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Feature Highlights Carousel */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.sectionHeader}>Mengapa Pilih Kami?</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.highlightsScroll}
          >
            {FEATURES_HIGHLIGHT.map((feature) => (
              <View key={feature.id} style={styles.highlightCard}>
                <Text style={styles.highlightIcon}>{feature.icon}</Text>
                <Text style={styles.highlightTitle}>{feature.title}</Text>
                <Text style={styles.highlightDesc}>{feature.desc}</Text>
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Feature Cards */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.sectionHeader}>Fitur Unggulan</Text>
          <View style={styles.cardRow}>
            <TouchableOpacity 
              style={[styles.card, styles.cardBlue]} 
              onPress={() => router.push('/(tabs)/gmap')} 
              activeOpacity={0.9}
            >
              <View style={styles.cardIconWrap}>
                <Text style={styles.cardEmoji}>🗺️</Text>
              </View>
              <Text style={styles.cardTitle}>Peta Interaktif</Text>
              <Text style={styles.cardDesc}>
                Eksplorasi lokasi hotel dengan peta real-time, marker detail, dan navigasi langsung ke destinasi Anda.
              </Text>
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>POPULER</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.card, styles.cardPurple]} 
              onPress={() => router.push('/(tabs)/lokasi')} 
              activeOpacity={0.9}
            >
              <View style={styles.cardIconWrap}>
                <Text style={styles.cardEmoji}>🏨</Text>
              </View>
              <Text style={styles.cardTitle}>Daftar Hotel</Text>
              <Text style={styles.cardDesc}>
                Telusuri ratusan hotel berdasarkan kategori bintang, harga, dan fasilitas lengkap.
              </Text>
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>TERLENGKAP</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Stats Section with Animation */}
        <Animated.View style={[styles.statsContainer, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>500+</Text>
            <Text style={styles.statLabel}>Hotel</Text>
            <Text style={styles.statSubLabel}>Tersedia</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>50+</Text>
            <Text style={styles.statLabel}>Lokasi</Text>
            <Text style={styles.statSubLabel}>Di Yogyakarta</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>100%</Text>
            <Text style={styles.statLabel}>Akurat</Text>
            <Text style={styles.statSubLabel}>Data Real-time</Text>
          </View>
        </Animated.View>

        {/* Testimonials Section - Using ScrollView Instead */}
        <View style={styles.testimonialsSection}>
          <Text style={styles.sectionHeader}>Apa Kata Mereka?</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            snapToInterval={width * 0.9 + 16}
            decelerationRate="fast"
            contentContainerStyle={styles.testimonialsList}
          >
            {testimonials.map((item, index) => (
                <View 
                  key={item.id + (item.hotelId || '')}
                  style={[
                    styles.testimonialCard,
                    { opacity: activeTestimonial === index ? 1 : 0.85 }
                  ]}
                >
                  <View style={styles.testimonialHeader}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{String(item.name || item.hotelName || 'U').charAt(0)}</Text>
                    </View>
                    <View style={styles.testimonialInfo}>
                      <Text style={styles.testimonialName}>{item.name}</Text>
                      <Text style={styles.testimonialRole}>{item.hotelName ? item.hotelName : item.role}</Text>
                    </View>
                    <View style={styles.ratingContainer}>
                      {[...Array(Math.max(0, Number(item.rating || 0)))].map((_, i) => (
                        <Text key={i} style={styles.star}>⭐</Text>
                      ))}
                    </View>
                  </View>
                  <Text style={styles.testimonialComment}>"{item.comment}"</Text>
                </View>
              ))}
          </ScrollView>
          <View style={styles.paginationDots}>
            {testimonials.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  activeTestimonial === index && styles.activeDot,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Admin/Public Section */}
        {role === 'admin' ? (
          <Animated.View style={[styles.adminSection, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.adminHeader}>
              <Text style={styles.adminBadge}>👤 ADMIN</Text>
            </View>
            <Text style={styles.sectionTitle}>Panel Kontrol Admin</Text>
            <Text style={styles.sectionSub}>
              Selamat datang, Admin! Kelola data hotel, tambahkan lokasi baru, dan monitor sistem dengan mudah.
            </Text>
            <View style={styles.adminActions}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.manageBtn]} 
                onPress={() => router.push('/lokasi')}
              >
                <Text style={styles.actionIcon}>⚙️</Text>
                <Text style={styles.actionText}>Kelola Hotel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.logoutBtn]} 
                onPress={() => signOut()}
              >
                <Text style={styles.actionIcon}>🚪</Text>
                <Text style={styles.actionText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : (
          <View style={styles.publicSection}>
            <View style={styles.publicIconWrap}>
              <Text style={styles.publicIcon}>🌟</Text>
            </View>
            <Text style={styles.sectionTitle}>Jelajahi Tanpa Batas</Text>
            <Text style={styles.sectionSub}>
              Nikmati akses penuh ke daftar hotel dan peta interaktif tanpa perlu login. 
              Untuk fitur manajemen, silakan login sebagai admin.
            </Text>
            <View style={styles.publicActions}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.loginBtn]} 
                onPress={() => router.push('/login')}
              >
                <Text style={styles.actionIcon}>🔐</Text>
                <Text style={styles.actionText}>Masuk sebagai Admin</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Info Box with Enhanced Design */}
        <View style={styles.infoBox}>
          <View style={styles.infoHeader}>
            <Text style={styles.infoTitle}>💡 Tentang Aplikasi</Text>
            <View style={styles.infoBadge}>
              <Text style={styles.infoBadgeText}>v2.0</Text>
            </View>
          </View>
          <Text style={styles.infoText}>
            Hotel Finder adalah solusi modern untuk menemukan akomodasi di Yogyakarta. 
            Aplikasi ini dirancang dengan teknologi terkini untuk memberikan pengalaman pencarian 
            hotel yang cepat, akurat, dan user-friendly. Dengan fitur peta interaktif dan 
            database yang selalu terupdate, kami memastikan Anda menemukan hotel terbaik sesuai kebutuhan.
          </Text>
          <View style={styles.infoFeatures}>
            <View style={styles.infoFeatureItem}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.infoFeature}>Pencarian berdasarkan bintang</Text>
            </View>
            <View style={styles.infoFeatureItem}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.infoFeature}>Lokasi real-time di peta</Text>
            </View>
            <View style={styles.infoFeatureItem}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.infoFeature}>Informasi lengkap & akurat</Text>
            </View>
            <View style={styles.infoFeatureItem}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.infoFeature}>Interface modern & responsif</Text>
            </View>
          </View>
        </View>

        {/* Footer with Gradient */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Hotel Finder © 2025</Text>
          <Text style={styles.footerSubtext}>Dibuat dengan 💙 untuk Yogyakarta</Text>
          <Text style={styles.footerVersion}>Version 2.0.0</Text>
        </View>

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f8fafc' },
  container: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { fontSize: 18, color: '#64748b', fontWeight: '600' },

  // Hero Section
  heroWrap: { 
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  heroImage: { 
    width: '100%', 
    height: 440,
    justifyContent: 'flex-end',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.50)',
    borderRadius: 20,
  },
  heroContent: { 
    padding: 24,
    paddingBottom: 32,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  timeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  timeText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dateText: {
    fontSize: 14,
    color: '#e2e8f0',
    marginTop: 4,
    fontWeight: '600',
  },
  heroTitle: { 
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  heroSubtitle: { 
    fontSize: 15,
    color: '#e2e8f0',
    lineHeight: 23,
    marginBottom: 18,
  },
  heroBadges: {
    flexDirection: 'row',
    gap: 10,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // CTA Buttons
  ctaContainer: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  ctaPrimary: {
    flex: 1,
    backgroundColor: '#0284c7',
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  ctaSecondary: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#0284c7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  ctaIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  ctaText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 3,
  },
  ctaSubtext: {
    color: '#bae6fd',
    fontSize: 12,
    fontWeight: '600',
  },
  ctaTextSecondary: {
    color: '#0284c7',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 3,
  },
  ctaSubtextSecondary: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },

  // Highlights Carousel
  highlightsScroll: {
    paddingHorizontal: 20,
    gap: 14,
    marginBottom: 28,
  },
  highlightCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    width: width * 0.65,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#0284c7',
  },
  highlightIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 6,
  },
  highlightDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
  },

  // Section Header
  sectionHeader: {
    fontSize: 23,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 18,
    paddingHorizontal: 20,
  },

  // Feature Cards
  cardRow: { 
    flexDirection: 'row', 
    gap: 14,
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  card: { 
    flex: 1,
    padding: 22,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    position: 'relative',
  },
  cardBlue: {
    backgroundColor: '#fff',
    borderLeftWidth: 5,
    borderLeftColor: '#0284c7',
  },
  cardPurple: {
    backgroundColor: '#fff',
    borderLeftWidth: 5,
    borderLeftColor: '#7c3aed',
  },
  cardIconWrap: {
    width: 56,
    height: 56,
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardEmoji: {
    fontSize: 28,
  },
  cardTitle: { 
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
    color: '#1e293b',
  },
  cardDesc: { 
    color: '#64748b',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#fbbf24',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#78350f',
    letterSpacing: 0.5,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 28,
    padding: 24,
    borderRadius: 18,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0284c7',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '700',
    marginBottom: 2,
  },
  statSubLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 12,
  },

  // Testimonials
  testimonialsSection: {
    marginBottom: 28,
  },
  testimonialsList: {
    paddingHorizontal: (width - width * 0.9) / 2,
    gap: 16,
  },
  testimonialCard: {
    width: width * 0.9,
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  testimonialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  testimonialInfo: {
    flex: 1,
  },
  testimonialName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 2,
  },
  testimonialRole: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 14,
  },
  testimonialComment: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
  },
  activeDot: {
    backgroundColor: '#0284c7',
    width: 24,
  },

  // Admin Section
  adminSection: { 
    backgroundColor: '#fff',
    marginHorizontal: 20,
    padding: 22,
    borderRadius: 18,
    marginBottom: 24,
    borderWidth: 2.5,
    borderColor: '#0284c7',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  adminHeader: {
    marginBottom: 14,
  },
  adminBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#0284c7',
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
  },
  sectionTitle: { 
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
    color: '#1e293b',
  },
  sectionSub: { 
    color: '#64748b',
    marginBottom: 18,
    lineHeight: 21,
    fontSize: 14,
  },
  adminActions: { 
    flexDirection: 'row',
    gap: 12,
  },

  // Public Section
  publicSection: { 
    backgroundColor: '#fff',
    marginHorizontal: 20,
    padding: 22,
    borderRadius: 18,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    alignItems: 'center',
  },
  publicIconWrap: {
    width: 70,
    height: 70,
    backgroundColor: '#fef3c7',
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  publicIcon: {
    fontSize: 36,
  },
  publicActions: {
    flexDirection: 'row',
    width: '100%',
  },

  // Action Buttons
  actionBtn: { 
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  manageBtn: { 
    backgroundColor: '#0284c7',
  },
  logoutBtn: { 
    backgroundColor: '#dc2626',
  },
  loginBtn: { 
    backgroundColor: '#0284c7',
  },
  actionIcon: {
    fontSize: 20,
  },
  actionText: { 
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },

  // Info Box
  infoBox: { 
    marginHorizontal: 20,
    backgroundColor: '#f1f5f9',
    padding: 22,
    borderRadius: 18,
    borderLeftWidth: 5,
    borderLeftColor: '#0284c7',
    marginBottom: 24,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: { 
    fontWeight: '800',
    fontSize: 18,
    color: '#1e293b',
  },
  infoBadge: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  infoBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  infoText: { 
    color: '#475569',
    lineHeight: 23,
    fontSize: 14,
    marginBottom: 16,
  },
  infoFeatures: {
    gap: 10,
  },
  infoFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkIcon: {
    fontSize: 16,
    color: '#0284c7',
    fontWeight: '900',
  },
  infoFeature: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 12,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  footerText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 6,
  },
  footerSubtext: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 4,
  },
  footerVersion: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '600',
  },
});