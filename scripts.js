// DOM Elements
const connectButton = document.getElementById('connectButton');
const bleStateContainer = document.getElementById('bleState');
const sensitivity = document.getElementById('sensitivity')
const turnOffAfter = document.getElementById('timeon')
const keyID = document.getElementById('keypass')
const keyAddButton = document.getElementById('addkeybtn')
const keyName = document.getElementById('keyname')
const resetButton = document.getElementById('resetBtn')

//Define BLE Device Specs
var deviceName ='Near Field Control';
var bleService = '19b10000-e8f2-537e-4f6c-d104768a1214';
var ledCharacteristic = '19b10002-e8f2-537e-4f6c-d104768a1214';
var sensorCharacteristic= '19b10001-e8f2-537e-4f6c-d104768a1214';

var SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e" // UART service UUID
var CHARACTERISTIC_UUID_KEY_NAME = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
var CHARACTERISTIC_UUID_TX = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"
var CHARACTERISTIC_UUID_SS = "6e400004-b5a3-f393-e0a9-e50e24dcca9e"
var CHARACTERISTIC_UUID_TO = "6e400005-b5a3-f393-e0a9-e50e24dcca9e"
var CHARACTERISTIC_UUID_ADD_KEY = "6e400006-b5a3-f393-e0a9-e50e24dcca9e"
var CHARACTERISTIC_UUID_RESET = "6e400007-b5a3-f393-e0a9-e50e24dcca9e"

//Global Variables to Handle Bluetooth
var bleServer;
var bleServiceFound;
var sensorCharacteristicFound;

// Connect Button (search for BLE Devices only if BLE is available)
connectButton.addEventListener('click', (event) => {
    if (isWebBluetoothEnabled()){
        connectToDevice();
    }
});

sensitivity.addEventListener('change',()=>{
    console.log('Sensitivity:',sensitivity.value)
    writeOnCharacteristic(sensitivity.value,CHARACTERISTIC_UUID_SS)
})

turnOffAfter.addEventListener('change',()=>{
    console.log('Turn off after:', turnOffAfter.value)
    writeOnCharacteristic(turnOffAfter.value, CHARACTERISTIC_UUID_TO)
})

keyAddButton.addEventListener('click',()=>{
    console.log("KEY ID:", keyID.value)
    writeOnCharacteristic(keyID.value,CHARACTERISTIC_UUID_ADD_KEY)
})

// keyName.addEventListener('change',()=>{
//     writeOnCharacteristic(keyName.value, CHARACTERISTIC_UUID_KEY_NAME)
// })

resetButton.addEventListener('click', ()=>{
   writeOnCharacteristic(1,CHARACTERISTIC_UUID_RESET);
})

// Check if BLE is available in your Browser
function isWebBluetoothEnabled() {
    if (!navigator.bluetooth) {
        console.log("Web Bluetooth API is not available in this browser!");
        bleStateContainer.innerHTML = "Web Bluetooth API is not available in this browser!";
        return false
    }
    console.log('Web Bluetooth API supported in this browser.');
    return true
}

// Connect to BLE Device and Enable Notifications
function connectToDevice(){
    console.log('Initializing Bluetooth...');
    navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        // filters: [{name: deviceName}],
        optionalServices: [SERVICE_UUID]
    })
    .then(device => { //when it is connected
        console.log('Device Selected:', device.name);
        bleStateContainer.innerHTML = 'Device Connected';
        connectButton.disabled = true;
        connectButton.style.backgroundColor = '#666'
        bleStateContainer.style.color = "#24af37";
        device.addEventListener('gattservicedisconnected', onDisconnected);
        return device.gatt.connect();
    })
    .then(gattServer =>{
        bleServer = gattServer;
        console.log("Connected to GATT Server");
        return bleServer.getPrimaryService(SERVICE_UUID);
    })
    .then(service => {
        bleServiceFound = service;
        console.log("Service discovered:", service.uuid);
        return service.getCharacteristic(CHARACTERISTIC_UUID_TX);
    })
    .then(characteristic => {
        console.log("Characteristic discovered:", characteristic.uuid);
        sensorCharacteristicFound = characteristic;
        characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicChange);
        characteristic.startNotifications();
        console.log("Notifications Started.");
        return characteristic.readValue();
    })
    .then(value => {
        console.log("Read value: ", value);
        const decodedValue = new TextDecoder().decode(value);
        console.log("Decoded value: ", decodedValue);
        retrievedValue.innerHTML = decodedValue;
    })
    .catch(error => {
        console.log('Error: ', error);
    })
}

function onDisconnected(event){
    console.log('Device Disconnected:', event.target.device.name);
    bleStateContainer.innerHTML = "Device disconnected";
    bleStateContainer.style.color = "#d13a30";

    connectToDevice();
}

function handleCharacteristicChange(event){
    const newValueReceived = new TextDecoder().decode(event.target.value);
    // console.log("Characteristic value changed: ", newValueReceived);
  
}

function writeOnCharacteristic(value, writeTo){
    if (bleServer && bleServer.connected) {
        bleServiceFound.getCharacteristic(writeTo)
        .then(characteristic => {
            console.log("Found the characteristic: ", characteristic.uuid);
            // const data = new Uint8Array([value]);
            const textEncoder = new TextEncoder();
            const uint8Array = textEncoder.encode(value);
            console.log(uint8Array)
            return characteristic.writeValue(uint8Array);
        })
        .then(() => {
            console.log("Value written to LEDcharacteristic:", value);
        })
        .catch(error => {
            console.error("Error writing to the LED characteristic: ", error);
        });
    } else {
        console.error ("Bluetooth is not connected. Cannot write to characteristic.")
        window.alert("Bluetooth is not connected")
    }
}

function checkforDisconnect() {
    if(bleServer && bleServer.connected){
        return
    }
    console.log("BLE server disconnected")
    connectButton.disabled = false;
    connectButton.style.backgroundColor = '#ff7454'
    bleStateContainer.innerHTML = "Device Disconnected";
    bleStateContainer.style.color = "#d13a30";

}

setInterval(checkforDisconnect,1000);

function disconnectDevice() {
    console.log("Disconnect Device.");
    if (bleServer && bleServer.connected) {
        if (sensorCharacteristicFound) {
            sensorCharacteristicFound.stopNotifications()
                .then(() => {
                    console.log("Notifications Stopped");
                    return bleServer.disconnect();
                })
                .then(() => {
                    console.log("Device Disconnected");
                    connectButton.disabled = false;
                    connectButton.style.backgroundColor = '#ff7454'
                    bleStateContainer.innerHTML = "Device Disconnected";
                    bleStateContainer.style.color = "#d13a30";

                })
                .catch(error => {
                    console.log("An error occurred:", error);
                });
        } else {
            console.log("No characteristic found to disconnect.");
        }
    } else {
        // Throw an error if Bluetooth is not connected
        console.error("Bluetooth is not connected.");
        window.alert("Bluetooth is not connected.")
    }
}

function getDateTime() {
    var currentdate = new Date();
    var day = ("00" + currentdate.getDate()).slice(-2); // Convert day to string and slice
    var month = ("00" + (currentdate.getMonth() + 1)).slice(-2);
    var year = currentdate.getFullYear();
    var hours = ("00" + currentdate.getHours()).slice(-2);
    var minutes = ("00" + currentdate.getMinutes()).slice(-2);
    var seconds = ("00" + currentdate.getSeconds()).slice(-2);

    var datetime = day + "/" + month + "/" + year + " at " + hours + ":" + minutes + ":" + seconds;
    return datetime;
}

