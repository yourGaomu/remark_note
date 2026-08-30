import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddTransactionScreen } from '../../features/transactions/AddTransactionScreen';
import { AccountsScreen } from '../../features/accounts/AccountsScreen';
import { DashboardScreen } from '../../features/dashboard/DashboardScreen';
import { SettingsScreen } from '../../features/settings/SettingsScreen';
import { StatisticsScreen } from '../../features/statistics/StatisticsScreen';
import { TransactionsScreen } from '../../features/transactions/TransactionsScreen';
import { CategoriesScreen } from '../../features/categories/CategoriesScreen';
import { TagsScreen } from '../../features/tags/TagsScreen';
import { colors } from '../../shared/theme/colors';
import type { MainTabParamList, RootStackParamList } from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const MainTabs = createBottomTabNavigator<MainTabParamList>();

const tabIcons: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Dashboard: 'home-outline',
  Transactions: 'list-outline',
  Statistics: 'pie-chart-outline',
  Accounts: 'wallet-outline',
  Settings: 'person-outline',
};

function MainTabNavigator({ navigation }: NativeStackScreenProps<RootStackParamList, 'Main'>) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 66 + insets.bottom;

  return (
    <View style={styles.container}>
      <MainTabs.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600', paddingBottom: 2 },
          tabBarStyle: {
            height: tabBarHeight,
            paddingTop: 7,
            paddingBottom: insets.bottom,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
          },
          tabBarIcon: ({ color, size }) => <Ionicons name={tabIcons[route.name]} color={color} size={size} />,
        })}
      >
        <MainTabs.Screen name="Dashboard" component={DashboardScreen} options={{ title: '概览' }} />
        <MainTabs.Screen name="Transactions" component={TransactionsScreen} options={{ title: '交易' }} />
        <MainTabs.Screen name="Statistics" component={StatisticsScreen} options={{ title: '统计' }} />
        <MainTabs.Screen name="Accounts" component={AccountsScreen} options={{ title: '账户' }} />
        <MainTabs.Screen name="Settings" component={SettingsScreen} options={{ title: '设置' }} />
      </MainTabs.Navigator>
      <Pressable
        accessibilityLabel="新增交易"
        accessibilityRole="button"
        style={({ pressed }) => [styles.addButton, { bottom: tabBarHeight + 12 }, pressed && { opacity: 0.78 }]}
        onPress={() => navigation.navigate('AddTransaction')}
      >
        <Ionicons name="add" color="#FFFFFF" size={30} />
      </Pressable>
    </View>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <RootStack.Screen name="Main" component={MainTabNavigator} />
        <RootStack.Screen name="AddTransaction" component={AddTransactionScreen} options={{ presentation: 'modal' }} />
        <RootStack.Screen name="Categories" component={CategoriesScreen} options={{ presentation: 'modal' }} />
        <RootStack.Screen name="Tags" component={TagsScreen} options={{ presentation: 'modal' }} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  addButton: {
    position: 'absolute',
    right: 18,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 9,
    elevation: 7,
  },
});
