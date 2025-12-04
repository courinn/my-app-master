import { Tabs } from 'expo-router';
import React from 'react';
import { Animated, ImageBackground, Platform, StyleSheet, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';

const TAB_HEIGHT = Platform.OS === 'ios' ? 95 : 80;   // DIBESARKAN SUPAYA ICON 36px AMAN
const TAB_PADDING_BOTTOM = Platform.OS === 'ios' ? 32 : 14;

const ACTIVE_BG = "#e0f2fe";
const ACTIVE_BORDER = "#0ea5e9";
const GLASS_BG = require('@/assets/images/icon.png');


// --------------------------------------------------
// CUSTOM TAB BUTTON
// --------------------------------------------------
const CustomTabButton = ({ children, accessibilityState, onPress }) => {
    const isFocused = accessibilityState?.selected;

    // BOUNCE ANIMATION (lebih smooth & besar)
    const scaleAnim = React.useRef(
        new Animated.Value(isFocused ? 1.15 : 1.0)
    ).current;

    React.useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: isFocused ? 1.15 : 1.0,
            useNativeDriver: true,
            tension: 140,
            friction: 7,
        }).start();
    }, [isFocused]);

    return (
        <HapticTab onPress={onPress} style={styles.buttonArea}>
            <Animated.View
                style={[
                    styles.iconWrapper,
                    { transform: [{ scale: scaleAnim }] },
                ]}
            >
                {/* Highlight */}
                {isFocused && <View style={styles.activeCircle} />}

                <View style={{ zIndex: 3 }}>
                    {children}
                </View>
            </Animated.View>
        </HapticTab>
    );
};


// --------------------------------------------------
// MAIN TAB LAYOUT
// --------------------------------------------------
export default function TabLayout() {

    const colorScheme = useColorScheme();
    const renderHiddenTab = () => <View style={{ width: 0, height: 0 }} />;

    return (
        <ImageBackground
            source={GLASS_BG}
            blurRadius={18}
            style={{ flex: 1 }}
        >
            <Tabs
                screenOptions={{
                    headerShown: false,

                    tabBarButton: (props) => <CustomTabButton {...props} />,

                    tabBarStyle: {
                        backgroundColor: "rgba(255,255,255,0.45)",
                        borderTopLeftRadius: 22,
                        borderTopRightRadius: 22,
                        height: TAB_HEIGHT,
                        paddingBottom: TAB_PADDING_BOTTOM,
                        paddingTop: 12,
                        borderTopWidth: 0,
                        elevation: 15,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: -3 },
                        shadowOpacity: 0.10,
                        shadowRadius: 12,
                    },

                    tabBarActiveTintColor: ACTIVE_BORDER,
                    tabBarInactiveTintColor: "#94a3b8",

                    tabBarLabelStyle: {
                        fontSize: 11,
                        fontWeight: "600",
                        marginTop: 2,
                    },
                }}
            >

                {/* BOTTOM TABS */}
                <Tabs.Screen
                    name="index"
                    options={{
                        title: "Beranda",
                        tabBarIcon: ({ color, focused }) => (
                            <IconSymbol
                                size={focused ? 32 : 22}
                                name={focused ? "house.fill" : "house"}
                                color={color}
                            />
                        ),
                    }}
                />

                <Tabs.Screen
                    name="explore"
                    options={{
                        title: "Explore",
                        tabBarIcon: ({ color, focused }) => (
                            <IconSymbol
                                size={focused ? 32 : 22}
                                name={focused ? "star.bubble.fill" : "star.bubble"}
                                color={color}
                            />
                        ),
                    }}
                />

                <Tabs.Screen
                    name="lokasi"
                    options={{
                        title: "Lokasi",
                        tabBarIcon: ({ color, focused }) => (
                            <IconSymbol
                                size={focused ? 32 : 22}
                                name={focused ? "gmap.fill" : "gmap"}
                                color={color}
                            />
                        ),
                    }}
                />

                <Tabs.Screen
                    name="gmap"
                    options={{
                        title: "Gmap API",
                        tabBarIcon: ({ color, focused }) => (
                            <IconSymbol
                                size={focused ? 32 : 22}
                                name={focused ? "map.fill" : "map"}
                                color={color}
                            />
                        ),
                    }}
                />

                {/* hidden */}
                <Tabs.Screen name="mahasiswa" options={{ tabBarButton: renderHiddenTab }} />
                <Tabs.Screen name="map_webview" options={{ tabBarButton: renderHiddenTab }} />

            </Tabs>
        </ImageBackground>
    );
}


// --------------------------------------------------
// STYLING
// --------------------------------------------------
const styles = StyleSheet.create({
    buttonArea: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
    },

    iconWrapper: {
        width: 75,       // DIBESARKAN SUPAYA ICON 36px TIDAK TERPOTONG
        height: 75,
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
    },

    activeCircle: {
        position: "absolute",
        width: 75,
        height: 75,
        borderRadius: 38,
        backgroundColor: ACTIVE_BG,
        borderWidth: 2,
        borderColor: ACTIVE_BORDER,
        shadowColor: ACTIVE_BORDER,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 6,
        zIndex: 1,
    },
});
