import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Alert
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';

const CaptchaScreen = ({ route, navigation }) => {
  const { verifyCaptcha } = useAuth();
  const [captchaText, setCaptchaText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { onVerificationComplete } = route.params;

  useEffect(() => {
    loadCaptcha();
  }, []);

  const loadCaptcha = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('/captcha', 'GET');
      setCaptchaText(response.captchaText);
    } catch (error) {
      setError('Failed to load CAPTCHA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!userInput.trim()) {
      setError('Please enter the verification code');
      return;
    }

    try {
      setIsLoading(true);
      const success = await verifyCaptcha(userInput);
      
      if (success) {
        onVerificationComplete(true);
        navigation.goBack();
      } else {
        setError('Invalid CAPTCHA. Please try again.');
        loadCaptcha(); // Load new CAPTCHA
        setUserInput('');
      }
    } catch (error) {
      setError('Verification failed. Please try again.');
      loadCaptcha(); // Load new CAPTCHA
      setUserInput('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>CAPTCHA Verification</Text>
        <Text style={styles.subtitle}>Please enter the verification code shown below</Text>
        
        {isLoading ? (
          <ActivityIndicator size="large" color="#3970BE" />
        ) : (
          <>
            <View style={styles.captchaContainer}>
              <Text style={styles.captchaText}>{captchaText}</Text>
            </View>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter verification code"
                value={userInput}
                onChangeText={setUserInput}
                autoCapitalize="characters"
                maxLength={6}
              />
            </View>
            
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            
            <TouchableOpacity
              style={styles.verifyButton}
              onPress={handleVerify}
              disabled={isLoading || !userInput}
            >
              <Text style={styles.verifyButtonText}>Verify</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={loadCaptcha}
              disabled={isLoading}
            >
              <Text style={styles.refreshButtonText}>Refresh CAPTCHA</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3970BE',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  captchaContainer: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  captchaText: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 5,
    color: '#333',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 5,
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  verifyButton: {
    backgroundColor: '#3970BE',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    padding: 10,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#3970BE',
    fontSize: 14,
  },
});

export default CaptchaScreen; 