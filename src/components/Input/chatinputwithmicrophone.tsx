import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  PermissionsAndroid,
  Alert,
  Animated,
} from 'react-native';
import {Mic, MicOff} from 'lucide-react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';
import {Input} from '..';
import {transcribeAudio} from '../../utils/groq';

const ChatInputWithMicrophone = ({
  isAttachmentUploading,
  isStreaming,
  onAttachmentPress,
  onSendPress,
  onStopPress,
  isStopVisible,
  renderScrollable,
  sendButtonVisibilityMode,
  textInputProps,
  onMicPress,
  ...inputProps
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingPath, setRecordingPath] = useState('');
  const [audioRecorderPlayer] = useState(() => new AudioRecorderPlayer());
  const [hasPermission, setHasPermission] = useState(false);

  // Animation value for scaling
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Setup pulse animation when recording starts/stops
  useEffect(() => {
    console.log(isRecording);
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      // Reset animation when stopped
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isRecording]);

  useEffect(() => {
    checkAndRequestPermission();

    return () => {
      if (isRecording) {
        stopRecording();
      }
      audioRecorderPlayer.removeRecordBackListener();
    };
  }, []);

  const checkAndRequestPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const currentPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        );

        if (currentPermission) {
          setHasPermission(true);
          return true;
        }

        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'App needs access to your microphone to record audio',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Audio permission granted');
          setHasPermission(true);
          return true;
        } else {
          console.log('Audio permission denied');
          Alert.alert(
            'Permission Required',
            'This feature requires microphone access. Please enable it in your phone settings.',
            [{text: 'OK'}],
          );
          setHasPermission(false);
          return false;
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    // For iOS, we'll assume permission is granted for now
    // Add proper iOS permission handling if needed
    return true;
  };

  const handleMicSend = (transcription: string) => {
    const trimmedValue = transcription.trim();

    // Impossible to test since button is not visible when value is empty.
    // Additional check for the keyboard input.
    /* istanbul ignore next */
    if (trimmedValue) {
      onSendPress({text: trimmedValue, type: 'text'});
      // setText('');
    }
  };

  const startRecording = async () => {
    try {
      // Check permission before starting recording
      const permitted = await checkAndRequestPermission();
      if (!permitted) {
        return;
      }

      const dirPath = `${RNFS.DocumentDirectoryPath}/recordings`;

      await RNFS.mkdir(dirPath).catch(err => {
        if (err.code !== 'EEXIST') throw err;
      });

      const timestamp = Date.now();
      const audioPath = Platform.select({
        android: `${dirPath}/recording_${timestamp}.mp3`,
        ios: `${dirPath}/recording_${timestamp}.m4a`,
      });
      console.log(audioPath);
      if (audioPath) {
        setRecordingPath(audioPath);
      }

      const result = await audioRecorderPlayer.startRecorder(audioPath);
      audioRecorderPlayer.addRecordBackListener(e => {
        console.log('Recording . . . ', e.currentPosition);
      });

      console.log('Recording started', result);
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      return false;
    }
  };

  const stopRecording = async () => {
    try {
      const result = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();

      console.log('Recording stopped and saved:', recordingPath);
      return recordingPath;
    } catch (error) {
      console.error('Error stopping recording:', error);
      return null;
    }
  };

  const handleMicPress = async () => {
    if (!isRecording) {
      const started = await startRecording();
      if (started) {
        setIsRecording(true);
      }
    } else {
      const filePath = await stopRecording();
      setIsRecording(false);

      if (filePath) {
        try {
          // Show loading indicator if needed
          //   setIsTranscribing(true);

          // Transcribe the audio
          const transcription = await transcribeAudio({
            audioPath: filePath,
            // Optionally add any context specific to your app
            // prompt: 'This is a conversation transcript',
          });

          console.log('Transcription:', transcription);

          handleMicSend(transcription);
          // Handle the transcription result
          //   if (onTranscriptionComplete) {
          //     onTranscriptionComplete(transcription);
          //   }
        } catch (error) {
          console.error('Failed to transcribe:', error);
          // Handle error (show alert, etc.)
        }
        //  finally {
        //   setIsTranscribing(false);
        // }

        // Call original onMicPress if needed
        if (onMicPress) {
          onMicPress(filePath);
        }
      }
    }
  };
  return (
    <View style={styles.outerContainer}>
      <View style={styles.micContainer}>
        <TouchableOpacity
          onPress={handleMicPress}
          style={[
            styles.micButton,
            !hasPermission && styles.micButtonDisabled,
          ]}>
          <Animated.View
            style={{
              transform: [{scale: scaleAnim}],
            }}>
            <Mic color={isRecording ? '#A020F0' : '#4B5563'} size={48} />
          </Animated.View>
        </TouchableOpacity>
      </View>
      <View style={styles.inputContainer}>
        <Input
          isAttachmentUploading={isAttachmentUploading}
          isStreaming={isStreaming}
          onAttachmentPress={onAttachmentPress}
          onSendPress={onSendPress}
          onStopPress={onStopPress}
          isStopVisible={isStopVisible}
          sendButtonVisibilityMode={sendButtonVisibilityMode}
          textInputProps={textInputProps}
          {...inputProps}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: 'white',
  },
  micContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  micButton: {
    padding: 12,
    borderRadius: 9999,
    backgroundColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  micButtonDisabled: {
    opacity: 0.5,
  },
});

export default ChatInputWithMicrophone;
