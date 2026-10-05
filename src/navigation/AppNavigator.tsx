import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, BackHandler } from 'react-native';

import { HomeScreen } from '../screens/HomeScreen';
import { CaseDetailScreen } from '../screens/CaseDetailScreen';
import { VoiceScreen } from '../screens/VoiceScreen';
import { DocumentsScreen } from '../screens/DocumentsScreen';
import { RecoveryScreen } from '../screens/RecoveryScreen';
import { DoctorScreen } from '../screens/DoctorScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ModelManagerScreen } from '../screens/ModelManagerScreen';
import { DebugScreen } from '../screens/DebugScreen';
import { StorageScreen } from '../screens/StorageScreen';
import { DocumentVaultScreen } from '../screens/DocumentVaultScreen';

export type ScreenType =
  | 'Home'
  | 'CaseDetail'
  | 'Voice'
  | 'Documents'
  | 'Vault'
  | 'Recovery'
  | 'Doctor'
  | 'Chat'
  | 'Settings'
  | 'Models'
  | 'Storage'
  | 'Debug';

interface NavigationState {
  screen: ScreenType;
  params?: any;
}

export const AppNavigator = () => {
  const [navState, setNavState] = useState<NavigationState>({ screen: 'Home' });
  const [stack, setStack] = useState<NavigationState[]>([{ screen: 'Home' }]);

  const navigate = (screen: ScreenType, params?: any) => {
    const newState = { screen, params };
    setStack((prev) => [...prev, newState]);
    setNavState(newState);
  };

  const goBack = useCallback(() => {
    setStack((prevStack) => {
      if (prevStack.length > 1) {
        const newStack = [...prevStack];
        newStack.pop();
        const prev = newStack[newStack.length - 1];
        setNavState(prev);
        return newStack;
      }
      if (navState.screen !== 'Home') {
        const homeState: NavigationState = { screen: 'Home' };
        setNavState(homeState);
        return [homeState];
      }
      return prevStack;
    });
  }, [navState.screen]);

  useEffect(() => {
    const onHardwareBack = () => {
      if (stack.length > 1 || navState.screen !== 'Home') {
        goBack();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => subscription.remove();
  }, [stack.length, navState.screen, goBack]);

  const switchTab = (tab: ScreenType) => {
    const newState = { screen: tab };
    setStack([newState]);
    setNavState(newState);
  };

  const navigation = {
    navigate,
    goBack,
  };

  const currentScreen = navState.screen;

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Home':
        return <HomeScreen navigation={navigation} />;
      case 'CaseDetail':
        return (
          <CaseDetailScreen
            navigation={navigation}
            caseId={navState.params?.caseId || ''}
          />
        );
      case 'Voice':
        return <VoiceScreen navigation={navigation} />;
      case 'Documents':
        return <DocumentsScreen navigation={navigation} params={navState.params} />;
      case 'Vault':
        return <DocumentVaultScreen navigation={navigation} />;
      case 'Recovery':
        return <RecoveryScreen navigation={navigation} />;
      case 'Doctor':
        return <DoctorScreen navigation={navigation} />;
      case 'Chat':
        return <ChatScreen navigation={navigation} />;
      case 'Settings':
        return <SettingsScreen navigation={navigation} />;
      case 'Models':
        return <ModelManagerScreen navigation={navigation} />;
      case 'Storage':
        return <StorageScreen navigation={navigation} />;
      case 'Debug':
        return <DebugScreen navigation={navigation} />;
      default:
        return <HomeScreen navigation={navigation} />;
    }
  };

  const isModalOrSubscreen =
    currentScreen === 'CaseDetail' ||
    currentScreen === 'Chat' ||
    currentScreen === 'Settings' ||
    currentScreen === 'Models' ||
    currentScreen === 'Storage' ||
    currentScreen === 'Vault' ||
    currentScreen === 'Debug';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Main Content View */}
      <View style={styles.content}>{renderScreen()}</View>

      {/* Bottom Tab Bar (shown on primary views) */}
      {!isModalOrSubscreen && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, currentScreen === 'Home' && styles.tabItemActive]}
            onPress={() => switchTab('Home')}
          >
            <Text style={styles.tabIcon}>📂</Text>
            <Text style={[styles.tabLabel, currentScreen === 'Home' && styles.tabLabelActive]}>
              Cases
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, currentScreen === 'Documents' && styles.tabItemActive]}
            onPress={() => switchTab('Documents')}
          >
            <Text style={styles.tabIcon}>📷</Text>
            <Text
              style={[styles.tabLabel, currentScreen === 'Documents' && styles.tabLabelActive]}
            >
              Docs & OCR
            </Text>
          </TouchableOpacity>

          {/* Hero Spoken Voice Agent Button */}
          <TouchableOpacity
            style={[styles.heroVoiceTabItem, currentScreen === 'Voice' && styles.heroVoiceTabActive]}
            onPress={() => switchTab('Voice')}
          >
            <View style={styles.heroVoiceCircle}>
              <Text style={styles.heroVoiceIcon}>🎙️</Text>
            </View>
            <Text
              style={[styles.heroVoiceLabel, currentScreen === 'Voice' && styles.heroVoiceLabelActive]}
            >
              Voice
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, currentScreen === 'Recovery' && styles.tabItemActive]}
            onPress={() => switchTab('Recovery')}
          >
            <Text style={styles.tabIcon}>📈</Text>
            <Text
              style={[styles.tabLabel, currentScreen === 'Recovery' && styles.tabLabelActive]}
            >
              Recovery
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, currentScreen === 'Doctor' && styles.tabItemActive]}
            onPress={() => switchTab('Doctor')}
          >
            <Text style={styles.tabIcon}>🩺</Text>
            <Text style={[styles.tabLabel, currentScreen === 'Doctor' && styles.tabLabelActive]}>
              Doctor
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  content: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  tabBar: {
    height: 68,
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingBottom: 4,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  tabItemActive: {
    opacity: 1,
  },
  tabIcon: {
    fontSize: 17,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  heroVoiceTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -14,
  },
  heroVoiceTabActive: {},
  heroVoiceCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    borderWidth: 2,
    borderColor: '#38BDF8',
  },
  heroVoiceIcon: {
    fontSize: 20,
  },
  heroVoiceLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
    marginTop: 2,
  },
  heroVoiceLabelActive: {
    color: '#38BDF8',
  },
});
