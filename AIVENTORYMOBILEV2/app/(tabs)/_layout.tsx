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
        tabBarActiveTintColor: '#6c63ff',
        tabBarInactiveTintColor: '#2E3A8C',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#eee',
          paddingBottom: 4,
          paddingTop: 4,
          height: 68,
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name="square.grid.2x2.fill" color={focused ? '#6c63ff' : '#2E3A8C'} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name="shippingbox.fill" color={focused ? '#6c63ff' : '#2E3A8C'} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={30} name="qrcode.viewfinder" color={focused ? '#6c63ff' : '#2E3A8C'} />
          ),
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Invoices',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name="doc.text.fill" color={focused ? '#6c63ff' : '#2E3A8C'} />
          ),
        }}
      />
      <Tabs.Screen
        name="suppliers"
        options={{
          title: 'Suppliers',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name="person.2.fill" color={focused ? '#6c63ff' : '#2E3A8C'} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name="gearshape.fill" color={focused ? '#6c63ff' : '#2E3A8C'} />
          ),
        }}
      />
      {/* Hidden screens - these won't appear in the tab bar but can still be navigated to programmatically */}
      <Tabs.Screen
        name="analysis"
        options={{
          href: null, // This hides the tab from the tab bar
        }}
      />
      <Tabs.Screen
        name="prediction"
        options={{
          href: null, // This hides the tab from the tab bar
        }}
      />
    </Tabs>
  );
}