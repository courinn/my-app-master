import React from 'react';
import { SectionList, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const DATA = [
    {
        title: 'Kelas A',
        data: ['Garini Ulima Laksmihita', 'Fildzah Hind Ihsamy', 'Amelia Nur Aini', 'Regita Adinda Sefty'],
    },
    {
        title: 'Kelas B',
        data: ['Aditya Dwi Putra', 'Sigit Prayoga', 'Jonathan Saputra', 'Wildan Kurniawan'],
    },
    {
        title: 'Asisten',
        data: ['M. Syaiful', 'Rini Husadiyah', 'Hayyu Rahmayani Puspitasari', 'Veronica Tia Ningrum'],
    },
    {
        title: 'Desserts',
        data: ['Cheese Cake', 'Ice Cream'],
    },
];

const App = () => (
    <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top']}>
            <SectionList
                sections={DATA}
                keyExtractor={(item, index) => item + index}
                renderItem={({ item }) => (
                    <View style={styles.item}>
                        <Text style={styles.title}>
                        <MaterialIcons name="person-search" size={20} color="black" />
                        {''}
                        {item}
                        </Text>
                    </View>
                )}
                renderSectionHeader={({ section: { title } }) => (
                    <Text style={styles.header}>{title}</Text>
                )}
            />
        </SafeAreaView>
    </SafeAreaProvider>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: StatusBar.currentHeight,
        marginHorizontal: 20,
        marginVertical: 16,
    },
    item: {
        backgroundColor: '#D0D0D0',
        padding: 10,
        marginVertical: 8,
        borderRadius: 10,
    },
    header: {
        fontSize: 16,
        fontWeight: '600',
        backgroundColor: '#8d9db6',
        borderRadius: 10,   
        marginVertical: 8,
        padding: 10,
        marginTop: 20,
    },
    title: {
        fontSize: 16,
    },
});

export default App;