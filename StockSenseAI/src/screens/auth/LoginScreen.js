import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Alert
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { biometricAuthService } from '../../services/biometricAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../constants/colors';

const STORED_CREDENTIALS_KEY = 'stored_credentials';

const LoginScreen = ({ navigation }) => {
  const { login, checkBiometricEnabled, authenticateWithBiometric } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
    loadStoredEmail();
  }, []);

  const loadStoredEmail = async () => {
    try {
      const storedCredentials = await AsyncStorage.getItem(STORED_CREDENTIALS_KEY);
      if (storedCredentials) {
        const { email } = JSON.parse(storedCredentials);
        setFormData(prev => ({
          ...prev,
          email
        }));
      }
    } catch (error) {
      console.error('Error loading stored email:', error);
    }
  };

  const checkBiometricAvailability = async () => {
    try {
      // First check if the device has biometric hardware
      const isAvailable = await biometricAuthService.isBiometricAvailable();
      if (!isAvailable) {
        console.log('Biometric hardware not available or not enrolled');
        setBiometricAvailable(false);
        return;
      }

      // Then check if biometric authentication is enabled in the app
      const isEnabled = await checkBiometricEnabled();
      console.log('Biometric enabled in app:', isEnabled);
      setBiometricAvailable(isEnabled);
      
      // Get and log the available biometric types for debugging
      const types = await biometricAuthService.getBiometricTypes();
      console.log('Available biometric types:', types);
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setBiometricAvailable(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBiometricLogin = async () => {
    try {
      setIsLoading(true);
      console.log('Attempting biometric login...');
      const result = await authenticateWithBiometric();
      console.log('Biometric authentication result:', result);
      
      if (result.requiresCaptcha) {
        // Handle CAPTCHA if needed
        navigation.navigate('Captcha', {
          onVerificationComplete: async (verified) => {
            if (verified) {
              const storedCredentials = await AsyncStorage.getItem(STORED_CREDENTIALS_KEY);
              if (storedCredentials) {
                const { email, password } = JSON.parse(storedCredentials);
                const retryLogin = await login(email, password);
                if (!retryLogin.success) {
                  Alert.alert('Error', retryLogin.error || 'Login failed');
                }
              }
            }
          }
        });
      } else if (!result.success) {
        Alert.alert('Authentication Failed', result.error || 'Biometric authentication failed');
      }
    } catch (error) {
      console.error('Error in biometric login:', error);
      Alert.alert('Error', error.message || 'An error occurred during biometric login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (validateForm()) {
      try {
        setIsLoading(true);
        const result = await login(formData.email, formData.password);
        
        if (result.requiresCaptcha) {
          // Navigate to CAPTCHA screen if required
          navigation.navigate('Captcha', {
            email: formData.email,
            password: formData.password,
            onVerificationComplete: async (verified) => {
              if (verified) {
                // Retry login after CAPTCHA verification
                const loginResult = await login(formData.email, formData.password);
                if (loginResult.success) {
                  // Store credentials for biometric login if login successful
                  await AsyncStorage.setItem(STORED_CREDENTIALS_KEY, JSON.stringify({
                    email: formData.email,
                    password: formData.password
                  }));
                  console.log('Login successful after CAPTCHA');
                } else {
                  Alert.alert('Error', loginResult.error || 'Login failed. Please try again.');
                }
              }
            }
          });
        } else if (result.success) {
          // Store credentials for biometric login if login successful
          await AsyncStorage.setItem(STORED_CREDENTIALS_KEY, JSON.stringify({
            email: formData.email,
            password: formData.password
          }));
          console.log('Login successful');
        } else {
          Alert.alert('Error', result.error || 'Login failed. Please try again.');
        }
      } catch (error) {
        Alert.alert('Error', error.message || 'Login failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when field is edited
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollView}>
          <View style={styles.headerContainer}>
            <Image 
              source={require('../../../assets/logo.png')} 
              style={styles.logo} 
              resizeMode="contain"
            />
            <Text style={styles.headerText}>StockBuddy</Text>
            <Text style={styles.subHeaderText}>Welcome back!</Text>
          </View>
          
          <View style={styles.formContainer}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : null]}
                placeholder="Enter your email"
                value={formData.email}
                onChangeText={(text) => handleChange('email', text)}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>
            
            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.passwordContainer, errors.password ? styles.inputError : null]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChangeText={(text) => handleChange('password', text)}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.passwordVisibilityButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={24}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            {biometricAvailable && (
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricLogin}
                disabled={isLoading}
              >
                <Ionicons name="finger-print" size={24} color={Colors.primary} />
                <Text style={styles.biometricButtonText}>Sign in with Biometric</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.signupText}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 1,
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 80,
    height: 80,
  },
  headerText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#3970BE',
    marginTop: 10,
  },
  subHeaderText: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 14,
    marginTop: 5,
  },
  loginButton: {
    backgroundColor: '#3970BE',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  signupText: {
    color: '#3970BE',
    fontSize: 14,
    fontWeight: '600',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  passwordInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  passwordVisibilityButton: {
    padding: 10,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    height: 50,
    marginTop: 15,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  biometricButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default LoginScreen; 