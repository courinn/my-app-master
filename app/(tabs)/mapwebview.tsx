import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';


const webmap = require('../../assets/html/map.html')


export default function App() {
    return (
        <View style={styles.container}>
            <WebView
                style={styles.webview}
                source={webmap}
            />
            <TouchableOpacity style={styles.fab} onPress={() => router.push('/forminputlocation')}>
                <FontAwesome name="plus" size={24} color="white" />
            </TouchableOpacity>
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: Constants.statusBarHeight,
    },
    webview: {
        flex: 1,

    },
    fab: {
        position: 'absolute',
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        right: 20,
        bottom: 20,
        backgroundColor: '#0275d8',
        borderRadius: 30,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
});
