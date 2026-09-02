import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useT, useTpl } from "@/i18n";
import { useAuthStore } from "@/store/auth";

export default function TabsLayout() {
  const tt = useT();
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0F766E",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: {
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
          borderTopWidth: 1,
          borderTopColor: "#E4E4E7",
          backgroundColor: "#FFFFFF",
        },
        sceneStyle: { backgroundColor: "#FAFAFA" },
        animation: "shift",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: tt("tabs.home"),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: tt("tabs.sales"),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "bag-handle" : "bag-handle-outline"} size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: tt("tabs.customers"),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: tt("tabs.products"),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "cube" : "cube-outline"} size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: tt("tabs.more"),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "ellipsis-horizontal" : "ellipsis-horizontal-outline"} size={size - 2} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}