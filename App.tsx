import * as React from 'react';
import {Dimensions} from 'react-native';

import {reaction} from 'mobx';
import {observer} from 'mobx-react';
import {NavigationContainer} from '@react-navigation/native';
import {createDrawerNavigator} from '@react-navigation/drawer';
import {gestureHandlerRootHOC} from 'react-native-gesture-handler';
import {Provider as PaperProvider} from 'react-native-paper';

import {useTheme} from './src/hooks';
import {HeaderRight, SidebarContent} from './src/components';
import {modelStore} from './src/store';
import {ChatScreen, ModelsScreen, SettingsScreen} from './src/screens';

const Drawer = createDrawerNavigator();

const screenWidth = Dimensions.get('window').width;

const App = observer(() => {
  const [chatTitle, setChatTitle] = React.useState('Default Chat Page');

  React.useEffect(() => {
    const dispose = reaction(
      () => modelStore.chatTitle,
      newTitle => setChatTitle(newTitle),
      {fireImmediately: true},
    );
    return () => dispose();
  }, []);

  React.useEffect(() => {
    const initDefaultModel = async () => {
      const defaultModelId = 'default-llama-3.2-1b-instruct-q4_0_4_4.gguf';
      const defaultModel = modelStore.models.find(m => m.id === defaultModelId);

      if (defaultModel) {
        if (defaultModel.isDownloaded) {
          try {
            await modelStore.initContext(defaultModel);
          } catch (error) {
            console.error('Failed to initialize default model:', error);
          }
        } else {
          await modelStore.checkSpaceAndDownload(defaultModelId);
        }
      } else {
        console.warn('Default model not found in model list');
      }
    };

    // Add a small delay to ensure modelStore is fully initialized
    const timer = setTimeout(() => {
      initDefaultModel();
    }, 10);

    return () => clearTimeout(timer);
  }, []);

  const theme = useTheme();

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <Drawer.Navigator
          screenOptions={{
            drawerStyle: {
              width: screenWidth * 0.8,
            },
            headerStyle: {
              backgroundColor: theme.colors.background,
            },
            headerTintColor: theme.colors.onBackground,
          }}
          drawerContent={props => <SidebarContent {...props} />}>
          <Drawer.Screen
            name="Chat"
            component={gestureHandlerRootHOC(ChatScreen)}
            options={{
              title: chatTitle,
              headerRight: () => <HeaderRight />,
            }}
          />
          <Drawer.Screen
            name="Models"
            component={gestureHandlerRootHOC(ModelsScreen)}
          />
          <Drawer.Screen
            name="Settings"
            component={gestureHandlerRootHOC(SettingsScreen)}
          />
        </Drawer.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
});

export default App;
