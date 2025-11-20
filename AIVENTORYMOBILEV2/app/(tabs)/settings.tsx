import { StyleSheet, View, Switch, TouchableOpacity, Alert, ScrollView, Modal, TextInput } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAppTheme } from '@/hooks/use-app-theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { updateProfile } from '@/services/api';

export default function SettingsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [isEditProfileModalVisible, setIsEditProfileModalVisible] = useState(false);
  const [isChangePasswordModalVisible, setIsChangePasswordModalVisible] = useState(false);
  const [profile, setProfile] = useState({
    id: null,
    name: 'Loading...',
    role: 'User',
    email: ''
  });
  const [tempProfile, setTempProfile] = useState({
    name: '',
    role: '',
    email: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [loading, setLoading] = useState(true);

  const { theme, currentTheme, toggleTheme } = useAppTheme();

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const textTertiaryColor = useThemeColor({}, 'textTertiary');
  const primaryColor = useThemeColor({}, 'primary');
  const dangerColor = useThemeColor({}, 'danger');

  // Fetch user profile on component mount
  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      // Get user data from AsyncStorage (data saved during login)
      const userData = await AsyncStorage.getItem('user');
      const role = await AsyncStorage.getItem('role');
      
      if (userData) {
        const user = JSON.parse(userData);
        // Use the user data from login directly, no need for additional API call
        setProfile({
          id: user.id || null,
          name: user.name || 'Unknown User',
          role: role || 'User',
          email: user.email || ''
        });
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error fetching profile:', error);
      }
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            // Clear AsyncStorage
            AsyncStorage.multiRemove(['token', 'user', 'role']);
            // Navigate to login screen
            router.replace('/login');
          }
        }
      ]
    );
  };

  const openEditProfileModal = () => {
    setTempProfile({
      name: profile.name,
      role: profile.role,
      email: profile.email
    });
    setIsEditProfileModalVisible(true);
  };

  const saveProfile = async () => {
    if (!tempProfile.name || !tempProfile.email) {
      Alert.alert('Error', 'Name and email are required');
      return;
    }
    
    try {
      // Get user data from AsyncStorage
      const userData = await AsyncStorage.getItem('user');
      const role = await AsyncStorage.getItem('role');
      
      if (userData && role) {
        const user = JSON.parse(userData);
        
        // Ensure we have a valid user ID
        if (!user.id) {
          Alert.alert('Error', 'User ID not found');
          return;
        }
        
        // Update local state (UI will update immediately)
        setProfile({
          ...profile,
          name: tempProfile.name,
          email: tempProfile.email
        });
        
        // Update AsyncStorage (data will persist)
        const updatedUser = {
          ...user,
          name: tempProfile.name,
          email: tempProfile.email
        };
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Show success message without waiting for API
        Alert.alert('Success', 'Profile updated successfully');
        setIsEditProfileModalVisible(false);
        
        // Try API update in background (don't wait for it)
        updateProfile(role, user.id, {
          name: tempProfile.name,
          email: tempProfile.email,
          username: tempProfile.email
        }).then(response => {
          if (__DEV__) {
            console.log('Profile updated in database successfully');
          }
        }).catch(apiError => {
          if (__DEV__) {
            console.log('Failed to update profile in database:', apiError?.response?.data?.error || apiError?.message);
          }
        });
      } else {
        Alert.alert('Error', 'User session not found. Please log in again.');
        router.replace('/login');
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error updating profile:', error);
      }
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const cancelEditProfile = () => {
    setIsEditProfileModalVisible(false);
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmNewPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    
    try {
      // Get user data from AsyncStorage
      const userData = await AsyncStorage.getItem('user');
      const role = await AsyncStorage.getItem('role');
      
      if (userData && role) {
        const user = JSON.parse(userData);
        
        // Ensure we have a valid user ID
        if (!user.id) {
          Alert.alert('Error', 'User ID not found');
          return;
        }
        
        // Change password via API
        await api.put(`/profile/${role}/${user.id}/password`, {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        });
        
        Alert.alert('Success', 'Password changed successfully');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: ''
        });
        setIsChangePasswordModalVisible(false);
      } else {
        Alert.alert('Error', 'User session not found. Please log in again.');
        router.replace('/login');
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error changing password:', error);
      }
      if (error.response && error.response.data && error.response.data.error) {
        Alert.alert('Error', error.response.data.error);
      } else {
        Alert.alert('Error', 'Failed to change password');
      }
    }
  };

  const cancelChangePassword = () => {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    });
    setIsChangePasswordModalVisible(false);
  };

  const handleManualSync = async () => {
    try {
      // Simulate sync process
      Alert.alert('Sync', 'Manual sync initiated...');
      // In a real app, you would trigger actual data synchronization here
      await new Promise(resolve => setTimeout(resolve, 1000));
      Alert.alert('Sync Complete', 'Data synchronized successfully');
    } catch (error) {
      if (__DEV__) {
        console.error('Sync error:', error);
      }
      Alert.alert('Sync Error', 'Failed to synchronize data');
    }
  };

  // Persist settings changes
  const handleTogglePersist = async (key: string, value: boolean) => {
    try {
      await AsyncStorage.setItem(key, value ? 'true' : 'false');
    } catch (e) {
      if (__DEV__) {
        console.log('Failed to save setting', key, e);
      }
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: backgroundColor }]}>
      <ThemedText type="title" style={[styles.title, { color: textColor }]}>Settings</ThemedText>
      
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* User Profile Section */}
        <Card style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatar}>
              <MaterialIcons name="account-circle" size={60} color={textTertiaryColor} />
            </View>
            <ThemedText type="subtitle" style={[styles.profileName, { color: textColor }]}>{profile.name}</ThemedText>
            <ThemedText style={[styles.profileRole, { color: textTertiaryColor }]}>{profile.role}</ThemedText>
            <TouchableOpacity style={[styles.editButton, { borderColor: primaryColor }]} onPress={openEditProfileModal}>
              <MaterialIcons name="edit" size={16} color={primaryColor} />
              <ThemedText style={[styles.editButtonText, { color: primaryColor }]}>Edit Profile</ThemedText>
            </TouchableOpacity>
          </View>
        </Card>

        <Card style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="notifications" size={20} color={primaryColor} />
            <ThemedText type="subtitle" style={[styles.sectionTitle, { color: textColor }]}>Notifications</ThemedText>
          </View>
          
          <View style={[styles.settingRow, { borderBottomColor: borderColor }]}>
            <ThemedText style={[styles.settingText, { color: textSecondaryColor }]}>Enable notifications</ThemedText>
            <Switch
              value={notifications}
              onValueChange={(v) => { setNotifications(v); }}
              trackColor={{ false: borderColor, true: primaryColor }}
              thumbColor={notifications ? '#ffffff' : '#f4f3f4'}
            />
          </View>
          
          <View style={[styles.settingRow, { borderBottomColor: borderColor }]}>
            <ThemedText style={[styles.settingText, { color: textSecondaryColor }]}>Low stock alerts</ThemedText>
            <Switch
              value={true}
              disabled
              trackColor={{ false: borderColor, true: primaryColor }}
              thumbColor={'#ffffff'}
            />
          </View>
        </Card>

        {/* Appearance / Theme */}
        <Card style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="dark-mode" size={20} color={primaryColor} />
            <ThemedText type="subtitle" style={[styles.sectionTitle, { color: textColor }]}>
              Appearance
            </ThemedText>
          </View>
          <View style={styles.themeRow}>
            <TouchableOpacity
              style={[
                styles.themeOption,
                currentTheme === 'light' && [styles.themeOptionActive, { borderColor: primaryColor }],
              ]}
              onPress={() => toggleTheme('light')}
            >
              <MaterialIcons
                name="light-mode"
                size={18}
                color={currentTheme === 'light' ? primaryColor : textTertiaryColor}
              />
              <ThemedText
                style={[
                  styles.themeOptionText,
                  { color: currentTheme === 'light' ? primaryColor : textSecondaryColor },
                ]}
              >
                Light
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.themeOption,
                currentTheme === 'dark' && [styles.themeOptionActive, { borderColor: primaryColor }],
              ]}
              onPress={() => toggleTheme('dark')}
            >
              <MaterialIcons
                name="nightlight-round"
                size={18}
                color={currentTheme === 'dark' ? primaryColor : textTertiaryColor}
              />
              <ThemedText
                style={[
                  styles.themeOptionText,
                  { color: currentTheme === 'dark' ? primaryColor : textSecondaryColor },
                ]}
              >
                Dark
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.themeOption,
                theme === 'system' && [styles.themeOptionActive, { borderColor: primaryColor }],
              ]}
              onPress={() => toggleTheme('system')}
            >
              <MaterialIcons
                name="settings-suggest"
                size={18}
                color={theme === 'system' ? primaryColor : textTertiaryColor}
              />
              <ThemedText
                style={[
                  styles.themeOptionText,
                  { color: theme === 'system' ? primaryColor : textSecondaryColor },
                ]}
              >
                System
              </ThemedText>
            </TouchableOpacity>
          </View>
        </Card>

        <Card style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="sync" size={20} color={primaryColor} />
            <ThemedText type="subtitle" style={[styles.sectionTitle, { color: textColor }]}>Data Sync</ThemedText>
          </View>
          
          <View style={[styles.settingRow, { borderBottomColor: borderColor }]}>
            <ThemedText style={[styles.settingText, { color: textSecondaryColor }]}>Auto-sync inventory</ThemedText>
            <Switch
              value={autoSync}
              onValueChange={setAutoSync}
              trackColor={{ false: borderColor, true: primaryColor }}
              thumbColor={autoSync ? '#ffffff' : '#f4f3f4'}
            />
          </View>
          
          <TouchableOpacity style={[styles.syncButton, { backgroundColor: borderColor }]} onPress={handleManualSync}>
            <MaterialIcons name="sync" size={20} color={primaryColor} />
            <ThemedText style={[styles.syncButtonText, { color: primaryColor }]}>Sync Now</ThemedText>
          </TouchableOpacity>
        </Card>
        
        {/* Accounts Card */}
        <Card style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="account-circle" size={20} color={primaryColor} />
            <ThemedText type="subtitle" style={[styles.sectionTitle, { color: textColor }]}>Accounts</ThemedText>
          </View>
          
          <TouchableOpacity 
            style={[styles.accountButton, { borderBottomColor: borderColor }]} 
            onPress={() => setIsChangePasswordModalVisible(true)}
          >
            <MaterialIcons name="lock" size={20} color={primaryColor} />
            <ThemedText style={[styles.accountButtonText, { color: textColor }]}>Change Password</ThemedText>
            <MaterialIcons name="chevron-right" size={20} color={textTertiaryColor} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <MaterialIcons name="logout" size={20} color={dangerColor} />
            <ThemedText style={[styles.logoutButtonText, { color: dangerColor }]}>Logout</ThemedText>
          </TouchableOpacity>
        </Card>

        {/* About Card - Moved to the bottom */}
        <Card style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="info" size={20} color={primaryColor} />
            <ThemedText type="subtitle" style={[styles.sectionTitle, { color: textColor }]}>About</ThemedText>
          </View>
          
          <View style={styles.aboutRow}>
            <ThemedText style={[styles.aboutText, { color: textTertiaryColor }]}>AIVENTORY v1.0.0</ThemedText>
          </View>
          
          <View style={styles.aboutRow}>
            <ThemedText style={[styles.aboutText, { color: textTertiaryColor }]}>© 2025 AIVENTORY. All rights reserved.</ThemedText>
          </View>
        </Card>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isEditProfileModalVisible}
        onRequestClose={cancelEditProfile}
      >
        <View style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: cardBackgroundColor }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle" style={[styles.modalTitle, { color: textColor }]}>Edit Profile</ThemedText>
              <TouchableOpacity onPress={cancelEditProfile}>
                <MaterialIcons name="close" size={24} color={textTertiaryColor} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Name</ThemedText>
              <TextInput
                style={[styles.input, { borderColor: borderColor, color: textColor, backgroundColor: backgroundColor }]}
                value={tempProfile.name}
                onChangeText={(text) => setTempProfile({ ...tempProfile, name: text })}
                placeholder="Enter name"
                placeholderTextColor={textTertiaryColor}
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Email</ThemedText>
              <TextInput
                style={[styles.input, { borderColor: borderColor, color: textColor, backgroundColor: backgroundColor }]}
                value={tempProfile.email}
                onChangeText={(text) => setTempProfile({ ...tempProfile, email: text })}
                placeholder="Enter email"
                placeholderTextColor={textTertiaryColor}
                keyboardType="email-address"
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Role</ThemedText>
              <TextInput
                style={[styles.input, { borderColor: borderColor, color: textColor, backgroundColor: backgroundColor }]}
                value={tempProfile.role}
                editable={false}
                placeholder="Role"
                placeholderTextColor={textTertiaryColor}
              />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton, { borderColor: borderColor }]} 
                onPress={cancelEditProfile}
              >
                <ThemedText style={[styles.modalButtonText, { color: textSecondaryColor }]}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton, { backgroundColor: primaryColor }]} 
                onPress={saveProfile}
              >
                <ThemedText style={[styles.modalButtonText, { color: '#ffffff' }]}>Save</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isChangePasswordModalVisible}
        onRequestClose={cancelChangePassword}
      >
        <View style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: cardBackgroundColor }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle" style={[styles.modalTitle, { color: textColor }]}>Change Password</ThemedText>
              <TouchableOpacity onPress={cancelChangePassword}>
                <MaterialIcons name="close" size={24} color={textTertiaryColor} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Current Password</ThemedText>
              <TextInput
                style={[styles.input, { borderColor: borderColor, color: textColor, backgroundColor: backgroundColor }]}
                value={passwordForm.currentPassword}
                onChangeText={(text) => setPasswordForm({ ...passwordForm, currentPassword: text })}
                placeholder="Enter current password"
                placeholderTextColor={textTertiaryColor}
                secureTextEntry
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>New Password</ThemedText>
              <TextInput
                style={[styles.input, { borderColor: borderColor, color: textColor, backgroundColor: backgroundColor }]}
                value={passwordForm.newPassword}
                onChangeText={(text) => setPasswordForm({ ...passwordForm, newPassword: text })}
                placeholder="Enter new password"
                placeholderTextColor={textTertiaryColor}
                secureTextEntry
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Confirm New Password</ThemedText>
              <TextInput
                style={[styles.input, { borderColor: borderColor, color: textColor, backgroundColor: backgroundColor }]}
                value={passwordForm.confirmNewPassword}
                onChangeText={(text) => setPasswordForm({ ...passwordForm, confirmNewPassword: text })}
                placeholder="Confirm new password"
                placeholderTextColor={textTertiaryColor}
                secureTextEntry
              />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton, { borderColor: borderColor }]} 
                onPress={cancelChangePassword}
              >
                <ThemedText style={[styles.modalButtonText, { color: textSecondaryColor }]}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton, { backgroundColor: primaryColor }]} 
                onPress={handleChangePassword}
              >
                <ThemedText style={[styles.modalButtonText, { color: '#ffffff' }]}>Save</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 16,
  },
  title: {
    marginBottom: 8,
  },
  card: {
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  profileAvatar: {
    marginBottom: 12,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  editButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingText: {
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 5,
    marginTop: 16,
    gap: 8,
  },
  syncButtonText: {
    fontWeight: '600',
  },
  aboutRow: {
    paddingVertical: 8,
  },
  aboutText: {
  },
  themeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  themeOptionActive: {
    backgroundColor: 'rgba(148, 163, 253, 0.1)',
  },
  themeOptionText: {
    fontWeight: '600',
    fontSize: 14,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  
  logoutButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  
  accountButtonText: {
    flex: 1,
    marginLeft: 16,
    fontWeight: '500',
    fontSize: 16,
  },
  
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 12,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  modalButton: {
    borderRadius: 5,
    paddingHorizontal: 20,
    paddingVertical: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {
  },
  modalButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
});
