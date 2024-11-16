import React, {useState} from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {Mic, MicOff} from 'lucide-react-native';
import {Input} from '..';

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

  const handleMicPress = () => {
    setIsRecording(!isRecording);
    if (onMicPress) {
      onMicPress(!isRecording);
    }
  };

  return (
    <View style={styles.outerContainer}>
      <View style={styles.micContainer}>
        <TouchableOpacity onPress={handleMicPress} style={styles.micButton}>
          {isRecording ? (
            <MicOff color="#EF4444" size={48} />
          ) : (
            <Mic color="#4B5563" size={48} />
          )}
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
});

export default ChatInputWithMicrophone;
