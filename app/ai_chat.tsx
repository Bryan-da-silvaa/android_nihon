import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Keyboard, 
  Platform,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { sendMessage, addTokenListener } from '../modules/local-sensei';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  tps?: string;
}

const ChatMessage = memo(({ item }: { item: Message }) => {
  const isAi = item.sender === 'ai';
  return (
    <View className={`flex-row ${isAi ? 'justify-start' : 'justify-end'} mb-4 px-4`}>
      {isAi && (
        <View className="w-8 h-8 bg-indigo-500 rounded-full items-center justify-center mr-2 mt-auto">
          <Ionicons name="sparkles" size={16} color="#fff" />
        </View>
      )}
      <View className="max-w-[80%]">
        <View 
          className={`p-4 rounded-2xl ${
            isAi ? 'bg-white/10 rounded-bl-none' : 'bg-indigo-600 rounded-br-none'
          }`}
        >
          <Text className="text-white text-[16px] leading-6">{item.text}</Text>
        </View>
        {isAi && item.tps && (
          <View className="flex-row items-center mt-1 ml-1">
            <Ionicons name="speedometer-outline" size={10} color="#818cf8" />
            <Text className="text-indigo-400 text-[10px] ml-1 font-medium">{item.tps} t/s</Text>
          </View>
        )}
      </View>
    </View>
  );
});

export default function AIChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Bonjour ! Je suis Sensei, votre assistant japonais local. Comment puis-je vous aider aujourd'hui ?",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const currentAiMessageId = useRef<string | null>(null);

  useEffect(() => {
    // Manual Keyboard Handling
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        // On some Androids, we need to account for StatusBar or NavBars
        const height = e.endCoordinates.height;
        setKeyboardHeight(height + 40);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    const tokenSub = addTokenListener((event: any) => {
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.id === currentAiMessageId.current) {
          return [...prev.slice(0, -1), { ...lastMsg, text: event.text, tps: event.tps }];
        }
        return prev;
      });
      if (event.isDone) {
        setIsLoading(false);
        currentAiMessageId.current = null;
      }
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      tokenSub.remove();
    };
  }, []);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    const aiMsgId = (Date.now() + 1).toString();
    currentAiMessageId.current = aiMsgId;
    
    setMessages(prev => [...prev, userMsg, { id: aiMsgId, text: '', sender: 'ai', timestamp: new Date() }]);
    setInputText('');
    setIsLoading(true);

    try {
      await sendMessage(userMsg.text);
    } catch (e) {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, keyboardHeight]);

  const renderItem = useCallback(({ item }: { item: Message }) => (
    <ChatMessage item={item} />
  ), []);

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a', paddingBottom: keyboardHeight }}>
      <Stack.Screen options={{ 
        title: 'Sensei Chat',
        headerTransparent: false,
        headerStyle: { backgroundColor: '#0a0a0a' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontFamily: 'Outfit_700Bold' }
      }} />

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingVertical: 20 }}
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={Platform.OS === 'android'}
      />

      {isLoading && (
        <View className="px-6 py-2">
          <View className="bg-white/5 px-4 py-2 rounded-full flex-row items-center self-start">
            <ActivityIndicator size="small" color="#818cf8" />
            <Text className="text-indigo-400 text-xs ml-2 italic">Sensei réfléchit...</Text>
          </View>
        </View>
      )}

      <View className="flex-row items-center p-4 bg-[#121212] border-t border-white/10 pb-6">
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Écrivez à Sensei..."
          placeholderTextColor="#666"
          multiline
          className="flex-1 bg-white/5 text-white px-4 py-3 rounded-2xl max-h-32 text-[16px]"
        />
        <TouchableOpacity 
          onPress={handleSend}
          disabled={!inputText.trim() || isLoading}
          className={`ml-3 w-12 h-12 rounded-full items-center justify-center ${!inputText.trim() || isLoading ? 'bg-gray-800' : 'bg-indigo-600'}`}
        >
          <Ionicons name={isLoading ? "hourglass-outline" : "send"} size={20} color={!inputText.trim() || isLoading ? "#444" : "#fff"} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
