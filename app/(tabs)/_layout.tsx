import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
    const colorScheme = useColorScheme();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
                headerShown: false,
                tabBarButton: HapticTab,
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Beranda',
                    tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
                }}
            />
            <Tabs.Screen
                name="explore"
                options={{
                    title: 'Explore',
                    tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
                }}
            />

            {/* TAB INI DISEMBUNYIKAN */}
            <Tabs.Screen
                name="mahasiswa"
                options={{
                    title: 'Mahasiswa',
                    tabBarIcon: ({ color }) => <IconSymbol size={28} name="usergraduate.fill" color={color} />,
                    // === COMMAND UNTUK MENYEMBUNYIKAN TAB BAR ===
                    href: null,
                    // ===========================================
                }}
            />

            {/* TAB INI DISEMBUNYIKAN */}
            <Tabs.Screen
                name="map_webview"
                options={{
                    title: 'Leaflet Map',
                    tabBarIcon: ({ color }) => <IconSymbol
                        size={28}
                        name="map.fill"
                        color={color}
                    />,
                    // === COMMAND UNTUK MENYEMBUNYIKAN TAB BAR ===
                    href: null,
                    // ===========================================
                }}
            />
            
            <Tabs.Screen
                name="gmap"
                options={{
                    title: 'Gmap API',
                    tabBarIcon: ({ color }) => <IconSymbol
                        size={28}
                        name="gmap.fill"
                        color={color}
                    />,
                }}
            />
        </Tabs>
    );
}