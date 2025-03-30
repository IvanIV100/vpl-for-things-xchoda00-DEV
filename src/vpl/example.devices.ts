import { Device } from './language';

export const exampleDevices: Device[] = [
  {
    deviceName: 'DistanceSensor-1',
    deviceType: 'sensor',
    attributes: ['waterLevel', 'distance'],
    functions: [],
  },
  {
    deviceName: 'LT22222-Relay-1',
    deviceType: 'actuator',
    attributes: ['relayState'], // "opened", "closed"
    functions: [
      {
        type: 'unit_with_args',
        arguments: [
          {
            type: 'str_opt',
            options: [
              { id: 'open', label: 'Open' },
              { id: 'close', label: 'Close' },
            ],
          },
        ],
        backgroundColor: '#ec4899',
        foregroundColor: '#ffffff',
        label: 'setRelay',
        icon: 'lightningChargeFill',
        group: 'iot',
      },
    ],
  },
  {
    deviceName: 'Doorbell-1',
    deviceType: 'sensor',
    attributes: ['motionSensor'], // "active", "inactive"
    functions: [
      {
        type: 'unit',
        label: 'takePicture',
        icon: 'camera',
        group: 'iot',
        backgroundColor: '#f97316',
        foregroundColor: '#ffffff',
      },
    ],
  },
  {
    deviceName: 'TemperatureDevice-1',
    deviceType: 'sensor',
    attributes: ['temperatureLevel'], // "high", "ideal", "low", "critical_low"
    functions: [
      {
        type: 'unit_with_args',
        arguments: [
          {
            type: 'str_opt',
            options: [
              { id: 'high', label: 'High' },
              { id: 'ideal', label: 'Ideal' },
              { id: 'low', label: 'Low' },
              { id: 'critical', label: 'Critical' },
            ],
          },
        ],
        backgroundColor: '#eab308',
        foregroundColor: '#ffffff',
        label: 'setTemperature',
        icon: 'thermometerHalf',
        group: 'iot',
      },
    ],
  },
  {
    deviceName: 'LED-1',
    deviceType: 'actuator',
    attributes: ['currentLedColor'], // 'blue', 'orange', 'red'
    functions: [
      {
        type: 'unit_with_args',
        arguments: [
          {
            type: 'str_opt',
            options: [
              { id: 'blue', label: 'Blue' },
              { id: 'green', label: 'Green' },
              { id: 'orange', label: 'Orange' },
              { id: 'red', label: 'Red' },
            ],
          },
        ],
        backgroundColor: '#06b6d4',
        foregroundColor: '#ffffff',
        label: 'setLedColor',
        icon: 'lightbulb',
        group: 'iot',
      },
    ],
  },
  {
    deviceName: 'Buzzer-1',
    deviceType: 'actuator',
    attributes: [],
    functions: [
      {
        type: 'unit',
        backgroundColor: '#6366f1',
        foregroundColor: '#ffffff',
        label: 'beep',
        icon: 'volumeUp',
        group: 'iot',
      },
    ],
  },
  {
    deviceName: 'CoffeeMachine',
    deviceType: 'appliance',
    attributes: [],
    functions: [
      {
        type: 'unit_with_args',
        backgroundColor: '#795548',
        foregroundColor: '#ffffff',
        label: 'makeCoffee',
        icon: 'coffe',
        group: 'iot',
        arguments: [
          {
            type: 'str_opt',
            options: [
              { id: 'espresso', label: 'Espresso' },
              { id: 'late', label: 'Latte Macchiato' },
              { id: 'cappuccino', label: 'Cappuccino' },
            ],
          },
        ],
      },
    ],
  },
  {
    deviceName: 'LightSensor',
    deviceType: 'sensor',
    attributes: ['isDark'],
    functions: [],
  },
  {
    deviceName: 'OutDoorLight',
    deviceType: 'actuator',
    attributes: [],
    functions: [
      {
        type: 'unit_with_args',
        backgroundColor: '#eab308',
        foregroundColor: '#ffffff',
        label: 'state',
        icon: 'lightbulb',
        group: 'iot',
        arguments: [
          {
            type: 'str_opt',
            options: [
              { id: 'on', label: 'On' },
              { id: 'off', label: 'Off' },
            ],
          },
        ],
      },
    ],
  },
];
